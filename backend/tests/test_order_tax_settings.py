"""Tests for POST /api/orders/create — tax_percentage/service_charge now read from
db.site_settings.main (previously hard-coded 5% tax).

Related fix: /app/backend/routes/orders.py::create_order now reads service_charge
and tax_percentage from db.site_settings.find_one({id:'main'}) and applies:
    tax = subtotal_after_credits * tax_percentage/100
    server_final = subtotal_after_credits + service_charge + tax
so the customer-visible total on the frontend matches the DB total_amount exactly.
"""
import os
import sys
import copy
import asyncio
import uuid

import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.insert(0, "/app/backend")
load_dotenv("/app/backend/.env", override=False)

BASE_URL = (
    os.environ.get("REACT_APP_BACKEND_URL")
    or os.environ.get("NEXT_PUBLIC_BACKEND_URL")
    or "https://codebase-import-8.preview.emergentagent.com"
).rstrip("/")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "gsnadmin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "gsnadmin")

# Rs 180 product/variation (per problem statement)
PRODUCT_ID = "a82b37ff-0bd5-4c8b-b969-f59d5937fefa"
VARIATION_ID = "var-1769608319597"
VARIATION_NAME = "1 MONTH [FAMILY JOIN]"
UNIT_PRICE = 180.0


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
    """Login as gsnadmin and get bearer token."""
    resp = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert resp.status_code == 200, f"Admin login failed: {resp.status_code} {resp.text}"
    return resp.json()["token"]


@pytest.fixture(scope="module", autouse=True)
def backup_and_restore_settings(db, event_loop):
    """CRITICAL: backup db.site_settings.main, force to defaults (0/0) at start,
    restore original at end no matter what tests do in between."""
    async def _backup():
        original = await db.site_settings.find_one({"id": "main"})
        # Force safe defaults for the whole run so tests are deterministic
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
        else:
            await db.site_settings.delete_one({"id": "main"})

    original = event_loop.run_until_complete(_backup())
    yield
    event_loop.run_until_complete(_restore(original))


@pytest.fixture(autouse=True)
def cleanup_test_orders(db, event_loop):
    """Cleanup TEST_tax_ orders after each test."""
    yield
    async def _cleanup():
        await db.orders.delete_many({"customer_email": {"$regex": "^TEST_tax_"}})
    event_loop.run_until_complete(_cleanup())


def _make_payload(total_amount, email_suffix="default"):
    return {
        "customer_name": "TEST Tax",
        "customer_email": f"TEST_tax_{email_suffix}_{uuid.uuid4().hex[:6]}@example.com",
        "customer_phone": "9812345678",
        "items": [{
            "name": "Buy YouTube Premium",
            "price": UNIT_PRICE,
            "quantity": 1,
            "variation": VARIATION_NAME,
            "product_id": PRODUCT_ID,
            "variation_id": VARIATION_ID,
        }],
        "total_amount": total_amount,
    }


async def _set_settings(db, service_charge, tax_percentage):
    await db.site_settings.update_one(
        {"id": "main"},
        {"$set": {"id": "main", "service_charge": service_charge, "tax_percentage": tax_percentage}},
        upsert=True,
    )


# ==================== TEST CASES ====================

# 1. Default (0/0): total=180 → 200 and DB stores 180 (NOT 189)
def test_default_settings_stores_exact_total_180(db, event_loop):
    event_loop.run_until_complete(_set_settings(db, 0, 0))

    payload = _make_payload(total_amount=180, email_suffix="default180")
    resp = requests.post(f"{BASE_URL}/api/orders/create", json=payload, timeout=30)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    order_id = resp.json()["order_id"]

    async def _fetch():
        return await db.orders.find_one({"id": order_id}, {"_id": 0})
    doc = event_loop.run_until_complete(_fetch())

    assert doc is not None, "Order not persisted"
    assert doc["total_amount"] == 180, (
        f"REGRESSION: DB total_amount={doc['total_amount']} but expected 180 "
        "(default settings tax=0, service_charge=0 → no surcharge). "
        "This means the old hard-coded 5% is still being applied."
    )
    assert doc["total"] == 180


# 2. tax=10, service_charge=5: total=203 → 200, DB=203; restore afterwards
def test_tax_10_service_5_stores_203(db, event_loop):
    event_loop.run_until_complete(_set_settings(db, 5, 10))
    try:
        # subtotal 180 + service 5 + tax 10% of 180 = 18 → 203
        payload = _make_payload(total_amount=203, email_suffix="tax10sc5")
        resp = requests.post(f"{BASE_URL}/api/orders/create", json=payload, timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

        order_id = resp.json()["order_id"]

        async def _fetch():
            return await db.orders.find_one({"id": order_id}, {"_id": 0})
        doc = event_loop.run_until_complete(_fetch())

        assert doc is not None
        assert doc["total_amount"] == 203, (
            f"Expected DB total=203 (180+5+18), got {doc['total_amount']}"
        )
    finally:
        event_loop.run_until_complete(_set_settings(db, 0, 0))


# 3. Default (0/0): manipulated total=1 for a Rs 180 product → 400
def test_default_settings_price_manipulation_rejected(db, event_loop):
    event_loop.run_until_complete(_set_settings(db, 0, 0))

    payload = _make_payload(total_amount=1, email_suffix="manip")
    resp = requests.post(f"{BASE_URL}/api/orders/create", json=payload, timeout=30)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    detail = resp.json().get("detail", "").lower()
    assert "mismatch" in detail, f"Expected 'mismatch' in detail, got: {detail}"


# 4a. tax=10, sc=5: client sends 100 (< 90% of 203 = 182.7) → 400
def test_tax_10_service_5_below_floor_rejected(db, event_loop):
    event_loop.run_until_complete(_set_settings(db, 5, 10))
    try:
        payload = _make_payload(total_amount=100, email_suffix="belowfloor")
        resp = requests.post(f"{BASE_URL}/api/orders/create", json=payload, timeout=30)
        assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
        assert "mismatch" in resp.json().get("detail", "").lower()
    finally:
        event_loop.run_until_complete(_set_settings(db, 0, 0))


# 4b. tax=10, sc=5: client sends 202 (within Rs 2 of server 203) → 200 (allows minor rounding)
def test_tax_10_service_5_within_floor_accepted(db, event_loop):
    event_loop.run_until_complete(_set_settings(db, 5, 10))
    try:
        payload = _make_payload(total_amount=202, email_suffix="withinfloor")
        resp = requests.post(f"{BASE_URL}/api/orders/create", json=payload, timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

        order_id = resp.json()["order_id"]
        async def _fetch():
            return await db.orders.find_one({"id": order_id}, {"_id": 0})
        doc = event_loop.run_until_complete(_fetch())
        # Server verified total should be 203 (server-calculated wins over client 202)
        assert doc["total_amount"] == 203, (
            f"Server should overwrite client total with server_final=203, got {doc['total_amount']}"
        )
    finally:
        event_loop.run_until_complete(_set_settings(db, 0, 0))


# 5. Rs 0 hard block still fires
def test_zero_total_still_rejected(db, event_loop):
    event_loop.run_until_complete(_set_settings(db, 0, 0))
    payload = _make_payload(total_amount=0, email_suffix="zero")
    resp = requests.post(f"{BASE_URL}/api/orders/create", json=payload, timeout=30)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    assert "Invalid order total" in resp.json().get("detail", "")


# 6. Missing settings doc: fallback to 0/0 (no tax)
def test_missing_settings_doc_falls_back_to_zero(db, event_loop):
    """Backup settings, delete doc, order with total=180 must succeed with DB total=180,
    then restore the doc."""
    async def _backup_and_delete():
        current = await db.site_settings.find_one({"id": "main"})
        await db.site_settings.delete_one({"id": "main"})
        return current

    async def _restore(doc):
        if doc is not None:
            doc.pop("_id", None)
            await db.site_settings.replace_one({"id": "main"}, doc, upsert=True)

    backed_up = event_loop.run_until_complete(_backup_and_delete())
    try:
        # Confirm doc is really gone
        async def _confirm_gone():
            return await db.site_settings.find_one({"id": "main"})
        gone = event_loop.run_until_complete(_confirm_gone())
        assert gone is None, "Settings doc still present after delete"

        payload = _make_payload(total_amount=180, email_suffix="nosettings")
        resp = requests.post(f"{BASE_URL}/api/orders/create", json=payload, timeout=30)
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

        order_id = resp.json()["order_id"]
        async def _fetch():
            return await db.orders.find_one({"id": order_id}, {"_id": 0})
        doc = event_loop.run_until_complete(_fetch())
        assert doc is not None
        assert doc["total_amount"] == 180, (
            f"When settings doc missing, backend must fall back to service_charge=0, "
            f"tax_percentage=0. Expected 180, got {doc['total_amount']}"
        )
    finally:
        event_loop.run_until_complete(_restore(backed_up))


# 7. Admin control smoke: GET/PUT /api/settings
def test_admin_can_read_and_update_settings(admin_token, db, event_loop):
    headers = {"Authorization": f"Bearer {admin_token}"}

    # GET
    r_get = requests.get(f"{BASE_URL}/api/settings", timeout=30)
    assert r_get.status_code == 200
    data = r_get.json()
    assert "tax_percentage" in data, "tax_percentage field missing from GET /api/settings"
    assert "service_charge" in data, "service_charge field missing from GET /api/settings"

    # PUT - set tax to 7
    put_body = dict(data)
    put_body["tax_percentage"] = 7
    put_body["service_charge"] = 3
    r_put = requests.put(f"{BASE_URL}/api/settings", json=put_body, headers=headers, timeout=30)
    assert r_put.status_code == 200, f"PUT failed: {r_put.status_code} {r_put.text}"

    # GET again
    r_get2 = requests.get(f"{BASE_URL}/api/settings", timeout=30)
    assert r_get2.status_code == 200
    data2 = r_get2.json()
    assert data2["tax_percentage"] == 7, f"Expected tax_percentage=7 after PUT, got {data2.get('tax_percentage')}"
    assert data2["service_charge"] == 3, f"Expected service_charge=3 after PUT, got {data2.get('service_charge')}"

    # Restore to 0/0
    restore_body = dict(data2)
    restore_body["tax_percentage"] = 0
    restore_body["service_charge"] = 0
    r_restore = requests.put(f"{BASE_URL}/api/settings", json=restore_body, headers=headers, timeout=30)
    assert r_restore.status_code == 200

    r_get3 = requests.get(f"{BASE_URL}/api/settings", timeout=30)
    data3 = r_get3.json()
    assert data3["tax_percentage"] == 0
    assert data3["service_charge"] == 0


# 8. PUT /api/settings without auth → 401/403
def test_admin_settings_requires_auth():
    resp = requests.put(
        f"{BASE_URL}/api/settings",
        json={"tax_percentage": 99, "service_charge": 99},
        timeout=30,
    )
    assert resp.status_code in (401, 403), (
        f"Expected 401/403 without auth, got {resp.status_code}"
    )
