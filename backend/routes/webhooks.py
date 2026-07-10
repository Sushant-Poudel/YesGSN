"""Webhook management routes - product webhooks, global webhooks, and message templates."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime, timezone
from database import db, DISCORD_ORDER_WEBHOOK
from dependencies import get_current_user
from discord_service import send_discord_test_notification
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# Default templates with placeholders
DEFAULT_TEMPLATES = {
    "new_order": {
        "title": "New Order #{order_number}",
        "content": "@here New order from **{customer_name}**\n\n**Items:**\n{items}\n\n**Total:** Rs {total_amount}\n**Payment:** {payment_method}",
        "description": "Sent when a new order is placed (to product-specific webhooks)"
    },
    "order_confirmed": {
        "title": "Order Confirmed - #{order_number}",
        "content": "Order #{order_number} has been confirmed!\n\n**Customer:** {customer_name}\n**Phone:** {customer_phone}\n**Email:** {customer_email}\n\n**Items:**\n{items}\n\n**Total:** Rs {total_amount}",
        "description": "Sent to global webhook when payment is confirmed"
    },
    "payment_screenshot": {
        "title": "Payment Screenshot - Order #{order_number}",
        "content": "Payment screenshot received for Order #{order_number}\n\n**Customer:** {customer_name}\n**Total:** Rs {total_amount}\n**Payment Method:** {payment_method}",
        "description": "Sent when customer uploads payment screenshot"
    },
    "status_update": {
        "title": "Order Status Updated - #{order_number}",
        "content": "Order #{order_number} status changed: **{old_status}** → **{new_status}**\n\n**Customer:** {customer_name}\n**Phone:** {customer_phone}\n**Total:** Rs {total_amount}",
        "description": "Sent when order status is changed"
    }
}

AVAILABLE_PLACEHOLDERS = [
    {"key": "{order_number}", "desc": "Order number"},
    {"key": "{customer_name}", "desc": "Customer's name"},
    {"key": "{customer_phone}", "desc": "Customer's phone"},
    {"key": "{customer_email}", "desc": "Customer's email"},
    {"key": "{total_amount}", "desc": "Order total (formatted)"},
    {"key": "{items}", "desc": "List of ordered items"},
    {"key": "{payment_method}", "desc": "Payment method used"},
    {"key": "{status}", "desc": "Current order status"},
    {"key": "{old_status}", "desc": "Previous status (status update only)"},
    {"key": "{new_status}", "desc": "New status (status update only)"},
]


class GlobalWebhookSettings(BaseModel):
    order_webhook: str = ""
    payment_webhook: str = ""
    complaint_webhook: str = ""


class TemplateUpdate(BaseModel):
    templates: Dict[str, dict]


# ==================== PRODUCT WEBHOOKS ====================

@router.get("/admin/webhooks/products")
async def get_product_webhooks(current_user: dict = Depends(get_current_user)):
    """Get all products that have Discord webhooks configured."""
    products = await db.products.find(
        {"discord_webhooks": {"$exists": True, "$ne": []}},
        {"_id": 0, "id": 1, "name": 1, "image_url": 1, "discord_webhooks": 1, "category_id": 1}
    ).to_list(500)
    return products


@router.put("/admin/webhooks/products/{product_id}")
async def update_product_webhooks(product_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update webhook URLs for a specific product."""
    webhooks = data.get("discord_webhooks", [])
    result = await db.products.update_one(
        {"id": product_id},
        {"$set": {"discord_webhooks": webhooks}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product webhooks updated"}


# ==================== GLOBAL WEBHOOKS ====================

@router.get("/admin/webhooks/global")
async def get_global_webhooks(current_user: dict = Depends(get_current_user)):
    """Get global webhook settings (order + payment screenshot)."""
    settings = await db.site_settings.find_one({"id": "webhook_settings"}, {"_id": 0})
    if not settings:
        settings = {
            "id": "webhook_settings",
            "order_webhook": DISCORD_ORDER_WEBHOOK or "",
            "payment_webhook": "",
            "complaint_webhook": ""
        }
    # Always include the env var as fallback info
    settings["env_order_webhook"] = DISCORD_ORDER_WEBHOOK or ""
    return settings


@router.put("/admin/webhooks/global")
async def update_global_webhooks(data: GlobalWebhookSettings, current_user: dict = Depends(get_current_user)):
    """Update global webhook URLs."""
    update = {
        "id": "webhook_settings",
        "order_webhook": data.order_webhook.strip(),
        "payment_webhook": data.payment_webhook.strip(),
        "complaint_webhook": data.complaint_webhook.strip(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.site_settings.update_one(
        {"id": "webhook_settings"},
        {"$set": update},
        upsert=True
    )
    return {"message": "Global webhooks updated"}


@router.post("/admin/webhooks/test")
async def test_webhook(data: dict, current_user: dict = Depends(get_current_user)):
    """Send a test notification to a webhook URL."""
    url = data.get("webhook_url", "").strip()
    if not url:
        raise HTTPException(status_code=400, detail="No webhook URL provided")
    result = await send_discord_test_notification(url)
    return result


# ==================== MESSAGE TEMPLATES ====================

@router.get("/admin/webhooks/templates")
async def get_webhook_templates(current_user: dict = Depends(get_current_user)):
    """Get editable webhook message templates."""
    settings = await db.site_settings.find_one({"id": "webhook_templates"}, {"_id": 0})
    templates = DEFAULT_TEMPLATES.copy()
    if settings and settings.get("templates"):
        for key, val in settings["templates"].items():
            if key in templates:
                templates[key]["title"] = val.get("title", templates[key]["title"])
                templates[key]["content"] = val.get("content", templates[key]["content"])
    return {
        "templates": templates,
        "placeholders": AVAILABLE_PLACEHOLDERS
    }


@router.put("/admin/webhooks/templates")
async def update_webhook_templates(data: TemplateUpdate, current_user: dict = Depends(get_current_user)):
    """Update webhook message templates."""
    await db.site_settings.update_one(
        {"id": "webhook_templates"},
        {"$set": {
            "id": "webhook_templates",
            "templates": data.templates,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Templates updated"}


@router.post("/admin/webhooks/templates/reset")
async def reset_webhook_templates(current_user: dict = Depends(get_current_user)):
    """Reset all templates to defaults."""
    await db.site_settings.delete_one({"id": "webhook_templates"})
    return {"message": "Templates reset to defaults", "templates": DEFAULT_TEMPLATES}
