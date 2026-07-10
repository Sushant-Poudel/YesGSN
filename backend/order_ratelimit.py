"""
In-memory rate limiter + IP blocklist for order creation.
"""
from datetime import datetime, timezone, timedelta
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

# In-memory store
_order_timestamps = defaultdict(list)
_blocked_ips = set()
_blocked_emails = set()

WINDOW_MINUTES = 10
MAX_ORDERS_PER_WINDOW = 3

def block_ip(ip: str):
    _blocked_ips.add(ip)
    logger.warning(f"IP BLOCKED: {ip}")

def unblock_ip(ip: str):
    _blocked_ips.discard(ip)
    logger.info(f"IP UNBLOCKED: {ip}")

def block_email(email: str):
    _blocked_emails.add(email.lower().strip())
    logger.warning(f"EMAIL BLOCKED: {email}")

def unblock_email(email: str):
    _blocked_emails.discard(email.lower().strip())

def get_blocked():
    return {"ips": list(_blocked_ips), "emails": list(_blocked_emails)}

def check_rate_limit(ip: str, email: str = "") -> tuple[bool, str]:
    if ip in _blocked_ips:
        return False, "Your IP has been blocked. Contact support if this is a mistake."
    if email and email.lower().strip() in _blocked_emails:
        return False, "This email has been blocked. Contact support if this is a mistake."
    
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=WINDOW_MINUTES)
    _order_timestamps[ip] = [t for t in _order_timestamps[ip] if t > cutoff]
    
    if len(_order_timestamps[ip]) >= MAX_ORDERS_PER_WINDOW:
        return False, f"Too many orders. Please wait {WINDOW_MINUTES} minutes before ordering again."
    
    return True, ""

def record_order(ip: str):
    _order_timestamps[ip].append(datetime.now(timezone.utc))
