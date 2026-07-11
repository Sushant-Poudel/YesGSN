"""Cron-triggered endpoints for platforms without persistent background workers (Vercel).

The droplet deployment runs order_cleanup.run_cleanup_task() and
daily_summary_service.run_daily_summary_scheduler() as infinite asyncio
loops from server.py's startup event — unaffected by this file.

On Vercel, nothing keeps running between requests, so these single-run
endpoints exist for Vercel Cron (see vercel.json) to call instead.
"""
import os
import logging
from fastapi import APIRouter, Header, HTTPException

from database import db
from order_cleanup import cleanup_old_pending_orders
from daily_summary_service import send_daily_summary

logger = logging.getLogger(__name__)
router = APIRouter()


def _verify_cron_secret(authorization: str | None):
    secret = os.environ.get("CRON_SECRET", "")
    if not secret:
        # No secret configured - refuse rather than run unauthenticated on a public URL.
        raise HTTPException(status_code=503, detail="CRON_SECRET not configured")
    if authorization != f"Bearer {secret}":
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/cron/cleanup-orders")
async def cron_cleanup_orders(authorization: str | None = Header(default=None)):
    """Delete pending orders older than 30 minutes. Call via Vercel Cron."""
    _verify_cron_secret(authorization)
    before = await db.orders.count_documents({"status": {"$in": ["Pending", "pending"]}})
    await cleanup_old_pending_orders()
    after = await db.orders.count_documents({"status": {"$in": ["Pending", "pending"]}})
    return {"pending_before": before, "pending_after": after, "deleted": before - after}


@router.get("/cron/daily-summary")
async def cron_daily_summary(authorization: str | None = Header(default=None)):
    """Send the daily sales summary email. Call via Vercel Cron."""
    _verify_cron_secret(authorization)
    recipient = os.environ.get("DAILY_SUMMARY_EMAIL", "")
    if not recipient:
        return {"sent": False, "reason": "DAILY_SUMMARY_EMAIL not configured"}
    ok = await send_daily_summary(db, recipient)
    return {"sent": bool(ok), "recipient": recipient}
