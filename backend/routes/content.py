"""Blog, pages, social links, site settings, notification bar, webhook settings, and payment methods routes."""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
from database import db, DISCORD_ORDER_WEBHOOK
from dependencies import get_current_user
from discord_service import send_discord_test_notification
import uuid
import logging
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== MODELS ====================

class SocialLinkCreate(BaseModel):
    platform: str
    url: str
    icon: Optional[str] = None

class SocialLink(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    platform: str
    url: str
    icon: Optional[str] = None

class PageContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    page_key: str
    title: str
    content: str
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


# ==================== PAGE ROUTES ====================

@router.get("/pages/{page_key}")
async def get_page(page_key: str):
    page = await db.pages.find_one({"page_key": page_key}, {"_id": 0})
    if not page:
        defaults = {
            "about": {"title": "About Us", "content": "<p>Welcome to GameShop Nepal - Your trusted source for digital products since 2021.</p>"},
            "terms": {"title": "Terms and Conditions", "content": "<p>Terms and conditions content here.</p>"},
            "faq": {"title": "FAQ", "content": ""}
        }
        return {"page_key": page_key, **defaults.get(page_key, {"title": page_key.title(), "content": ""})}
    return page

class PageUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None

@router.put("/pages/{page_key}")
async def update_page(page_key: str, data: PageUpdate, current_user: dict = Depends(get_current_user)):
    page_data = {
        "page_key": page_key,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if data.title is not None:
        page_data["title"] = data.title
    if data.content is not None:
        page_data["content"] = data.content
    await db.pages.update_one({"page_key": page_key}, {"$set": page_data}, upsert=True)
    return page_data

# ==================== SOCIAL LINK ROUTES ====================

@router.get("/social-links")
async def get_social_links():
    """Get all social links as an array"""
    links = await db.social_links.find({}, {"_id": 0}).to_list(100)
    return links

@router.post("/social-links", response_model=SocialLink)
async def create_social_link(link_data: SocialLinkCreate, current_user: dict = Depends(get_current_user)):
    link = SocialLink(**link_data.model_dump())
    await db.social_links.insert_one(link.model_dump())
    return link

@router.put("/social-links/{link_id}", response_model=SocialLink)
async def update_social_link(link_id: str, link_data: SocialLinkCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.social_links.find_one({"id": link_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Social link not found")

    await db.social_links.update_one({"id": link_id}, {"$set": link_data.model_dump()})
    updated = await db.social_links.find_one({"id": link_id}, {"_id": 0})
    return updated

@router.delete("/social-links/{link_id}")
async def delete_social_link(link_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.social_links.delete_one({"id": link_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Social link not found")
    return {"message": "Social link deleted"}

# ==================== CLEAR DATA ====================

@router.post("/clear-products")
async def clear_products(current_user: dict = Depends(get_current_user)):
    await db.products.delete_many({})
    await db.categories.delete_many({})
    return {"message": "All products and categories cleared"}

# ==================== SEED DATA ====================

@router.post("/seed")
async def seed_data(current_user: dict = Depends(get_current_user)):
    social_data = [
        {"id": "fb", "platform": "Facebook", "url": "https://facebook.com/gameshopnepal", "icon": "facebook"},
        {"id": "ig", "platform": "Instagram", "url": "https://instagram.com/gameshopnepal", "icon": "instagram"},
        {"id": "tt", "platform": "TikTok", "url": "https://tiktok.com/@gameshopnepal", "icon": "tiktok"},
        {"id": "wa", "platform": "WhatsApp", "url": "https://wa.me/9779743488871", "icon": "whatsapp"},
    ]

    for link in social_data:
        await db.social_links.update_one({"id": link["id"]}, {"$set": link}, upsert=True)

    reviews_data = [
        {"id": "rev1", "reviewer_name": "Sujan Thapa", "rating": 5, "comment": "Fast delivery and genuine products. Got my Netflix subscription within minutes!", "review_date": "2025-01-10T10:00:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "rev2", "reviewer_name": "Anisha Sharma", "rating": 5, "comment": "Best prices in Nepal for digital products. Highly recommended!", "review_date": "2025-01-08T14:30:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "rev3", "reviewer_name": "Rohan KC", "rating": 5, "comment": "Bought PUBG UC, instant delivery. Will buy again!", "review_date": "2025-01-05T09:15:00Z", "created_at": datetime.now(timezone.utc).isoformat()},
    ]

    for rev in reviews_data:
        await db.reviews.update_one({"id": rev["id"]}, {"$set": rev}, upsert=True)

    default_faqs = [
        {"id": "faq1", "question": "How do I place an order?", "answer": "Simply browse our products, select the plan you want, and click 'Order Now'. This will redirect you to WhatsApp where you can complete your order.", "sort_order": 0},
        {"id": "faq2", "question": "How long does delivery take?", "answer": "Most products are delivered instantly within minutes after payment confirmation.", "sort_order": 1},
        {"id": "faq3", "question": "What payment methods do you accept?", "answer": "We accept eSewa, Khalti, bank transfer, and other local payment methods.", "sort_order": 2},
        {"id": "faq4", "question": "Are your products genuine?", "answer": "Yes! All our products are 100% genuine and sourced directly from authorized channels.", "sort_order": 3},
    ]

    for faq in default_faqs:
        await db.faqs.update_one({"id": faq["id"]}, {"$set": faq}, upsert=True)

    return {"message": "Data seeded successfully"}


# ==================== PAYMENT METHODS ====================

class PaymentMethod(BaseModel):
    id: Optional[str] = None
    name: str
    image_url: str  # Logo/icon
    qr_code_url: Optional[str] = None  # Legacy single QR code (kept for backwards compatibility)
    qr_codes: Optional[List[dict]] = []  # Multiple QR codes: [{"url": "...", "label": "QR 1"}, ...]
    merchant_name: Optional[str] = None
    phone_number: Optional[str] = None
    instructions: Optional[str] = None  # Payment instructions text
    is_active: bool = True
    sort_order: int = 0

@router.get("/payment-methods")
async def get_payment_methods():
    # Check both 'enabled' and 'is_active' for backwards compatibility
    methods = await db.payment_methods.find({
        "$or": [{"enabled": True}, {"is_active": True}]
    }).sort([("sort_order", 1), ("display_order", 1)]).to_list(100)
    for m in methods:
        m.pop("_id", None)
    return methods

@router.get("/payment-methods/all")
async def get_all_payment_methods(current_user: dict = Depends(get_current_user)):
    methods = await db.payment_methods.find().sort("sort_order", 1).to_list(100)
    for m in methods:
        m.pop("_id", None)
    return methods

@router.get("/payment-methods/{method_id}")
async def get_payment_method(method_id: str):
    method = await db.payment_methods.find_one({"id": method_id}, {"_id": 0})
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    return method

@router.post("/payment-methods")
async def create_payment_method(method: PaymentMethod, current_user: dict = Depends(get_current_user)):
    method_dict = method.model_dump()
    method_dict["id"] = str(uuid.uuid4())
    await db.payment_methods.insert_one(method_dict)
    method_dict.pop("_id", None)
    return method_dict

@router.put("/payment-methods/{method_id}")
async def update_payment_method(method_id: str, method: PaymentMethod, current_user: dict = Depends(get_current_user)):
    method_dict = method.model_dump()
    method_dict["id"] = method_id
    await db.payment_methods.update_one({"id": method_id}, {"$set": method_dict})
    return method_dict

@router.delete("/payment-methods/{method_id}")
async def delete_payment_method(method_id: str, current_user: dict = Depends(get_current_user)):
    await db.payment_methods.delete_one({"id": method_id})
    return {"message": "Payment method deleted"}


# ==================== DISCORD WEBHOOK TEST ====================

class WebhookTestRequest(BaseModel):
    webhook_url: str

@router.post("/discord/test-webhook")
async def test_discord_webhook(request: WebhookTestRequest, current_user: dict = Depends(get_current_user)):
    """Test a Discord webhook to verify it's working"""
    result = await send_discord_test_notification(request.webhook_url)
    return result



# ==================== NOTIFICATION BAR ====================

class NotificationBar(BaseModel):
    id: Optional[str] = None
    text: str
    link: Optional[str] = None
    is_active: bool = True
    bg_color: Optional[str] = "#F5A623"
    text_color: Optional[str] = "#000000"

@router.get("/notification-bar")
async def get_notification_bar():
    notification = await db.notification_bar.find_one({"is_active": True})
    if notification:
        notification.pop("_id", None)
        return notification
    return {"is_active": False, "message": "", "type": "info"}

@router.put("/notification-bar")
async def update_notification_bar(notification: NotificationBar, current_user: dict = Depends(get_current_user)):
    notification_dict = notification.model_dump()
    notification_dict["id"] = "main"
    await db.notification_bar.update_one({"id": "main"}, {"$set": notification_dict}, upsert=True)
    return notification_dict

# ==================== BLOG POSTS ====================

class BlogPost(BaseModel):
    id: Optional[str] = None
    title: str
    slug: Optional[str] = None
    excerpt: str
    content: str
    image_url: Optional[str] = None
    cta_url: Optional[str] = None
    cta_text: Optional[str] = "Order Now"
    is_published: bool = True
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@router.get("/blog")
async def get_blog_posts():
    posts = await db.blog_posts.find({"is_published": True}).sort("created_at", -1).to_list(100)
    for p in posts:
        p.pop("_id", None)
    return posts

@router.get("/blog/all/admin")
async def get_all_blog_posts(current_user: dict = Depends(get_current_user)):
    posts = await db.blog_posts.find().sort("created_at", -1).to_list(100)
    for p in posts:
        p.pop("_id", None)
    return posts

@router.get("/blog/{slug}")
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "is_published": True})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    post.pop("_id", None)
    return post

@router.post("/blog")
async def create_blog_post(post: BlogPost, current_user: dict = Depends(get_current_user)):
    post_dict = post.model_dump()
    post_dict["id"] = str(uuid.uuid4())
    post_dict["slug"] = post_dict["slug"] or post_dict["title"].lower().replace(" ", "-").replace("?", "").replace("!", "")
    post_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    post_dict["updated_at"] = post_dict["created_at"]
    await db.blog_posts.insert_one(post_dict)
    post_dict.pop("_id", None)
    return post_dict

@router.put("/blog/{post_id}")
async def update_blog_post(post_id: str, post: BlogPost, current_user: dict = Depends(get_current_user)):
    post_dict = post.model_dump()
    post_dict["id"] = post_id
    post_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.blog_posts.update_one({"id": post_id}, {"$set": post_dict})
    return post_dict

@router.delete("/blog/{post_id}")
async def delete_blog_post(post_id: str, current_user: dict = Depends(get_current_user)):
    await db.blog_posts.delete_one({"id": post_id})
    return {"message": "Blog post deleted"}

# ==================== SITE SETTINGS ====================

@router.get("/settings")
async def get_site_settings():
    settings = await db.site_settings.find_one({"id": "main"})
    if not settings:
        settings = {
            "id": "main", 
            "notification_bar_enabled": True, 
            "chat_enabled": True,
            "service_charge": 0,
            "tax_percentage": 0,
            "tax_label": "Tax"
        }
    settings.pop("_id", None)
    return settings

class SiteSettingsUpdate(BaseModel):
    """Editable site settings. All fields optional so PATCH-style updates work.
    tax_percentage and service_charge must be non-negative numbers when provided."""
    model_config = ConfigDict(extra="allow")  # Allow forward-compatible fields
    notification_bar_enabled: Optional[bool] = None
    notification_bar_message: Optional[str] = None
    chat_enabled: Optional[bool] = None
    service_charge: Optional[float] = Field(default=None, ge=0)
    tax_percentage: Optional[float] = Field(default=None, ge=0, le=100)
    tax_label: Optional[str] = None

@router.put("/settings")
async def update_site_settings(settings: SiteSettingsUpdate, current_user: dict = Depends(get_current_user)):
    payload = settings.model_dump(exclude_none=True)
    payload["id"] = "main"
    await db.site_settings.update_one({"id": "main"}, {"$set": payload}, upsert=True)
    stored = await db.site_settings.find_one({"id": "main"})
    stored.pop("_id", None)
    return stored

# ==================== SMTP / EMAIL SETTINGS ====================

@router.get("/settings/smtp")
async def get_smtp_settings(current_user: dict = Depends(get_current_user)):
    """Get SMTP config from DB (passwords masked)."""
    import os
    doc = await db.site_settings.find_one({"id": "smtp_config"}, {"_id": 0})
    if doc and doc.get("smtp_user"):
        return {
            "smtp_host": doc.get("smtp_host", ""),
            "smtp_port": doc.get("smtp_port", 587),
            "smtp_user": doc.get("smtp_user", ""),
            "smtp_password": "••••••••" if doc.get("smtp_password") else "",
            "smtp_from_email": doc.get("smtp_from_email", ""),
            "smtp_from_name": doc.get("smtp_from_name", ""),
            "source": "database",
        }
    # Fallback: show .env file values (not K8s env vars)
    from dotenv import dotenv_values
    _fc = dotenv_values(Path(__file__).parent.parent / '.env')
    return {
        "smtp_host": _fc.get("SMTP_HOST", ""),
        "smtp_port": int(_fc.get("SMTP_PORT", "587")),
        "smtp_user": _fc.get("SMTP_USER", ""),
        "smtp_password": "••••••••" if _fc.get("SMTP_PASSWORD") else "",
        "smtp_from_email": _fc.get("SMTP_FROM_EMAIL", ""),
        "smtp_from_name": _fc.get("SMTP_FROM_NAME", ""),
        "source": "env_file",
    }

@router.put("/settings/smtp")
async def update_smtp_settings(data: dict, current_user: dict = Depends(get_current_user)):
    """Save SMTP config to DB so it overrides env vars everywhere."""
    doc = {
        "id": "smtp_config",
        "smtp_host": data.get("smtp_host", "smtp.gmail.com"),
        "smtp_port": int(data.get("smtp_port", 587)),
        "smtp_user": data.get("smtp_user", ""),
        "smtp_from_email": data.get("smtp_from_email", ""),
        "smtp_from_name": data.get("smtp_from_name", "GameShop Nepal"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    # Only update password if a real value was provided (not masked)
    if data.get("smtp_password") and data["smtp_password"] != "••••••••":
        doc["smtp_password"] = data["smtp_password"]
    else:
        # Keep existing password
        existing = await db.site_settings.find_one({"id": "smtp_config"})
        if existing:
            doc["smtp_password"] = existing.get("smtp_password", "")
        else:
            from dotenv import dotenv_values
            _fc = dotenv_values(Path(__file__).parent.parent / '.env')
            doc["smtp_password"] = _fc.get("SMTP_PASSWORD", "")
    await db.site_settings.update_one({"id": "smtp_config"}, {"$set": doc}, upsert=True)
    return {"message": "SMTP settings saved", "from_email": doc["smtp_from_email"]}

@router.post("/settings/smtp/test")
async def test_smtp(data: dict, current_user: dict = Depends(get_current_user)):
    """Send a test email to verify SMTP config."""
    to_email = data.get("to_email", "")
    if not to_email:
        raise HTTPException(status_code=400, detail="to_email is required")
    from email_service import send_email
    result = send_email(to_email, "Test Email - GameShop Nepal", "<h2>SMTP is working!</h2><p>This is a test email from GameShop Nepal.</p>", "SMTP is working! This is a test email from GameShop Nepal.")
    if result:
        return {"message": f"Test email sent to {to_email}"}
    raise HTTPException(status_code=500, detail="Failed to send test email. Check SMTP credentials.")


# ==================== WEBHOOK SETTINGS ====================

@router.get("/webhooks/settings")
async def get_webhook_settings(current_user: dict = Depends(get_current_user)):
    """Get webhook settings"""
    # Get global order webhook from env
    settings = {
        "discord_order_webhook": DISCORD_ORDER_WEBHOOK or "",
        "discord_order_webhook_active": bool(DISCORD_ORDER_WEBHOOK)
    }
    return settings

@router.get("/webhooks/products")
async def get_products_with_webhooks(current_user: dict = Depends(get_current_user)):
    """Get all products that have Discord webhooks configured"""
    products = await db.products.find(
        {"discord_webhooks": {"$exists": True, "$ne": []}},
        {"_id": 0, "id": 1, "name": 1, "discord_webhooks": 1}
    ).to_list(100)
    return products

@router.post("/webhooks/test")
async def test_webhook(data: dict, current_user: dict = Depends(get_current_user)):
    """Test a webhook by sending a test message"""
    webhook_url = data.get("webhook_url", "")
    if not webhook_url or "discord.com/api/webhooks" not in webhook_url:
        raise HTTPException(status_code=400, detail="Invalid Discord webhook URL")
    
    result = await send_discord_test_notification(webhook_url)
    return result



@router.get("/settings/payment-redirect")
async def get_payment_redirect_settings():
    """Get payment redirect channel config — public"""
    doc = await db.site_settings.find_one({"id": "payment_redirect"}, {"_id": 0})
    if not doc:
        return {
            "id": "payment_redirect",
            "active_channel": "whatsapp",
            "channels": {
                "whatsapp":  {"enabled": True,  "label": "WhatsApp",      "number":   "9779743488871"},
                "messenger": {"enabled": False, "label": "Messenger",     "username": "gameshopnepal"},
                "instagram": {"enabled": False, "label": "Instagram DM",  "username": "gameshopnepal.co"}
            }
        }
    doc.pop("_id", None)
    return doc

@router.put("/settings/payment-redirect")
async def update_payment_redirect_settings(data: dict, current_user: dict = Depends(get_current_user)):
    """Update payment redirect channel config — admin only"""
    data["id"] = "payment_redirect"
    await db.site_settings.update_one({"id": "payment_redirect"}, {"$set": data}, upsert=True)
    return data


@router.get("/settings/floating-button")
async def get_floating_button():
    """Get floating button config — public"""
    doc = await db.site_settings.find_one({"id": "floating_button"}, {"_id": 0})
    if not doc:
        return {
            "id": "floating_button",
            "enabled": True,
            "url": "https://wa.me/9779743488871",
            "tooltip": "Chat with us",
            "bg_color": "#22c55e",
            "icon": "whatsapp"
        }
    doc.pop("_id", None)
    return doc

@router.put("/settings/floating-button")
async def update_floating_button(data: dict, current_user: dict = Depends(get_current_user)):
    """Update floating button config — admin only"""
    data["id"] = "floating_button"
    await db.site_settings.update_one({"id": "floating_button"}, {"$set": data}, upsert=True)
    return data
