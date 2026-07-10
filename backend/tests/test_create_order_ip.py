"""Tests for POST /api/orders/create — regression around client_ip NameError bug fix.

Bug: create_order referenced undefined `client_ip` when building local_order → NameError
     → 500 for every checkout. Fix extracts client_ip from request (X-Forwarded-For or
     request.client.host) BEFORE building the local_order dict.
"""
import os
import sys
import asyncio
import uuid

import pytest
import requests
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

sys.path.insert(0, "/app/backend")
load_dotenv("/app/backend/.env", override=False)

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL") or "https://codebase-import-8.preview.emergentagent.com"
BASE_URL = BASE_URL.rstrip("/")
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

TEST_EMAIL = f"TEST_orderbug_{uuid.uuid4().hex[:8]}@example.com"


@pytest.fixture(scope="module")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="module")
def db():
    client = AsyncIOMotorClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


@pytest.fixture(scope="module")
def real_product():
    """Fetch a real product from the API and pick a variation with the lowest price."""
    r = requests.get(f"{BASE_URL}/api/products", timeout=30)
    assert r.status_code == 200, f"GET /api/products failed: {r.status_code}"
    products = r.json()
    assert isinstance(products, list) and len(products) > 0, "No products returned"

    # Pick first product that has variations with a numeric price
    for p in products:
        variations = p.get("variations") or []
        if not variations:
            continue
        priced = [v for v in variations if isinstance(v.get("price"), (int, float)) and v.get("price") > 0]
        if not priced:
            continue
        cheapest = min(priced, key=lambda v: v["price"])
        return {"product": p, "variation": cheapest}
    pytest.skip("No product with a priced variation available for testing")


@pytest.fixture(scope="module", autouse=True)
def cleanup_test_orders(db, event_loop):
    """Ensure test orders (identified by TEST_ email prefix) are cleaned up afterwards."""
    async def _teardown():
        await db.orders.delete_many({"customer_email": {"$regex": "^TEST_orderbug_"}})
    yield
    event_loop.run_until_complete(_teardown())


# ==================== HAPPY PATH ====================

def test_create_order_success_returns_200_with_uuid(real_product, db, event_loop):
    """POST /api/orders/create with a valid payload returns 200 + {success, order_id}."""
    product = real_product["product"]
    variation = real_product["variation"]

    payload = {
        "customer_name": "TEST User",
        "customer_email": TEST_EMAIL,
        "customer_phone": "9812345678",
        "items": [{
            "name": product["name"],
            "price": float(variation["price"]),
            "quantity": 1,
            "variation": variation.get("name"),
            "product_id": product["id"],
            "variation_id": variation.get("id"),
        }],
        # Send a client total that matches what the frontend would send:
        # server computes: price*qty  → +5% tax  = final. We match within tolerance.
        "total_amount": round(float(variation["price"]) * 1.05, 2),
    }

    resp = requests.post(f"{BASE_URL}/api/orders/create", json=payload, timeout=30)
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    data = resp.json()
    assert data.get("success") is True
    order_id = data.get("order_id")
    assert isinstance(order_id, str) and len(order_id) == 36, f"Bad order_id: {order_id}"

    # Verify persistence in DB
    async def _fetch():
        return await db.orders.find_one({"id": order_id}, {"_id": 0})
    order_doc = event_loop.run_until_complete(_fetch())

    assert order_doc is not None, "Order not persisted"
    assert order_doc["id"] == order_id
    assert order_doc["status"] == "Pending"
    assert order_doc["customer_name"] == "TEST User"
    assert order_doc["customer_email"] == TEST_EMAIL
    assert order_doc["customer_phone"]  # phone should be formatted, non-empty
    assert isinstance(order_doc.get("items"), list) and len(order_doc["items"]) == 1
    assert order_doc["items"][0]["product_id"] == product["id"]

    # Server-verified totals set
    assert order_doc.get("total_amount") is not None
    assert order_doc.get("total") == order_doc.get("total_amount")
    assert order_doc["total_amount"] > 0

    # customer_ip should be populated when going through the ingress (X-Forwarded-For)
    assert "customer_ip" in order_doc, "customer_ip key missing entirely"
    assert order_doc["customer_ip"] is not None and order_doc["customer_ip"] != "", (
        f"customer_ip not populated: {order_doc.get('customer_ip')!r}"
    )


# ==================== REGRESSION: price manipulation guard ====================

def test_create_order_rejects_price_manipulation(real_product):
    """total_amount=1 with a Rs 180+ product must 400 (total mismatch)."""
    product = real_product["product"]
    variation = real_product["variation"]

    payload = {
        "customer_name": "TEST Manip",
        "customer_email": TEST_EMAIL,
        "customer_phone": "9812345678",
        "items": [{
            "name": product["name"],
            "price": float(variation["price"]),
            "quantity": 1,
            "variation": variation.get("name"),
            "product_id": product["id"],
            "variation_id": variation.get("id"),
        }],
        "total_amount": 1,  # way below server total
    }

    resp = requests.post(f"{BASE_URL}/api/orders/create", json=payload, timeout=30)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    detail = resp.json().get("detail", "").lower()
    assert "mismatch" in detail, f"Expected 'mismatch' in detail, got: {detail}"


# ==================== REGRESSION: Rs 0 hard block ====================

def test_create_order_rejects_zero_total(real_product):
    """total_amount=0 must 400 with 'Invalid order total'."""
    product = real_product["product"]
    variation = real_product["variation"]

    payload = {
        "customer_name": "TEST Zero",
        "customer_email": TEST_EMAIL,
        "customer_phone": "9812345678",
        "items": [{
            "name": product["name"],
            "price": float(variation["price"]),
            "quantity": 1,
            "variation": variation.get("name"),
            "product_id": product["id"],
            "variation_id": variation.get("id"),
        }],
        "total_amount": 0,
    }

    resp = requests.post(f"{BASE_URL}/api/orders/create", json=payload, timeout=30)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    detail = resp.json().get("detail", "")
    assert "Invalid order total" in detail, f"Unexpected detail: {detail}"


# ==================== REGRESSION: missing required fields ====================

def test_create_order_rejects_empty_phone(real_product):
    product = real_product["product"]
    variation = real_product["variation"]

    payload = {
        "customer_name": "TEST NoPhone",
        "customer_email": TEST_EMAIL,
        "customer_phone": "   ",  # empty/whitespace
        "items": [{
            "name": product["name"],
            "price": float(variation["price"]),
            "quantity": 1,
            "variation": variation.get("name"),
            "product_id": product["id"],
            "variation_id": variation.get("id"),
        }],
        "total_amount": round(float(variation["price"]) * 1.05, 2),
    }

    resp = requests.post(f"{BASE_URL}/api/orders/create", json=payload, timeout=30)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    assert "phone" in resp.json().get("detail", "").lower()


def test_create_order_rejects_empty_email(real_product):
    product = real_product["product"]
    variation = real_product["variation"]

    payload = {
        "customer_name": "TEST NoEmail",
        "customer_email": "   ",
        "customer_phone": "9812345678",
        "items": [{
            "name": product["name"],
            "price": float(variation["price"]),
            "quantity": 1,
            "variation": variation.get("name"),
            "product_id": product["id"],
            "variation_id": variation.get("id"),
        }],
        "total_amount": round(float(variation["price"]) * 1.05, 2),
    }

    resp = requests.post(f"{BASE_URL}/api/orders/create", json=payload, timeout=30)
    assert resp.status_code == 400, f"Expected 400, got {resp.status_code}: {resp.text}"
    assert "email" in resp.json().get("detail", "").lower()
