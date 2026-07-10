"""Order creation, payment, completion, status, tracking, and invoice routes."""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from database import db, DISCORD_ORDER_WEBHOOK
from dependencies import get_current_user, get_current_customer, check_permission, create_audit_log
from email_service import send_email, get_order_confirmation_email, get_order_status_update_email
from discord_service import send_discord_order_notification, send_discord_order_status_update, send_discord_test_notification, send_confirmed_order_notification
import google_sheets_service
import uuid
import os
import httpx
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== MODELS ====================

class OrderItem(BaseModel):
    name: str
    price: float
    quantity: int = 1
    variation: Optional[str] = None
    product_id: Optional[str] = None  # For Discord webhook lookup
    variation_id: Optional[str] = None

class CreateOrderRequest(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: str  # Required
    items: List[OrderItem]
    total_amount: float
    remark: Optional[str] = None
    credits_used: float = 0  # Store credits used for this order
    promo_code: Optional[str] = None  # Promo code used for this order

class PaymentScreenshotUpload(BaseModel):
    screenshot_url: str
    payment_method: Optional[str] = None
    payment_sent_to: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None

class BulkDeleteRequest(BaseModel):
    order_ids: List[str]

class WebhookTestRequest(BaseModel):
    webhook_url: str
    message: str = "Test webhook from GameShop Nepal"


# Import credit functions from promotions module
async def _use_credits(customer_email, amount, order_id):
    """Proxy to use_credits - imported lazily to avoid circular imports."""
    from routes.promotions import use_credits
    return await use_credits(customer_email, amount, order_id)

async def _award_credits_for_order(order_id, customer_email, order_total):
    """Proxy to award_credits_for_order - imported lazily to avoid circular imports."""
    from routes.promotions import award_credits_for_order
    return await award_credits_for_order(order_id, customer_email, order_total)

@router.post("/orders/create")
async def create_order(order_data: CreateOrderRequest, request: Request = None):
    # === HARD BLOCK: Rs 0 orders only ===
    if float(order_data.total_amount) <= 0:
        logger.warning(f"BLOCKED Rs0 order: {order_data.customer_email} | total: {order_data.total_amount}")
        raise HTTPException(status_code=400, detail="Invalid order total. Please refresh and try again.")

    # Validate required fields
    if not order_data.customer_phone or not order_data.customer_phone.strip():
        raise HTTPException(status_code=400, detail="Phone number is required")
    if not order_data.customer_email or not order_data.customer_email.strip():
        raise HTTPException(status_code=400, detail="Email is required")

    if not order_data.items:
        raise HTTPException(status_code=400, detail="Order must contain at least one item")

    # Extract client IP early (needed for rate-limit + audit)
    client_ip = None
    if request is not None:
        xff = request.headers.get("x-forwarded-for")
        if xff:
            client_ip = xff.split(",")[0].strip()
        elif request.client:
            client_ip = request.client.host

    # === RATE LIMIT / BLOCKLIST CHECK ===
    from order_ratelimit import check_rate_limit, record_order
    ok, reason = check_rate_limit(client_ip or "unknown", order_data.customer_email)
    if not ok:
        logger.warning(f"RATE-LIMIT BLOCK: ip={client_ip} email={order_data.customer_email} reason={reason}")
        raise HTTPException(status_code=429, detail=reason)

    # ============================================================
    # SECURITY: Server-side price validation
    # Every item MUST resolve to a real product + variation in DB.
    # We NEVER trust the client-supplied price.
    # ============================================================
    server_total = 0.0
    for idx, item in enumerate(order_data.items):
        if not item.product_id:
            logger.warning(
                f"PRICE MANIPULATION: item[{idx}] '{item.name}' missing product_id "
                f"(email={order_data.customer_email}, ip={client_ip})"
            )
            raise HTTPException(status_code=400, detail="Invalid product. Please refresh and try again.")

        product = await db.products.find_one({"id": item.product_id})
        if not product:
            logger.warning(
                f"PRICE MANIPULATION: item[{idx}] product_id={item.product_id} not found "
                f"(email={order_data.customer_email}, ip={client_ip})"
            )
            raise HTTPException(status_code=400, detail="Invalid product. Please refresh and try again.")

        variations = product.get("variations") or []
        variation_price = None
        for v in variations:
            if item.variation_id and v.get("id") == item.variation_id:
                variation_price = float(v.get("price", 0))
                break
            if item.variation and v.get("name") == item.variation:
                variation_price = float(v.get("price", 0))
                break

        if variation_price is None:
            # No fallback to first variation — that leaks cheap prices for arbitrary attacks.
            logger.warning(
                f"PRICE MANIPULATION: item[{idx}] variation not found "
                f"(product_id={item.product_id}, variation_id={item.variation_id}, "
                f"variation='{item.variation}', client_price={item.price}, "
                f"email={order_data.customer_email}, ip={client_ip})"
            )
            raise HTTPException(status_code=400, detail="Invalid product variation. Please refresh and try again.")

        if item.quantity is None or item.quantity < 1:
            raise HTTPException(status_code=400, detail="Invalid item quantity.")

        server_total += variation_price * item.quantity

    # Apply credits deduction
    credits = float(order_data.credits_used or 0)
    server_total_after_credits = max(0.0, server_total - credits)

    # Apply service charge and tax from site settings (admin-controlled).
    # Falls back to zero if not configured, so the customer-visible total on
    # the frontend (which reads the same settings) always matches the total
    # we store here.
    site_settings = await db.site_settings.find_one({"id": "main"}) or {}
    try:
        service_charge = float(site_settings.get("service_charge") or 0)
    except (TypeError, ValueError):
        service_charge = 0.0
    try:
        tax_percentage = float(site_settings.get("tax_percentage") or 0)
    except (TypeError, ValueError):
        tax_percentage = 0.0

    tax = server_total_after_credits * (tax_percentage / 100.0)
    server_final = server_total_after_credits + service_charge + tax

    # Reject if client total is more than 5% below server total (was 10%).
    # For low totals (<=Rs 20) we also allow only a Rs 2 absolute delta to
    # prevent tiny-order exploits like "Rs 10 for a Rs 999 product".
    client_total = float(order_data.total_amount)
    tolerance_ratio = 0.95
    if server_final > 0:
        min_acceptable = max(server_final - 2, server_final * tolerance_ratio)
        if client_total < min_acceptable:
            logger.warning(
                f"PRICE MANIPULATION ATTEMPT: client sent Rs{client_total:.2f}, "
                f"server calculated Rs{server_final:.2f} — order blocked. "
                f"Email: {order_data.customer_email}, ip={client_ip}, "
                f"Items: {[i.name for i in order_data.items]}"
            )
            raise HTTPException(
                status_code=400,
                detail="Order total mismatch. Please refresh the page and try again."
            )

    # Use server-calculated total (never trust client total)
    verified_total = round(server_final, 2) if server_final > 0 else client_total
    
    order_id = str(uuid.uuid4())

    def format_phone_number(phone):
        phone = ''.join(filter(str.isdigit, phone))
        if phone.startswith('0'):
            phone = phone[1:]
        if not phone.startswith('977') and len(phone) == 10:
            phone = '977' + phone
        return phone

    formatted_phone = format_phone_number(order_data.customer_phone)

    items_text = ", ".join([f"{item.quantity}x {item.name}" + (f" ({item.variation})" if item.variation else "") for item in order_data.items])

    local_order = {
        "id": order_id,
        "customer_name": order_data.customer_name,
        "customer_ip": client_ip,
        "customer_phone": formatted_phone,
        "customer_email": order_data.customer_email,
        "items": [item.model_dump() for item in order_data.items],
        "total_amount": verified_total,
        "total": verified_total,  # Server-verified total — never from client
        "remark": order_data.remark,
        "items_text": items_text,
        "status": "Pending",
        "payment_screenshot": None,
        "payment_method": None,
        "credits_used": order_data.credits_used,
        "promo_code": order_data.promo_code,
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    await db.orders.insert_one(local_order)

    # Record for rate-limit window so the next order from same IP is counted
    record_order(client_ip or "unknown")

    # Record promo code usage if a promo was used
    if order_data.promo_code:
        try:
            # Increment usage count
            await db.promo_codes.update_one(
                {"code": order_data.promo_code.upper()},
                {"$inc": {"used_count": 1}}
            )
            
            # Record individual usage
            usage_record = {
                "id": str(uuid.uuid4()),
                "promo_code": order_data.promo_code.upper(),
                "order_id": order_id,
                "customer_email": order_data.customer_email.lower(),
                "used_at": datetime.now(timezone.utc).isoformat()
            }
            await db.promo_usage.insert_one(usage_record)
            logger.info(f"Promo code {order_data.promo_code} usage recorded for order {order_id}")
        except Exception as e:
            logger.error(f"Failed to record promo usage: {e}")
    
    # Don't deduct credits immediately - they will be deducted when order is confirmed
    # Just mark the order with pending credits
    if order_data.credits_used > 0:
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"credits_pending": True}}
        )
    
    # Sync order to Google Sheets (in background)
    try:
        google_sheets_service.sync_order_to_sheets(local_order)
    except Exception as e:
        logger.warning(f"Failed to sync order to Google Sheets: {e}")

    # Send order confirmation email
    if order_data.customer_email:
        try:
            subject, html, text = get_order_confirmation_email(local_order)
            send_email(order_data.customer_email, subject, html, text)
            logger.info(f"Order confirmation email sent to {order_data.customer_email}")
        except Exception as e:
            logger.error(f"Failed to send order confirmation email: {e}")
    
    # Discord webhook will be sent after payment screenshot upload
    # See /orders/{order_id}/payment-screenshot endpoint

    return {
        "success": True,
        "order_id": order_id,
        "message": "Order created successfully"
    }

@router.get("/orders/new-confirmed-count")
async def get_new_confirmed_count(since: str = None, current_user: dict = Depends(get_current_user)):
    """Get count of confirmed orders since a given timestamp (for admin sound notifications)"""
    query = {"status": "Confirmed"}
    if since:
        query["created_at"] = {"$gt": since}
    count = await db.orders.count_documents(query)
    latest = await db.orders.find_one({"status": "Confirmed"}, {"_id": 0, "created_at": 1}, sort=[("created_at", -1)])
    return {"count": count, "latest_at": latest.get("created_at") if latest else None}


@router.get("/orders")
async def get_local_orders(
    current_user: dict = Depends(get_current_user), 
    limit: int = 1000, 
    skip: int = 0,
    days: Optional[int] = None
):
    """Get orders with optional date filter. Use days=30 for last 30 days."""
    query = {}
    
    # Filter by date if days parameter is provided
    if days:
        from_date = datetime.now(timezone.utc) - timedelta(days=days)
        query["created_at"] = {"$gte": from_date.isoformat()}
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    # Also return total count for pagination info
    total_count = await db.orders.count_documents(query)
    
    return {"orders": orders, "total": total_count, "limit": limit, "skip": skip}


# ==================== ORDER PAYMENT SCREENSHOT ====================

@router.post("/orders/{order_id}/payment-screenshot")
async def upload_payment_screenshot(order_id: str, data: PaymentScreenshotUpload):
    """Upload payment screenshot for an order - automatically marks as Confirmed and deducts credits"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Generate invoice URL
    invoice_url = f"/invoice/{order_id}"
    
    # Deduct store credits if customer used them
    credits_deducted = 0
    customer_email = order.get("customer_email")
    credits_used = float(order.get("credits_used", 0) or 0)
    credits_pending = order.get("credits_pending", False)
    
    logger.info(f"Order {order_id}: email={customer_email}, credits_used={credits_used}, credits_pending={credits_pending}")
    
    if credits_used > 0 and customer_email:
        try:
            await _use_credits(customer_email, credits_used, order_id)
            credits_deducted = credits_used
            logger.info(f"Deducted {credits_used} credits from {customer_email} for order {order_id}")
        except Exception as e:
            logger.warning(f"Failed to deduct credits for order {order_id}: {e}")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "payment_screenshot": data.screenshot_url,
            "payment_method": data.payment_method,
            "payment_sent_to": data.payment_sent_to,
            "payment_uploaded_at": datetime.now(timezone.utc).isoformat(),
            "status": "Confirmed",
            "invoice_url": invoice_url,
            "credits_pending": False,
            "credits_deducted": credits_deducted > 0
        }}
    )
    
    # Send payment screenshot to dedicated webhook
    payment_webhook_url = None
    try:
        wh_settings = await db.site_settings.find_one({"id": "webhook_settings"}, {"_id": 0})
        if wh_settings and wh_settings.get("payment_webhook"):
            payment_webhook_url = wh_settings["payment_webhook"]
    except Exception:
        pass
    if not payment_webhook_url:
        # Load webhook URL from DB settings (not hardcoded)
        _webhook_settings = await db.site_settings.find_one({"id": "webhook_settings"}, {"_id": 0})
        payment_webhook_url = (_webhook_settings or {}).get("payment_webhook", "https://discord.com/api/webhooks/1481673730177372284/ZSwFuiblK2sJ0QaXU45pwsJDaMSZyQQN5_yTYmIWxFnIHI3WVYHPmUYDOfP_ykxpYwE7")
    try:
        import httpx
        order_num = order.get("takeapp_order_number") or order_id[:8]
        customer_name = order.get("customer_name") or "Unknown"
        items_text = order.get("items_text") or ", ".join(i.get("name", "") for i in order.get("items", []))
        total_amt = f"Rs {round(order.get('total_amount', 0)):,}"
        
        embed = {
            "title": f"Payment Screenshot - Order #{order_num}",
            "color": 0xF59E0B,
            "fields": [
                {"name": "Customer", "value": customer_name, "inline": True},
                {"name": "Total", "value": total_amt, "inline": True},
                {"name": "Payment Method", "value": data.payment_method or "Not specified", "inline": True},
                {"name": "Payment Sent To", "value": data.payment_sent_to or "Not specified", "inline": True},
                {"name": "Items", "value": items_text or "N/A", "inline": False},
            ],
            "image": {"url": data.screenshot_url},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        async with httpx.AsyncClient() as client:
            await client.post(payment_webhook_url, json={"embeds": [embed]}, timeout=10)
        logger.info(f"Payment screenshot webhook sent for order {order_id}")
    except Exception as e:
        logger.warning(f"Failed to send payment screenshot webhook: {e}")
    
    # Send Discord webhook notifications for products with webhooks
    try:
        # Get updated order
        updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        
        # Collect all Discord webhooks from order items
        all_webhooks = []
        product_names = []
        
        # Batch fetch all products to avoid N+1 queries
        product_ids = [item.get('product_id') for item in updated_order.get('items', []) if item.get('product_id')]
        if product_ids:
            products = await db.products.find({"id": {"$in": product_ids}}, {"_id": 0, "id": 1, "name": 1, "discord_webhooks": 1}).to_list(len(product_ids))
            product_map = {p['id']: p for p in products}
            
            for item in updated_order.get('items', []):
                product_id = item.get('product_id')
                if product_id and product_id in product_map:
                    product = product_map[product_id]
                    if product.get('discord_webhooks'):
                        all_webhooks.extend(product.get('discord_webhooks', []))
                        product_names.append(product.get('name', 'Unknown'))
        
        # Remove duplicates
        unique_webhooks = list(set([w for w in all_webhooks if w and w.strip()]))
        
        if unique_webhooks:
            logger.info(f"Sending Discord notifications to {len(unique_webhooks)} webhooks for paid order {order_id}")
            await send_discord_order_notification(
                webhook_urls=unique_webhooks,
                order_data=updated_order,
                product_data={"name": ", ".join(set(product_names))} if product_names else None
            )
        
        # Also send to global confirmed order webhook
        global_order_webhook = DISCORD_ORDER_WEBHOOK
        try:
            wh_settings_global = await db.site_settings.find_one({"id": "webhook_settings"}, {"_id": 0})
            if wh_settings_global and wh_settings_global.get("order_webhook"):
                global_order_webhook = wh_settings_global["order_webhook"]
        except Exception:
            pass
        if global_order_webhook:
            await send_confirmed_order_notification(global_order_webhook, updated_order)
            logger.info(f"Sent global Discord notification for confirmed order {order_id}")
    except Exception as e:
        logger.error(f"Failed to send Discord webhook: {e}")
    
    response = {
        "message": "Payment screenshot uploaded", 
        "order_id": order_id,
        "status": "Confirmed",
        "invoice_url": invoice_url
    }
    
    if credits_deducted > 0:
        response["credits_deducted"] = credits_deducted
    
    return response

@router.post("/orders/{order_id}/complete")
async def complete_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Mark order as completed, award credits, and send invoice email"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Award credits for this order BEFORE updating status
    customer_email = order.get("customer_email")
    credits_awarded = 0
    if customer_email:
        try:
            # Calculate credits based on order total
            order_total = order.get("total_amount", 0) or order.get("total", 0)
            
            credit_result = await _award_credits_for_order(order_id, customer_email, order_total)
            credits_awarded = credit_result.get("credits_awarded", 0)
            logger.info(f"Awarded {credits_awarded} credits to {customer_email} for order {order_id}")
        except Exception as e:
            logger.warning(f"Failed to award credits for order {order_id}: {e}")
    
    # Update status to Completed with credits info
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "Completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "credits_awarded": credits_awarded
        }}
    )
    
    # Decrement variation stock for each item
    for item in order.get("items", []):
        qty = item.get("quantity", 1)
        product_id = item.get("product_id")
        variation_id = item.get("variation_id")
        variation_name = item.get("variation")
        
        try:
            if product_id and variation_id:
                # Match by product_id + variation_id
                await db.products.update_one(
                    {"id": product_id, "variations.id": variation_id, "variations.stock": {"$gt": 0}},
                    {"$inc": {"variations.$.stock": -qty}}
                )
            elif product_id and variation_name:
                # Match by product_id + variation name
                await db.products.update_one(
                    {"id": product_id, "variations.name": variation_name, "variations.stock": {"$gt": 0}},
                    {"$inc": {"variations.$.stock": -qty}}
                )
            elif variation_name:
                # Legacy: match by item name + variation name across all products
                item_name = item.get("name", "")
                product = await db.products.find_one(
                    {"variations.name": variation_name},
                    {"_id": 0, "id": 1}
                )
                if product:
                    await db.products.update_one(
                        {"id": product["id"], "variations.name": variation_name, "variations.stock": {"$gt": 0}},
                        {"$inc": {"variations.$.stock": -qty}}
                    )
            logger.info(f"Decremented stock for variation '{variation_name or variation_id}' by {qty}")
        except Exception as e:
            logger.warning(f"Failed to decrement stock for item: {e}")
    
    # Send invoice email to customer if email exists
    if customer_email:
        try:
            site_url = os.environ.get("SITE_URL", "https://gameshopnepal.com")
            invoice_url = f"{site_url}/invoice/{order_id}"
            review_url = "https://gameshopnepal.com/reviews#write-review"
            
            # Credits message
            credits_message = ""
            if credits_awarded > 0:
                credits_message = f"""
                    <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 10px; padding: 15px; margin: 20px 0; text-align: center;">
                        <p style="color: #fff; margin: 0; font-size: 16px;">🎉 You earned <strong>Rs {credits_awarded:.0f}</strong> in store credits!</p>
                        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 13px;">Use it on your next purchase</p>
                    </div>
                """
            
            from email_service import get_order_status_update_email
            subject, html, text = get_order_status_update_email(order, "completed")
            # Add invoice URL to order dict for the template
            order["invoice_url"] = invoice_url
            if credits_awarded > 0:
                text += f"\nYou earned Rs {int(credits_awarded)} in store credits!"
            send_email(customer_email, subject, html, text)
        except Exception as e:
            print(f"Failed to send invoice email: {e}")
    
    response = {"message": "Order marked as completed", "order_id": order_id}
    if credits_awarded > 0:
        response["credits_awarded"] = credits_awarded
    return response



@router.post("/orders/{order_id}/complete-giftcard")
async def complete_giftcard_order(order_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Complete a giftcard order by providing the gift card code."""
    gift_code = data.get("gift_code", "").strip()
    if not gift_code:
        raise HTTPException(status_code=400, detail="Gift card code is required")

    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    customer_email = order.get("customer_email")
    customer_name = order.get("customer_name", "Customer")

    # Award credits
    credits_awarded = 0
    if customer_email:
        try:
            order_total = order.get("total_amount", 0) or order.get("total", 0)
            credit_result = await _award_credits_for_order(order_id, customer_email, order_total)
            credits_awarded = credit_result.get("credits_awarded", 0)
        except Exception as e:
            logger.warning(f"Failed to award credits for giftcard order {order_id}: {e}")

    # Update order status
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": "Completed",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "credits_awarded": credits_awarded,
            "gift_code": gift_code
        }}
    )

    # Get product name from order items
    items = order.get("items", [])
    product_name = items[0].get("name", "Gift Card") if items else "Gift Card"
    variation = items[0].get("variation", "") if items else ""

    # Send gift card email to customer
    if customer_email:
        try:
            site_url = os.environ.get("SITE_URL", "https://gameshopnepal.com")
            from email_service import send_email, _base
            subject = f"Your {product_name} Gift Card Code — GameShop Nepal"

            variation_line = f"<p style='margin:0;font-size:12px;color:#888888;'>{variation}</p>" if variation else ""

            content = f"""
    <tr>
      <td style="background:#1a1a1a;padding:36px 28px;text-align:center;">
        <div style="width:56px;height:56px;background:#1a2a3a;border:2px solid #F5A623;border-radius:50%;margin:0 auto 14px;text-align:center;line-height:52px;">
          <span style="font-size:26px;line-height:52px;">🎁</span>
        </div>
        <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#ffffff;">Your Gift Card is Ready!</p>
        <p style="margin:0;font-size:13px;color:#888888;">Here is your <strong style="color:#F5A623;">{product_name}</strong> code</p>
      </td>
    </tr>

    <tr>
      <td style="padding:22px 28px 0;">
        <p style="margin:0 0 16px;font-size:14px;color:#444444;">Hi <strong style="color:#111111;">{customer_name}</strong>, your order is complete! Here is your gift card code:</p>

        <div style="background:#f9f8f5;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
          <p style="margin:0 0 4px;font-size:10px;color:#888888;letter-spacing:0.8px;">PRODUCT</p>
          <p style="margin:0;font-size:14px;font-weight:600;color:#111111;">{product_name}</p>
          {variation_line}
        </div>

        <div style="border:2px solid #F5A623;background:#fffbf0;border-radius:8px;padding:20px;margin-bottom:16px;text-align:center;">
          <p style="margin:0 0 6px;font-size:11px;color:#888888;letter-spacing:0.8px;">YOUR GIFT CARD CODE</p>
          <p style="margin:0;font-size:28px;font-weight:700;color:#F5A623;letter-spacing:4px;font-family:'Courier New',monospace;">{gift_code}</p>
        </div>

        <div style="background:#f0f7ff;border:1px solid #b5d4f4;border-radius:8px;padding:16px 18px;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#185FA5;">&#8505; Don't know how to redeem?</p>
          <p style="margin:0 0 10px;font-size:13px;color:#444444;line-height:1.6;">No worries! Our team is here to help you redeem your gift card step by step. Just message us on WhatsApp and we'll guide you through the process.</p>
          <a href="https://wa.me/9779743488871"
            style="display:inline-block;background:#25D366;color:#ffffff;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:600;">
            Message on WhatsApp
          </a>
        </div>

        <div style="border:1px solid #e8e5de;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
          <table width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td><p style="margin:0;font-size:13px;color:#888888;">Order ID</p></td>
              <td align="right"><p style="margin:0;font-size:13px;font-weight:600;color:#F5A623;">#{order_id[:8].upper()}</p></td>
            </tr>
            <tr>
              <td style="padding-top:8px;"><p style="margin:0;font-size:13px;color:#888888;">Amount Paid</p></td>
              <td style="padding-top:8px;" align="right"><p style="margin:0;font-size:13px;font-weight:600;color:#111111;">Rs {order.get('total_amount', 0):,.0f}</p></td>
            </tr>
          </table>
        </div>

      </td>
    </tr>

    <tr>
      <td style="padding:0 28px 24px;text-align:center;">
        <div style="background:#f9f8f5;border-radius:8px;padding:12px 16px;">
          <p style="margin:0;font-size:12px;color:#666666;">Need help? We're here 24/7</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888888;">WhatsApp: <strong style="color:#25D366;">+977 9743488871</strong> &middot; Email: <strong style="color:#F5A623;">support@gameshopnepal.com</strong></p>
        </div>
      </td>
    </tr>
            """
            html = _base(content, f"Your {product_name} gift card code is ready!")
            text = f"Your {product_name} Gift Card Code\n\nHi {customer_name},\n\nYour gift card code: {gift_code}\n\nNeed help redeeming? WhatsApp: +977 9743488871"
            send_email(customer_email, subject, html, text)
            logger.info(f"Gift card email sent to {customer_email}")
        except Exception as e:
            logger.error(f"Failed to send gift card email: {e}")

    response = {"message": "Gift card order completed", "order_id": order_id}
    if credits_awarded > 0:
        response["credits_awarded"] = credits_awarded
    return response

@router.delete("/orders/{order_id}")
async def delete_order(order_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an order - requires delete_orders permission"""
    # Check permission
    if not check_permission(current_user, 'delete_orders'):
        raise HTTPException(status_code=403, detail="You don't have permission to delete orders")
    
    # Check if order exists
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Delete the order
    result = await db.orders.delete_one({"id": order_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=500, detail="Failed to delete order")
    
    logger.info(f"Order deleted by {current_user.get('username')}: {order_id}")
    
    return {"message": "Order deleted successfully", "order_id": order_id}

@router.post("/orders/bulk-delete")
async def bulk_delete_orders(request: BulkDeleteRequest, current_user: dict = Depends(get_current_user)):
    """Bulk delete orders - requires delete_orders permission"""
    
    if not check_permission(current_user, 'delete_orders'):
        raise HTTPException(status_code=403, detail="You don't have permission to delete orders")
    
    if not request.order_ids:
        raise HTTPException(status_code=400, detail="No order IDs provided")
    
    deleted_count = 0
    failed_ids = []
    
    for order_id in request.order_ids:
        try:
            result = await db.orders.delete_one({"id": order_id})
            if result.deleted_count > 0:
                deleted_count += 1
                # Also delete tracking history
                await db.order_status_history.delete_many({"order_id": order_id})
            else:
                failed_ids.append(order_id)
        except Exception as e:
            logger.error(f"Failed to delete order {order_id}: {e}")
            failed_ids.append(order_id)
    
    logger.info(f"Bulk delete by {current_user.get('username')}: {deleted_count} orders deleted")
    
    return {
        "message": f"Successfully deleted {deleted_count} orders",
        "deleted_count": deleted_count,
        "failed_ids": failed_ids
    }

@router.get("/invoice/{order_id}")
async def get_invoice(order_id: str, email: str = None):
    """Get invoice — public but requires valid order ID (UUID format)"""
    import re as _re
    # Validate UUID format to prevent enumeration
    uuid_pattern = _re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', _re.I)
    if not uuid_pattern.match(order_id):
        raise HTTPException(status_code=404, detail="Order not found")
    """Get invoice data for an order"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return {
        "order": order,
        "invoice_number": f"INV-{order_id[:8].upper()}",
        "generated_at": datetime.now(timezone.utc).isoformat()
    }


@router.get("/orders/track/{order_id}")
async def track_order(order_id: str):
    """Public order tracking by order ID or order number"""
    order = await db.orders.find_one(
        {"$or": [
            {"id": order_id}, 
            {"takeapp_order_id": order_id},
            {"takeapp_order_number": order_id}
        ]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get status history
    history = await db.order_status_history.find(
        {"order_id": order.get("id")},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    
    # Mask sensitive data for public view
    return {
        "id": order.get("id"),
        "order_number": order.get("takeapp_order_number"),
        "status": order.get("status", "pending"),
        "items_text": order.get("items_text"),
        "total_amount": order.get("total_amount"),
        "created_at": order.get("created_at"),
        "status_history": history,
        "estimated_delivery": "Instant delivery after payment confirmation"
    }

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: str, status_data: OrderStatusUpdate, current_user: dict = Depends(get_current_user)):
    """Admin: Update order status"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    old_status = order.get("status", "pending")
    new_status = status_data.status.lower()
    
    # Update order status
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status_data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Add to status history
    history_entry = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "old_status": old_status,
        "new_status": status_data.status,
        "note": status_data.note,
        "updated_by": current_user.get("email"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.order_status_history.insert_one(history_entry)
    
    # Create audit log for order status change
    order_number = order.get('takeapp_order_number', order_id[:8].upper())
    await create_audit_log(
        action="UPDATE_ORDER_STATUS",
        actor_id=current_user.get("id"),
        actor_name=current_user.get("name", current_user.get("email")),
        actor_role=current_user.get("role", "admin"),
        resource_type="order",
        resource_id=order_id,
        resource_name=f"Order #{order_number}",
        details={
            "old_status": old_status,
            "new_status": status_data.status,
            "note": status_data.note,
            "customer_email": order.get("customer_email")
        }
    )
    
    credits_deducted = 0
    credits_awarded = 0
    customer_email = order.get("customer_email")
    
    # Deduct credits when order is CONFIRMED (not pending anymore)
    if new_status == "confirmed" and old_status.lower() != "confirmed":
        credits_used = order.get("credits_used", 0)
        if credits_used > 0 and customer_email and order.get("credits_pending"):
            try:
                await _use_credits(customer_email, credits_used, order_id)
                credits_deducted = credits_used
                # Mark credits as deducted
                await db.orders.update_one(
                    {"id": order_id},
                    {"$set": {"credits_pending": False, "credits_deducted": True}}
                )
                logger.info(f"Deducted {credits_used} credits from {customer_email} for confirmed order {order_id}")
            except Exception as e:
                logger.warning(f"Failed to deduct credits for order {order_id}: {e}")
        
        # Send Discord notification for confirmed order (global webhook)
        global_wh = DISCORD_ORDER_WEBHOOK
        try:
            wh_s = await db.site_settings.find_one({"id": "webhook_settings"}, {"_id": 0})
            if wh_s and wh_s.get("order_webhook"):
                global_wh = wh_s["order_webhook"]
        except Exception:
            pass
        if global_wh:
            try:
                updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
                await send_confirmed_order_notification(global_wh, updated_order)
                logger.info(f"Sent Discord notification for confirmed order {order_id}")
            except Exception as e:
                logger.warning(f"Failed to send Discord notification for order {order_id}: {e}")
    
    # Award credits when order is COMPLETED
    if new_status == "completed" and old_status.lower() != "completed":
        if customer_email:
            try:
                order_total = order.get("total_amount", 0)
                credit_result = await _award_credits_for_order(order_id, customer_email, order_total)
                credits_awarded = credit_result.get("credits_awarded", 0)
                if credits_awarded > 0:
                    logger.info(f"Awarded {credits_awarded} credits to {customer_email} for completed order {order_id}")
            except Exception as e:
                logger.warning(f"Failed to award credits for order {order_id}: {e}")
        
        # Update order with completion timestamp
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"completed_at": datetime.now(timezone.utc).isoformat(), "credits_awarded": credits_awarded}}
        )
        
        # Decrement variation stock for each item
        for item in order.get("items", []):
            qty = item.get("quantity", 1)
            pid = item.get("product_id")
            vid = item.get("variation_id")
            vname = item.get("variation")
            try:
                if pid and vid:
                    await db.products.update_one(
                        {"id": pid, "variations.id": vid, "variations.stock": {"$gt": 0}},
                        {"$inc": {"variations.$.stock": -qty}}
                    )
                elif pid and vname:
                    await db.products.update_one(
                        {"id": pid, "variations.name": vname, "variations.stock": {"$gt": 0}},
                        {"$inc": {"variations.$.stock": -qty}}
                    )
                elif vname:
                    product = await db.products.find_one({"variations.name": vname}, {"_id": 0, "id": 1})
                    if product:
                        await db.products.update_one(
                            {"id": product["id"], "variations.name": vname, "variations.stock": {"$gt": 0}},
                            {"$inc": {"variations.$.stock": -qty}}
                        )
            except Exception as e:
                logger.warning(f"Failed to decrement stock for item: {e}")
        
        # Send invoice email automatically when marked as completed
        if customer_email:
            try:
                site_url = os.environ.get("SITE_URL", "https://gameshopnepal.com")
                invoice_url = f"{site_url}/invoice/{order_id}"
                review_url = "https://gameshopnepal.com/reviews#write-review"
                
                # Credits message
                credits_message = ""
                if credits_awarded > 0:
                    credits_message = f"""
                        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 12px; padding: 18px; margin: 25px 0; text-align: center;">
                            <p style="color: #fff; margin: 0; font-size: 17px; font-weight: 600;">You earned Rs {credits_awarded:.0f} in store credits!</p>
                            <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0 0; font-size: 13px;">Use it on your next purchase</p>
                        </div>
                    """
                
                order_number = order.get('takeapp_order_number', order_id[:8].upper())
                from email_service import get_order_status_update_email
                subject, html, text = get_order_status_update_email(order, "completed")
                order["invoice_url"] = invoice_url
                if credits_awarded > 0:
                    text += f"\nYou earned Rs {int(credits_awarded)} in store credits!"
                send_email(customer_email, subject, html, text)
                logger.info(f"Invoice email sent to {customer_email} for completed order {order_id}")
            except Exception as e:
                logger.error(f"Failed to send invoice email for completed order {order_id}: {e}")
        
        # Return early - don't send the generic status update email for completed orders
        response = {"message": f"Order status updated to {status_data.status}"}
        if credits_awarded > 0:
            response["credits_awarded"] = credits_awarded
        return response
    
    # Send status update email
    if customer_email:
        try:
            subject, html, text = get_order_status_update_email(order, status_data.status)
            send_email(customer_email, subject, html, text)
            logger.info(f"Order status update email sent to {customer_email}")
        except Exception as e:
            logger.error(f"Failed to send status update email: {e}")
    
    response = {"message": f"Order status updated to {status_data.status}"}
    if credits_deducted > 0:
        response["credits_deducted"] = credits_deducted
    if credits_awarded > 0:
        response["credits_awarded"] = credits_awarded
    return response

@router.get("/orders/{order_id}")
async def get_order_details(order_id: str, current_user: dict = Depends(get_current_user)):
    """Admin: Get full order details"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    history = await db.order_status_history.find(
        {"order_id": order_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(50)
    
    order["status_history"] = history
    return order



# ==================== ORDER COMPLAINTS ====================

@router.post("/orders/{order_id}/complaint")
async def raise_complaint(order_id: str, data: dict):
    """Raise a complaint for an order — sends to Discord webhook."""
    whatsapp = data.get("whatsapp", "").strip()
    email = data.get("email", "").strip()
    reason = data.get("reason", "").strip()

    if not whatsapp:
        raise HTTPException(status_code=400, detail="WhatsApp number is required")
    if not reason or len(reason) < 20:
        raise HTTPException(status_code=400, detail="Reason must be at least 20 characters")

    # Get order details
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Get complaint webhook URL
    settings = await db.site_settings.find_one({"id": "webhook_settings"}, {"_id": 0})
    complaint_webhook = (settings or {}).get("complaint_webhook", "")
    # Send confirmation email to customer
    if email:
        try:
            from email_service import get_complaint_email, send_email
            import uuid
            from datetime import datetime, timezone
            ticket_id = str(uuid.uuid4())[:8].upper()
            submitted_at = datetime.now(timezone.utc).strftime("%Y-%m-%d at %I:%M %p")
            subject, html, text = get_complaint_email(
                customer_name=order.get("customer_name", "Customer"),
                ticket_id=ticket_id,
                order_id=order_id,
                complaint_text=reason,
                submitted_at=submitted_at
            )
            send_email(to_email=email, subject=subject, html_body=html, text_body=text)
            logger.info(f"Complaint confirmation email sent to {email}")
        except Exception as e:
            logger.warning(f"Failed to send complaint email: {e}")

    if not complaint_webhook:
        logger.warning("No complaint webhook configured")
        return {"message": "Complaint submitted successfully"}

    # Build items text
    items_list = order.get("items", [])
    items_text = "\n".join([
        f"{item.get('quantity', 1)}x {item.get('product_name', item.get('name', 'Unknown'))}"
        for item in items_list
    ]) if items_list else order.get("items_text", "N/A")

    # Format order date
    order_date = order.get("created_at", "")
    if isinstance(order_date, str) and "T" in order_date:
        order_date = order_date.split("T")[0]

    # Status emoji
    status = order.get("status", "unknown")
    status_emojis = {
        "pending": "⏳", "confirmed": "☑️", "processing": "🔄",
        "completed": "✅", "cancelled": "❌", "refunded": "💰"
    }
    status_display = f"{status.capitalize()} {status_emojis.get(status, '')}"

    customer_name = order.get("customer_name", "Unknown")
    total = order.get("total_amount", 0)

    # Send to Discord
    payload = {
        "embeds": [
            {
                "title": "⚠️ Order Complaint Raised",
                "color": 0xFF4444,
                "fields": [
                    {"name": "Customer Name", "value": customer_name, "inline": True},
                    {"name": "WhatsApp", "value": f"```{whatsapp}```", "inline": True},
                    {"name": "Mail", "value": email or "Not provided", "inline": True},
                ],
                "timestamp": datetime.now(timezone.utc).isoformat()
            },
            {
                "title": "📝 Complaint Details",
                "color": 0xFF4444,
                "description": reason,
            },
            {
                "title": "📦 Order Details",
                "color": 0x2F3136,
                "fields": [
                    {"name": "Ordered", "value": items_text, "inline": False},
                    {"name": "Total Paid", "value": f"Rs {total}", "inline": True},
                    {"name": "Date of Order", "value": order_date, "inline": True},
                    {"name": "Order Status", "value": status_display, "inline": True},
                    {"name": "Order ID", "value": f"```{order_id}```", "inline": False},
                ],
            }
        ]
    }

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(complaint_webhook, json=payload, timeout=15)
            if resp.status_code in [200, 204]:
                logger.info(f"Complaint webhook sent for order {order_id}")
            else:
                logger.warning(f"Complaint webhook failed: {resp.status_code}")
    except Exception as e:
        logger.error(f"Failed to send complaint webhook: {e}")

    # Save complaint to DB
    import uuid as _uuid
    complaint_doc = {
        "id": str(_uuid.uuid4()),
        "order_id": order_id,
        "customer_name": order.get("customer_name", "Unknown"),
        "customer_email": email or order.get("customer_email", ""),
        "whatsapp": whatsapp,
        "reason": reason,
        "status": "Pending",
        "admin_note": "",
        "items_text": order.get("items_text", ""),
        "total_amount": order.get("total_amount", 0),
        "order_status": order.get("status", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.complaints.insert_one(complaint_doc)

    return {"message": "Complaint submitted successfully"}


@router.put("/orders/{order_id}/communication-channel")
async def save_communication_channel(order_id: str, data: dict):
    """Save customer's chosen communication channel after payment"""
    channel = data.get("channel")
    if channel not in ["whatsapp", "messenger", "instagram", "email"]:
        raise HTTPException(status_code=400, detail="Invalid channel")
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"communication_channel": channel, "communication_channel_set_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Channel saved", "channel": channel}


# ==================== COMPLAINTS ADMIN ====================

@router.get("/complaints")
async def get_all_complaints(current_user: dict = Depends(get_current_user)):
    """Get all complaints with linked order data"""
    complaints = await db.complaints.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return complaints

@router.put("/complaints/{complaint_id}/status")
async def update_complaint_status(complaint_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update complaint status — Pending, Resolved, Dismissed"""
    status = data.get("status")
    note = data.get("note", "")
    if status not in ["Pending", "In Progress", "Resolved", "Dismissed"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    complaint = await db.complaints.find_one({"id": complaint_id}, {"_id": 0})
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    await db.complaints.update_one(
        {"id": complaint_id},
        {"$set": {
            "status": status,
            "admin_note": note,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    customer_email = complaint.get("customer_email") or complaint.get("email")
    logger.info(f"Complaint {complaint_id} status → {status} | email: {customer_email} | complaint keys: {list(complaint.keys())}")
    if customer_email and status in ["In Progress", "Resolved", "Dismissed"]:
        try:
            from email_service import send_email
            status_color = "#22c55e" if status == "Resolved" else "#f59e0b" if status == "In Progress" else "#ef4444"
            status_emoji = "✅" if status == "Resolved" else "🔄" if status == "In Progress" else "❌"
            subject = f"{status_emoji} Your Complaint Has Been {status} — GameShop Nepal"
            html = f"""<div style="font-family:Inter,sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#fff;border-radius:12px;overflow:hidden;">
              <div style="background:#1a1a1a;padding:32px 28px;text-align:center;">
                <h1 style="margin:0;font-size:22px;color:#fff;">Complaint Update</h1>
                <p style="color:#888;margin:8px 0 0;">GameShop Nepal</p>
              </div>
              <div style="padding:28px;">
                <div style="background:{status_color}22;border:1px solid {status_color}44;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px;">
                  <p style="margin:0;font-size:18px;font-weight:700;color:{status_color};">{status_emoji} Complaint {status}</p>
                </div>
                <p style="color:#ccc;">Hi {complaint.get('customer_name', 'Customer')},</p>
                <p style="color:#ccc;">Your complaint regarding order <strong style="color:#fff;">#{complaint.get('order_id','')[:8].upper()}</strong> has been marked as <strong style="color:{status_color};">{status}</strong>.</p>
                {"<p style='color:#ccc;'><strong style='color:#fff;'>Note from our team:</strong> " + note + "</p>" if note else ""}
                <p style="color:#ccc;">If you have further concerns, please contact us at gameshopnepal.com or Instagram @gameshopnepal.co</p>
                <p style="color:#888;font-size:12px;margin-top:24px;">— Team GameShop Nepal</p>
              </div>
            </div>"""
            text = f"Your complaint for order #{complaint.get('order_id','')[:8].upper()} has been {status}. {('Note: ' + note) if note else ''}"
            send_email(to_email=customer_email, subject=subject, html_body=html, text_body=text)
        except Exception as e:
            logger.error(f"COMPLAINT EMAIL FAILED: {e} | to: {customer_email} | status: {status}")
            import traceback
            logger.error(traceback.format_exc())
    return {"message": f"Complaint marked as {status}"}


# ==================== IP/EMAIL BLOCKLIST ====================

@router.get("/blocklist")
async def get_blocklist(current_user: dict = Depends(get_current_user)):
    """Get blocked IPs and emails"""
    from order_ratelimit import get_blocked
    return get_blocked()

@router.post("/blocklist/ip")
async def block_ip_endpoint(data: dict, current_user: dict = Depends(get_current_user)):
    """Block an IP address"""
    ip = data.get("ip", "").strip()
    if not ip:
        raise HTTPException(status_code=400, detail="IP required")
    from order_ratelimit import block_ip
    block_ip(ip)
    await db.site_settings.update_one(
        {"id": "blocklist"},
        {"$addToSet": {"blocked_ips": ip}},
        upsert=True
    )
    return {"message": f"IP {ip} blocked"}

@router.delete("/blocklist/ip")
async def unblock_ip_endpoint(data: dict, current_user: dict = Depends(get_current_user)):
    """Unblock an IP address"""
    ip = data.get("ip", "").strip()
    from order_ratelimit import unblock_ip
    unblock_ip(ip)
    await db.site_settings.update_one(
        {"id": "blocklist"},
        {"$pull": {"blocked_ips": ip}}
    )
    return {"message": f"IP {ip} unblocked"}

@router.post("/blocklist/email")
async def block_email_endpoint(data: dict, current_user: dict = Depends(get_current_user)):
    """Block an email address"""
    email = data.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email required")
    from order_ratelimit import block_email
    block_email(email)
    await db.site_settings.update_one(
        {"id": "blocklist"},
        {"$addToSet": {"blocked_emails": email}},
        upsert=True
    )
    return {"message": f"Email {email} blocked"}

@router.delete("/blocklist/email")
async def unblock_email_endpoint(data: dict, current_user: dict = Depends(get_current_user)):
    """Unblock an email"""
    email = data.get("email", "").strip().lower()
    from order_ratelimit import unblock_email
    unblock_email(email)
    await db.site_settings.update_one(
        {"id": "blocklist"},
        {"$pull": {"blocked_emails": email}}
    )
    return {"message": f"Email {email} unblocked"}

@router.post("/blocklist/restore")
async def restore_blocklist(current_user: dict = Depends(get_current_user)):
    """Restore blocklist from DB on server restart"""
    from order_ratelimit import block_ip, block_email
    doc = await db.site_settings.find_one({"id": "blocklist"}, {"_id": 0})
    if doc:
        for ip in doc.get("blocked_ips", []):
            block_ip(ip)
        for email in doc.get("blocked_emails", []):
            block_email(email)
        return {"restored_ips": len(doc.get("blocked_ips", [])), "restored_emails": len(doc.get("blocked_emails", []))}
    return {"restored_ips": 0, "restored_emails": 0}
