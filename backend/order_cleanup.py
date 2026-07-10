"""
Background task to auto-delete pending orders after 30 minutes
"""
import asyncio
import logging
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv(override=False)
logger = logging.getLogger(__name__)

async def cleanup_old_pending_orders():
    """Delete pending orders older than 30 minutes"""
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client[os.environ['DB_NAME']]

    try:
        # Calculate cutoff time (30 minutes ago)
        cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=30)
        cutoff_time_str = cutoff_time.isoformat()

        # Orders are stored with status "Pending" (capital P) in routes/orders.py,
        # but historically some may be lowercase. Match both.
        query = {
            "status": {"$in": ["Pending", "pending"]},
            "created_at": {"$lt": cutoff_time_str},
        }

        # Log how many will be affected before deletion (helps diagnose in prod)
        to_delete = await db.orders.count_documents(query)
        if to_delete > 0:
            logger.info(
                f"🧹 Order cleanup: found {to_delete} pending orders older than 30 min (cutoff={cutoff_time_str})"
            )

        result = await db.orders.delete_many(query)

        if result.deleted_count > 0:
            logger.info(
                f"🗑️ Auto-deleted {result.deleted_count} pending orders older than 30 minutes"
            )
    finally:
        client.close()

async def run_cleanup_task():
    """Run cleanup task every 5 minutes"""
    logger.info("✅ Order cleanup background task started (interval=5min, ttl=30min)")
    while True:
        try:
            await cleanup_old_pending_orders()
        except Exception as e:
            logger.error(f"Error in cleanup task: {e}")

        # Wait 5 minutes before next check
        await asyncio.sleep(300)  # 5 minutes
