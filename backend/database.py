from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv
import os
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env', override=False)

# Create uploads directory
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Google OAuth Config
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')
GOOGLE_CLIENT_SECRET = os.environ.get('GOOGLE_CLIENT_SECRET', '')

# Discord Global Order Webhook
DISCORD_ORDER_WEBHOOK = os.environ.get('DISCORD_ORDER_WEBHOOK', '')

# Take.app Config
TAKEAPP_API_KEY = os.environ.get('TAKEAPP_API_KEY', '')
TAKEAPP_BASE_URL = "https://api.take.app/v1"

# Admin credentials
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "gsnadmin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "gsnadmin")
