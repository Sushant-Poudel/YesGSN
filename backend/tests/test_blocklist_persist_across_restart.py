"""Iteration 23 regression: verify blocklist persists across backend restart.

Flow:
  1) Admin logs in, POSTs /api/blocklist/ip with a synthetic IP.
  2) Confirm create-order with that X-Forwarded-For returns 429 (in-memory block is live).
  3) `sudo supervisorctl restart backend && sleep 5`.
  4) Confirm create-order STILL 429 (blocklist was restored from db.site_settings.blocklist).
  5) Assert 'Blocklist restored:' appears in /var/log/supervisor/backend.err.log.
  6) DELETE /api/blocklist/ip to cleanup.
"""
import os
import subprocess
import time
import uuid

import pytest
import requests

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL")
            or "https://codebase-import-8.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Real product for a real order-create attempt
YT_PRODUCT_ID = "a82b37ff-0bd5-4c8b-b969-f59d5937fefa"
YT_VARIATION_ID = "var-1769608319597"
YT_VARIATION_NAME = "1 MONTH [FAMILY JOIN]"
YT_PRICE = 180

# Use a unique per-run IP so we don't collide with existing blocklist entries
TEST_IP = f"9.9.9.{(hash(uuid.uuid4().hex) % 250) + 2}"


def _order_payload():
    return {
        "customer_name": "TEST_blocklist_persist",
        "customer_phone": "9800000009",
        "customer_email": f"TEST_blocklist_{uuid.uuid4().hex[:6]}@example.com",
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


@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(f"{API}/auth/login",
                      json={"email": "gsnadmin", "password": "gsnadmin"},
                      timeout=15)
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_blocklist_persists_across_backend_restart(admin_headers):
    # 1) block the IP
    r = requests.post(f"{API}/blocklist/ip",
                      json={"ip": TEST_IP, "reason": "iteration_23 restart test"},
                      headers=admin_headers, timeout=10)
    assert r.status_code in (200, 201), f"block create failed: {r.status_code} {r.text}"

    try:
        # 2) verify in-memory block: create-order from that IP → 429
        r2 = requests.post(f"{API}/orders/create",
                           json=_order_payload(),
                           headers={"X-Forwarded-For": TEST_IP},
                           timeout=15)
        assert r2.status_code == 429, (
            f"Pre-restart: expected 429 for blocked IP {TEST_IP}, got {r2.status_code} {r2.text}"
        )

        # 3) restart backend
        subprocess.run(["sudo", "supervisorctl", "restart", "backend"],
                       check=True, capture_output=True, text=True, timeout=30)

        # wait for backend to come back — poll /api/health for up to 20s
        deadline = time.time() + 20
        healthy = False
        while time.time() < deadline:
            try:
                hr = requests.get(f"{API}/health", timeout=3)
                if hr.status_code == 200:
                    healthy = True
                    break
            except Exception:
                pass
            time.sleep(1)
        assert healthy, "Backend did not come back healthy within 20s of restart"

        # Extra sleep to let startup event finish (blocklist restore is async in the startup task)
        time.sleep(2)

        # 4) post-restart: same IP must STILL be blocked
        r3 = requests.post(f"{API}/orders/create",
                           json=_order_payload(),
                           headers={"X-Forwarded-For": TEST_IP},
                           timeout=15)
        assert r3.status_code == 429, (
            f"POST-restart: blocklist did NOT persist. IP {TEST_IP} got {r3.status_code}: {r3.text}"
        )

        # 5) supervisor log check
        log_paths = [
            "/var/log/supervisor/backend.err.log",
            "/var/log/supervisor/backend.out.log",
        ]
        found = False
        for p in log_paths:
            try:
                with open(p, "r") as f:
                    tail = f.read()[-20000:]  # last 20KB
                if "Blocklist restored" in tail:
                    found = True
                    break
            except FileNotFoundError:
                continue
        assert found, "'Blocklist restored:' log line not found in backend supervisor logs"

    finally:
        # 6) cleanup — unblock
        requests.delete(f"{API}/blocklist/ip",
                        json={"ip": TEST_IP},
                        headers=admin_headers,
                        timeout=10)
