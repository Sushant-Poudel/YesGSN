"""Daily rewards, referral program, multiplier events, wishlist, recent purchases, and newsletter routes."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from database import db
from dependencies import get_current_user
from utils import get_nepal_date, get_nepal_datetime, generate_referral_code
import uuid
import string
import random
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# ==================== RECENT PURCHASES (Live Ticker) ====================

# Nepal cities for random location
NEPAL_CITIES = ["Kathmandu", "Pokhara", "Lalitpur", "Biratnagar", "Bharatpur", "Birgunj", "Dharan", "Butwal", "Hetauda", "Bhaktapur", "Janakpur", "Nepalgunj", "Itahari", "Dhangadhi", "Tulsipur"]

@router.get("/recent-purchases")
async def get_recent_purchases(limit: int = 10):
    """Get recent purchases for live ticker - mix of real orders and simulated"""
    purchases = []
    
    # Get real recent orders (last 24 hours)
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    real_orders = await db.orders.find(
        {"created_at": {"$gte": yesterday}},
        {"_id": 0, "customer_name": 1, "items_text": 1, "created_at": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    for order in real_orders:
        # Mask customer name for privacy (show first name only)
        name_parts = order.get("customer_name", "Customer").split()
        masked_name = name_parts[0] if name_parts else "Customer"
        
        purchases.append({
            "name": masked_name,
            "location": random.choice(NEPAL_CITIES),
            "product": order.get("items_text", "Digital Product"),
            "time_ago": "Just now",
            "is_real": True
        })
    
    # If we don't have enough real orders, add simulated ones
    if len(purchases) < limit:
        # Get some products for simulation
        products = await db.products.find({"is_active": True}, {"_id": 0, "name": 1}).limit(20).to_list(20)
        product_names = [p["name"] for p in products] if products else ["Netflix Premium", "Spotify Premium", "YouTube Premium"]
        
        # Common Nepali first names
        names = ["Aarav", "Sita", "Ram", "Gita", "Bikash", "Anita", "Sunil", "Priya", "Rajesh", "Maya", "Dipak", "Sunita", "Anil", "Kamala", "Binod"]
        
        times_ago = ["2 min ago", "5 min ago", "8 min ago", "12 min ago", "15 min ago", "20 min ago", "25 min ago", "30 min ago"]
        
        while len(purchases) < limit:
            purchases.append({
                "name": random.choice(names),
                "location": random.choice(NEPAL_CITIES),
                "product": random.choice(product_names),
                "time_ago": random.choice(times_ago),
                "is_real": False
            })
    
    random.shuffle(purchases)
    return purchases[:limit]

# ==================== WISHLIST ====================

class WishlistItem(BaseModel):
    product_id: str
    variation_id: Optional[str] = None

class WishlistCreate(BaseModel):
    visitor_id: str  # Browser fingerprint or localStorage ID
    product_id: str
    variation_id: Optional[str] = None
    email: Optional[str] = None  # For price drop notifications

@router.get("/wishlist/{visitor_id}")
async def get_wishlist(visitor_id: str):
    """Get wishlist items for a visitor"""
    items = await db.wishlists.find({"visitor_id": visitor_id}, {"_id": 0}).to_list(100)
    
    # Populate product details
    for item in items:
        product = await db.products.find_one({"id": item.get("product_id")}, {"_id": 0})
        item["product"] = product
    
    return items

@router.post("/wishlist")
async def add_to_wishlist(data: WishlistCreate):
    """Add item to wishlist"""
    # Check if already in wishlist
    existing = await db.wishlists.find_one({
        "visitor_id": data.visitor_id,
        "product_id": data.product_id,
        "variation_id": data.variation_id
    })
    
    if existing:
        return {"message": "Already in wishlist", "id": existing.get("id")}
    
    # Get current price for tracking
    product = await db.products.find_one({"id": data.product_id})
    current_price = None
    if product and data.variation_id:
        for v in product.get("variations", []):
            if v.get("id") == data.variation_id:
                current_price = v.get("price")
                break
    elif product and product.get("variations"):
        current_price = product["variations"][0].get("price")
    
    wishlist_item = {
        "id": str(uuid.uuid4()),
        "visitor_id": data.visitor_id,
        "product_id": data.product_id,
        "variation_id": data.variation_id,
        "email": data.email,
        "price_when_added": current_price,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.wishlists.insert_one(wishlist_item)
    return {"message": "Added to wishlist", "id": wishlist_item["id"]}

@router.delete("/wishlist/{visitor_id}/{product_id}")
async def remove_from_wishlist(visitor_id: str, product_id: str, variation_id: Optional[str] = None):
    """Remove item from wishlist"""
    query = {"visitor_id": visitor_id, "product_id": product_id}
    if variation_id:
        query["variation_id"] = variation_id
    
    result = await db.wishlists.delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found in wishlist")
    return {"message": "Removed from wishlist"}

@router.put("/wishlist/{visitor_id}/email")
async def update_wishlist_email(visitor_id: str, email: str):
    """Update email for price drop notifications"""
    await db.wishlists.update_many(
        {"visitor_id": visitor_id},
        {"$set": {"email": email}}
    )
    return {"message": "Email updated for notifications"}

# ==================== ORDER TRACKING ====================

class OrderStatusUpdate(BaseModel):
    status: str  # pending, processing, completed, cancelled
    note: Optional[str] = None

# ==================== NEWSLETTER ====================

class NewsletterSubscribe(BaseModel):
    email: str
    name: Optional[str] = None

@router.post("/newsletter/subscribe")
async def subscribe_newsletter(data: NewsletterSubscribe):
    """Subscribe to newsletter"""
    email = data.email.lower().strip()
    
    # Validate email format
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")
    
    # Check if already subscribed
    existing = await db.newsletter.find_one({"email": email})
    if existing:
        if existing.get("is_active", True):
            return {"message": "You're already subscribed!", "already_subscribed": True}
        else:
            # Reactivate subscription
            await db.newsletter.update_one(
                {"email": email},
                {"$set": {"is_active": True, "resubscribed_at": datetime.now(timezone.utc).isoformat()}}
            )
            return {"message": "Welcome back! You've been resubscribed.", "resubscribed": True}
    
    # Create new subscription
    subscriber = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": data.name,
        "is_active": True,
        "subscribed_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.newsletter.insert_one(subscriber)
    
    return {"message": "Successfully subscribed to our newsletter!", "success": True}

@router.post("/newsletter/unsubscribe")
async def unsubscribe_newsletter(email: str):
    """Unsubscribe from newsletter"""
    email = email.lower().strip()
    
    result = await db.newsletter.update_one(
        {"email": email},
        {"$set": {"is_active": False, "unsubscribed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Email not found in subscribers")
    
    return {"message": "Successfully unsubscribed"}

@router.get("/newsletter/subscribers")
async def get_newsletter_subscribers(current_user: dict = Depends(get_current_user)):
    """Get all newsletter subscribers (admin only)"""
    subscribers = await db.newsletter.find(
        {"is_active": True},
        {"_id": 0}
    ).sort("subscribed_at", -1).to_list(500)
    
    return subscribers

@router.get("/newsletter/stats")
async def get_newsletter_stats(current_user: dict = Depends(get_current_user)):
    """Get newsletter statistics"""
    total = await db.newsletter.count_documents({})
    active = await db.newsletter.count_documents({"is_active": True})
    
    # Get subscribers in last 7 days
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    recent = await db.newsletter.count_documents({
        "subscribed_at": {"$gte": week_ago},
        "is_active": True
    })
    
    return {
        "total": total,
        "active": active,
        "unsubscribed": total - active,
        "recent_week": recent
    }


# ==================== DAILY REWARDS ====================

class DailyRewardSettings(BaseModel):
    is_enabled: bool = True
    reward_amount: float = 10.0  # Credits to award daily
    streak_bonus_enabled: bool = True
    streak_milestones: dict = {
        "7": 50,   # 7 day streak bonus
        "30": 200  # 30 day streak bonus
    }

async def get_active_multiplier_value(event_type: str = None) -> float:
    """Get the current active multiplier value"""
    now = datetime.now(timezone.utc).isoformat()
    
    query = {
        "is_active": True,
        "start_time": {"$lte": now},
        "end_time": {"$gte": now}
    }
    
    events = await db.multiplier_events.find(query).to_list(10)
    
    max_multiplier = 1.0
    for event in events:
        applies_to = event.get("applies_to", ["daily_reward", "cashback", "referral"])
        if event_type is None or event_type in applies_to:
            if event.get("multiplier", 1) > max_multiplier:
                max_multiplier = event.get("multiplier", 1)
    
    return max_multiplier

@router.get("/daily-reward/settings")
async def get_daily_reward_settings():
    """Get daily reward settings (public)"""
    settings = await db.daily_reward_settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        settings = {
            "id": "main",
            "is_enabled": True,
            "reward_amount": 10.0,
            "streak_bonus_enabled": True,
            "streak_milestones": {"7": 50, "30": 200}
        }
    return settings

@router.put("/daily-reward/settings")
async def update_daily_reward_settings(settings: DailyRewardSettings, current_user: dict = Depends(get_current_user)):
    """Update daily reward settings (admin only)"""
    settings_dict = settings.model_dump()
    settings_dict["id"] = "main"
    await db.daily_reward_settings.update_one({"id": "main"}, {"$set": settings_dict}, upsert=True)
    return settings_dict

@router.get("/daily-reward/status")
async def get_daily_reward_status(email: str):
    """Check if customer can claim daily reward and their streak"""
    settings = await db.daily_reward_settings.find_one({"id": "main"})
    if not settings:
        settings = {
            "is_enabled": True,
            "reward_amount": 10.0,
            "streak_bonus_enabled": True,
            "streak_milestones": {"7": 50, "30": 200}
        }
    
    if not settings.get("is_enabled", True):
        return {"can_claim": False, "reason": "Daily rewards are disabled", "streak": 0}
    
    customer = await db.customers.find_one({"email": email})
    if not customer:
        return {"can_claim": False, "reason": "Customer not found", "streak": 0}
    
    today = get_nepal_date()
    last_claim_date = customer.get("last_daily_reward_date")
    current_streak = customer.get("daily_reward_streak", 0)
    
    # Check if already claimed today
    if last_claim_date == today:
        return {
            "can_claim": False, 
            "reason": "Already claimed today", 
            "streak": current_streak,
            "last_claim": last_claim_date,
            "reward_amount": settings.get("reward_amount", 10),
            "next_reset": get_nepal_date()  # Resets at 12 AM Nepal time
        }
    
    # Check if streak should be reset (missed a day)
    if last_claim_date:
        yesterday = (get_nepal_datetime() - timedelta(days=1)).date().isoformat()
        if last_claim_date != yesterday:
            current_streak = 0  # Reset streak if missed a day
    
    return {
        "can_claim": True,
        "streak": current_streak,
        "next_streak": current_streak + 1,
        "reward_amount": settings.get("reward_amount", 10),
        "streak_bonus_enabled": settings.get("streak_bonus_enabled", True),
        "streak_milestones": settings.get("streak_milestones", {"7": 50, "30": 200}),
        "last_claim": last_claim_date
    }

@router.post("/daily-reward/claim")
async def claim_daily_reward(email: str):
    """Claim daily login reward"""
    settings = await db.daily_reward_settings.find_one({"id": "main"})
    if not settings or not settings.get("is_enabled", True):
        raise HTTPException(status_code=400, detail="Daily rewards are disabled")
    
    customer = await db.customers.find_one({"email": email})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    today = get_nepal_date()
    last_claim_date = customer.get("last_daily_reward_date")
    
    # Check if already claimed today
    if last_claim_date == today:
        raise HTTPException(status_code=400, detail="Already claimed today")
    
    # Calculate streak
    current_streak = customer.get("daily_reward_streak", 0)
    if last_claim_date:
        yesterday = (get_nepal_datetime() - timedelta(days=1)).date().isoformat()
        if last_claim_date == yesterday:
            current_streak += 1  # Continue streak
        else:
            current_streak = 1  # Reset streak
    else:
        current_streak = 1  # First claim
    
    # Calculate reward
    base_reward = settings.get("reward_amount", 10)
    streak_bonus = 0
    streak_milestone_reached = None
    
    # Check for streak milestones
    if settings.get("streak_bonus_enabled", True):
        milestones = settings.get("streak_milestones", {"7": 50, "30": 200})
        for days, bonus in milestones.items():
            if current_streak == int(days):
                streak_bonus = bonus
                streak_milestone_reached = int(days)
                break
    
    # Apply multiplier
    multiplier = await get_active_multiplier_value("daily_reward")
    base_reward_multiplied = base_reward * multiplier
    streak_bonus_multiplied = streak_bonus * multiplier
    total_reward = base_reward_multiplied + streak_bonus_multiplied
    
    # Check free customer credit cap (customers who haven't ordered yet)
    current_balance = customer.get("credit_balance", 0)
    credit_settings = await db.credit_settings.find_one({"id": "main"})
    free_cap = credit_settings.get("free_customer_credit_cap", 0) if credit_settings else 0
    
    if free_cap > 0:
        # Check if customer has ever placed an order
        order_count = await db.orders.count_documents({"customer_email": email})
        if order_count == 0:
            # Cap: don't let balance exceed the limit
            room = max(0, free_cap - current_balance)
            if room <= 0:
                raise HTTPException(status_code=400, detail=f"Credit cap reached. Free customers can hold up to Rs {int(free_cap)} credits. Place an order to unlock more!")
            total_reward = min(total_reward, room)
            base_reward_multiplied = min(base_reward_multiplied, total_reward)
            streak_bonus_multiplied = max(0, total_reward - base_reward_multiplied)
    
    # Update customer
    new_balance = current_balance + total_reward
    
    await db.customers.update_one(
        {"email": email},
        {"$set": {
            "credit_balance": new_balance,
            "last_daily_reward_date": today,
            "daily_reward_streak": current_streak
        }}
    )
    
    # Log the credit transaction
    multiplier_text = f" ({multiplier}x multiplier!)" if multiplier > 1 else ""
    credit_log = {
        "id": str(uuid.uuid4()),
        "customer_id": customer.get("id"),
        "customer_email": email,
        "amount": total_reward,
        "reason": f"Daily login reward (Day {current_streak})" + (f" + {streak_milestone_reached}-day streak bonus!" if streak_bonus > 0 else "") + multiplier_text,
        "balance_before": current_balance,
        "balance_after": new_balance,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "type": "daily_reward",
        "multiplier": multiplier
    }
    await db.credit_logs.insert_one(credit_log)
    
    return {
        "success": True,
        "base_reward": base_reward_multiplied,
        "streak_bonus": streak_bonus_multiplied,
        "total_reward": total_reward,
        "new_balance": new_balance,
        "streak": current_streak,
        "streak_milestone_reached": streak_milestone_reached,
        "multiplier": multiplier,
        "message": f"You earned Rs {total_reward} credits!" + (f" 🎉 {streak_milestone_reached}-day streak bonus!" if streak_bonus > 0 else "") + (f" 🔥 {multiplier}x multiplier active!" if multiplier > 1 else "")
    }

# ==================== REFERRAL PROGRAM ====================

class ReferralSettings(BaseModel):
    is_enabled: bool = True
    referrer_reward: float = 50.0  # Credits for person who refers
    referee_reward: float = 25.0   # Credits for new user who uses code
    min_purchase_required: bool = False  # Require purchase to earn referral bonus
    min_purchase_amount: float = 0

@router.get("/referral/settings")
async def get_referral_settings():
    """Get referral program settings"""
    settings = await db.referral_settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        settings = {
            "id": "main",
            "is_enabled": True,
            "referrer_reward": 50.0,
            "referee_reward": 25.0,
            "min_purchase_required": False,
            "min_purchase_amount": 0
        }
    return settings

@router.put("/referral/settings")
async def update_referral_settings(settings: ReferralSettings, current_user: dict = Depends(get_current_user)):
    """Update referral settings (admin only)"""
    settings_dict = settings.model_dump()
    settings_dict["id"] = "main"
    await db.referral_settings.update_one({"id": "main"}, {"$set": settings_dict}, upsert=True)
    return settings_dict

@router.get("/referral/code/{email}")
async def get_referral_code(email: str):
    """Get or generate referral code for a customer"""
    customer = await db.customers.find_one({"email": email.lower()})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Check if customer already has a referral code
    referral_code = customer.get("referral_code")
    if not referral_code:
        # Generate unique code
        while True:
            referral_code = generate_referral_code()
            existing = await db.customers.find_one({"referral_code": referral_code})
            if not existing:
                break
        
        await db.customers.update_one(
            {"email": email.lower()},
            {"$set": {"referral_code": referral_code}}
        )
    
    # Get referral stats
    referral_count = await db.referrals.count_documents({"referrer_email": email.lower()})
    total_earned = 0
    referrals = await db.referrals.find({"referrer_email": email.lower()}).to_list(100)
    for ref in referrals:
        total_earned += ref.get("referrer_reward", 0)
    
    # Check if user has already used a referral code
    has_used_referral = customer.get("referred_by") is not None
    
    return {
        "referral_code": referral_code,
        "referral_count": referral_count,
        "total_earned": total_earned,
        "has_used_referral": has_used_referral
    }

@router.post("/referral/apply")
async def apply_referral_code(referee_email: str, referral_code: str):
    """Apply a referral code for a new user"""
    settings = await db.referral_settings.find_one({"id": "main"})
    if not settings or not settings.get("is_enabled", True):
        raise HTTPException(status_code=400, detail="Referral program is currently disabled")
    
    # Find referrer by code
    referrer = await db.customers.find_one({"referral_code": referral_code.upper()})
    if not referrer:
        raise HTTPException(status_code=400, detail="Invalid referral code")
    
    # Check if referee exists
    referee = await db.customers.find_one({"email": referee_email.lower()})
    if not referee:
        raise HTTPException(status_code=404, detail="Your account not found")
    
    # Check if same person
    if referrer["email"].lower() == referee_email.lower():
        raise HTTPException(status_code=400, detail="You cannot use your own referral code")
    
    # Check if already used a referral code
    if referee.get("referred_by"):
        raise HTTPException(status_code=400, detail="You have already used a referral code")
    
    # Check if referee already has purchases (not a new user)
    order_count = await db.orders.count_documents({"customer_email": referee_email.lower()})
    if order_count > 0:
        raise HTTPException(status_code=400, detail="Referral codes are only for new users")
    
    referee_reward = settings.get("referee_reward", 25)
    referrer_reward = settings.get("referrer_reward", 50)
    
    # Get active multiplier
    multiplier = await get_active_multiplier_value("referral")
    referee_reward = referee_reward * multiplier
    referrer_reward = referrer_reward * multiplier
    
    # Award credits to referee immediately
    referee_balance = referee.get("credit_balance", 0)
    await db.customers.update_one(
        {"email": referee_email.lower()},
        {"$set": {
            "credit_balance": referee_balance + referee_reward,
            "referred_by": referrer["email"],
            "referred_by_code": referral_code.upper()
        }}
    )
    
    # Log credit for referee
    await db.credit_logs.insert_one({
        "id": str(uuid.uuid4()),
        "customer_email": referee_email.lower(),
        "amount": referee_reward,
        "reason": f"Welcome bonus - used referral code {referral_code.upper()}" + (f" ({multiplier}x multiplier)" if multiplier > 1 else ""),
        "type": "referral_bonus",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Award credits to referrer (can be immediate or after first purchase based on settings)
    if not settings.get("min_purchase_required", False):
        referrer_balance = referrer.get("credit_balance", 0)
        await db.customers.update_one(
            {"email": referrer["email"]},
            {"$set": {"credit_balance": referrer_balance + referrer_reward}}
        )
        
        await db.credit_logs.insert_one({
            "id": str(uuid.uuid4()),
            "customer_email": referrer["email"],
            "amount": referrer_reward,
            "reason": f"Referral bonus - {referee_email} joined" + (f" ({multiplier}x multiplier)" if multiplier > 1 else ""),
            "type": "referral_reward",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        referrer_credited = True
    else:
        referrer_credited = False
    
    # Record the referral
    await db.referrals.insert_one({
        "id": str(uuid.uuid4()),
        "referrer_email": referrer["email"],
        "referee_email": referee_email.lower(),
        "referral_code": referral_code.upper(),
        "referee_reward": referee_reward,
        "referrer_reward": referrer_reward if referrer_credited else 0,
        "referrer_pending_reward": 0 if referrer_credited else referrer_reward,
        "referrer_credited": referrer_credited,
        "multiplier_applied": multiplier,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {
        "success": True,
        "message": f"Referral code applied! You received Rs {referee_reward} credits!",
        "credits_received": referee_reward,
        "multiplier": multiplier
    }

@router.get("/referral/history/{email}")
async def get_referral_history(email: str):
    """Get referral history for a customer"""
    referrals = await db.referrals.find({"referrer_email": email.lower()}).sort("created_at", -1).to_list(100)
    for ref in referrals:
        ref["id"] = str(ref.get("_id", ref.get("id")))
        if "_id" in ref:
            del ref["_id"]
    return referrals

@router.get("/referrals/all")
async def get_all_referrals(current_user: dict = Depends(get_current_user)):
    """Get all referrals for admin panel"""
    referrals = await db.referrals.find().sort("created_at", -1).to_list(100)
    for ref in referrals:
        ref["id"] = str(ref.get("_id", ref.get("id")))
        if "_id" in ref:
            del ref["_id"]
    return referrals

# ==================== POINTS MULTIPLIER EVENTS ====================

class MultiplierEvent(BaseModel):
    name: str
    multiplier: float = 2.0
    start_time: str  # ISO format datetime
    end_time: str    # ISO format datetime
    applies_to: List[str] = ["daily_reward", "cashback", "referral"]  # What it applies to
    is_active: bool = True

@router.get("/multiplier/active")
async def get_active_multiplier_event():
    """Get current active multiplier event (public)"""
    now = datetime.now(timezone.utc).isoformat()
    
    event = await db.multiplier_events.find_one({
        "is_active": True,
        "start_time": {"$lte": now},
        "end_time": {"$gte": now}
    }, {"_id": 0})
    
    if event:
        return {
            "is_active": True,
            "name": event.get("name"),
            "multiplier": event.get("multiplier", 2),
            "end_time": event.get("end_time"),
            "applies_to": event.get("applies_to", ["daily_reward", "cashback", "referral"])
        }
    
    return {"is_active": False, "multiplier": 1}

@router.get("/multiplier/events")
async def get_multiplier_events(current_user: dict = Depends(get_current_user)):
    """Get all multiplier events (admin only)"""
    events = await db.multiplier_events.find().sort("start_time", -1).to_list(100)
    for event in events:
        event["id"] = str(event.get("_id", event.get("id")))
        if "_id" in event:
            del event["_id"]
    return events

@router.post("/multiplier/events")
async def create_multiplier_event(event: MultiplierEvent, current_user: dict = Depends(get_current_user)):
    """Create a new multiplier event (admin only)"""
    event_dict = event.model_dump()
    event_dict["id"] = str(uuid.uuid4())
    event_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.multiplier_events.insert_one(event_dict)
    # Remove MongoDB's _id from response
    if "_id" in event_dict:
        del event_dict["_id"]
    return event_dict

@router.put("/multiplier/events/{event_id}")
async def update_multiplier_event(event_id: str, event: MultiplierEvent, current_user: dict = Depends(get_current_user)):
    """Update a multiplier event (admin only)"""
    result = await db.multiplier_events.update_one(
        {"id": event_id},
        {"$set": event.model_dump()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event updated"}

@router.delete("/multiplier/events/{event_id}")
async def delete_multiplier_event(event_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a multiplier event (admin only)"""
    result = await db.multiplier_events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted"}

# ==================== NEWSLETTER ====================

from newsletter_service import get_template_list, render_template, send_newsletter, NEWSLETTER_TEMPLATES

class NewsletterColors(BaseModel):
    primary_color: str = "#F59E0B"
    secondary_color: str = "#1F2937"
    text_color: str = "#374151"
    background_color: str = "#FFFFFF"
    button_color: str = "#F59E0B"
    button_text_color: str = "#000000"

class NewsletterSendRequest(BaseModel):
    template_id: str
    variables: dict
    colors: Optional[NewsletterColors] = None
    recipient_filter: str = "all"  # all, subscribed, recent_buyers, single
    test_email: Optional[str] = None  # For test sends
    single_email: Optional[str] = None  # For sending to a specific person

@router.get("/newsletter/templates")
async def get_newsletter_templates(current_user: dict = Depends(get_current_user)):
    """Get available newsletter templates"""
    return get_template_list()

@router.post("/newsletter/preview")
async def preview_newsletter(request: NewsletterSendRequest, current_user: dict = Depends(get_current_user)):
    """Preview a newsletter before sending"""
    try:
        colors_dict = request.colors.model_dump() if request.colors else None
        subject, html = render_template(request.template_id, request.variables, colors=colors_dict)
        return {"subject": subject, "html": html}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/newsletter/send-test")
async def send_test_newsletter(request: NewsletterSendRequest, current_user: dict = Depends(get_current_user)):
    """Send test newsletter to a single email"""
    if not request.test_email:
        raise HTTPException(status_code=400, detail="Test email required")
    
    try:
        colors_dict = request.colors.model_dump() if request.colors else None
        subject, html = render_template(request.template_id, request.variables, colors=colors_dict)
        result = send_newsletter([request.test_email], subject, html)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/newsletter/send")
async def send_bulk_newsletter(request: NewsletterSendRequest, current_user: dict = Depends(get_current_user)):
    """Send newsletter to customers based on filter"""
    try:
        colors_dict = request.colors.model_dump() if request.colors else None
        subject, html = render_template(request.template_id, request.variables, colors=colors_dict)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    # Handle single email recipient
    if request.recipient_filter == "single":
        if not request.single_email:
            raise HTTPException(status_code=400, detail="Email address required for single recipient")
        
        emails = [request.single_email]
        result = send_newsletter(emails, subject, html)
        
        # Log the campaign
        campaign_log = {
            "id": str(uuid.uuid4()),
            "template_id": request.template_id,
            "subject": subject,
            "recipient_filter": f"single: {request.single_email}",
            "total_recipients": 1,
            "sent": result.get("sent", 0),
            "failed": result.get("failed", 0),
            "sent_by": current_user.get("username"),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.newsletter_campaigns.insert_one(campaign_log)
        
        return {
            "success": result.get("success", False),
            "total_recipients": 1,
            "sent": result.get("sent", 0),
            "failed": result.get("failed", 0),
            "campaign_id": campaign_log["id"]
        }
    
    # Get recipients based on filter
    query = {}
    if request.recipient_filter == "subscribed":
        query["newsletter_subscribed"] = {"$ne": False}
    elif request.recipient_filter == "recent_buyers":
        # Customers who ordered in last 30 days
        thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        recent_orders = await db.orders.distinct("customer_email", {
            "created_at": {"$gte": thirty_days_ago}
        })
        query["email"] = {"$in": [e for e in recent_orders if e]}
    
    customers = await db.customers.find(query, {"email": 1, "_id": 0}).to_list(10000)
    emails = [c["email"] for c in customers if c.get("email")]
    
    if not emails:
        raise HTTPException(status_code=400, detail="No recipients found")
    
    # Send newsletter
    result = send_newsletter(emails, subject, html)
    
    # Log the campaign
    campaign_log = {
        "id": str(uuid.uuid4()),
        "template_id": request.template_id,
        "subject": subject,
        "recipient_filter": request.recipient_filter,
        "total_recipients": len(emails),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "sent_by": current_user.get("username"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.newsletter_campaigns.insert_one(campaign_log)
    
    return {
        "success": result.get("success", False),
        "total_recipients": len(emails),
        "sent": result.get("sent", 0),
        "failed": result.get("failed", 0),
        "campaign_id": campaign_log["id"]
    }

@router.get("/newsletter/campaigns")
async def get_newsletter_campaigns(current_user: dict = Depends(get_current_user)):
    """Get newsletter campaign history"""
    campaigns = await db.newsletter_campaigns.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return campaigns

@router.get("/newsletter/subscribers/count")
async def get_subscriber_count(current_user: dict = Depends(get_current_user)):
    """Get subscriber counts for different filters"""
    total = await db.customers.count_documents({"email": {"$exists": True, "$ne": None}})
    subscribed = await db.customers.count_documents({"newsletter_subscribed": {"$ne": False}, "email": {"$exists": True}})
    
    # Recent buyers (last 30 days)
    thirty_days_ago = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    recent_emails = await db.orders.distinct("customer_email", {"created_at": {"$gte": thirty_days_ago}})
    recent_buyers = len([e for e in recent_emails if e])
    
    return {
        "all": total,
        "subscribed": subscribed,
        "recent_buyers": recent_buyers
    }

