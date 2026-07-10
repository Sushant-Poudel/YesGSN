"""Promo codes, store credits, and bundle deals routes."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from database import db
from dependencies import get_current_user
import uuid
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== MODELS ====================

class PromoCodeCreate(BaseModel):
    code: str
    discount_type: str = "percentage"
    discount_value: float
    min_order_amount: float = 0
    max_uses: Optional[int] = None
    max_uses_per_customer: Optional[int] = None
    is_active: bool = True
    expiry_date: Optional[str] = None
    applicable_categories: List[str] = []
    applicable_products: List[str] = []
    first_time_only: bool = False
    buy_quantity: Optional[int] = None
    get_quantity: Optional[int] = None
    auto_apply: bool = False
    stackable: bool = False

class PromoCode(PromoCodeCreate):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    used_count: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CreditSettings(BaseModel):
    cashback_percentage: float = 5.0
    is_enabled: bool = True
    eligible_categories: List[str] = []
    eligible_products: List[str] = []
    min_order_amount: float = 0
    usable_categories: List[str] = []
    usable_products: List[str] = []
    max_credit_per_order: float = 0
    max_credit_percentage: float = 0
    free_customer_credit_cap: float = 0

class CustomerCreditUpdate(BaseModel):
    customer_id: str
    amount: float
    reason: str = "Manual adjustment"


# ==================== PROMO CODES ====================

@router.get("/promo-codes")
async def get_promo_codes(current_user: dict = Depends(get_current_user)):
    codes = await db.promo_codes.find().sort("created_at", -1).to_list(100)
    for c in codes:
        c.pop("_id", None)
    return codes

@router.post("/promo-codes")
async def create_promo_code(code_data: PromoCodeCreate, current_user: dict = Depends(get_current_user)):
    # Check if code already exists
    existing = await db.promo_codes.find_one({"code": code_data.code.upper()})
    if existing:
        raise HTTPException(status_code=400, detail="Promo code already exists")
    
    code = PromoCode(
        code=code_data.code.upper(),
        discount_type=code_data.discount_type,
        discount_value=code_data.discount_value,
        min_order_amount=code_data.min_order_amount,
        max_uses=code_data.max_uses,
        max_uses_per_customer=code_data.max_uses_per_customer,
        is_active=code_data.is_active,
        expiry_date=code_data.expiry_date,
        applicable_categories=code_data.applicable_categories,
        applicable_products=code_data.applicable_products,
        first_time_only=code_data.first_time_only,
        buy_quantity=code_data.buy_quantity,
        get_quantity=code_data.get_quantity,
        auto_apply=code_data.auto_apply,
        stackable=code_data.stackable
    )
    await db.promo_codes.insert_one(code.model_dump())
    result = code.model_dump()
    result.pop("_id", None)
    return result

@router.put("/promo-codes/{code_id}")
async def update_promo_code(code_id: str, code_data: PromoCodeCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.promo_codes.find_one({"id": code_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    update_data = code_data.model_dump()
    update_data["code"] = update_data["code"].upper()
    await db.promo_codes.update_one({"id": code_id}, {"$set": update_data})
    updated = await db.promo_codes.find_one({"id": code_id}, {"_id": 0})
    return updated

@router.delete("/promo-codes/{code_id}")
async def delete_promo_code(code_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.promo_codes.delete_one({"id": code_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Promo code not found")
    return {"message": "Promo code deleted"}

@router.post("/promo-codes/validate")
async def validate_promo_code(
    code: str, 
    subtotal: float, 
    cart_items: List[dict] = [], 
    customer_email: Optional[str] = None
):
    """Validate a promo code with advanced rules - requires customer login"""
    # Require customer to be logged in
    if not customer_email:
        raise HTTPException(status_code=401, detail="Please login to use promo codes")
    
    promo = await db.promo_codes.find_one({"code": code.upper(), "is_active": True})
    if not promo:
        raise HTTPException(status_code=400, detail="Invalid or expired promo code")
    
    # Check expiry date
    if promo.get("expiry_date"):
        expiry = datetime.fromisoformat(promo["expiry_date"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expiry:
            raise HTTPException(status_code=400, detail="Promo code has expired")
    
    # Check minimum order amount
    if promo.get("min_order_amount", 0) > subtotal:
        raise HTTPException(status_code=400, detail=f"Minimum order amount is Rs {promo['min_order_amount']}")
    
    # Check max uses (global)
    if promo.get("max_uses") and promo.get("used_count", 0) >= promo["max_uses"]:
        raise HTTPException(status_code=400, detail="Promo code has reached maximum uses")
    
    # Check max uses per customer (user-specific limit)
    max_per_user = promo.get("max_uses_per_customer") or promo.get("max_uses_per_user")
    if max_per_user:
        customer_usage = await db.promo_usage.count_documents({
            "promo_code": code.upper(),
            "customer_email": customer_email.lower()
        })
        if customer_usage >= max_per_user:
            raise HTTPException(status_code=400, detail=f"You have reached the maximum {max_per_user} uses for this promo code")
    
    # Check first-time buyer restriction
    if promo.get("first_time_only"):
        previous_orders = await db.orders.count_documents({"customer_email": customer_email.lower()})
        if previous_orders > 0:
            raise HTTPException(status_code=400, detail="This promo code is only for first-time buyers")
    
    # Check category/product restrictions
    if promo.get("applicable_categories") or promo.get("applicable_products"):
        cart_valid = False
        for item in cart_items:
            product_id = item.get("product_id")
            if product_id:
                product = await db.products.find_one({"id": product_id})
                if product:
                    # Check if product matches
                    if promo.get("applicable_products") and product_id in promo["applicable_products"]:
                        cart_valid = True
                        break
                    # Check if category matches
                    if promo.get("applicable_categories") and product.get("category_id") in promo["applicable_categories"]:
                        cart_valid = True
                        break
        
        if not cart_valid:
            raise HTTPException(status_code=400, detail="This promo code is not applicable to items in your cart")
    
    # Calculate discount
    discount = 0
    discount_details = {}
    
    if promo["discount_type"] == "percentage":
        discount = subtotal * (promo["discount_value"] / 100)
        discount_details = {
            "type": "percentage",
            "value": promo["discount_value"],
            "description": f"{promo['discount_value']}% off"
        }
    elif promo["discount_type"] == "fixed":
        discount = min(promo["discount_value"], subtotal)
        discount_details = {
            "type": "fixed",
            "value": promo["discount_value"],
            "description": f"Rs {promo['discount_value']} off"
        }
    elif promo["discount_type"] == "buy_x_get_y":
        buy_qty = promo.get("buy_quantity", 0)
        get_qty = promo.get("get_quantity", 0)
        discount_details = {
            "type": "buy_x_get_y",
            "buy_quantity": buy_qty,
            "get_quantity": get_qty,
            "description": f"Buy {buy_qty}, Get {get_qty} Free"
        }
    elif promo["discount_type"] == "free_shipping":
        discount_details = {
            "type": "free_shipping",
            "description": "Free Shipping"
        }
    
    return {
        "valid": True,
        "code": promo["code"],
        "discount_type": promo["discount_type"],
        "discount_value": promo["discount_value"],
        "discount_amount": round(discount, 2),
        "details": discount_details,
        "stackable": promo.get("stackable", False),
        "message": f"Promo code applied! {discount_details.get('description', '')}"
    }

@router.get("/promo-codes/auto-apply")
async def get_auto_apply_promos(subtotal: float, customer_email: Optional[str] = None):
    """Get all auto-apply promo codes that match the criteria"""
    query = {"is_active": True, "auto_apply": True}
    
    # Check expiry
    now = datetime.now(timezone.utc).isoformat()
    query["$or"] = [
        {"expiry_date": None},
        {"expiry_date": {"$gt": now}}
    ]
    
    promos = await db.promo_codes.find(query, {"_id": 0}).to_list(100)
    
    applicable_promos = []
    for promo in promos:
        try:
            # Validate each promo
            validation = await validate_promo_code(
                promo["code"], 
                subtotal, 
                [], 
                customer_email
            )
            applicable_promos.append({
                "code": promo["code"],
                "discount_amount": validation["discount_amount"],
                "description": validation["details"]["description"]
            })
        except Exception:
            continue
    
    return applicable_promos

@router.post("/promo-codes/record-usage")
async def record_promo_usage(promo_code: str, order_id: str, customer_email: Optional[str] = None):
    """Record promo code usage"""
    # Increment usage count
    await db.promo_codes.update_one(
        {"code": promo_code.upper()},
        {"$inc": {"used_count": 1}}
    )
    
    # Record individual usage
    usage_record = {
        "id": str(uuid.uuid4()),
        "promo_code": promo_code.upper(),
        "order_id": order_id,
        "customer_email": customer_email,
        "used_at": datetime.now(timezone.utc).isoformat()
    }
    await db.promo_usage.insert_one(usage_record)
    
    return {"message": "Promo usage recorded"}


@router.get("/promo-codes/analytics")
async def get_promo_analytics(current_user: dict = Depends(get_current_user)):
    """Get promo code analytics: most used, total discounts, daily/weekly/monthly stats"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_start = (now - timedelta(days=7)).isoformat()
    month_start = (now - timedelta(days=30)).isoformat()

    # Get all promo codes
    codes = await db.promo_codes.find({}, {"_id": 0}).to_list(200)
    code_map = {c["code"]: c for c in codes}

    # Get all orders with promo codes
    promo_orders = await db.orders.find(
        {"promo_code": {"$ne": None, "$exists": True}},
        {"_id": 0, "promo_code": 1, "total_amount": 1, "created_at": 1, "items": 1}
    ).to_list(5000)

    # Build per-code stats
    code_stats = {}
    today_discount = 0
    today_count = 0
    week_discount = 0
    week_count = 0
    month_discount = 0
    month_count = 0
    total_discount = 0

    for order in promo_orders:
        pc = order.get("promo_code", "").upper()
        created = order.get("created_at", "")
        promo = code_map.get(pc)

        # Calculate discount for this order
        discount = 0
        if promo:
            if promo.get("discount_type") == "percentage":
                # Reverse-calculate: total_amount = subtotal * (1 - pct/100), so subtotal = total / (1 - pct/100)
                pct = promo.get("discount_value", 0)
                if pct < 100:
                    subtotal_est = order.get("total_amount", 0) / (1 - pct / 100)
                    discount = subtotal_est - order.get("total_amount", 0)
            else:
                discount = promo.get("discount_value", 0)
        
        discount = round(max(0, discount), 2)
        total_discount += discount

        if pc not in code_stats:
            code_stats[pc] = {"code": pc, "uses": 0, "total_discount": 0, "discount_type": promo.get("discount_type", "fixed") if promo else "fixed", "discount_value": promo.get("discount_value", 0) if promo else 0, "is_active": promo.get("is_active", False) if promo else False}
        code_stats[pc]["uses"] += 1
        code_stats[pc]["total_discount"] += discount

        if created >= today_start:
            today_discount += discount
            today_count += 1
        if created >= week_start:
            week_discount += discount
            week_count += 1
        if created >= month_start:
            month_discount += discount
            month_count += 1

    stats_list = sorted(code_stats.values(), key=lambda x: x["uses"], reverse=True)
    most_used = stats_list[0] if stats_list else None
    most_discount = max(stats_list, key=lambda x: x["total_discount"]) if stats_list else None

    return {
        "most_used": most_used,
        "most_discounted": most_discount,
        "today": {"count": today_count, "discount": round(today_discount, 2)},
        "week": {"count": week_count, "discount": round(week_discount, 2)},
        "month": {"count": month_count, "discount": round(month_discount, 2)},
        "total": {"count": len(promo_orders), "discount": round(total_discount, 2)},
        "per_code": stats_list
    }


# ==================== STORE CREDITS ====================

@router.get("/credits/settings")
async def get_credit_settings():
    """Get credit system settings"""
    settings = await db.credit_settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        settings = {
            "id": "main",
            "cashback_percentage": 5.0,
            "is_enabled": True,
            "eligible_categories": [],
            "eligible_products": [],
            "min_order_amount": 0,
            "usable_categories": [],
            "usable_products": [],
            "max_credit_per_order": 0,
            "max_credit_percentage": 0
        }
    # Ensure fields exist for backward compatibility
    if "max_credit_per_order" not in settings:
        settings["max_credit_per_order"] = 0
    if "max_credit_percentage" not in settings:
        settings["max_credit_percentage"] = 0
    if "free_customer_credit_cap" not in settings:
        settings["free_customer_credit_cap"] = 0
    return settings

@router.put("/credits/settings")
async def update_credit_settings(settings: CreditSettings, current_user: dict = Depends(get_current_user)):
    """Update credit system settings (admin only)"""
    settings_dict = settings.model_dump()
    settings_dict["id"] = "main"
    await db.credit_settings.update_one({"id": "main"}, {"$set": settings_dict}, upsert=True)
    return settings_dict

@router.get("/credits/balance")
async def get_customer_credit_balance(email: str):
    """Get customer's credit balance"""
    customer = await db.customers.find_one({"email": email})
    if not customer:
        return {"credit_balance": 0}
    return {"credit_balance": customer.get("credit_balance", 0)}

@router.post("/credits/adjust")
async def adjust_customer_credits(data: CustomerCreditUpdate, current_user: dict = Depends(get_current_user)):
    """Manually adjust customer credits (admin only)"""
    customer = await db.customers.find_one({"id": data.customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    current_balance = customer.get("credit_balance", 0)
    new_balance = max(0, current_balance + data.amount)  # Don't go below 0
    
    await db.customers.update_one(
        {"id": data.customer_id},
        {"$set": {"credit_balance": new_balance}}
    )
    
    # Log the credit transaction
    credit_log = {
        "id": str(uuid.uuid4()),
        "customer_id": data.customer_id,
        "customer_email": customer.get("email"),
        "amount": data.amount,
        "reason": data.reason,
        "balance_before": current_balance,
        "balance_after": new_balance,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": current_user.get("id", "admin")
    }
    await db.credit_logs.insert_one(credit_log)
    
    return {
        "success": True,
        "previous_balance": current_balance,
        "new_balance": new_balance,
        "message": f"Credit {'added' if data.amount > 0 else 'deducted'} successfully"
    }

@router.get("/credits/logs/{customer_id}")
async def get_customer_credit_logs(customer_id: str, current_user: dict = Depends(get_current_user)):
    """Get credit transaction history for a customer"""
    logs = await db.credit_logs.find({"customer_id": customer_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return logs

@router.post("/credits/award")
async def award_credits_for_order(order_id: str, customer_email: str, order_total: float):
    """Award cashback credits for a completed order"""
    settings = await db.credit_settings.find_one({"id": "main"})
    if not settings or not settings.get("is_enabled", True):
        return {"credits_awarded": 0, "message": "Credit system is disabled"}
    
    # Check minimum order amount
    if order_total < settings.get("min_order_amount", 0):
        return {"credits_awarded": 0, "message": "Order below minimum amount for credits"}
    
    # Get the order to check eligible categories/products
    order = await db.orders.find_one({"id": order_id})
    if not order:
        return {"credits_awarded": 0, "message": "Order not found"}
    
    # Check eligible categories and products
    eligible_categories = settings.get("eligible_categories", [])
    eligible_products = settings.get("eligible_products", [])
    
    # Calculate eligible amount (only from eligible items)
    eligible_amount = 0
    order_items = order.get("items", [])
    
    for item in order_items:
        item_eligible = False
        product_id = item.get("product_id")
        
        # No restrictions = all eligible
        if not eligible_categories and not eligible_products:
            item_eligible = True
        elif product_id:
            product = await db.products.find_one({"id": product_id}, {"category_id": 1})
            if product:
                category_id = product.get("category_id")
                
                # OR logic: eligible if in eligible_categories OR in eligible_products
                if eligible_categories and category_id in eligible_categories:
                    item_eligible = True
                if eligible_products and product_id in eligible_products:
                    item_eligible = True
        
        if item_eligible:
            item_total = item.get("price", 0) * item.get("quantity", 1)
            eligible_amount += item_total
    
    if eligible_amount <= 0:
        return {"credits_awarded": 0, "message": "No eligible items for credits"}
    
    # Calculate credits based on eligible amount only
    cashback_percentage = settings.get("cashback_percentage", 5.0)
    credits_to_award = round(eligible_amount * (cashback_percentage / 100), 2)
    
    # Find or create customer
    customer = await db.customers.find_one({"email": customer_email})
    if customer:
        current_balance = customer.get("credit_balance", 0)
        new_balance = current_balance + credits_to_award
        await db.customers.update_one(
            {"email": customer_email},
            {"$set": {"credit_balance": new_balance}}
        )
        
        # Log the credit award
        credit_log = {
            "id": str(uuid.uuid4()),
            "customer_id": customer.get("id"),
            "customer_email": customer_email,
            "amount": credits_to_award,
            "reason": f"Cashback for order {order_id}",
            "balance_before": current_balance,
            "balance_after": new_balance,
            "order_id": order_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.credit_logs.insert_one(credit_log)
        
        return {"credits_awarded": credits_to_award, "new_balance": new_balance}
    
    return {"credits_awarded": 0, "message": "Customer not found"}

@router.post("/credits/use")
async def use_credits(customer_email: str, amount: float, order_id: str):
    """Deduct credits when used in an order"""
    customer = await db.customers.find_one({"email": customer_email})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    current_balance = customer.get("credit_balance", 0)
    if amount > current_balance:
        raise HTTPException(status_code=400, detail="Insufficient credit balance")
    
    new_balance = current_balance - amount
    await db.customers.update_one(
        {"email": customer_email},
        {"$set": {"credit_balance": new_balance}}
    )
    
    # Log the credit usage
    credit_log = {
        "id": str(uuid.uuid4()),
        "customer_id": customer.get("id"),
        "customer_email": customer_email,
        "amount": -amount,
        "reason": f"Used for order {order_id}",
        "balance_before": current_balance,
        "balance_after": new_balance,
        "order_id": order_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.credit_logs.insert_one(credit_log)
    
    return {"success": True, "amount_used": amount, "new_balance": new_balance}

class CreditValidationRequest(BaseModel):
    product_ids: List[str] = []
    requested_credits: float = 0

@router.post("/credits/validate")
async def validate_credit_usage(data: CreditValidationRequest):
    """Validate if credits can be used for given products and calculate max usable amount"""
    settings = await db.credit_settings.find_one({"id": "main"})
    if not settings or not settings.get("is_enabled", True):
        return {
            "can_use_credits": False,
            "max_usable": 0,
            "reason": "Credit system is disabled"
        }
    
    usable_categories = settings.get("usable_categories", [])
    usable_products = settings.get("usable_products", [])
    max_credit_per_order = settings.get("max_credit_per_order", 0)
    max_credit_percentage = settings.get("max_credit_percentage", 0)
    
    # If no restrictions, all products are eligible
    if not usable_categories and not usable_products:
        max_usable = max_credit_per_order if max_credit_per_order > 0 else float('inf')
        return {
            "can_use_credits": True,
            "max_usable": max_usable if max_usable != float('inf') else 0,
            "unlimited": max_usable == float('inf'),
            "max_credit_percentage": max_credit_percentage,
            "eligible_product_ids": data.product_ids,
            "reason": "All products eligible"
        }
    
    # Check each product individually — OR logic: eligible if in usable_products OR in usable_categories
    eligible_product_ids = []
    
    for product_id in data.product_ids:
        is_eligible = False
        
        # Check if product is directly in usable_products
        if usable_products and product_id in usable_products:
            is_eligible = True
        
        # Check if product's category is in usable_categories
        if not is_eligible and usable_categories:
            product = await db.products.find_one({"id": product_id}, {"category_id": 1})
            if product and product.get("category_id") in usable_categories:
                is_eligible = True
        
        if is_eligible:
            eligible_product_ids.append(product_id)
    
    if not eligible_product_ids:
        return {
            "can_use_credits": False,
            "max_usable": 0,
            "eligible_product_ids": [],
            "reason": "None of the products in cart are eligible for credit usage"
        }
    
    max_usable = max_credit_per_order if max_credit_per_order > 0 else float('inf')
    return {
        "can_use_credits": True,
        "max_usable": max_usable if max_usable != float('inf') else 0,
        "unlimited": max_usable == float('inf'),
        "max_credit_percentage": max_credit_percentage,
        "eligible_product_ids": eligible_product_ids,
        "reason": f"{len(eligible_product_ids)} of {len(data.product_ids)} products eligible"
    }


# ==================== BUNDLE DEALS ====================

class BundleProduct(BaseModel):
    product_id: str
    variation_id: Optional[str] = None

class BundleCreate(BaseModel):
    name: str
    description: str = ""
    image_url: str = ""
    products: List[BundleProduct]
    original_price: float
    bundle_price: float
    is_active: bool = True
    sort_order: int = 0

class Bundle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str = ""
    description: str = ""
    image_url: str = ""
    products: List[dict] = []
    original_price: float
    bundle_price: float
    discount_percentage: float = 0
    is_active: bool = True
    sort_order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@router.get("/bundles")
async def get_bundles():
    """Get all active bundles with populated product details"""
    bundles = await db.bundles.find({"is_active": True}).sort("sort_order", 1).to_list(100)
    
    # Collect all product IDs from all bundles
    all_product_ids = []
    for bundle in bundles:
        for bp in bundle.get("products", []):
            pid = bp.get("product_id")
            if pid and pid not in all_product_ids:
                all_product_ids.append(pid)
    
    # Batch fetch all products at once
    products_list = await db.products.find({"id": {"$in": all_product_ids}}, {"_id": 0}).to_list(len(all_product_ids)) if all_product_ids else []
    product_map = {p['id']: p for p in products_list}
    
    # Populate product details for each bundle
    for bundle in bundles:
        bundle.pop("_id", None)
        populated_products = []
        for bp in bundle.get("products", []):
            product_id = bp.get("product_id")
            if product_id and product_id in product_map:
                populated_products.append({
                    "product": product_map[product_id],
                    "variation_id": bp.get("variation_id")
                })
        bundle["populated_products"] = populated_products
    
    return bundles

@router.get("/bundles/all")
async def get_all_bundles(current_user: dict = Depends(get_current_user)):
    """Get all bundles for admin"""
    bundles = await db.bundles.find().sort("sort_order", 1).to_list(100)
    for b in bundles:
        b.pop("_id", None)
    return bundles

@router.post("/bundles")
async def create_bundle(bundle_data: BundleCreate, current_user: dict = Depends(get_current_user)):
    slug = bundle_data.name.lower().replace(" ", "-").replace("&", "and")
    discount_pct = round(((bundle_data.original_price - bundle_data.bundle_price) / bundle_data.original_price) * 100, 1) if bundle_data.original_price > 0 else 0
    
    bundle = Bundle(
        name=bundle_data.name,
        slug=slug,
        description=bundle_data.description,
        image_url=bundle_data.image_url,
        products=[p.model_dump() for p in bundle_data.products],
        original_price=bundle_data.original_price,
        bundle_price=bundle_data.bundle_price,
        discount_percentage=discount_pct,
        is_active=bundle_data.is_active,
        sort_order=bundle_data.sort_order
    )
    
    await db.bundles.insert_one(bundle.model_dump())
    result = bundle.model_dump()
    return result

@router.put("/bundles/{bundle_id}")
async def update_bundle(bundle_id: str, bundle_data: BundleCreate, current_user: dict = Depends(get_current_user)):
    slug = bundle_data.name.lower().replace(" ", "-").replace("&", "and")
    discount_pct = round(((bundle_data.original_price - bundle_data.bundle_price) / bundle_data.original_price) * 100, 1) if bundle_data.original_price > 0 else 0
    
    update_data = {
        "name": bundle_data.name,
        "slug": slug,
        "description": bundle_data.description,
        "image_url": bundle_data.image_url,
        "products": [p.model_dump() for p in bundle_data.products],
        "original_price": bundle_data.original_price,
        "bundle_price": bundle_data.bundle_price,
        "discount_percentage": discount_pct,
        "is_active": bundle_data.is_active,
        "sort_order": bundle_data.sort_order
    }
    
    await db.bundles.update_one({"id": bundle_id}, {"$set": update_data})
    updated = await db.bundles.find_one({"id": bundle_id}, {"_id": 0})
    return updated

@router.delete("/bundles/{bundle_id}")
async def delete_bundle(bundle_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.bundles.delete_one({"id": bundle_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bundle not found")
    return {"message": "Bundle deleted"}

