"""Shared utility functions used across multiple route modules."""
import re
import string
import random
from datetime import datetime, timezone


def generate_slug(name: str) -> str:
    """Generate a URL-friendly slug from product name"""
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9]+', '-', slug)
    slug = slug.strip('-')
    slug = re.sub(r'-+', '-', slug)
    return slug


def generate_otp() -> str:
    """Generate a 6-digit OTP"""
    import secrets
    return str(secrets.randbelow(900000) + 100000)


def generate_referral_code(length=8):
    """Generate a unique referral code"""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))


def get_nepal_date():
    """Get current date in Nepal timezone (UTC+5:45)"""
    from datetime import timedelta
    nepal_offset = timedelta(hours=5, minutes=45)
    nepal_time = datetime.now(timezone.utc) + nepal_offset
    return nepal_time.date().isoformat()


def get_nepal_datetime():
    """Get current datetime in Nepal timezone (UTC+5:45)"""
    from datetime import timedelta
    nepal_offset = timedelta(hours=5, minutes=45)
    return datetime.now(timezone.utc) + nepal_offset
