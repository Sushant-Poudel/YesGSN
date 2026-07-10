"""
Daily Sales Summary Service
Sends automated daily sales summary at 10 PM Nepal Time (NPT)
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from email_service import send_email

logger = logging.getLogger("daily_summary")

# Nepal Time is UTC+5:45
NPT_OFFSET = timedelta(hours=5, minutes=45)

async def get_daily_summary(db):
    """Get today's sales summary data"""
    # Get current time in Nepal
    utc_now = datetime.now(timezone.utc)
    npt_now = utc_now + NPT_OFFSET
    
    # Get start and end of today in Nepal time, convert to UTC for query
    today_start_npt = npt_now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end_npt = npt_now.replace(hour=23, minute=59, second=59, microsecond=999999)
    
    today_start_utc = today_start_npt - NPT_OFFSET
    today_end_utc = today_end_npt - NPT_OFFSET
    
    # Query orders for today
    pipeline = [
        {
            "$match": {
                "created_at": {
                    "$gte": today_start_utc.isoformat(),
                    "$lte": today_end_utc.isoformat()
                }
            }
        },
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "total": {"$sum": "$total_amount"}
            }
        }
    ]
    
    results = await db.orders.aggregate(pipeline).to_list(100)
    
    # Process results
    summary = {
        "date": npt_now.strftime("%Y-%m-%d"),
        "total_orders": 0,
        "total_revenue": 0,
        "confirmed_orders": 0,
        "confirmed_revenue": 0,
        "completed_orders": 0,
        "completed_revenue": 0,
        "pending_orders": 0,
        "cancelled_orders": 0
    }
    
    for r in results:
        status = r["_id"]
        count = r["count"]
        total = r["total"] or 0
        
        summary["total_orders"] += count
        summary["total_revenue"] += total
        
        if status == "Confirmed":
            summary["confirmed_orders"] = count
            summary["confirmed_revenue"] = total
        elif status == "Completed":
            summary["completed_orders"] = count
            summary["completed_revenue"] = total
        elif status in ["pending", "Pending"]:
            summary["pending_orders"] = count
        elif status in ["cancelled", "Cancelled"]:
            summary["cancelled_orders"] = count
    
    # Get top products for the day
    top_products_pipeline = [
        {
            "$match": {
                "created_at": {
                    "$gte": today_start_utc.isoformat(),
                    "$lte": today_end_utc.isoformat()
                },
                "status": {"$in": ["Confirmed", "Completed"]}
            }
        },
        {"$unwind": "$items"},
        {
            "$group": {
                "_id": "$items.name",
                "quantity": {"$sum": "$items.quantity"},
                "revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}
            }
        },
        {"$sort": {"quantity": -1}},
        {"$limit": 5}
    ]
    
    top_products = await db.orders.aggregate(top_products_pipeline).to_list(5)
    summary["top_products"] = top_products
    
    return summary


def generate_summary_email_html(summary):
    """Generate HTML email for daily summary"""
    top_products_html = ""
    for i, p in enumerate(summary.get("top_products", []), 1):
        top_products_html += f"""
        <tr style="border-bottom: 1px solid #2a2a2a;">
            <td style="padding: 8px; color: #888;">{i}</td>
            <td style="padding: 8px; color: #fff;">{p['_id']}</td>
            <td style="padding: 8px; color: #F5A623; text-align: center;">{p['quantity']}</td>
            <td style="padding: 8px; color: #4ade80; text-align: right;">Rs {p['revenue']:,.0f}</td>
        </tr>
        """
    
    if not top_products_html:
        top_products_html = """
        <tr>
            <td colspan="4" style="padding: 20px; color: #888; text-align: center;">No sales today</td>
        </tr>
        """
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #F5A623 0%, #f97316 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                <h1 style="margin: 0; color: #000; font-size: 24px; font-weight: bold;">Daily Sales Summary</h1>
                <p style="margin: 10px 0 0; color: #000; opacity: 0.8;">{summary['date']}</p>
            </div>
            
            <!-- Stats Grid -->
            <div style="background-color: #111; padding: 25px; border-left: 1px solid #222; border-right: 1px solid #222;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 15px; text-align: center; border-right: 1px solid #333;">
                            <div style="font-size: 32px; font-weight: bold; color: #F5A623;">{summary['total_orders']}</div>
                            <div style="color: #888; font-size: 14px; margin-top: 5px;">Total Orders</div>
                        </td>
                        <td style="padding: 15px; text-align: center;">
                            <div style="font-size: 32px; font-weight: bold; color: #4ade80;">Rs {summary['total_revenue']:,.0f}</div>
                            <div style="color: #888; font-size: 14px; margin-top: 5px;">Total Revenue</div>
                        </td>
                    </tr>
                </table>
            </div>
            
            <!-- Order Breakdown -->
            <div style="background-color: #0a0a0a; padding: 25px; border-left: 1px solid #222; border-right: 1px solid #222;">
                <h2 style="margin: 0 0 20px; color: #fff; font-size: 18px;">Order Breakdown</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #222;">
                            <span style="color: #4ade80;">●</span>
                            <span style="color: #fff; margin-left: 10px;">Confirmed</span>
                        </td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #222; text-align: center; color: #fff;">{summary['confirmed_orders']}</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #222; text-align: right; color: #4ade80;">Rs {summary['confirmed_revenue']:,.0f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #222;">
                            <span style="color: #3b82f6;">●</span>
                            <span style="color: #fff; margin-left: 10px;">Completed</span>
                        </td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #222; text-align: center; color: #fff;">{summary['completed_orders']}</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #222; text-align: right; color: #3b82f6;">Rs {summary['completed_revenue']:,.0f}</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid #222;">
                            <span style="color: #eab308;">●</span>
                            <span style="color: #fff; margin-left: 10px;">Pending</span>
                        </td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #222; text-align: center; color: #fff;">{summary['pending_orders']}</td>
                        <td style="padding: 12px 0; border-bottom: 1px solid #222; text-align: right; color: #888;">-</td>
                    </tr>
                    <tr>
                        <td style="padding: 12px 0;">
                            <span style="color: #ef4444;">●</span>
                            <span style="color: #fff; margin-left: 10px;">Cancelled</span>
                        </td>
                        <td style="padding: 12px 0; text-align: center; color: #fff;">{summary['cancelled_orders']}</td>
                        <td style="padding: 12px 0; text-align: right; color: #888;">-</td>
                    </tr>
                </table>
            </div>
            
            <!-- Top Products -->
            <div style="background-color: #111; padding: 25px; border-left: 1px solid #222; border-right: 1px solid #222;">
                <h2 style="margin: 0 0 20px; color: #fff; font-size: 18px;">Top Selling Products</h2>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="border-bottom: 2px solid #F5A623;">
                            <th style="padding: 10px 8px; color: #888; text-align: left; font-weight: normal;">#</th>
                            <th style="padding: 10px 8px; color: #888; text-align: left; font-weight: normal;">Product</th>
                            <th style="padding: 10px 8px; color: #888; text-align: center; font-weight: normal;">Qty</th>
                            <th style="padding: 10px 8px; color: #888; text-align: right; font-weight: normal;">Revenue</th>
                        </tr>
                    </thead>
                    <tbody>
                        {top_products_html}
                    </tbody>
                </table>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #0a0a0a; padding: 20px; border-radius: 0 0 16px 16px; text-align: center; border: 1px solid #222; border-top: none;">
                <p style="margin: 0; color: #666; font-size: 12px;">
                    GameShop Nepal - Daily Report<br>
                    Generated at 10:00 PM NPT
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    return html


async def send_daily_summary(db, recipient_email: str):
    """Send daily summary email"""
    try:
        summary = await get_daily_summary(db)
        html = generate_summary_email_html(summary)
        
        subject = f"Daily Sales Summary - {summary['date']} | {summary['total_orders']} Orders | Rs {summary['total_revenue']:,.0f}"
        
        result = send_email(
            to_email=recipient_email,
            subject=subject,
            html_body=html
        )
        
        if result:
            logger.info(f"Daily summary sent to {recipient_email}")
            return True
        else:
            logger.error(f"Failed to send daily summary to {recipient_email}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending daily summary: {e}")
        return False


async def run_daily_summary_scheduler(db, recipient_email: str):
    """
    Background task that sends daily summary at 10 PM Nepal Time
    Nepal Time = UTC + 5:45
    """
    logger.info(f"Daily summary scheduler started. Will send to: {recipient_email}")
    
    while True:
        try:
            # Get current time in Nepal
            utc_now = datetime.now(timezone.utc)
            npt_now = utc_now + NPT_OFFSET
            
            # Calculate next 10 PM NPT
            target_hour = 22  # 10 PM
            target_minute = 0
            
            next_run = npt_now.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
            
            # If we've passed 10 PM today, schedule for tomorrow
            if npt_now >= next_run:
                next_run += timedelta(days=1)
            
            # Calculate seconds until next run
            wait_seconds = (next_run - npt_now).total_seconds()
            
            logger.info(f"Next daily summary scheduled for {next_run.strftime('%Y-%m-%d %H:%M')} NPT (in {wait_seconds/3600:.1f} hours)")
            
            # Wait until 10 PM
            await asyncio.sleep(wait_seconds)
            
            # Send the summary
            logger.info("Sending daily summary...")
            await send_daily_summary(db, recipient_email)
            
            # Wait a minute to avoid double-sending
            await asyncio.sleep(60)
            
        except asyncio.CancelledError:
            logger.info("Daily summary scheduler cancelled")
            break
        except Exception as e:
            logger.error(f"Error in daily summary scheduler: {e}")
            # Wait 5 minutes before retrying
            await asyncio.sleep(300)
