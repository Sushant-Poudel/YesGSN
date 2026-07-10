"""Analytics dashboard, audit logs, and Google Sheets routes."""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from database import db
from dependencies import get_current_user
from daily_summary_service import send_daily_summary
import google_sheets_service
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# ==================== ANALYTICS DASHBOARD ====================

@router.get("/analytics/overview")
async def get_analytics_overview(current_user: dict = Depends(get_current_user)):
    """Get overview analytics for admin dashboard"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()
    
    # Calculate last month date range
    first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_end = (first_of_this_month - timedelta(days=1)).isoformat()
    last_month_start = first_of_this_month.replace(month=first_of_this_month.month - 1 if first_of_this_month.month > 1 else 12, 
                                                    year=first_of_this_month.year if first_of_this_month.month > 1 else first_of_this_month.year - 1).isoformat()
    
    # Today's stats
    today_orders = await db.orders.count_documents({"created_at": {"$gte": today_start}})
    today_revenue_cursor = await db.orders.aggregate([
        {"$match": {"created_at": {"$gte": today_start}, "status": {"$in": ["Confirmed", "Completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    today_revenue = today_revenue_cursor[0]["total"] if today_revenue_cursor else 0
    
    # This week stats
    week_orders = await db.orders.count_documents({"created_at": {"$gte": week_ago}})
    week_revenue_cursor = await db.orders.aggregate([
        {"$match": {"created_at": {"$gte": week_ago}, "status": {"$in": ["Confirmed", "Completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    week_revenue = week_revenue_cursor[0]["total"] if week_revenue_cursor else 0
    
    # This month stats
    month_orders = await db.orders.count_documents({"created_at": {"$gte": month_ago}})
    month_revenue_cursor = await db.orders.aggregate([
        {"$match": {"created_at": {"$gte": month_ago}, "status": {"$in": ["Confirmed", "Completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    month_revenue = month_revenue_cursor[0]["total"] if month_revenue_cursor else 0
    
    # Last month stats
    last_month_orders = await db.orders.count_documents({
        "created_at": {"$gte": last_month_start, "$lte": last_month_end}
    })
    last_month_revenue_cursor = await db.orders.aggregate([
        {"$match": {"created_at": {"$gte": last_month_start, "$lte": last_month_end}, "status": {"$in": ["Confirmed", "Completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    last_month_revenue = last_month_revenue_cursor[0]["total"] if last_month_revenue_cursor else 0
    
    # Total stats (all time)
    total_orders = await db.orders.count_documents({})
    total_revenue_cursor = await db.orders.aggregate([
        {"$match": {"status": {"$in": ["Confirmed", "Completed"]}}},
        {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
    ]).to_list(1)
    total_revenue = total_revenue_cursor[0]["total"] if total_revenue_cursor else 0
    
    # Website visits
    today_visits = await db.visits.count_documents({"date": today_start[:10]})
    week_visits = await db.visits.count_documents({"created_at": {"$gte": week_ago}})
    month_visits = await db.visits.count_documents({"created_at": {"$gte": month_ago}})
    last_month_visits = await db.visits.count_documents({
        "created_at": {"$gte": last_month_start, "$lte": last_month_end}
    })
    total_visits = await db.visits.count_documents({})
    
    return {
        "today": {"orders": today_orders, "revenue": today_revenue},
        "week": {"orders": week_orders, "revenue": week_revenue},
        "month": {"orders": month_orders, "revenue": month_revenue},
        "lastMonth": {"orders": last_month_orders, "revenue": last_month_revenue},
        "total": {"orders": total_orders, "revenue": total_revenue},
        "visits": {
            "today": today_visits,
            "week": week_visits,
            "month": month_visits,
            "lastMonth": last_month_visits,
            "total": total_visits
        }
    }

@router.post("/track-visit")
async def track_visit(request: Request):
    """Track a website visit - called from frontend"""
    try:
        # Get visitor identifier from header or generate session-based
        visitor_id = request.headers.get("X-Visitor-ID", "")
        user_agent = request.headers.get("User-Agent", "")
        
        now = datetime.now(timezone.utc)
        today = now.strftime("%Y-%m-%d")
        current_hour = now.strftime("%H")
        
        # Only count unique visits per day per visitor
        existing = await db.visits.find_one({
            "visitor_id": visitor_id,
            "date": today
        })
        
        if not existing and visitor_id:
            await db.visits.insert_one({
                "visitor_id": visitor_id,
                "date": today,
                "hour": current_hour,
                "user_agent": user_agent,
                "created_at": now.isoformat()
            })
        
        return {"success": True}
    except Exception as e:
        logger.error(f"Error tracking visit: {e}")
        return {"success": False}

@router.get("/analytics/top-products")
async def get_top_products(current_user: dict = Depends(get_current_user), limit: int = 10):
    """Get top selling products - only counts completed orders"""
    # Aggregate orders to find top products - only from completed orders
    pipeline = [
        {"$match": {"status": {"$in": ["completed", "Completed", "delivered"]}}},
        {"$unwind": "$items"},
        {"$group": {
            "_id": "$items.name",
            "total_quantity": {"$sum": "$items.quantity"},
            "total_revenue": {"$sum": {"$multiply": ["$items.price", "$items.quantity"]}}
        }},
        {"$sort": {"total_quantity": -1}},
        {"$limit": limit}
    ]
    
    top_products = await db.orders.aggregate(pipeline).to_list(limit)
    
    return [
        {
            "name": p["_id"],
            "quantity": p["total_quantity"],
            "revenue": p["total_revenue"]
        }
        for p in top_products
    ]

@router.get("/analytics/revenue-chart")
async def get_revenue_chart(current_user: dict = Depends(get_current_user), days: int = 30):
    """Get daily revenue and visits for chart"""
    now = datetime.now(timezone.utc)
    start_date = (now - timedelta(days=days)).isoformat()
    
    # Get orders data
    pipeline = [
        {"$match": {"created_at": {"$gte": start_date}, "status": {"$in": ["Confirmed", "Completed"]}}},
        {"$addFields": {
            "date": {"$substr": ["$created_at", 0, 10]}
        }},
        {"$group": {
            "_id": "$date",
            "orders": {"$sum": 1},
            "revenue": {"$sum": "$total_amount"}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    daily_data = await db.orders.aggregate(pipeline).to_list(days + 2)
    
    # Get visits data
    visits_pipeline = [
        {"$match": {"date": {"$gte": (now - timedelta(days=days)).strftime("%Y-%m-%d")}}},
        {"$group": {
            "_id": "$date",
            "visits": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    visits_data = await db.visits.aggregate(visits_pipeline).to_list(days + 2)
    visits_map = {v["_id"]: v["visits"] for v in visits_data}
    
    # Fill in missing dates with zero values
    result = []
    current = now - timedelta(days=days)
    data_map = {d["_id"]: d for d in daily_data}
    
    for i in range(days + 1):
        date_str = current.strftime("%Y-%m-%d")
        orders_data = data_map.get(date_str, {"orders": 0, "revenue": 0})
        result.append({
            "date": date_str,
            "orders": orders_data.get("orders", 0),
            "revenue": orders_data.get("revenue", 0),
            "visits": visits_map.get(date_str, 0)
        })
        current += timedelta(days=1)
    
    return result


@router.get("/analytics/today-hourly")
async def get_today_hourly_stats(current_user: dict = Depends(get_current_user)):
    """Get hourly stats for today"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_str = today_start.strftime("%Y-%m-%d")
    
    # Get orders by hour for today
    orders_pipeline = [
        {"$match": {
            "created_at": {"$gte": today_start.isoformat()},
            "status": {"$in": ["Confirmed", "Completed"]}
        }},
        {"$addFields": {
            "hour": {"$substr": ["$created_at", 11, 2]}
        }},
        {"$group": {
            "_id": "$hour",
            "orders": {"$sum": 1},
            "revenue": {"$sum": "$total_amount"}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    hourly_orders = await db.orders.aggregate(orders_pipeline).to_list(24)
    orders_map = {d["_id"]: d for d in hourly_orders}
    
    # Get visits by hour for today
    visits_pipeline = [
        {"$match": {"date": today_str}},
        {"$addFields": {
            "hour": {"$cond": {
                "if": {"$ifNull": ["$hour", False]},
                "then": "$hour",
                "else": "00"
            }}
        }},
        {"$group": {
            "_id": "$hour",
            "visits": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    
    hourly_visits = await db.visits.aggregate(visits_pipeline).to_list(24)
    visits_map = {v["_id"]: v["visits"] for v in hourly_visits}
    
    # Build hourly data (0-23 hours)
    result = []
    for hour in range(24):
        hour_str = f"{hour:02d}"
        order_data = orders_map.get(hour_str, {"orders": 0, "revenue": 0})
        result.append({
            "hour": hour_str,
            "label": f"{hour:02d}:00",
            "orders": order_data.get("orders", 0),
            "revenue": order_data.get("revenue", 0),
            "visits": visits_map.get(hour_str, 0)
        })
    
    # Calculate totals for today
    total_orders = sum(d["orders"] for d in result)
    total_revenue = sum(d["revenue"] for d in result)
    total_visits = sum(d["visits"] for d in result)
    
    return {
        "hourly": result,
        "totals": {
            "orders": total_orders,
            "revenue": total_revenue,
            "visits": total_visits,
            "avgOrderValue": round(total_revenue / total_orders) if total_orders > 0 else 0
        }
    }

@router.get("/analytics/order-status")
async def get_order_status_breakdown(current_user: dict = Depends(get_current_user)):
    """Get order status breakdown"""
    pipeline = [
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    status_data = await db.orders.aggregate(pipeline).to_list(10)
    
    return {
        item["_id"] or "pending": item["count"]
        for item in status_data
    }

@router.get("/analytics/peak-hours")
async def get_peak_hours_analytics(days: int = 30, current_user: dict = Depends(get_current_user)):
    """Get peak hours analysis based on historical order data"""
    start_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # Aggregate orders by hour of day across all days
    pipeline = [
        {
            "$match": {
                "created_at": {"$gte": start_date},
                "status": {"$in": ["Confirmed", "Completed"]}
            }
        },
        {
            "$addFields": {
                "hour": {"$substr": ["$created_at", 11, 2]}
            }
        },
        {
            "$group": {
                "_id": "$hour",
                "total_orders": {"$sum": 1},
                "total_revenue": {"$sum": "$total_amount"},
                "avg_order_value": {"$avg": "$total_amount"}
            }
        },
        {"$sort": {"_id": 1}}
    ]
    
    hourly_data = await db.orders.aggregate(pipeline).to_list(24)
    
    # Build complete 24-hour data
    hourly_map = {d["_id"]: d for d in hourly_data}
    result = []
    max_orders = 0
    peak_hour = "00"
    
    for hour in range(24):
        hour_str = f"{hour:02d}"
        data = hourly_map.get(hour_str, {"total_orders": 0, "total_revenue": 0, "avg_order_value": 0})
        
        orders = data.get("total_orders", 0)
        if orders > max_orders:
            max_orders = orders
            peak_hour = hour_str
        
        result.append({
            "hour": hour_str,
            "label": f"{hour:02d}:00",
            "orders": orders,
            "revenue": round(data.get("total_revenue", 0), 2),
            "avgOrderValue": round(data.get("avg_order_value", 0), 2)
        })
    
    # Calculate insights
    total_orders = sum(d["orders"] for d in result)
    total_revenue = sum(d["revenue"] for d in result)
    
    # Find busiest period (morning, afternoon, evening, night)
    morning = sum(d["orders"] for d in result if 6 <= int(d["hour"]) < 12)
    afternoon = sum(d["orders"] for d in result if 12 <= int(d["hour"]) < 18)
    evening = sum(d["orders"] for d in result if 18 <= int(d["hour"]) < 22)
    night = sum(d["orders"] for d in result if int(d["hour"]) >= 22 or int(d["hour"]) < 6)
    
    periods = {"Morning (6AM-12PM)": morning, "Afternoon (12PM-6PM)": afternoon, "Evening (6PM-10PM)": evening, "Night (10PM-6AM)": night}
    busiest_period = max(periods, key=periods.get)
    
    return {
        "hourly": result,
        "insights": {
            "peakHour": f"{peak_hour}:00",
            "peakHourOrders": max_orders,
            "busiestPeriod": busiest_period,
            "periodBreakdown": periods,
            "totalOrders": total_orders,
            "totalRevenue": total_revenue,
            "analyzedDays": days
        }
    }


@router.post("/admin/send-daily-summary")
async def trigger_daily_summary(current_user: dict = Depends(get_current_user)):
    """Manually trigger daily summary email (for testing)"""
    recipient = os.environ.get("DAILY_SUMMARY_EMAIL", "poudelsushant79@gmail.com")
    result = await send_daily_summary(db, recipient)
    if result:
        return {"success": True, "message": f"Daily summary sent to {recipient}"}
    else:
        raise HTTPException(status_code=500, detail="Failed to send daily summary")


@router.get("/analytics/revenue-per-visit-chart")
async def get_revenue_per_visit_chart(current_user: dict = Depends(get_current_user), days: int = 30):
    """Daily Revenue per Visit (RPV) - the truest measure of monetization efficiency."""
    from datetime import datetime, timezone, timedelta
    end = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
    start = end - timedelta(days=days)
    
    # Aggregate real revenue per day (Confirmed/Completed only, minus credits)
    rev_pipeline = [
        {"$match": {
            "created_at": {"$gte": start.isoformat()},
            "status": {"$in": ["Confirmed", "Completed"]}
        }},
        {"$addFields": {
            "day": {"$substr": ["$created_at", 0, 10]},
            "real_amount": {"$subtract": ["$total_amount", {"$ifNull": ["$credits_used", 0]}]}
        }},
        {"$group": {
            "_id": "$day",
            "revenue": {"$sum": "$real_amount"},
            "orders": {"$sum": 1}
        }}
    ]
    rev_data = {d["_id"]: d for d in await db.orders.aggregate(rev_pipeline).to_list(days)}
    
    # Aggregate visits per day
    visit_pipeline = [
        {"$match": {"date": {"$gte": start.strftime("%Y-%m-%d")}}},
        {"$group": {"_id": "$date", "visits": {"$sum": 1}}}
    ]
    visit_data = {v["_id"]: v["visits"] for v in await db.visits.aggregate(visit_pipeline).to_list(days)}
    
    # Build daily series
    result = []
    cur = start
    while cur < end:
        d = cur.strftime("%Y-%m-%d")
        r = rev_data.get(d, {"revenue": 0, "orders": 0})
        v = visit_data.get(d, 0)
        rpv = (r["revenue"] / v) if v > 0 else 0
        conversion = (r["orders"] / v * 100) if v > 0 else 0
        result.append({
            "date": d,
            "revenue": round(r["revenue"], 2),
            "visits": v,
            "orders": r["orders"],
            "rpv": round(rpv, 2),
            "conversion_pct": round(conversion, 2)
        })
        cur += timedelta(days=1)
    return result

@router.get("/analytics/profit")
async def get_profit_analytics(current_user: dict = Depends(get_current_user)):
    """Get profit analytics based on cost price vs selling price"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()
    month_ago = (now - timedelta(days=30)).isoformat()
    
    # Calculate last month date range
    first_of_this_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    last_month_end = (first_of_this_month - timedelta(days=1)).isoformat()
    last_month_start = first_of_this_month.replace(month=first_of_this_month.month - 1 if first_of_this_month.month > 1 else 12, 
                                                    year=first_of_this_month.year if first_of_this_month.month > 1 else first_of_this_month.year - 1).isoformat()
    
    # Get completed orders with projection for better performance (limit to last 90 days)
    ninety_days_ago = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    completed_orders = await db.orders.find(
        {
            "status": {"$regex": "^(completed|delivered)$", "$options": "i"},
            "created_at": {"$gte": ninety_days_ago}
        },
        {"_id": 0, "id": 1, "total_amount": 1, "items": 1, "created_at": 1, "status": 1}
    ).to_list(5000)
    
    # Get all products to map cost prices
    products = await db.products.find({}, {"_id": 0, "id": 1, "variations": 1}).to_list(500)
    
    # Create variation cost price lookup
    cost_lookup = {}
    for product in products:
        for var in product.get("variations", []):
            key = f"{product['id']}_{var['id']}"
            cost_lookup[key] = var.get("cost_price", 0) or 0
    
    # Calculate profits
    def calculate_profit(orders):
        total_revenue = 0
        total_cost = 0
        for order in orders:
            total_revenue += order.get("total_amount", 0)
            for item in order.get("items", []):
                key = f"{item.get('product_id', '')}_{item.get('variation_id', '')}"
                cost = cost_lookup.get(key, 0)
                qty = item.get("quantity", 1)
                total_cost += cost * qty
        return {"revenue": total_revenue, "cost": total_cost, "profit": total_revenue - total_cost}
    
    # Filter orders by time periods
    today_orders = [o for o in completed_orders if o.get("created_at", "") >= today_start]
    week_orders = [o for o in completed_orders if o.get("created_at", "") >= week_ago]
    month_orders = [o for o in completed_orders if o.get("created_at", "") >= month_ago]
    last_month_orders = [o for o in completed_orders if last_month_start <= o.get("created_at", "") <= last_month_end]
    
    return {
        "today": calculate_profit(today_orders),
        "week": calculate_profit(week_orders),
        "month": calculate_profit(month_orders),
        "lastMonth": calculate_profit(last_month_orders),
        "total": calculate_profit(completed_orders),
        "all_time": calculate_profit(completed_orders)
    }


# ==================== AUDIT LOGS ====================

@router.get("/audit-logs")
async def get_audit_logs(
    current_user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 50,
    action: str = None,
    actor_id: str = None,
    resource_type: str = None,
    date_from: str = None,
    date_to: str = None
):
    """Get audit logs with filtering and pagination"""
    # Build query
    query = {}
    
    if action:
        query["action"] = action
    if actor_id:
        query["actor.id"] = actor_id
    if resource_type:
        query["resource_type"] = resource_type
    if date_from:
        query["timestamp"] = {"$gte": date_from}
    if date_to:
        if "timestamp" in query:
            query["timestamp"]["$lte"] = date_to
        else:
            query["timestamp"] = {"$lte": date_to}
    
    # Get total count
    total = await db.audit_logs.count_documents(query)
    
    # Get logs with pagination
    skip = (page - 1) * limit
    logs = await db.audit_logs.find(query, {"_id": 0}).sort("timestamp", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "logs": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit
    }


@router.get("/audit-logs/actions")
async def get_audit_log_actions(current_user: dict = Depends(get_current_user)):
    """Get list of all action types in audit logs"""
    actions = await db.audit_logs.distinct("action")
    return {"actions": sorted(actions)}


@router.get("/audit-logs/actors")
async def get_audit_log_actors(current_user: dict = Depends(get_current_user)):
    """Get list of all actors (admins/staff) in audit logs"""
    pipeline = [
        {"$group": {
            "_id": "$actor.id",
            "name": {"$first": "$actor.name"},
            "role": {"$first": "$actor.role"}
        }},
        {"$sort": {"name": 1}}
    ]
    actors = await db.audit_logs.aggregate(pipeline).to_list(100)
    return {"actors": [{"id": a["_id"], "name": a["name"], "role": a["role"]} for a in actors]}


@router.get("/audit-logs/stats")
async def get_audit_log_stats(current_user: dict = Depends(get_current_user)):
    """Get audit log statistics"""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    week_ago = (now - timedelta(days=7)).isoformat()
    
    # Today's activity
    today_count = await db.audit_logs.count_documents({"timestamp": {"$gte": today_start}})
    
    # This week's activity
    week_count = await db.audit_logs.count_documents({"timestamp": {"$gte": week_ago}})
    
    # Total logs
    total_count = await db.audit_logs.count_documents({})
    
    # Actions breakdown
    actions_pipeline = [
        {"$group": {"_id": "$action", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10}
    ]
    top_actions = await db.audit_logs.aggregate(actions_pipeline).to_list(10)
    
    # Most active users
    actors_pipeline = [
        {"$group": {"_id": "$actor.name", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_actors = await db.audit_logs.aggregate(actors_pipeline).to_list(5)
    
    return {
        "today": today_count,
        "week": week_count,
        "total": total_count,
        "top_actions": [{"action": a["_id"], "count": a["count"]} for a in top_actions],
        "top_actors": [{"name": a["_id"], "count": a["count"]} for a in top_actors]
    }


# ==================== GOOGLE SHEETS ====================

@router.get("/google-sheets/test")
async def test_google_sheets(current_user: dict = Depends(get_current_user)):
    """Test Google Sheets connection"""
    return google_sheets_service.test_connection()

@router.post("/google-sheets/sync-all")
async def sync_all_to_sheets(current_user: dict = Depends(get_current_user)):
    """Sync all customers and orders to Google Sheets"""
    # Sync all customers
    customers = await db.customers.find({}, {"_id": 0}).to_list(10000)
    customers_synced = 0
    for customer in customers:
        try:
            google_sheets_service.sync_customer_to_sheets(customer)
            customers_synced += 1
        except Exception as e:
            logger.error(f"Failed to sync customer {customer.get('email')}: {e}")
    
    # Sync all orders
    orders = await db.orders.find({}, {"_id": 0}).to_list(10000)
    orders_synced = 0
    for order in orders:
        try:
            google_sheets_service.sync_order_to_sheets(order)
            orders_synced += 1
        except Exception as e:
            logger.error(f"Failed to sync order {order.get('id')}: {e}")
    
    return {
        "success": True,
        "customers_synced": customers_synced,
        "orders_synced": orders_synced
    }

