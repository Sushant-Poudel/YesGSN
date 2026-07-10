"""
Admin Permission System Setup Script
Creates main admin and permission structure
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from pathlib import Path
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

def hash_password(password: str) -> str:
    """Simple password hashing"""
    return hashlib.sha256(password.encode()).hexdigest()

async def setup_admin_system():
    print("🔐 Setting up admin permission system...")
    
    # Clear existing admins
    await db.admins.delete_many({})
    
    # Create main admin
    main_admin = {
        "_id": "admin_main",
        "username": "sushantgsn",
        "password": hash_password("AAA123bcdef."),
        "email": "admin@gameshopnepal.com",
        "name": "Main Administrator",
        "role": "main_admin",
        "is_active": True,
        "permissions": ["all"],  # Main admin has all permissions
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_login": None
    }
    
    await db.admins.insert_one(main_admin)
    print(f"✓ Created main admin: sushantgsn")
    
    # Define available permissions
    permissions = [
        {"id": "view_dashboard", "name": "View Dashboard", "category": "General"},
        {"id": "view_analytics", "name": "View Analytics", "category": "General"},
        
        {"id": "view_orders", "name": "View Orders", "category": "Orders"},
        {"id": "manage_orders", "name": "Manage Orders (Update Status)", "category": "Orders"},
        {"id": "delete_orders", "name": "Delete Orders", "category": "Orders"},
        
        {"id": "view_products", "name": "View Products", "category": "Products"},
        {"id": "manage_products", "name": "Manage Products (Add/Edit)", "category": "Products"},
        {"id": "delete_products", "name": "Delete Products", "category": "Products"},
        
        {"id": "view_customers", "name": "View Customers", "category": "Customers"},
        {"id": "manage_customers", "name": "Manage Customers", "category": "Customers"},
        
        {"id": "view_categories", "name": "View Categories", "category": "Categories"},
        {"id": "manage_categories", "name": "Manage Categories", "category": "Categories"},
        
        {"id": "view_reviews", "name": "View Reviews", "category": "Reviews"},
        {"id": "manage_reviews", "name": "Manage Reviews", "category": "Reviews"},
        
        {"id": "view_faqs", "name": "View FAQs", "category": "Content"},
        {"id": "manage_faqs", "name": "Manage FAQs", "category": "Content"},
        
        {"id": "view_blog", "name": "View Blog Posts", "category": "Content"},
        {"id": "manage_blog", "name": "Manage Blog Posts", "category": "Content"},
        
        {"id": "view_pages", "name": "View Pages", "category": "Content"},
        {"id": "manage_pages", "name": "Manage Pages", "category": "Content"},
        
        {"id": "view_settings", "name": "View Settings", "category": "Settings"},
        {"id": "manage_settings", "name": "Manage Settings", "category": "Settings"},
        
        {"id": "view_admins", "name": "View Staff/Admins", "category": "Admin Management"},
        {"id": "manage_admins", "name": "Manage Staff/Admins", "category": "Admin Management"},
    ]
    
    await db.permissions.delete_many({})
    await db.permissions.insert_many(permissions)
    print(f"✓ Created {len(permissions)} permission definitions")
    
    # Create example staff admin (can only view orders)
    staff_admin = {
        "_id": "admin_staff_example",
        "username": "staff1",
        "password": hash_password("staff123"),
        "email": "staff1@gameshopnepal.com",
        "name": "Staff Member 1",
        "role": "staff",
        "is_active": True,
        "permissions": ["view_dashboard", "view_orders"],  # Limited permissions
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": "admin_main",
        "last_login": None
    }
    
    await db.admins.insert_one(staff_admin)
    print(f"✓ Created example staff: staff1 (password: staff123)")
    
    print("\n✅ Admin permission system setup complete!")
    print("\n📋 Login Credentials:")
    print("   Main Admin:")
    print("     Username: sushantgsn")
    print("     Password: AAA123bcdef.")
    print("\n   Example Staff:")
    print("     Username: staff1")
    print("     Password: staff123")
    print("     Permissions: View Dashboard, View Orders only")

if __name__ == "__main__":
    asyncio.run(setup_admin_system())
