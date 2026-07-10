"""
Seed database with initial data from mockData.js
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def seed_database():
    print("🌱 Starting database seeding...")
    
    # Clear existing data
    await db.products.delete_many({})
    await db.categories.delete_many({})
    await db.reviews.delete_many({})
    await db.blog_posts.delete_many({})
    await db.faqs.delete_many({})
    await db.notification_bar.delete_many({})
    await db.social_links.delete_many({})
    await db.payment_methods.delete_many({})
    
    print("✓ Cleared existing data")
    
    # Seed Categories
    categories = [
        {"_id": "cat_gaming", "name": "Gaming", "slug": "gaming", "icon": "gamepad", "display_order": 1, "is_active": True},
        {"_id": "cat_streaming", "name": "Streaming", "slug": "streaming", "icon": "tv", "display_order": 2, "is_active": True},
        {"_id": "cat_giftcards", "name": "Gift Cards", "slug": "gift-cards", "icon": "gift", "display_order": 3, "is_active": True},
        {"_id": "cat_software", "name": "Software", "slug": "software", "icon": "code", "display_order": 4, "is_active": True},
    ]
    await db.categories.insert_many(categories)
    print(f"✓ Seeded {len(categories)} categories")
    
    # Seed Products
    products = [
        {
            "_id": "prod_netflix",
            "name": "Netflix Gift Card",
            "slug": "netflix-gift-card",
            "description": "Netflix Premium subscription gift cards. Instant delivery. Works worldwide. Enjoy unlimited movies, TV shows, and documentaries with no ads. Perfect for entertainment lovers!",
            "category_id": "cat_streaming",
            "image_url": "https://images.pexels.com/photos/10330108/pexels-photo-10330108.jpeg?auto=compress&cs=tinysrgb&w=800",
            "base_price": 15.99,
            "currency": "USD",
            "in_stock": True,
            "featured": True,
            "flash_sale": False,
            "is_active": True,
            "variations": [
                {"id": "v1", "name": "1 Month", "price": 15.99, "original_price": 19.99},
                {"id": "v2", "name": "3 Months", "price": 42.99, "original_price": 54.99},
                {"id": "v3", "name": "6 Months", "price": 79.99, "original_price": 99.99},
            ],
            "regions": ["US", "UK", "EU", "Global"],
            "display_order": 1,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "_id": "prod_spotify",
            "name": "Spotify Premium",
            "slug": "spotify-premium",
            "description": "Spotify Premium subscription. Ad-free music streaming. Offline downloads. High quality audio. Access to 90+ million songs and podcasts.",
            "category_id": "cat_streaming",
            "image_url": "https://images.pexels.com/photos/31884818/pexels-photo-31884818.jpeg?auto=compress&cs=tinysrgb&w=800",
            "base_price": 9.99,
            "currency": "USD",
            "in_stock": True,
            "featured": True,
            "flash_sale": True,
            "is_active": True,
            "variations": [
                {"id": "v1", "name": "1 Month", "price": 9.99, "original_price": 12.99},
                {"id": "v2", "name": "3 Months", "price": 27.99, "original_price": 35.99},
            ],
            "regions": ["US", "UK", "EU", "Global"],
            "display_order": 2,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "_id": "prod_pubg",
            "name": "PUBG Mobile UC",
            "slug": "pubg-uc",
            "description": "PUBG Mobile Unknown Cash (UC). Get your UC instantly. All regions supported. Use for skins, royal pass, and more. Fast and secure delivery.",
            "category_id": "cat_gaming",
            "image_url": "https://images.pexels.com/photos/14583222/pexels-photo-14583222.jpeg?auto=compress&cs=tinysrgb&w=800",
            "base_price": 4.99,
            "currency": "USD",
            "in_stock": True,
            "featured": True,
            "flash_sale": True,
            "is_active": True,
            "variations": [
                {"id": "v1", "name": "60 UC", "price": 4.99, "original_price": 5.99},
                {"id": "v2", "name": "300 UC", "price": 19.99, "original_price": 24.99},
                {"id": "v3", "name": "600 UC", "price": 39.99, "original_price": 49.99},
                {"id": "v4", "name": "1500 UC", "price": 99.99, "original_price": 119.99},
            ],
            "regions": ["Global"],
            "display_order": 3,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "_id": "prod_steam",
            "name": "Steam Wallet Code",
            "slug": "steam-wallet",
            "description": "Steam Wallet codes for your gaming needs. Instant delivery. Multiple denominations. Buy games, DLC, and in-game items on Steam.",
            "category_id": "cat_gaming",
            "image_url": "https://images.pexels.com/photos/14402043/pexels-photo-14402043.jpeg?auto=compress&cs=tinysrgb&w=800",
            "base_price": 20.00,
            "currency": "USD",
            "in_stock": True,
            "featured": True,
            "flash_sale": False,
            "is_active": True,
            "variations": [
                {"id": "v1", "name": "$10", "price": 10.00, "original_price": 10.00},
                {"id": "v2", "name": "$20", "price": 20.00, "original_price": 20.00},
                {"id": "v3", "name": "$50", "price": 50.00, "original_price": 50.00},
                {"id": "v4", "name": "$100", "price": 100.00, "original_price": 100.00},
            ],
            "regions": ["US", "EU", "Asia"],
            "display_order": 4,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "_id": "prod_psplus",
            "name": "PlayStation Plus",
            "slug": "playstation-plus",
            "description": "PlayStation Plus subscription. Free monthly games. Online multiplayer access. Exclusive discounts and early access to demos.",
            "category_id": "cat_gaming",
            "image_url": "https://images.pexels.com/photos/4219885/pexels-photo-4219885.jpeg?auto=compress&cs=tinysrgb&w=800",
            "base_price": 24.99,
            "currency": "USD",
            "in_stock": True,
            "featured": False,
            "flash_sale": False,
            "is_active": True,
            "variations": [
                {"id": "v1", "name": "1 Month", "price": 24.99, "original_price": 29.99},
                {"id": "v2", "name": "3 Months", "price": 69.99, "original_price": 84.99},
                {"id": "v3", "name": "12 Months", "price": 239.99, "original_price": 299.99},
            ],
            "regions": ["US", "UK", "EU"],
            "display_order": 5,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "_id": "prod_freefire",
            "name": "Free Fire Diamonds",
            "slug": "free-fire-diamonds",
            "description": "Garena Free Fire Diamonds. Fast delivery. Best prices guaranteed. Get exclusive characters, skins, and bundles.",
            "category_id": "cat_gaming",
            "image_url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop",
            "base_price": 9.99,
            "currency": "USD",
            "in_stock": True,
            "featured": True,
            "flash_sale": True,
            "is_active": True,
            "variations": [
                {"id": "v1", "name": "100 Diamonds", "price": 9.99, "original_price": 11.99},
                {"id": "v2", "name": "310 Diamonds", "price": 29.99, "original_price": 34.99},
                {"id": "v3", "name": "520 Diamonds", "price": 49.99, "original_price": 59.99},
            ],
            "regions": ["Global"],
            "display_order": 6,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
    ]
    await db.products.insert_many(products)
    print(f"✓ Seeded {len(products)} products")
    
    # Seed Reviews
    reviews = [
        {
            "_id": "rev_1",
            "reviewer_name": "Alex Johnson",
            "rating": 5,
            "comment": "Super fast delivery! Got my PUBG UC within minutes. Highly recommended!",
            "product_id": "prod_pubg",
            "verified": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "_id": "rev_2",
            "reviewer_name": "Sarah Miller",
            "rating": 5,
            "comment": "Best prices for Netflix gift cards. Always shop here!",
            "product_id": "prod_netflix",
            "verified": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "_id": "rev_3",
            "reviewer_name": "Mike Chen",
            "rating": 5,
            "comment": "Excellent service. Steam codes work perfectly. Will buy again.",
            "product_id": "prod_steam",
            "verified": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "_id": "rev_4",
            "reviewer_name": "Emily Davis",
            "rating": 4,
            "comment": "Great prices and fast delivery. Customer support is responsive too.",
            "product_id": "prod_spotify",
            "verified": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "_id": "rev_5",
            "reviewer_name": "David Wilson",
            "rating": 5,
            "comment": "Been using this site for months. Never had any issues. Trustworthy!",
            "product_id": "prod_psplus",
            "verified": True,
            "is_active": True,
            "created_at": datetime.now(timezone.utc)
        },
    ]
    await db.reviews.insert_many(reviews)
    print(f"✓ Seeded {len(reviews)} reviews")
    
    # Seed FAQs
    faqs = [
        {
            "_id": "faq_1",
            "question": "How fast is the delivery?",
            "answer": "Most orders are delivered instantly or within 5-30 minutes. Some products may take up to 24 hours during high demand.",
            "display_order": 1,
            "is_active": True
        },
        {
            "_id": "faq_2",
            "question": "Are the products genuine?",
            "answer": "Yes! All our products are 100% genuine and sourced directly from authorized distributors.",
            "display_order": 2,
            "is_active": True
        },
        {
            "_id": "faq_3",
            "question": "What payment methods do you accept?",
            "answer": "We accept credit/debit cards, PayPal, cryptocurrency, and various local payment methods.",
            "display_order": 3,
            "is_active": True
        },
        {
            "_id": "faq_4",
            "question": "Can I get a refund?",
            "answer": "Refunds are available if the product code doesn't work or if there's an issue with your order. Please contact support within 24 hours.",
            "display_order": 4,
            "is_active": True
        },
        {
            "_id": "faq_5",
            "question": "Do you offer customer support?",
            "answer": "Yes! Our customer support team is available 24/7 via WhatsApp, email, and live chat.",
            "display_order": 5,
            "is_active": True
        },
    ]
    await db.faqs.insert_many(faqs)
    print(f"✓ Seeded {len(faqs)} FAQs")
    
    # Seed Notification Bar
    notification_bar = {
        "_id": "notif_1",
        "message": "🔥 Flash Sale! Up to 30% OFF on all gaming products. Limited time offer!",
        "link": "/?category=gaming",
        "background_color": "#F5A623",
        "text_color": "#000000",
        "enabled": True,
        "updated_at": datetime.now(timezone.utc)
    }
    await db.notification_bar.insert_one(notification_bar)
    print("✓ Seeded notification bar")
    
    # Seed Social Links
    social_links = {
        "_id": "social_1",
        "whatsapp": "https://wa.me/9779743488871",
        "facebook": "https://facebook.com/gangbro",
        "instagram": "https://instagram.com/gangbro",
        "tiktok": "https://tiktok.com/@gangbro",
        "twitter": "https://twitter.com/gangbro",
        "updated_at": datetime.now(timezone.utc)
    }
    await db.social_links.insert_one(social_links)
    print("✓ Seeded social links")
    
    # Seed Payment Methods
    payment_methods = [
        {"_id": "pay_1", "name": "Credit Card", "icon": "credit-card", "enabled": True, "display_order": 1},
        {"_id": "pay_2", "name": "PayPal", "icon": "paypal", "enabled": True, "display_order": 2},
        {"_id": "pay_3", "name": "Cryptocurrency", "icon": "bitcoin", "enabled": True, "display_order": 3},
        {"_id": "pay_4", "name": "Bank Transfer", "icon": "bank", "enabled": False, "display_order": 4},
    ]
    await db.payment_methods.insert_many(payment_methods)
    print(f"✓ Seeded {len(payment_methods)} payment methods")
    
    print("\n✅ Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed_database())
