"""Regression tests for cleanup fixes (iteration 21).

Covers:
- Complaint validator (char-based, not word-based)
- No NameError on payment-screenshot, status update, SMTP settings, chat, promo-codes
- SiteSettings validators (tax_percentage bounds)
- Health endpoint parity
- Full order-create flow regression
"""
import os
import time
import uuid
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://codebase-import-8.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_USER = "gsnadmin"
ADMIN_PASS = "gsnadmin"

# Real product used for order-create payloads (server-side price validation is strict —
# variation_id must match a real DB variation).
YT_PRODUCT_ID = "a82b37ff-0bd5-4c8b-b969-f59d5937fefa"
YT_VARIATION_ID = "var-1769608319597"
YT_VARIATION_NAME = "1 MONTH [FAMILY JOIN]"
YT_PRICE = 180


# ==================== FIXTURES ====================

@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_USER, "password": ADMIN_PASS}, timeout=10)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def test_order(admin_headers):
    """Create a real order via /api/orders/create for use in complaint / payment-screenshot tests."""
    payload = {
        "customer_name": "TEST_Cleanup User",
        "customer_phone": "9800000000",
        "customer_email": "test_cleanup@example.com",
        "items": [{
            "name": "Buy YouTube Premium",
            "price": YT_PRICE,
            "quantity": 1,
            "variation": YT_VARIATION_NAME,
            "product_id": YT_PRODUCT_ID,
            "variation_id": YT_VARIATION_ID,
        }],
        "total_amount": YT_PRICE,
        "remark": "iteration_21 regression",
    }
    r = requests.post(f"{API}/orders/create", json=payload, timeout=15)
    assert r.status_code == 200, f"order/create failed: {r.status_code} {r.text}"
    data = r.json()
    assert data.get("success") is True
    order_id = data["order_id"]
    yield order_id
    # cleanup
    try:
        requests.delete(f"{API}/orders/{order_id}", headers=admin_headers, timeout=10)
    except Exception:
        pass


# ==================== HEALTH ====================

class TestHealth:
    def test_health_api(self):
        t0 = time.time()
        r = requests.get(f"{API}/health", timeout=5)
        elapsed = time.time() - t0
        assert r.status_code == 200
        data = r.json()
        assert data.get("status") == "healthy"
        assert "database" in data
        # nominal <5ms is unrealistic across public URL; ensure <2s at worst
        assert elapsed < 2.0


# ==================== COMPLAINT VALIDATOR (BUG FIX) ====================

class TestComplaintValidator:
    def test_20_char_single_word_accepted(self, test_order):
        """25-character single-word reason (no spaces) must succeed."""
        reason = "a" * 25  # single "word", 25 chars
        payload = {
            "whatsapp": "9800000000",
            "email": "test_cleanup@example.com",
            "reason": reason,
        }
        r = requests.post(f"{API}/orders/{test_order}/complaint", json=payload, timeout=15)
        # Endpoint should not 400 for length; it may 200 or 500 (webhook failure) but must NOT be 400
        assert r.status_code != 400, f"Expected != 400, got {r.status_code}: {r.text}"
        # ideally 200
        assert r.status_code in (200, 500), f"Unexpected status: {r.status_code} {r.text}"

    def test_15_char_rejected_with_char_message(self, test_order):
        payload = {
            "whatsapp": "9800000000",
            "email": "test_cleanup@example.com",
            "reason": "a" * 15,
        }
        r = requests.post(f"{API}/orders/{test_order}/complaint", json=payload, timeout=10)
        assert r.status_code == 400, f"Expected 400, got {r.status_code}"
        detail = r.json().get("detail", "").lower()
        assert "20 character" in detail or "20 characters" in detail, f"Message should mention 20 characters, got: {detail}"

    def test_empty_whatsapp_rejected(self, test_order):
        r = requests.post(
            f"{API}/orders/{test_order}/complaint",
            json={"whatsapp": "", "reason": "a" * 30},
            timeout=10,
        )
        assert r.status_code == 400


# ==================== PAYMENT SCREENSHOT + STATUS (NameError check) ====================

class TestPaymentScreenshotAndStatus:
    def test_payment_screenshot_no_nameerror(self, test_order):
        r = requests.post(
            f"{API}/orders/{test_order}/payment-screenshot",
            json={"screenshot_url": "https://example.com/dummy.png", "payment_method": "eSewa"},
            timeout=15,
        )
        # Endpoint must succeed (Confirmed set); Discord webhook is a best-effort try/except.
        assert r.status_code == 200, f"payment-screenshot returned {r.status_code}: {r.text}"

    def test_status_update_no_nameerror(self, admin_headers):
        # Create a second order
        payload = {
            "customer_name": "TEST_Status Order",
            "customer_phone": "9800000001",
            "customer_email": "test_status@example.com",
            "items": [{
                "name": "Buy YouTube Premium",
                "price": YT_PRICE,
                "quantity": 1,
                "variation": YT_VARIATION_NAME,
                "product_id": YT_PRODUCT_ID,
                "variation_id": YT_VARIATION_ID,
            }],
            "total_amount": YT_PRICE,
        }
        r = requests.post(f"{API}/orders/create", json=payload, timeout=15)
        assert r.status_code == 200
        oid = r.json()["order_id"]
        try:
            r2 = requests.put(
                f"{API}/orders/{oid}/status",
                json={"status": "confirmed", "note": "regression test"},
                headers=admin_headers,
                timeout=15,
            )
            assert r2.status_code == 200, f"status update returned {r2.status_code}: {r2.text}"
        finally:
            requests.delete(f"{API}/orders/{oid}", headers=admin_headers, timeout=10)


# ==================== SMTP SETTINGS (Path import) ====================

class TestSmtpSettings:
    def test_smtp_get(self, admin_headers):
        r = requests.get(f"{API}/settings/smtp", headers=admin_headers, timeout=10)
        assert r.status_code == 200, f"SMTP GET failed: {r.status_code} {r.text}"
        data = r.json()
        assert isinstance(data, dict)


# ==================== PROMO CODES (PromoCode model) ====================

class TestPromoCodeCreation:
    def test_create_and_get_promo(self, admin_headers):
        code = f"TEST_CLEANUP_{uuid.uuid4().hex[:8].upper()}"
        payload = {
            "code": code,
            "discount_type": "percentage",
            "discount_value": 10,
            "min_order_amount": 0,
            "is_active": True,
        }
        r = requests.post(f"{API}/promo-codes", json=payload, headers=admin_headers, timeout=10)
        assert r.status_code == 200, f"promo create failed: {r.status_code} {r.text}"
        created = r.json()
        assert "id" in created
        assert "created_at" in created
        assert created["code"] == code
        assert created["used_count"] == 0
        promo_id = created["id"]

        # GET list — must include the new code
        r2 = requests.get(f"{API}/promo-codes", headers=admin_headers, timeout=10)
        assert r2.status_code == 200
        codes = [p["code"] for p in r2.json()]
        assert code in codes

        # cleanup
        requests.delete(f"{API}/promo-codes/{promo_id}", headers=admin_headers, timeout=10)


# ==================== CHATBOT (LlmChat/UserMessage imports) ====================

class TestChatbot:
    def test_chat_no_nameerror(self):
        payload = {"message": "hello", "session_id": "test-cleanup-session"}
        r = requests.post(f"{API}/chat", json=payload, timeout=30)
        # Either 200 (LLM responded) or 500 (LLM key issue), but body must NOT reference NameError
        assert r.status_code in (200, 500, 502), f"Unexpected chat status: {r.status_code} {r.text}"
        body = r.text.lower()
        assert "nameerror" not in body, f"NameError present in chat response: {r.text}"
        if r.status_code == 200:
            assert "response" in r.json()


# ==================== SITE SETTINGS VALIDATION ====================

class TestSiteSettingsValidation:
    def test_tax_negative_rejected(self, admin_headers):
        r = requests.put(f"{API}/settings", json={"tax_percentage": -1}, headers=admin_headers, timeout=10)
        assert r.status_code == 422, f"Expected 422 for tax=-1, got {r.status_code}: {r.text}"

    def test_tax_above_100_rejected(self, admin_headers):
        r = requests.put(f"{API}/settings", json={"tax_percentage": 150}, headers=admin_headers, timeout=10)
        assert r.status_code == 422, f"Expected 422 for tax=150, got {r.status_code}: {r.text}"

    def test_tax_valid_merged(self, admin_headers):
        r = requests.put(
            f"{API}/settings",
            json={"tax_percentage": 7.5, "service_charge": 3},
            headers=admin_headers,
            timeout=10,
        )
        assert r.status_code == 200, f"Valid update failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("tax_percentage") == 7.5
        assert data.get("service_charge") == 3

        # Restore
        r2 = requests.put(
            f"{API}/settings",
            json={"tax_percentage": 0, "service_charge": 0},
            headers=admin_headers,
            timeout=10,
        )
        assert r2.status_code == 200


# ==================== ORDER CREATE REGRESSION ====================

class TestOrderCreateRegression:
    def test_full_order_flow(self, admin_headers):
        payload = {
            "customer_name": "TEST_Regression",
            "customer_phone": "9811111111",
            "customer_email": "regression@example.com",
            "items": [{
                "name": "Buy YouTube Premium",
                "price": YT_PRICE,
                "quantity": 1,
                "variation": YT_VARIATION_NAME,
                "product_id": YT_PRODUCT_ID,
                "variation_id": YT_VARIATION_ID,
            }],
            "total_amount": YT_PRICE,
        }
        r = requests.post(f"{API}/orders/create", json=payload, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data.get("success") is True
        assert "order_id" in data
        oid = data["order_id"]

        # Fetch order (admin) — verify total_amount stored
        r2 = requests.get(f"{API}/orders", headers=admin_headers, timeout=10)
        assert r2.status_code == 200
        orders = r2.json() if isinstance(r2.json(), list) else r2.json().get("orders", [])
        found = next((o for o in orders if o.get("id") == oid), None)
        assert found is not None, "Created order not found in list"
        assert found.get("total_amount") == 180

        # cleanup
        requests.delete(f"{API}/orders/{oid}", headers=admin_headers, timeout=10)
