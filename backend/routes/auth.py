"""Admin authentication and management routes."""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from datetime import datetime, timezone
from database import db, ADMIN_USERNAME, ADMIN_PASSWORD
from dependencies import (
    get_current_user, hash_password, create_token, create_audit_log, security
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


class UserCreate(BaseModel):
    email: str
    password: str
    name: str = "Admin"

class UserLogin(BaseModel):
    email: str
    password: str


@router.post("/auth/register")
async def register(user_data: UserCreate):
    raise HTTPException(status_code=403, detail="Registration disabled. Use admin credentials.")

@router.post("/auth/login")
async def login(credentials: UserLogin, request: Request):
    # Try new admin system first
    admin = await db.admins.find_one({"username": credentials.email})
    if admin:
        hashed_password = hash_password(credentials.password)
        if admin["password"] == hashed_password and admin.get("is_active"):
            await db.admins.update_one(
                {"id": admin["id"]},
                {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
            )
            client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
            await create_audit_log(
                action="LOGIN",
                actor_id=admin["id"],
                actor_name=admin.get("name", admin.get("username")),
                actor_role=admin.get("role", "admin"),
                details={"method": "password", "username": admin.get("username")},
                ip_address=client_ip
            )
            token = create_token(admin["id"])
            return {
                "token": token,
                "user": {
                    "id": admin["id"],
                    "username": admin.get("username"),
                    "email": admin.get("email"),
                    "name": admin.get("name"),
                    "role": admin.get("role"),
                    "permissions": admin.get("permissions", []),
                    "is_admin": True,
                    "is_main_admin": admin.get("role") == "main_admin" or admin.get("is_main_admin")
                }
            }

    # Fallback to old admin system
    if credentials.email == ADMIN_USERNAME and credentials.password == ADMIN_PASSWORD:
        main_admin_id = "admin_main"
        existing_main = await db.admins.find_one({"id": main_admin_id})
        if not existing_main:
            main_admin_doc = {
                "id": main_admin_id,
                "username": ADMIN_USERNAME,
                "email": f"{ADMIN_USERNAME}@gameshopnepal.com",
                "name": "Main Admin",
                "password": hash_password(ADMIN_PASSWORD),
                "role": "main_admin",
                "is_main_admin": True,
                "is_active": True,
                "permissions": ["all"],
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.admins.insert_one(main_admin_doc)
            logger.info("Main admin created in database")
        else:
            await db.admins.update_one(
                {"id": main_admin_id},
                {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
            )
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
        await create_audit_log(
            action="LOGIN",
            actor_id=main_admin_id,
            actor_name="Main Admin",
            actor_role="main_admin",
            details={"method": "password", "username": ADMIN_USERNAME},
            ip_address=client_ip
        )
        token = create_token(main_admin_id)
        return {
            "token": token,
            "user": {
                "id": main_admin_id,
                "email": ADMIN_USERNAME,
                "name": "Main Admin",
                "is_admin": True,
                "is_main_admin": True,
                "permissions": ["all"]
            }
        }
    raise HTTPException(status_code=401, detail="Invalid credentials")

@router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user


# ==================== ADMIN MANAGEMENT ====================

@router.get("/admins")
async def get_all_admins(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_main_admin"):
        raise HTTPException(status_code=403, detail="Only main admin can view all admins")
    admins = await db.admins.find({}, {"password": 0}).sort("created_at", -1).to_list(100)
    result = []
    for admin in admins:
        admin_data = {k: v for k, v in admin.items() if k != "_id"}
        if "id" not in admin_data and "_id" in admin:
            admin_data["id"] = str(admin["_id"])
        result.append(admin_data)
    return result

@router.post("/admins")
async def create_admin(admin_data: dict, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_main_admin"):
        raise HTTPException(status_code=403, detail="Only main admin can create staff admins")
    existing = await db.admins.find_one({"username": admin_data["username"]})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    admin_id = f"admin_{admin_data['username']}"
    new_admin = {
        "id": admin_id,
        "username": admin_data["username"],
        "password": hash_password(admin_data["password"]),
        "email": admin_data.get("email", ""),
        "name": admin_data.get("name", admin_data["username"]),
        "role": "staff",
        "is_active": True,
        "permissions": admin_data.get("permissions", ["view_dashboard", "view_orders"]),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user["id"]
    }
    await db.admins.insert_one(new_admin)
    return {
        "message": "Staff admin created successfully",
        "admin": {
            "id": admin_id, "username": new_admin["username"], "email": new_admin["email"],
            "name": new_admin["name"], "role": new_admin["role"],
            "is_active": new_admin["is_active"], "permissions": new_admin["permissions"]
        }
    }

@router.put("/admins/{admin_id}")
async def update_admin(admin_id: str, admin_data: dict, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_main_admin"):
        raise HTTPException(status_code=403, detail="Only main admin can update admins")
    logger.info(f"Updating admin with id: {admin_id}")
    existing = await db.admins.find_one({"id": admin_id})
    if not existing:
        existing = await db.admins.find_one({"_id": admin_id})
        if existing:
            await db.admins.update_one({"_id": admin_id}, {"$set": {"id": admin_id}})
            logger.info(f"Migrated admin {admin_id} to use id field")
    if not existing:
        logger.error(f"Admin not found: {admin_id}")
        raise HTTPException(status_code=404, detail="Admin not found")
    update_data = {}
    if "permissions" in admin_data:
        update_data["permissions"] = admin_data["permissions"]
    if "is_active" in admin_data:
        update_data["is_active"] = admin_data["is_active"]
    if "name" in admin_data:
        update_data["name"] = admin_data["name"]
    if "email" in admin_data:
        update_data["email"] = admin_data["email"]
    if "password" in admin_data and admin_data["password"]:
        update_data["password"] = hash_password(admin_data["password"])
    if existing.get("id"):
        await db.admins.update_one({"id": admin_id}, {"$set": update_data})
    else:
        await db.admins.update_one({"_id": admin_id}, {"$set": update_data})
    return {"message": "Admin updated successfully"}

@router.delete("/admins/{admin_id}")
async def delete_admin(admin_id: str, current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_main_admin"):
        raise HTTPException(status_code=403, detail="Only main admin can delete admins")
    if admin_id == "admin_main" or admin_id == "admin-fixed":
        raise HTTPException(status_code=400, detail="Cannot delete main admin")
    result = await db.admins.delete_one({"id": admin_id})
    if result.deleted_count == 0:
        result = await db.admins.delete_one({"_id": admin_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Admin not found")
    return {"message": "Admin deleted successfully"}

@router.get("/permissions")
async def get_permissions(current_user: dict = Depends(get_current_user)):
    if not current_user.get("is_main_admin"):
        raise HTTPException(status_code=403, detail="Only main admin can view permissions")
    permissions = await db.permissions.find({}, {"_id": 0}).to_list(100)
    if not permissions:
        default_permissions = [
            {"id": "view_dashboard", "name": "View Dashboard", "category": "Dashboard"},
            {"id": "view_orders", "name": "View Orders", "category": "Orders"},
            {"id": "manage_orders", "name": "Manage Orders (Update Status)", "category": "Orders"},
            {"id": "view_products", "name": "View Products", "category": "Products"},
            {"id": "manage_products", "name": "Add/Edit/Delete Products", "category": "Products"},
            {"id": "view_categories", "name": "View Categories", "category": "Categories"},
            {"id": "manage_categories", "name": "Add/Edit/Delete Categories", "category": "Categories"},
            {"id": "view_reviews", "name": "View Reviews", "category": "Reviews"},
            {"id": "manage_reviews", "name": "Add/Edit/Delete Reviews", "category": "Reviews"},
            {"id": "view_customers", "name": "View Customers", "category": "Customers"},
            {"id": "manage_customers", "name": "Manage Customers", "category": "Customers"},
            {"id": "manage_blog", "name": "Manage Blog Posts", "category": "Content"},
            {"id": "manage_faqs", "name": "Manage FAQs", "category": "Content"},
            {"id": "manage_pages", "name": "Manage Static Pages", "category": "Content"},
            {"id": "manage_payment_methods", "name": "Manage Payment Methods", "category": "Settings"},
            {"id": "manage_promo_codes", "name": "Manage Promo Codes", "category": "Settings"},
            {"id": "manage_social_links", "name": "Manage Social Links", "category": "Settings"},
            {"id": "manage_notification_bar", "name": "Manage Notification Bar", "category": "Settings"},
            {"id": "view_analytics", "name": "View Analytics", "category": "Analytics"},
        ]
        for perm in default_permissions:
            await db.permissions.update_one({"id": perm["id"]}, {"$set": perm}, upsert=True)
        logger.info("Default permissions seeded")
        permissions = default_permissions
    return permissions


@router.post("/permissions/bulk-seed")
async def bulk_seed_permissions(current_user: dict = Depends(get_current_user)):
    """One-time endpoint to seed missing permissions"""
    if not current_user.get("is_main_admin"):
        raise HTTPException(status_code=403, detail="Main admin only")
    new_perms = [
        {"id": "view_complaints",   "name": "View Complaints",                    "category": "Complaints"},
        {"id": "manage_complaints", "name": "Manage Complaints (Resolve/Dismiss)", "category": "Complaints"},
        {"id": "manage_settings",   "name": "Manage Settings",                    "category": "Settings"},
        {"id": "manage_ads",        "name": "Manage Advertisements",              "category": "Settings"},
        {"id": "view_blog",         "name": "View Blog Posts",                    "category": "Content"},
        {"id": "view_pages",        "name": "View Pages",                         "category": "Content"},
        {"id": "view_faqs",         "name": "View FAQs",                          "category": "Content"},
        {"id": "view_settings",     "name": "View Settings",                      "category": "Settings"},
        {"id": "delete_orders",     "name": "Delete Orders",                      "category": "Orders"},
        {"id": "manage_newsletter", "name": "Manage Newsletter",                  "category": "Marketing"},
        {"id": "manage_referral",   "name": "Manage Referral Program",            "category": "Marketing"},
        {"id": "manage_rewards",    "name": "Manage Daily Rewards",               "category": "Marketing"},
        {"id": "manage_multiplier", "name": "Manage Multiplier Events",           "category": "Marketing"},
        {"id": "manage_admins",     "name": "Manage Staff Members",               "category": "Admin"},
        {"id": "view_audit_logs",   "name": "View Audit Logs",                    "category": "Admin"},
    ]
    added = 0
    for perm in new_perms:
        existing = await db.permissions.find_one({"id": perm["id"]})
        if not existing:
            await db.permissions.insert_one(perm)
            added += 1
    total = await db.permissions.count_documents({})
    return {"added": added, "total": total}
