"""
Discord Webhook Service
Sends order notifications to Discord via webhooks with retry logic and rate limit handling
"""
import httpx
import logging
import asyncio
from datetime import datetime, timezone
from typing import List, Optional

logger = logging.getLogger(__name__)

# Constants
MAX_RETRIES = 3
RETRY_DELAY = 2  # seconds
WEBHOOK_TIMEOUT = 30  # seconds


async def send_webhook_with_retry(client: httpx.AsyncClient, webhook_url: str, payload: dict, max_retries: int = MAX_RETRIES) -> bool:
    """
    Send webhook with retry logic and rate limit handling
    
    Returns True if successful, False otherwise
    """
    for attempt in range(max_retries):
        try:
            response = await client.post(webhook_url, json=payload)
            
            if response.status_code in [200, 204]:
                logger.info(f"✅ Discord webhook sent successfully (attempt {attempt + 1})")
                return True
            
            # Rate limited - wait and retry
            if response.status_code == 429:
                retry_after = response.json().get('retry_after', 5)
                logger.warning(f"⏳ Discord rate limited, waiting {retry_after}s before retry...")
                await asyncio.sleep(retry_after)
                continue
            
            # Other error
            logger.error(f"❌ Discord webhook failed (attempt {attempt + 1}): {response.status_code} - {response.text[:200]}")
            
        except httpx.TimeoutException:
            logger.error(f"❌ Discord webhook timeout (attempt {attempt + 1})")
        except httpx.ConnectError:
            logger.error(f"❌ Discord webhook connection error (attempt {attempt + 1})")
        except Exception as e:
            logger.error(f"❌ Discord webhook error (attempt {attempt + 1}): {str(e)}")
        
        # Wait before retry (exponential backoff)
        if attempt < max_retries - 1:
            wait_time = RETRY_DELAY * (2 ** attempt)
            logger.info(f"🔄 Retrying in {wait_time}s...")
            await asyncio.sleep(wait_time)
    
    return False


async def send_discord_order_notification(
    webhook_urls: List[str],
    order_data: dict,
    product_data: dict = None
):
    """
    Send order notification to Discord webhooks with improved reliability
    
    Args:
        webhook_urls: List of Discord webhook URLs
        order_data: Order information
        product_data: Product information (optional)
    """
    if not webhook_urls:
        logger.warning("No webhook URLs provided, skipping Discord notification")
        return
    
    # Filter out empty/invalid URLs
    valid_urls = [url.strip() for url in webhook_urls if url and url.strip() and url.strip().startswith('https://discord')]
    
    if not valid_urls:
        logger.warning("No valid Discord webhook URLs found")
        return
    
    logger.info(f"📤 Preparing Discord notification for order {order_data.get('id', 'N/A')[:8]} to {len(valid_urls)} webhook(s)")
    
    # Prepare embed data
    order_id = order_data.get('id', 'N/A')
    order_number = order_data.get('takeapp_order_number', order_id[:8].upper())
    customer_name = order_data.get('customer_name', 'N/A')
    customer_phone = order_data.get('customer_phone', 'N/A')
    customer_email = order_data.get('customer_email', '')
    total_amount = order_data.get('total_amount', 0)
    items = order_data.get('items', [])
    status = order_data.get('status', 'Pending')
    remark = order_data.get('remark', '')
    payment_method = order_data.get('payment_method', 'N/A')
    
    # Build items description
    items_description = ""
    for item in items:
        quantity = item.get('quantity', 1)
        name = item.get('name', 'Unknown')
        variation = item.get('variation', item.get('variation_name', ''))
        price = item.get('price', 0)
        
        variation_text = f" ({variation})" if variation else ""
        items_description += f"• **{quantity}x** {name}{variation_text} - Rs {price:,.0f}\n"
    
    if not items_description:
        items_description = "No items listed"
    
    # Extract custom fields from remark
    custom_fields_list = []
    notes = ""
    if remark:
        lines = remark.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue
            if line.startswith('Notes:'):
                notes = line.replace('Notes:', '').strip()
            elif ':' in line and not line.startswith('Promo Code:') and not line.startswith('Store Credits'):
                parts = line.split(':', 1)
                if len(parts) == 2:
                    label = parts[0].strip()
                    value = parts[1].strip()
                    if value:  # Only add if value is not empty
                        custom_fields_list.append({"label": label, "value": value})
    
    # Status emoji and color mapping (including Confirmed status)
    status_config = {
        'pending': {'emoji': '⏳', 'color': 0xFFA500},      # Orange
        'confirmed': {'emoji': '✅', 'color': 0x3498DB},    # Blue
        'processing': {'emoji': '🔄', 'color': 0x9B59B6},   # Purple
        'completed': {'emoji': '🎉', 'color': 0x2ECC71},    # Green
        'delivered': {'emoji': '📦', 'color': 0x2ECC71},    # Green
        'cancelled': {'emoji': '❌', 'color': 0xE74C3C}     # Red
    }
    
    config = status_config.get(status.lower(), {'emoji': '📦', 'color': 0x95A5A6})
    
    # Build custom fields text for content (outside embed for click-to-copy)
    custom_fields_text = ""
    if custom_fields_list:
        for field_data in custom_fields_list:
            custom_fields_text += f"\n**{field_data['label']}:** `{field_data['value']}`"
    
    # Build embed fields
    embed_fields = [
        {
            "name": "📱 Customer",
            "value": f"**{customer_name}**\n{customer_phone}" + (f"\n{customer_email}" if customer_email else ""),
            "inline": True
        },
        {
            "name": "💳 Payment",
            "value": f"{payment_method}",
            "inline": True
        },
        {
            "name": "📊 Status",
            "value": f"{config['emoji']} **{status.upper()}**",
            "inline": True
        },
        {
            "name": "📦 Order Items",
            "value": items_description[:1024],  # Discord field limit
            "inline": False
        },
        {
            "name": "💰 Total Amount",
            "value": f"**Rs {total_amount:,.0f}**",
            "inline": True
        }
    ]
    
    # Add notes if present
    if notes:
        embed_fields.append({
            "name": "📝 Notes",
            "value": notes[:500],
            "inline": False
        })
    
    # Build Discord message with embed
    payload = {
        "content": f"@here 🛒 **New Order #{order_number}**{custom_fields_text}",
        "embeds": [{
            "title": f"Order #{order_number}",
            "color": config['color'],
            "fields": embed_fields,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "footer": {
                "text": f"Order ID: {order_id}"
            }
        }]
    }
    
    # Send to all webhooks concurrently with retry logic
    async with httpx.AsyncClient(timeout=httpx.Timeout(WEBHOOK_TIMEOUT)) as client:
        tasks = []
        for webhook_url in valid_urls:
            task = send_webhook_with_retry(client, webhook_url, payload)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        success_count = sum(1 for r in results if r is True)
        fail_count = len(results) - success_count
        
        if fail_count > 0:
            logger.warning(f"⚠️ Discord notification: {success_count}/{len(valid_urls)} webhooks succeeded")
        else:
            logger.info(f"✅ Discord notification sent to all {success_count} webhook(s)")


async def send_discord_order_status_update(
    webhook_urls: List[str],
    order_data: dict,
    old_status: str,
    new_status: str
):
    """
    Send order status update to Discord webhooks
    
    Args:
        webhook_urls: List of Discord webhook URLs
        order_data: Order information
        old_status: Previous status
        new_status: New status
    """
    if not webhook_urls:
        return
    
    # Filter out empty/invalid URLs
    valid_urls = [url.strip() for url in webhook_urls if url and url.strip() and url.strip().startswith('https://discord')]
    
    if not valid_urls:
        return
    
    order_id = order_data.get('id', 'N/A')
    order_number = order_data.get('takeapp_order_number', order_id[:8].upper())
    customer_name = order_data.get('customer_name', 'N/A')
    customer_phone = order_data.get('customer_phone', 'N/A')
    total_amount = order_data.get('total_amount', 0)
    
    # Status config
    status_config = {
        'pending': {'emoji': '⏳', 'color': 0xFFA500},
        'confirmed': {'emoji': '✅', 'color': 0x3498DB},
        'processing': {'emoji': '🔄', 'color': 0x9B59B6},
        'completed': {'emoji': '🎉', 'color': 0x2ECC71},
        'delivered': {'emoji': '📦', 'color': 0x2ECC71},
        'cancelled': {'emoji': '❌', 'color': 0xE74C3C}
    }
    
    old_config = status_config.get(old_status.lower(), {'emoji': '📦', 'color': 0x95A5A6})
    new_config = status_config.get(new_status.lower(), {'emoji': '📦', 'color': 0x95A5A6})
    
    # Build Discord embed
    payload = {
        "content": f"@here 📢 **Order Status Updated**",
        "embeds": [{
            "title": f"Order #{order_number}",
            "description": f"{old_config['emoji']} **{old_status.upper()}** → {new_config['emoji']} **{new_status.upper()}**",
            "color": new_config['color'],
            "fields": [
                {
                    "name": "👤 Customer",
                    "value": f"{customer_name}\n{customer_phone}",
                    "inline": True
                },
                {
                    "name": "💰 Amount",
                    "value": f"Rs {total_amount:,.0f}",
                    "inline": True
                }
            ],
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "footer": {
                "text": f"Order ID: {order_id}"
            }
        }]
    }
    
    # Send to all webhooks concurrently
    async with httpx.AsyncClient(timeout=httpx.Timeout(WEBHOOK_TIMEOUT)) as client:
        tasks = [send_webhook_with_retry(client, url, payload) for url in valid_urls]
        await asyncio.gather(*tasks, return_exceptions=True)


async def send_discord_test_notification(webhook_url: str) -> dict:
    """
    Send a test notification to verify webhook is working
    
    Returns dict with success status and message
    """
    if not webhook_url or not webhook_url.strip():
        return {"success": False, "message": "No webhook URL provided"}
    
    webhook_url = webhook_url.strip()
    if not webhook_url.startswith('https://discord'):
        return {"success": False, "message": "Invalid Discord webhook URL"}
    
    payload = {
        "content": "🧪 **Test Notification**",
        "embeds": [{
            "title": "Webhook Test Successful!",
            "description": "This Discord webhook is properly configured and receiving notifications from GameShop Nepal.",
            "color": 0x2ECC71,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "footer": {
                "text": "GameShop Nepal - Order Management"
            }
        }]
    }
    
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(15)) as client:
            response = await client.post(webhook_url, json=payload)
            
            if response.status_code in [200, 204]:
                return {"success": True, "message": "Test notification sent successfully"}
            elif response.status_code == 429:
                return {"success": False, "message": "Discord rate limited. Please try again later."}
            else:
                return {"success": False, "message": f"Discord returned error: {response.status_code}"}
    except httpx.TimeoutException:
        return {"success": False, "message": "Request timed out. Check webhook URL."}
    except Exception as e:
        return {"success": False, "message": f"Error: {str(e)}"}


async def send_confirmed_order_notification(webhook_url: str, order_data: dict):
    """
    Send confirmed order notification to the global Discord webhook
    NO @here ping, clean embed format
    
    Args:
        webhook_url: Discord webhook URL
        order_data: Order information
    """
    if not webhook_url or not webhook_url.strip().startswith('https://discord'):
        logger.warning("Invalid webhook URL for confirmed order notification")
        return
    
    order_id = order_data.get('id', 'N/A')
    order_number = order_data.get('takeapp_order_number', order_id[:8].upper())
    customer_name = order_data.get('customer_name', 'N/A')
    customer_phone = order_data.get('customer_phone', 'N/A')
    customer_email = order_data.get('customer_email', 'N/A')
    total_amount = order_data.get('total_amount', 0)
    items = order_data.get('items', [])
    
    # Build items description with product/variant and price
    items_description = ""
    for item in items:
        quantity = item.get('quantity', 1)
        name = item.get('name', 'Unknown')
        variation = item.get('variation', item.get('variation_name', ''))
        price = item.get('price', 0)
        
        variation_text = f" ({variation})" if variation else ""
        items_description += f"• **{quantity}x** {name}{variation_text} - Rs {price:,.0f}\n"
    
    if not items_description:
        items_description = "No items listed"
    
    # Build embed
    embed = {
        "title": f"✅ Order Confirmed - #{order_number}",
        "color": 0x2ECC71,  # Green
        "fields": [
            {
                "name": "👤 Customer Name",
                "value": f"**{customer_name}**",
                "inline": True
            },
            {
                "name": "📱 Phone Number",
                "value": f"{customer_phone}",
                "inline": True
            },
            {
                "name": "📧 Email",
                "value": f"{customer_email if customer_email and customer_email != 'N/A' else 'Not provided'}",
                "inline": True
            },
            {
                "name": "📦 Products",
                "value": items_description[:1024],
                "inline": False
            },
            {
                "name": "💰 Total Amount",
                "value": f"**Rs {total_amount:,.0f}**",
                "inline": True
            }
        ],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "footer": {
            "text": f"Order ID: {order_id} | GameShop Nepal"
        }
    }
    
    payload = {
        "embeds": [embed]
    }
    
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(WEBHOOK_TIMEOUT)) as client:
            result = await send_webhook_with_retry(client, webhook_url.strip(), payload)
            if result:
                logger.info(f"✅ Confirmed order notification sent for #{order_number}")
            else:
                logger.error(f"❌ Failed to send confirmed order notification for #{order_number}")
    except Exception as e:
        logger.error(f"❌ Error sending confirmed order notification: {str(e)}")
