from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from datetime import datetime, timezone, timedelta
from database import db, JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS, ADMIN_USERNAME
import jwt
import hashlib
import uuid
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def create_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")

        if not user_id:
            logger.error(f"No user_id in token payload: {payload}")
            raise HTTPException(status_code=401, detail="Invalid token: no user_id")

        admin = await db.admins.find_one({"id": user_id})
        if admin and admin.get("is_active"):
            return {
                "id": admin.get("id"),
                "username": admin.get("username"),
                "email": admin.get("email"),
                "name": admin.get("name"),
                "role": admin.get("role"),
                "permissions": admin.get("permissions", []),
                "is_admin": True,
                "is_main_admin": admin.get("role") == "main_admin" or admin.get("is_main_admin")
            }

        if user_id == "admin-fixed" or user_id == "admin_main":
            return {
                "id": user_id,
                "email": ADMIN_USERNAME,
                "name": "Main Admin",
                "is_admin": True,
                "is_main_admin": True,
                "permissions": ["all"]
            }

        logger.error(f"User not found for user_id: {user_id}")
        raise HTTPException(status_code=401, detail="Invalid user")
    except jwt.ExpiredSignatureError:
        logger.error("Token expired")
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.error(f"Invalid token: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid token")


async def get_current_customer(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current logged-in customer"""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")

        customer = await db.customers.find_one({"id": user_id}, {"_id": 0})
        if customer:
            return customer

        customer_id = payload.get("customer_id")
        if customer_id:
            customer = await db.customers.find_one({"id": customer_id}, {"_id": 0})
            if customer:
                return customer

        raise HTTPException(status_code=401, detail="Invalid customer token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def check_permission(user: dict, required_permission: str) -> bool:
    """Check if user has required permission"""
    if user.get("permissions") and "all" in user["permissions"]:
        return True
    return required_permission in user.get("permissions", [])


async def create_audit_log(
    action: str,
    actor_id: str,
    actor_name: str,
    actor_role: str = "admin",
    resource_type: str = None,
    resource_id: str = None,
    resource_name: str = None,
    details: dict = None,
    ip_address: str = None
):
    try:
        log_entry = {
            "id": str(uuid.uuid4()),
            "action": action,
            "actor": {
                "id": actor_id,
                "name": actor_name,
                "role": actor_role
            },
            "resource_type": resource_type,
            "resource_id": resource_id,
            "resource_name": resource_name,
            "details": details or {},
            "ip_address": ip_address,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        await db.audit_logs.insert_one(log_entry)
        logger.info(f"Audit log: {action} by {actor_name} on {resource_type or 'system'}")
    except Exception as e:
        logger.error(f"Failed to create audit log: {e}")
