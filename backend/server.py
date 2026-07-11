"""GameShop Nepal - Main Application Server"""
from fastapi import FastAPI, APIRouter, Request
from starlette.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os
import logging
from pathlib import Path
from dotenv import load_dotenv

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(title="GameShop Nepal API", version="2.0.0")

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://gameshopnepal.com", "https://www.gameshopnepal.com", "http://localhost:3000", "https://codebase-import-8.preview.emergentagent.com"],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security headers middleware
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


# ==================== API ROUTER + ROUTE REGISTRATION ====================

api_router = APIRouter()

# Import and include all route modules
from routes.auth import router as auth_router
from routes.products import router as products_router
from routes.orders import router as orders_router
from routes.reviews import router as reviews_router
from routes.ads import router as ads_router
from routes.content import router as content_router
from routes.promotions import router as promotions_router
from routes.analytics import router as analytics_router
from routes.engagement import router as engagement_router
from routes.chatbot import router as chatbot_router
from routes.customers import router as customers_router
from routes.webhooks import router as webhooks_router
from routes.cron import router as cron_router

api_router.include_router(auth_router)
api_router.include_router(products_router)
api_router.include_router(orders_router)
api_router.include_router(reviews_router)
api_router.include_router(ads_router)
api_router.include_router(content_router)
api_router.include_router(promotions_router)
api_router.include_router(analytics_router)
api_router.include_router(engagement_router)
api_router.include_router(chatbot_router)
api_router.include_router(customers_router)
api_router.include_router(webhooks_router)
api_router.include_router(cron_router)


# ==================== HEALTH CHECK ====================


async def _health_payload():
    """Shared health-check body — returns HTTP 200 fast even if DB ping stalls."""
    import asyncio
    from database import db
    try:
        await asyncio.wait_for(db.command("ping"), timeout=1.0)
        return {"status": "healthy", "database": "connected"}
    except asyncio.TimeoutError:
        return {"status": "healthy", "database": "degraded: ping timeout (>1s)"}
    except Exception as e:
        return {"status": "healthy", "database": f"degraded: {str(e)[:80]}"}


@app.get("/health")
async def health_check():
    """Fast health check for Kubernetes readiness/liveness probes."""
    return await _health_payload()


@api_router.get("/health")
async def api_health():
    return await _health_payload()


# ==================== ROOT ====================

@api_router.get("/")
async def root():
    from database import db
    products_count = await db.products.count_documents({})
    categories_count = await db.categories.count_documents({})
    orders_count = await db.orders.count_documents({})
    return {
        "name": "GameShop Nepal API",
        "version": "2.0.0",
        "status": "running",
        "stats": {
            "products": products_count,
            "categories": categories_count,
            "orders": orders_count
        }
    }


# ==================== STATIC FILE SERVING ====================

UPLOADS_DIR = ROOT_DIR / "uploads"
try:
    UPLOADS_DIR.mkdir(exist_ok=True)
except OSError:
    pass

@app.get("/uploads/{filename}")
async def serve_upload(filename: str):
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)


# Mount API router
app.include_router(api_router, prefix="/api")


# ==================== STARTUP / SHUTDOWN ====================

@app.on_event("startup")
async def startup_db_client():
    from database import db
    try:
        await db.command("ping")
        logger.info("Connected to MongoDB successfully")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")

    # Run database migration/seed if needed
    try:
        from db_migration import run_migration
        await run_migration(db)
    except Exception as e:
        logger.warning(f"Database migration: {e}")

    # Seed/update SMTP config in DB from .env file
    # Uses dotenv_values() to read the FILE directly, bypassing K8s env vars
    try:
        from dotenv import dotenv_values
        env_file_values = dotenv_values(ROOT_DIR / '.env')
        smtp_user = env_file_values.get("SMTP_USER", "")
        if smtp_user:
            smtp_config = {
                "id": "smtp_config",
                "smtp_host": env_file_values.get("SMTP_HOST", "smtp.gmail.com"),
                "smtp_port": int(env_file_values.get("SMTP_PORT", "587")),
                "smtp_user": smtp_user,
                "smtp_password": env_file_values.get("SMTP_PASSWORD", ""),
                "smtp_from_email": env_file_values.get("SMTP_FROM_EMAIL", smtp_user),
                "smtp_from_name": env_file_values.get("SMTP_FROM_NAME", "GameShop Nepal"),
            }
            await db.site_settings.update_one(
                {"id": "smtp_config"}, {"$set": smtp_config}, upsert=True
            )
            logger.info(f"SMTP config synced to DB: {smtp_config['smtp_from_email']}")
    except Exception as e:
        logger.warning(f"Failed to seed SMTP config: {e}")

    # Start background tasks
    try:
        import asyncio
        from order_cleanup import run_cleanup_task
        asyncio.create_task(run_cleanup_task())
    except Exception as e:
        logger.warning(f"Failed to start cleanup task: {e}")
    
    try:
        from daily_summary_service import run_daily_summary_scheduler
        admin_email = os.environ.get("DAILY_SUMMARY_EMAIL", "")
        if admin_email:
            asyncio.create_task(run_daily_summary_scheduler(db, admin_email))
    except Exception as e:
        logger.warning(f"Failed to start daily summary scheduler: {e}")

    # Restore IP/email blocklist from DB into the in-memory rate limiter
    # so that a container restart doesn't unblock attackers.
    try:
        from order_ratelimit import block_ip, block_email
        doc = await db.site_settings.find_one({"id": "blocklist"}, {"_id": 0})
        if doc:
            for ip in (doc.get("blocked_ips") or []):
                block_ip(ip)
            for email in (doc.get("blocked_emails") or []):
                block_email(email)
            logger.info(
                f"Blocklist restored: {len(doc.get('blocked_ips') or [])} IPs, "
                f"{len(doc.get('blocked_emails') or [])} emails"
            )
    except Exception as e:
        logger.warning(f"Failed to restore blocklist on startup: {e}")

@app.on_event("shutdown")
async def shutdown_db_client():
    from database import client
    client.close()
    logger.info("MongoDB connection closed")
