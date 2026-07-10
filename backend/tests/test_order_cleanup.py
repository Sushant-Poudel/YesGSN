"""Tests for pending order cleanup background task (bug fix: status case mismatch)."""
import os
import sys
import asyncio
import uuid
from datetime import datetime, timezone, timedelta

import pytest
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Ensure backend is importable
sys.path.insert(0, "/app/backend")
load_dotenv("/app/backend/.env", override=False)

from order_cleanup import cleanup_old_pending_orders  # noqa: E402


MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

TEST_IDS = {
    "old_pending_capital": f"TEST_cleanup_{uuid.uuid4()}",
    "old_pending_lower": f"TEST_cleanup_{uuid.uuid4()}",
    "fresh_pending": f"TEST_cleanup_{uuid.uuid4()}",
    "old_completed": f"TEST_cleanup_{uuid.uuid4()}",
    "old_confirmed": f"TEST_cleanup_{uuid.uuid4()}",
    "old_cancelled": f"TEST_cleanup_{uuid.uuid4()}",
}


def _make_order(order_id, status, minutes_ago):
    ts = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    return {
        "id": order_id,
        "status": status,
        "customer_name": "TEST_user",
        "customer_email": "test_cleanup@example.com",
        "customer_phone": "9779999999999",
        "items": [],
        "total_amount": 0,
        "created_at": ts.isoformat(),
    }


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


@pytest.fixture(scope="module", autouse=True)
def seed_and_cleanup(db, event_loop):
    async def _seed():
        # Insert seed docs
        await db.orders.insert_many([
            _make_order(TEST_IDS["old_pending_capital"], "Pending", 31),
            _make_order(TEST_IDS["old_pending_lower"], "pending", 31),
            _make_order(TEST_IDS["fresh_pending"], "Pending", 1),
            _make_order(TEST_IDS["old_completed"], "Completed", 120),
            _make_order(TEST_IDS["old_confirmed"], "Confirmed", 120),
            _make_order(TEST_IDS["old_cancelled"], "cancelled", 120),
        ])

    async def _teardown():
        await db.orders.delete_many({"id": {"$in": list(TEST_IDS.values())}})

    event_loop.run_until_complete(_seed())
    yield
    event_loop.run_until_complete(_teardown())


def test_cleanup_deletes_old_pending_orders(db, event_loop):
    """Runs cleanup_old_pending_orders and validates deletion behaviour."""
    async def _run():
        # Sanity: all seeds exist
        before = await db.orders.count_documents({"id": {"$in": list(TEST_IDS.values())}})
        assert before == 6, f"Expected 6 seed orders, found {before}"

        # Run cleanup
        await cleanup_old_pending_orders()

        # Old pending (both cases) should be gone
        assert await db.orders.find_one({"id": TEST_IDS["old_pending_capital"]}) is None
        assert await db.orders.find_one({"id": TEST_IDS["old_pending_lower"]}) is None

        # Fresh pending must remain
        fresh = await db.orders.find_one({"id": TEST_IDS["fresh_pending"]})
        assert fresh is not None
        assert fresh["status"] == "Pending"

        # Non-pending old orders must remain (regression)
        for key in ("old_completed", "old_confirmed", "old_cancelled"):
            doc = await db.orders.find_one({"id": TEST_IDS[key]})
            assert doc is not None, f"{key} was deleted but should be preserved"

    event_loop.run_until_complete(_run())


def test_cleanup_is_idempotent(db, event_loop):
    """A second run should not error and not delete non-pending old orders."""
    async def _run():
        await cleanup_old_pending_orders()
        # Fresh pending still there
        assert await db.orders.find_one({"id": TEST_IDS["fresh_pending"]}) is not None
        # Non-pending still there
        assert await db.orders.find_one({"id": TEST_IDS["old_completed"]}) is not None

    event_loop.run_until_complete(_run())
