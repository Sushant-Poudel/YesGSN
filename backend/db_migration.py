"""
Database migration/seed script.
Runs on application startup to ensure the database has production data.
Only seeds if database appears empty or has stale data (< 30 products).
"""
import json
import os
import logging
from pathlib import Path
from bson import json_util

logger = logging.getLogger("db_migration")

SEED_FILE = Path(__file__).parent / "production_seed_data.json"

# Collections to ALWAYS overwrite (config/settings)
ALWAYS_SEED = {
    "categories", "permissions", "social_links", "payment_methods",
    "site_settings", "faqs", "pages", "notification_bar", "admins",
    "referral_settings", "daily_reward_settings", "reseller_plans",
    "trustpilot_config",
}

# Collections to seed ONLY if they have fewer records than the seed
SEED_IF_LESS = {
    "products", "orders", "customers", "reviews", "promo_codes",
    "audit_logs", "newsletter", "referrals", "users", "blog_posts",
    "bundles", "takeapp_orders", "order_status_history", "otp_records",
    "visits",
}


async def run_migration(db):
    """Check and seed database if needed."""
    if not SEED_FILE.exists():
        logger.info("No seed file found, skipping migration")
        return

    # Quick check - if products >= 30, database is likely already seeded
    product_count = await db.products.count_documents({})
    if product_count >= 30:
        logger.info(f"Database already has {product_count} products, skipping seed")
        return

    logger.info(f"Database has only {product_count} products - seeding from production data...")

    with open(SEED_FILE, "r") as f:
        seed_data = json.load(f)

    for coll_name, docs_raw in seed_data.items():
        if not docs_raw:
            continue

        # Parse BSON extended JSON back to proper types
        docs = json_util.loads(json.dumps(docs_raw))

        current_count = await db[coll_name].count_documents({})

        if coll_name in ALWAYS_SEED:
            await db[coll_name].drop()
            await db[coll_name].insert_many(docs)
            logger.info(f"  Seeded {coll_name}: {len(docs)} docs (config/settings)")
        elif coll_name in SEED_IF_LESS and current_count < len(docs):
            await db[coll_name].drop()
            await db[coll_name].insert_many(docs)
            logger.info(f"  Seeded {coll_name}: {len(docs)} docs (was {current_count})")
        else:
            logger.info(f"  Skipped {coll_name}: already has {current_count} docs")

    logger.info("Database seed complete!")
