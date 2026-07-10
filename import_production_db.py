#!/usr/bin/env python3
"""Import full production database from documentation into local MongoDB."""
from pymongo import MongoClient
import uuid
import json
from datetime import datetime, timezone

client = MongoClient('mongodb://localhost:27017')
db = client['test_database']

def uid():
    return str(uuid.uuid4())

now = datetime.now(timezone.utc).isoformat()

# ============================================================
# 1. CATEGORIES (4)
# ============================================================
print("=== Importing Categories ===")
db['categories'].drop()
categories = [
    {"_id": "6978dea34205b3e786d20b4d", "id": "c5b86244-fa4c-4227-94bf-b3eb349e17fa", "name": "SUBSCRIPTIONS", "slug": "subscriptions"},
    {"_id": "697a160ce223869489c7354d", "id": "57a34044-8d4d-4e3e-966f-e41271559075", "name": "GAME SERVICE", "slug": "game-service"},
    {"_id": "6990514470b142ceda56f741", "id": "861537a3-d987-4042-82af-fa50331a2753", "name": "Others", "slug": "others"},
    {"_id": "69bfc83119995eea03283c36", "id": "537fb194-b862-44c9-bd8d-454eff700067", "name": "Bundles", "slug": "bundles"},
]
db['categories'].insert_many(categories)
print(f"  Imported {len(categories)} categories")

# ============================================================
# 2. ADMINS (3) - Fix permissions
# ============================================================
print("=== Updating Admins ===")
db['admins'].drop()
admins = [
    {
        "_id": "6991cc1ace20e88b47db6d8e",
        "id": "admin_main",
        "username": "gsnadmin",
        "email": "gsnadmin@gameshopnepal.com",
        "name": "Main Admin",
        "password": "821be41430dfd530eadcbc615d5d1d04bce620f8f0f19c450b80526ea86c6aa0",
        "role": "main_admin",
        "is_main_admin": True,
        "is_active": True,
        "permissions": ["all"],
        "created_at": "2026-02-15T19:22:30+00:00",
        "last_login": "2026-04-16T17:51:37+00:00"
    },
    {
        "_id": "6991e36a2fd26e139733a773",
        "id": "admin_suyogs",
        "username": "suyogs",
        "email": "suyogshakya50@gmail.com",
        "name": "Suyog Shakya",
        "password": "60a0766b46c88837eb31104322aa9e3c9500382254eea117c6f57f78534b2cac",
        "role": "staff",
        "is_main_admin": False,
        "is_active": True,
        "permissions": ["view_dashboard", "view_orders", "manage_orders", "view_products"],
        "created_at": "2026-02-15T21:01:58+00:00",
        "created_by": "admin-fixed",
        "last_login": "2026-04-16T15:23:27+00:00"
    },
    {
        "_id": "69b4d8b24f9562922baef2ca",
        "id": "admin_susma",
        "username": "susma",
        "email": "a@gmail.com",
        "name": "Susma",
        "password": "5de5723d5c5e9ab583ff56798e7c124e0b0e5ae3199e40e4acc96f073b66cfb7",
        "role": "staff",
        "is_main_admin": False,
        "is_active": True,
        "permissions": ["view_dashboard", "view_orders"],
        "created_at": "2026-03-14T09:25:34+00:00",
        "created_by": "admin_main",
        "last_login": "2026-03-15T16:04:52+00:00"
    },
]
db['admins'].insert_many(admins)
print(f"  Imported {len(admins)} admins")

# ============================================================
# 3. PERMISSIONS (20)
# ============================================================
print("=== Importing Permissions ===")
db['permissions'].drop()
permissions = [
    {"id": "view_dashboard", "name": "View Dashboard", "category": "Dashboard"},
    {"id": "view_orders", "name": "View Orders", "category": "Orders"},
    {"id": "manage_orders", "name": "Manage Orders (Update Status)", "category": "Orders"},
    {"id": "view_products", "name": "View Products", "category": "Products"},
    {"id": "manage_products", "name": "Add/Edit/Delete Products", "category": "Products"},
    {"id": "view_categories", "name": "View Categories", "category": "Categories"},
    {"id": "manage_categories", "name": "Add/Edit/Delete Categories", "category": "Categories"},
    {"id": "view_reviews", "name": "View Reviews", "category": "Reviews"},
    {"id": "manage_reviews", "name": "Add/Edit/Delete Reviews", "category": "Reviews"},
    {"id": "view_customers", "name": "View Customers", "category": "Customers"},
    {"id": "manage_customers", "name": "Manage Customers", "category": "Customers"},
    {"id": "manage_blog", "name": "Manage Blog Posts", "category": "Content"},
    {"id": "manage_faqs", "name": "Manage FAQs", "category": "Content"},
    {"id": "manage_pages", "name": "Manage Static Pages", "category": "Content"},
    {"id": "manage_payment_methods", "name": "Manage Payment Methods", "category": "Settings"},
    {"id": "manage_promo_codes", "name": "Manage Promo Codes", "category": "Settings"},
    {"id": "manage_social_links", "name": "Manage Social Links", "category": "Settings"},
    {"id": "manage_notification_bar", "name": "Manage Notification Bar", "category": "Settings"},
    {"id": "view_analytics", "name": "View Analytics", "category": "Analytics"},
    {"id": "manage_reseller_plans", "name": "Manage Reseller Plans", "category": "Settings"},
]
db['permissions'].insert_many(permissions)
print(f"  Imported {len(permissions)} permissions")

# ============================================================
# 4. SOCIAL LINKS (6)
# ============================================================
print("=== Importing Social Links ===")
db['social_links'].drop()
social_links = [
    {"id": uid(), "platform": "Facebook", "url": "https://www.facebook.com/share/1X9fnJ32mC/?mibextid=wwXIfr", "icon": "facebook", "sort_order": 0},
    {"id": uid(), "platform": "Instagram", "url": "https://instagram.com/gameshopnepal.co", "icon": "instagram", "sort_order": 1},
    {"id": uid(), "platform": "WhatsApp", "url": "https://wa.me/9779743488871", "icon": "whatsapp", "sort_order": 2},
    {"id": uid(), "platform": "Discord", "url": "https://discord.gg/JgUGPaH9fs", "icon": "discord", "sort_order": 3},
    {"id": uid(), "platform": "TikTok", "url": "https://tiktok.com/@gameshopnepal", "icon": "tiktok", "sort_order": 4},
    {"id": uid(), "platform": "Telegram", "url": "https://t.me/dotzgg", "icon": "telegram", "sort_order": 5},
]
db['social_links'].insert_many(social_links)
print(f"  Imported {len(social_links)} social links")

# ============================================================
# 5. PAYMENT METHODS (3)
# ============================================================
print("=== Importing Payment Methods ===")
db['payment_methods'].drop()
instructions = "📌 Please enter your WhatsApp number in the remarks section.\n🚫 Do NOT write \"Netflix,\" \"YouTube Premium,\" or any similar product names."
payment_methods = [
    {
        "_id": "697db94e049d67f4fd7caa67",
        "id": uid(),
        "name": "eSewa QR",
        "image_url": "",
        "qr_code_url": "",
        "merchant_name": "Game Shop Nepal",
        "phone_number": "9743488871 / 9705070222",
        "instructions": instructions,
        "is_active": True,
        "sort_order": 0
    },
    {
        "_id": "697db9ae049d67f4fd7caa69",
        "id": uid(),
        "name": "Khalti QR",
        "image_url": "",
        "qr_code_url": "",
        "merchant_name": "Game Shop Nepal",
        "phone_number": "9705070222",
        "instructions": instructions,
        "is_active": True,
        "sort_order": 1
    },
    {
        "_id": "697db9e3049d67f4fd7caa6a",
        "id": uid(),
        "name": "Bank QR",
        "image_url": "",
        "qr_code_url": "",
        "merchant_name": "Sushant Poudel",
        "phone_number": "9847057346",
        "instructions": instructions,
        "is_active": True,
        "sort_order": 2
    },
]
db['payment_methods'].insert_many(payment_methods)
print(f"  Imported {len(payment_methods)} payment methods")

# ============================================================
# 6. SITE SETTINGS (4 docs)
# ============================================================
print("=== Importing Site Settings ===")
db['site_settings'].drop()
site_settings = [
    {
        "_id": "697bac0769e61460e72ea9f5",
        "id": uid(),
        "service_charge": 10,
        "tax_label": "Tax",
        "tax_percentage": 7
    },
    {
        "_id": "69b5708da01a893cd3a3f66c",
        "id": uid(),
        "review_reward_enabled": True,
        "review_reward_percentage": 10
    },
    {
        "_id": "69bd5b05a01a893cd3a47c7d",
        "id": uid(),
        "order_webhook": "https://discord.com/api/webhooks/1479816863235051615/sDf1bbaOlCHsatIH3VirbvXMPoIToSVPz71R_jIxFY5brnLODt7pXVbMop3SGzPfrf0r",
        "payment_webhook": "https://discord.com/api/webhooks/1481673730177372284/placeholder"
    },
    {
        "_id": "69cfe77ffe1a877825a8f45c",
        "id": uid(),
        "smtp_host": "smtp.gmail.com",
        "smtp_port": 587,
        "smtp_user": "support@gameshopnepal.com",
        "smtp_password": "tsqw crvt ajgl tehm",
        "smtp_from_name": "GameShop Nepal",
        "smtp_from_email": "support@gameshopnepal.com"
    },
]
db['site_settings'].insert_many(site_settings)
print(f"  Imported {len(site_settings)} site settings docs")

# ============================================================
# 7. FAQs (16)
# ============================================================
print("=== Importing FAQs ===")
db['faqs'].drop()
faqs = [
    {"id": uid(), "question": "How do I place an order?", "answer": "Simply browse our products, select the plan you want, and click 'Order Now'. This will redirect you to WhatsApp where you can complete your order.", "sort_order": 0, "category": "Ordering"},
    {"id": uid(), "question": "How long does delivery take?", "answer": "Most products are delivered instantly or within a few minutes after payment confirmation. Some products may take up to 24 hours during peak times.", "sort_order": 1, "category": "Delivery"},
    {"id": uid(), "question": "What payment methods do you accept?", "answer": "We accept eSewa, Khalti, bank transfer, and other local payment methods available in Nepal.", "sort_order": 2, "category": "Payments"},
    {"id": uid(), "question": "Are your products genuine?", "answer": "Yes, 100% genuine. All our products are sourced directly from authorized channels. We guarantee authenticity on every product.", "sort_order": 3, "category": "General"},
    {"id": uid(), "question": "What is Game Shop Nepal?", "answer": "Game Shop Nepal is an online store providing digital game items, subscriptions, and services at competitive prices for the Nepali market.", "sort_order": 4, "category": "General"},
    {"id": uid(), "question": "Do I need an account to make a purchase?", "answer": "No, you can buy as a guest. However, creating an account helps you track your orders and access exclusive rewards.", "sort_order": 5, "category": "Support"},
    {"id": uid(), "question": "What if my item isn't delivered?", "answer": "Contact our support team with your order details and we'll resolve it promptly. Reach us via WhatsApp or the Contact Us page.", "sort_order": 7, "category": "Delivery"},
    {"id": uid(), "question": "Why are your prices lower than some other sites?", "answer": "We focus on competitive sourcing while maintaining quality and authenticity. Our partnerships allow us to offer the best prices in Nepal.", "sort_order": 8, "category": "Ordering"},
    {"id": uid(), "question": "What information do I need to provide?", "answer": "Only your game ID, character ID, or account identifier. We never ask for your passwords.", "sort_order": 10, "category": "Ordering"},
    {"id": uid(), "question": "Is my data secure?", "answer": "Yes, we use secure systems and industry-standard protection to keep your data safe.", "sort_order": 11, "category": "Support"},
    {"id": uid(), "question": "Can I get a refund?", "answer": "Due to the digital nature of our products, refunds are only possible in specific cases such as non-delivery or wrong product. Contact support for assistance.", "sort_order": 12, "category": "Support"},
    {"id": uid(), "question": "What if my top-up or subscription doesn't work?", "answer": "Please provide your order number and error details. Our team will investigate and resolve the issue as quickly as possible.", "sort_order": 13, "category": "Delivery"},
    {"id": uid(), "question": "How do I get help if I have a problem?", "answer": "Reach out to us via the Contact Us page, WhatsApp, or Discord. Our support team is available to assist you.", "sort_order": 14, "category": "Support"},
    {"id": uid(), "question": "What kinds of products do you sell?", "answer": "We sell digital subscriptions (Netflix, Spotify, YouTube Premium, etc.), game currencies, in-game items, and various digital services.", "sort_order": 15, "category": "General"},
    {"id": uid(), "question": "Can I cancel or change my order?", "answer": "Digital orders are processed instantly and usually cannot be cancelled or changed. Please double-check your order before confirming.", "sort_order": 16, "category": "Ordering"},
]
db['faqs'].insert_many(faqs)
print(f"  Imported {len(faqs)} FAQs")

# ============================================================
# 8. PROMO CODES (2 standard + 3 sample review codes)
# ============================================================
print("=== Importing Promo Codes ===")
db['promo_codes'].drop()
promo_codes = [
    {
        "id": uid(), "code": "REVIEWED", "discount_type": "percentage", "discount_value": 10.0,
        "min_order_amount": 0.0, "max_uses": None, "used_count": 6, "is_active": True,
        "created_at": "2026-03-01T00:00:00+00:00"
    },
    {
        "id": uid(), "code": "NEWBUY", "discount_type": "percentage", "discount_value": 8.0,
        "min_order_amount": 0.0, "max_uses": None, "used_count": 18, "is_active": True,
        "created_at": "2026-03-01T00:00:00+00:00"
    },
    {
        "id": uid(), "code": "REVIEW-683F2C5C", "discount_type": "percentage", "discount_value": 10.0,
        "min_order_amount": 0.0, "max_uses": 1, "used_count": 0, "is_active": True, "is_single_use": True,
        "email": "samundrapunky@gmail.com",
        "created_at": "2026-04-15T00:00:00+00:00", "expires_at": "2026-05-15T00:00:00+00:00"
    },
    {
        "id": uid(), "code": "REVIEW-3656E1C8", "discount_type": "percentage", "discount_value": 10.0,
        "min_order_amount": 0.0, "max_uses": 1, "used_count": 0, "is_active": True, "is_single_use": True,
        "email": "thanetmanish3@gmail.com",
        "created_at": "2026-04-13T00:00:00+00:00", "expires_at": "2026-05-13T00:00:00+00:00"
    },
    {
        "id": uid(), "code": "REVIEW-B5CF3DF8", "discount_type": "percentage", "discount_value": 10.0,
        "min_order_amount": 0.0, "max_uses": 1, "used_count": 0, "is_active": True, "is_single_use": True,
        "email": "pilot.abhi350@gmail.com",
        "created_at": "2026-04-13T00:00:00+00:00", "expires_at": "2026-05-13T00:00:00+00:00"
    },
]
db['promo_codes'].insert_many(promo_codes)
print(f"  Imported {len(promo_codes)} promo codes (2 standard + 3 sample review codes)")

# ============================================================
# 9. REFERRALS (8 sample from docs)
# ============================================================
print("=== Importing Referrals ===")
db['referrals'].drop()
referrals = [
    {"_id": "69ddff156b24a9fd281cea97", "id": uid(), "referrer_email": "gurungjita900@gmail.com", "referee_email": "gurungjitraj123@gmail.com", "referral_code": "DHWC4SNO", "referee_reward": 10, "referrer_pending": 10, "credited": False, "created_at": now},
    {"_id": "69ddfea06b24a9fd281cea8c", "id": uid(), "referrer_email": "gurungjita900@gmail.com", "referee_email": "gurungjita300@gmail.com", "referral_code": "DHWC4SNO", "referee_reward": 10, "referrer_pending": 10, "credited": False, "created_at": now},
    {"_id": "69d7f9586b24a9fd281cdc18", "id": uid(), "referrer_email": "rahulgahatraj2007@gmail.com", "referee_email": "sertrvbh@gmail.com", "referral_code": "2DNPLWUM", "referee_reward": 10, "referrer_pending": 10, "credited": False, "created_at": now},
    {"_id": "69d7f6c16b24a9fd281cdc0b", "id": uid(), "referrer_email": "rahulgahatraj2007@gmail.com", "referee_email": "cdramafiesta@gmail.com", "referral_code": "2DNPLWUM", "referee_reward": 10, "referrer_pending": 10, "credited": False, "created_at": now},
    {"_id": "69d7d7dd6b24a9fd281cdbe0", "id": uid(), "referrer_email": "sirjandangi53@gmail.com", "referee_email": "sirishdangi721@gmail.com", "referral_code": "M22FGRCR", "referee_reward": 10, "referrer_pending": 10, "credited": False, "created_at": now},
    {"_id": "69d7ad7f6b24a9fd281cdb57", "id": uid(), "referrer_email": "xitij.phuyal@gmail.com", "referee_email": "unknounnaruto@gmail.com", "referral_code": "ROJTOTR8", "referee_reward": 10, "referrer_pending": 10, "credited": False, "created_at": now},
    {"_id": "69cd21efbf5f8da18def3c25", "id": uid(), "referrer_email": "rahulgahatraj2007@gmail.com", "referee_email": "cdramajewel4@gmail.com", "referral_code": "2DNPLWUM", "referee_reward": 10, "referrer_pending": 10, "credited": False, "created_at": now},
    {"_id": "69ca6263d03aba6a13d529e9", "id": uid(), "referrer_email": "taragiri2954@gmail.com", "referee_email": "ratanrajgiri57@gmail.com", "referral_code": "KUSSN77D", "referee_reward": 10, "referrer_pending": 10, "credited": False, "created_at": now},
]
db['referrals'].insert_many(referrals)
print(f"  Imported {len(referrals)} referrals (8 of 24 from docs)")

# ============================================================
# 10. RESELLER PLANS (3)
# ============================================================
print("=== Importing Reseller Plans ===")
db['reseller_plans'].drop()
reseller_plans = [
    {
        "_id": "69ac48949b2141ef5b124f63", "id": uid(),
        "name": "Bronze Tier", "price": 499, "discount_percentage": 3, "duration": "1 Month",
        "features": ["3% discount on all products", "Basic support", "Access to all products"],
        "is_active": True, "is_popular": False, "sort_order": 0, "created_at": now
    },
    {
        "_id": "69dd00066b24a9fd281ce8e9", "id": uid(),
        "name": "Silver Tier", "price": 999, "discount_percentage": 5, "duration": "1 Month",
        "features": ["5% discount on all products", "Priority support", "Access to all products", "Early access to new products"],
        "is_active": True, "is_popular": True, "sort_order": 1, "created_at": now
    },
    {
        "_id": "69dd00966b24a9fd281ce8eb", "id": uid(),
        "name": "Gold Tier", "price": 1999, "discount_percentage": 10, "duration": "1 Month",
        "features": ["10% discount on all products", "VIP support", "Access to all products", "Early access + exclusive deals"],
        "is_active": True, "is_popular": False, "sort_order": 2, "created_at": now
    },
]
db['reseller_plans'].insert_many(reseller_plans)
print(f"  Imported {len(reseller_plans)} reseller plans")

# ============================================================
# 11. PRODUCTS (36)
# ============================================================
print("=== Importing Products ===")

# Load existing products to preserve their descriptions/images/variations
with open('/tmp/existing_products.json') as f:
    existing = json.load(f)

existing_map = {}
name_map = {
    "NETFLIX | PREMIUM | PROFILE": "NETFLIX PREMIUM PROFILE",
    "SPOTIFY PREMIUM": "SPOTIFY PREMIUM",
    "PRIME VIDEO ": "PRIME VIDEO",
    "PRIME VIDEO": "PRIME VIDEO",
    "YOUTUBE PREMIUM": "YOUTUBE PREMIUM",
    "RED DEAD REDEMPTION II": "RED DEAD REDEMPTION II",
}
for p in existing:
    mapped = name_map.get(p['name'], p['name'])
    existing_map[mapped] = p

CAT_SUB = "c5b86244-fa4c-4227-94bf-b3eb349e17fa"
CAT_GAME = "57a34044-8d4d-4e3e-966f-e41271559075"
CAT_OTHER = "861537a3-d987-4042-82af-fa50331a2753"
CAT_BUNDLE = "537fb194-b862-44c9-bd8d-454eff700067"

def make_vars(count):
    return [{"id": f"var-{uid()[:8]}", "name": f"Option {i+1}", "price": 0, "original_price": 0, "description": None} for i in range(count)]

product_defs = [
    # Subscriptions
    {"name": "YOUTUBE PREMIUM", "slug": "youtube-premium", "cat": CAT_SUB, "sort": 0, "active": True, "sold": False, "tags": ["Popular"], "vars": 4},
    {"name": "NETFLIX PREMIUM PROFILE", "slug": "netflix", "cat": CAT_SUB, "sort": 1, "active": True, "sold": False, "tags": ["Popular"], "vars": 4},
    {"name": "PRIME VIDEO", "slug": "prime-video", "cat": CAT_SUB, "sort": 3, "active": True, "sold": False, "tags": [], "vars": 4},
    {"name": "CRUNCHYROLL MEGAFAN", "slug": "crunchyroll", "cat": CAT_SUB, "sort": 3, "active": True, "sold": False, "tags": [], "vars": 2},
    {"name": "CHATGPT", "slug": "chatgpt", "cat": CAT_SUB, "sort": 4, "active": False, "sold": True, "tags": [], "vars": 2},
    {"name": "SPOTIFY PREMIUM", "slug": "spotify-premium", "cat": CAT_SUB, "sort": 6, "active": True, "sold": False, "tags": ["Popular"], "vars": 5},
    {"name": "CANVA PRO", "slug": "canva-pro", "cat": CAT_SUB, "sort": 9, "active": True, "sold": False, "tags": [], "vars": 2},
    {"name": "NordVPN", "slug": "nordvpn", "cat": CAT_SUB, "sort": 11, "active": True, "sold": False, "tags": [], "vars": 2},
    {"name": "Gemini PRO", "slug": "google-drive", "cat": CAT_SUB, "sort": 13, "active": True, "sold": False, "tags": [], "vars": 2},
    {"name": "EMERGENT AI", "slug": "emergent-ai", "cat": CAT_SUB, "sort": 15, "active": False, "sold": False, "tags": [], "vars": 1},
    {"name": "CapCut PRO", "slug": "capcut-pro", "cat": CAT_SUB, "sort": 18, "active": True, "sold": False, "tags": [], "vars": 1},
    # Game Service
    {"name": "RED DEAD REDEMPTION II", "slug": "rdr2", "cat": CAT_GAME, "sort": 5, "active": True, "sold": False, "tags": [], "vars": 1},
    {"name": "Mobile Legends : Bang Bang", "slug": "mlbb", "cat": CAT_GAME, "sort": 7, "active": True, "sold": False, "tags": ["Popular"], "vars": 10},
    {"name": "PUBG MOBILE", "slug": "pubg", "cat": CAT_GAME, "sort": 10, "active": True, "sold": False, "tags": ["Popular"], "vars": 9},
    {"name": "Valorant Points", "slug": "valorant", "cat": CAT_GAME, "sort": 12, "active": True, "sold": False, "tags": [], "vars": 6},
    {"name": "MINECRAFT JAVA + BEDROCK", "slug": "minecraft", "cat": CAT_GAME, "sort": 14, "active": True, "sold": False, "tags": [], "vars": 2},
    {"name": "Clash of Clans Topup", "slug": "coc", "cat": CAT_GAME, "sort": 16, "active": True, "sold": False, "tags": [], "vars": 9},
    {"name": "GTA V Premium Edition", "slug": "gta5", "cat": CAT_GAME, "sort": 17, "active": True, "sold": False, "tags": [], "vars": 5},
    {"name": "EA SPORTS FC 25", "slug": "ea-sports-fc-25", "cat": CAT_GAME, "sort": 19, "active": True, "sold": False, "tags": [], "vars": 1},
    {"name": "Fortnite Topup [via login]", "slug": "fortnite-topup", "cat": CAT_GAME, "sort": 21, "active": True, "sold": False, "tags": [], "vars": 5},
    {"name": "Black Myth: Wukong Deluxe Edition", "slug": "black-myth-wukong-deluxe-editon", "cat": CAT_GAME, "sort": 25, "active": True, "sold": False, "tags": [], "vars": 1},
    {"name": "Clash Royal Topup", "slug": "cr", "cat": CAT_GAME, "sort": 27, "active": True, "sold": False, "tags": [], "vars": 9},
    {"name": "Robux Giftcard", "slug": "robux", "cat": CAT_GAME, "sort": 28, "active": True, "sold": False, "tags": [], "vars": 6},
    # Others
    {"name": "140+ AAA Games Steam Bundle", "slug": "steam-bundle", "cat": CAT_OTHER, "sort": 20, "active": True, "sold": False, "tags": [], "vars": 1},
    {"name": "200+ Games Steam Bundle", "slug": "200games", "cat": CAT_OTHER, "sort": 22, "active": True, "sold": False, "tags": [], "vars": 1},
    {"name": "APPLE Giftcard US", "slug": "apple-giftcard", "cat": CAT_OTHER, "sort": 23, "active": True, "sold": False, "tags": [], "vars": 6},
    {"name": "Xbox Game Pass", "slug": "xbox-game-pass", "cat": CAT_OTHER, "sort": 24, "active": True, "sold": False, "tags": [], "vars": 4},
    {"name": "Chess Diamond Membership", "slug": "chess-diamond-membership", "cat": CAT_OTHER, "sort": 26, "active": True, "sold": False, "tags": [], "vars": 1},
    {"name": "Binance Topup", "slug": "binance-", "cat": CAT_OTHER, "sort": 29, "active": True, "sold": False, "tags": [], "vars": 1},
    {"name": "Lifetime PC Game Pass", "slug": "gamepass", "cat": CAT_OTHER, "sort": 30, "active": True, "sold": False, "tags": [], "vars": 1},
    {"name": "Steam Gift Card (GLOBAL)", "slug": "steam-gc", "cat": CAT_OTHER, "sort": 31, "active": True, "sold": False, "tags": [], "vars": 5},
    {"name": "Windows 11 PRO", "slug": "windows11", "cat": CAT_OTHER, "sort": 32, "active": True, "sold": False, "tags": [], "vars": 1},
    {"name": "Discord Services", "slug": "discord-services", "cat": CAT_OTHER, "sort": 33, "active": True, "sold": True, "tags": [], "vars": 1},
    {"name": "Claude AI Pro", "slug": "claude-ai-pro", "cat": CAT_OTHER, "sort": 34, "active": True, "sold": False, "tags": ["Popular"], "vars": 1},
    # Bundles
    {"name": "NETFLIX + PRIME VIDEO", "slug": "netflix-prime", "cat": CAT_BUNDLE, "sort": 8, "active": True, "sold": False, "tags": ["Popular"], "vars": 2},
]

db['products'].drop()
products = []
for pd in product_defs:
    # Check if we have existing data for this product
    ex = existing_map.get(pd['name'])
    doc = {
        "id": uid(),
        "name": pd['name'],
        "slug": pd['slug'],
        "category_id": pd['cat'],
        "sort_order": pd['sort'],
        "is_active": pd['active'],
        "is_sold_out": pd['sold'],
        "tags": pd['tags'],
        "custom_fields": [],
        "created_at": ex.get('created_at', now) if ex else now,
        "description": ex.get('description', '') if ex else '',
        "image_url": ex.get('image_url', '') if ex else '',
        "variations": ex.get('variations', make_vars(pd['vars'])) if ex else make_vars(pd['vars']),
    }
    products.append(doc)

db['products'].insert_many(products)
print(f"  Imported {len(products)} products ({sum(1 for p in products if p['description'])} with full details, rest are stubs)")

# ============================================================
# SUMMARY
# ============================================================
print("\n=== IMPORT SUMMARY ===")
for name in sorted(db.list_collection_names()):
    count = db[name].count_documents({})
    print(f"  {name}: {count}")

client.close()
print("\nDone!")
