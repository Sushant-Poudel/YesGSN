"""Tests for the order-creation security hardening (iteration 22).

Covers the fixes described in the review request:
1. Server rejects fake variation_id + fake variation name → 400 (was Rs 10 stored).
2. Server rejects missing product_id → 400.
3. Server rejects fake product_id → 400.
4. Tighter price tolerance (95% + Rs 2 floor) rejects 10%-off manipulation.
5. Rate-limit wiring: 4th order from same IP within 10 min → 429.
6. Blocklist wiring: order from a blocked IP → 429.
7. Regression: valid Rs 180 order stores 180 exactly.
8. Security smoke: no db.orders row is inserted when the exploit endpoints
   return 400.

NOTE ON CONFTEST INTERACTION: /app/backend/tests/conftest.py patches
requests to inject a per-test X-Forwarded-For so tests don't step on each
other's rate-limit counters. Tests in this file that explicitly want to
exercise the rate-limit / blocklist logic pin their OWN X-Forwarded-For to
override the per-test default.
"""
import os
import sys
import uuid
import asyncio

import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.insert(0, "/app/backend")
load_dotenv("/app/backend/.env", override=False)

BASE_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or "https://codebase-import-8.preview.emergentagent.com"
).rstrip("/")
API = f"{BASE_URL}/api"

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

# Real products from the review request
WIN11_PRODUCT_ID = "8ed0e23d-8b46-40e8-beba-7c7c3f72d305"     # Windows 11 Pro, Rs 999
WIN11_VARIATION_ID = "var-1773632964256"
YT_PRODUCT_ID = "a82b37ff-0bd5-4c8b-b969-f59d5937fefa"        # YouTube Premium, Rs 180
YT_VARIATION_ID = "var-1769608319597"
YT_VARIATION_NAME = "1 MONTH [FAMILY JOIN]"
YT_UNIT_PRICE = 180.0


ADMIN_USER = "gsnadmin"
ADMIN_PASS = "gsnadmin"


# ==================== FIXTURES ====================

@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="module")
def db(event_loop):
    client = AsyncIOMotorClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{API}/auth/login",
        json={"email": ADMIN_USER, "password": ADMIN_PASS},
        timeout=15,
    )
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module", autouse=True)
def clean_test_orders_on_finish(db, event_loop):
    """Wipe TEST_sec_ orders at end of module run."""
    yield
    async def _cleanup():
        await db.orders.delete_many({"customer_email": {"$regex": "^TEST_sec_"}})
    event_loop.run_until_complete(_cleanup())


@pytest.fixture(scope="module", autouse=True)
def force_settings_zero(db, event_loop):
    """Force tax/service to 0/0 for deterministic totals; restore at end."""
    async def _backup_and_set():
        original = await db.site_settings.find_one({"id": "main"})
        await db.site_settings.update_one(
            {"id": "main"},
            {"$set": {"id": "main", "service_charge": 0, "tax_percentage": 0}},
            upsert=True,
        )
        return original
    async def _restore(original):
        if original is not None:
            original.pop("_id", None)
            await db.site_settings.replace_one({"id": "main"}, original, upsert=True)
    original = event_loop.run_until_complete(_backup_and_set())
    yield
    event_loop.run_until_complete(_restore(original))


def _sec_email(tag: str) -> str:
    return f"TEST_sec_{tag}_{uuid.uuid4().hex[:6]}@example.com"


def _yt_payload(total_amount, tag="default", email=None):
    return {
        "customer_name": "TEST_SEC",
        "customer_email": email or _sec_email(tag),
        "customer_phone": "9812345678",
        "items": [{
            "name": "Buy YouTube Premium",
            "price": YT_UNIT_PRICE,
            "quantity": 1,
            "variation": YT_VARIATION_NAME,
            "product_id": YT_PRODUCT_ID,
            "variation_id": YT_VARIATION_ID,
        }],
        "total_amount": total_amount,
    }


# ==================== EXPLOIT REPRO ====================

class TestExploitReproduction:
    def test_fake_variation_id_and_name_rejected(self, db, event_loop):
        """POST with real product_id but FAKE variation_id + FAKE variation name.

        Previously this stored a Rs 10 order for Windows 11 Pro. Must now 400.
        """
        async def _count():
            return await db.orders.count_documents(
                {"customer_email": {"$regex": "^TEST_sec_exploit1_"}}
            )
        before = event_loop.run_until_complete(_count())

        payload = {
            "customer_name": "TEST_SEC exploit1",
            "customer_email": _sec_email("exploit1"),
            "customer_phone": "9812345678",
            "items": [{
                "name": "Windows 11 PRO",
                "price": 1,
                "quantity": 1,
                "variation": "FAKE",
                "product_id": WIN11_PRODUCT_ID,
                "variation_id": "var-FAKE",
            }],
            "total_amount": 10,
        }
        r = requests.post(f"{API}/orders/create", json=payload, timeout=20)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        detail = r.json().get("detail", "").lower()
        assert "variation" in detail, f"Detail should mention variation, got: {detail}"

        after = event_loop.run_until_complete(_count())
        assert after == before, (
            f"SECURITY: order was inserted despite 400 response ({before} → {after})"
        )

    def test_missing_product_id_rejected(self, db, event_loop):
        async def _count():
            return await db.orders.count_documents(
                {"customer_email": {"$regex": "^TEST_sec_exploit2_"}}
            )
        before = event_loop.run_until_complete(_count())

        payload = {
            "customer_name": "TEST_SEC exploit2",
            "customer_email": _sec_email("exploit2"),
            "customer_phone": "9812345678",
            "items": [{
                "name": "Anything",
                "price": 1,
                "quantity": 1,
                # NO product_id
            }],
            "total_amount": 10,
        }
        r = requests.post(f"{API}/orders/create", json=payload, timeout=20)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        assert "invalid product" in r.json().get("detail", "").lower()

        after = event_loop.run_until_complete(_count())
        assert after == before

    def test_fake_product_id_rejected(self, db, event_loop):
        async def _count():
            return await db.orders.count_documents(
                {"customer_email": {"$regex": "^TEST_sec_exploit3_"}}
            )
        before = event_loop.run_until_complete(_count())

        payload = {
            "customer_name": "TEST_SEC exploit3",
            "customer_email": _sec_email("exploit3"),
            "customer_phone": "9812345678",
            "items": [{
                "name": "Bogus",
                "price": 1,
                "quantity": 1,
                "product_id": "00000000-0000-0000-0000-000000000000",
                "variation": "any",
                "variation_id": "any",
            }],
            "total_amount": 10,
        }
        r = requests.post(f"{API}/orders/create", json=payload, timeout=20)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        assert "invalid product" in r.json().get("detail", "").lower()

        after = event_loop.run_until_complete(_count())
        assert after == before


# ==================== TIGHTER TOLERANCE ====================

class TestTighterTolerance:
    def test_160_rejected_below_new_floor(self):
        """Server calc=180; floor = max(180-2, 180*0.95) = max(178, 171) = 178.
        Client sends 160 → 400."""
        payload = _yt_payload(total_amount=160, tag="tol160")
        r = requests.post(f"{API}/orders/create", json=payload, timeout=20)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}: {r.text}"
        assert "mismatch" in r.json().get("detail", "").lower()

    def test_178_accepted_at_absolute_floor(self, db, event_loop):
        payload = _yt_payload(total_amount=178, tag="tol178")
        r = requests.post(f"{API}/orders/create", json=payload, timeout=20)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        order_id = r.json()["order_id"]
        async def _fetch():
            return await db.orders.find_one({"id": order_id}, {"_id": 0})
        doc = event_loop.run_until_complete(_fetch())
        # server verified total should be 180
        assert doc["total_amount"] == 180

    def test_180_exact_accepted(self, db, event_loop):
        payload = _yt_payload(total_amount=180, tag="tol180")
        r = requests.post(f"{API}/orders/create", json=payload, timeout=20)
        assert r.status_code == 200, f"Expected 200, got {r.status_code}: {r.text}"
        order_id = r.json()["order_id"]
        async def _fetch():
            return await db.orders.find_one({"id": order_id}, {"_id": 0})
        doc = event_loop.run_until_complete(_fetch())
        assert doc["total_amount"] == 180
        assert doc["total"] == 180


# ==================== RATE LIMIT WIRING ====================

class TestRateLimit:
    def test_fourth_order_from_same_ip_returns_429(self):
        """POST 3 orders from a fixed IP → all 200; 4th → 429."""
        # Pick a unique IP for this test so it doesn't collide with anyone
        pinned_ip = f"192.168.99.{uuid.uuid4().int % 250}"
        hdr = {"X-Forwarded-For": pinned_ip}

        for i in range(3):
            payload = _yt_payload(total_amount=180, tag=f"rate_{i}")
            r = requests.post(f"{API}/orders/create", json=payload, headers=hdr, timeout=20)
            assert r.status_code == 200, (
                f"Order #{i+1} from ip={pinned_ip} unexpectedly returned "
                f"{r.status_code}: {r.text}"
            )

        payload = _yt_payload(total_amount=180, tag="rate_4")
        r = requests.post(f"{API}/orders/create", json=payload, headers=hdr, timeout=20)
        assert r.status_code == 429, (
            f"4th order from ip={pinned_ip} MUST be rate-limited but got "
            f"{r.status_code}: {r.text}"
        )
        detail = r.json().get("detail", "").lower()
        assert "too many" in detail or "wait" in detail, (
            f"429 detail should say 'too many' / 'wait', got: {detail}"
        )


# ==================== BLOCKLIST WIRING ====================

class TestBlocklist:
    def test_blocked_ip_cannot_place_order(self, admin_headers):
        blocked_ip = f"1.2.3.{uuid.uuid4().int % 250}"

        # Admin blocks the IP
        r_block = requests.post(
            f"{API}/blocklist/ip",
            json={"ip": blocked_ip},
            headers=admin_headers,
            timeout=15,
        )
        assert r_block.status_code == 200, f"block failed: {r_block.status_code} {r_block.text}"

        try:
            # Attempt an order from that IP
            hdr = {"X-Forwarded-For": blocked_ip}
            payload = _yt_payload(total_amount=180, tag="blocked")
            r = requests.post(f"{API}/orders/create", json=payload, headers=hdr, timeout=20)
            assert r.status_code == 429, (
                f"Blocked IP={blocked_ip} order MUST be 429, got {r.status_code}: {r.text}"
            )
            detail = r.json().get("detail", "").lower()
            assert "blocked" in detail, f"Detail should mention 'blocked', got: {detail}"
        finally:
            # Unblock
            r_unblock = requests.delete(
                f"{API}/blocklist/ip",
                json={"ip": blocked_ip},
                headers=admin_headers,
                timeout=15,
            )
            assert r_unblock.status_code == 200

        # After unblock, the order should succeed
        hdr = {"X-Forwarded-For": blocked_ip}
        payload = _yt_payload(total_amount=180, tag="unblocked")
        r2 = requests.post(f"{API}/orders/create", json=payload, headers=hdr, timeout=20)
        assert r2.status_code == 200, (
            f"After unblock, order from ip={blocked_ip} should succeed, got "
            f"{r2.status_code}: {r2.text}"
        )


# ==================== REGRESSION: happy path Rs 180 ====================

class TestValidOrderRegression:
    def test_rs_180_still_succeeds(self, db, event_loop):
        payload = _yt_payload(total_amount=180, tag="regression")
        r = requests.post(f"{API}/orders/create", json=payload, timeout=20)
        assert r.status_code == 200, f"Regression 180 failed: {r.status_code} {r.text}"
        order_id = r.json()["order_id"]
        async def _fetch():
            return await db.orders.find_one({"id": order_id}, {"_id": 0})
        doc = event_loop.run_until_complete(_fetch())
        assert doc is not None
        assert doc["total_amount"] == 180
        assert doc["total"] == 180
        assert doc["status"] == "Pending"
