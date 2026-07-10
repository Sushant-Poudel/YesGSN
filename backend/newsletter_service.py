"""
Newsletter Service Module
Handles bulk newsletter sending with preset templates
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict
import logging
from pathlib import Path
from dotenv import dotenv_values
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
logger = logging.getLogger(__name__)

# Read .env FILE directly — bypasses K8s env vars completely
_FILE_CONFIG = dotenv_values(ROOT_DIR / '.env')
SMTP_HOST = _FILE_CONFIG.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(_FILE_CONFIG.get("SMTP_PORT", "587"))
SMTP_USER = _FILE_CONFIG.get("SMTP_USER", "")
SMTP_PASSWORD = _FILE_CONFIG.get("SMTP_PASSWORD", "")
SMTP_FROM_EMAIL = _FILE_CONFIG.get("SMTP_FROM_EMAIL", "")
SMTP_FROM_NAME = _FILE_CONFIG.get("SMTP_FROM_NAME", "GameShop Nepal")

# Preset Newsletter Templates
NEWSLETTER_TEMPLATES = {
    "new_product": {
        "name": "New Product Launch",
        "subject": "🚀 New Product Alert: {product_name} is Here!",
        "description": "Announce a new product to your customers",
        "variables": ["product_name", "product_description", "product_price", "product_image", "product_link"],
        "html": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #000000; color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #F5A623;">
            <img src="https://customer-assets.emergentagent.com/job_f826d6c3-4354-45f7-8eac-b606d3ae45c3/artifacts/vhexbuqj_gsn.png" alt="GSN" style="width: 60px; height: 60px; border-radius: 10px;" />
            <p style="margin: 10px 0 0; color: #888;">GameShop Nepal</p>
        </div>
        
        <!-- New Product Banner -->
        <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); margin: 20px 0; border-radius: 12px; border: 1px solid #F5A623;">
            <span style="background: #F5A623; color: #000; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold;">NEW ARRIVAL</span>
            <h2 style="color: #ffffff; font-size: 32px; margin: 20px 0 10px;">{product_name}</h2>
            <p style="color: #888; font-size: 16px; margin: 0;">{product_description}</p>
        </div>
        
        <!-- Product Image -->
        {product_image_section}
        
        <!-- Price & CTA -->
        <div style="text-align: center; padding: 30px 0;">
            <p style="color: #F5A623; font-size: 36px; font-weight: bold; margin: 0 0 20px;">Rs {product_price}</p>
            <a href="{product_link}" style="display: inline-block; background: #F5A623; color: #000; padding: 15px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Shop Now →
            </a>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 30px 0; border-top: 1px solid #2a2a2a; margin-top: 20px;">
            <p style="color: #666; margin: 5px 0; font-size: 12px;">GameShop Nepal - Your Trusted Digital Store</p>
            <p style="color: #666; margin: 5px 0; font-size: 11px;">
                <a href="{unsubscribe_link}" style="color: #666;">Unsubscribe</a> | <a href="{website_link}" style="color: #666;">Visit Website</a>
            </p>
        </div>
    </div>
</body>
</html>
"""
    },
    
    "sale_announcement": {
        "name": "Sale Announcement",
        "subject": "🔥 {sale_name} - Up to {discount_percent}% OFF!",
        "description": "Announce a sale or special discount",
        "variables": ["sale_name", "discount_percent", "sale_description", "end_date", "shop_link"],
        "html": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #000000; color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #F5A623;">
            <img src="https://customer-assets.emergentagent.com/job_f826d6c3-4354-45f7-8eac-b606d3ae45c3/artifacts/vhexbuqj_gsn.png" alt="GSN" style="width: 60px; height: 60px; border-radius: 10px;" />
        </div>
        
        <!-- Sale Banner -->
        <div style="text-align: center; padding: 50px 20px; background: linear-gradient(135deg, #F5A623 0%, #FF6B35 100%); margin: 20px 0; border-radius: 12px;">
            <h2 style="color: #000; font-size: 42px; margin: 0; font-weight: 900;">{sale_name}</h2>
            <p style="color: #000; font-size: 72px; font-weight: 900; margin: 10px 0;">{discount_percent}% OFF</p>
            <p style="color: #000; font-size: 16px; margin: 0;">{sale_description}</p>
        </div>
        
        <!-- Countdown -->
        <div style="text-align: center; padding: 20px; background: #1a1a1a; border-radius: 8px; margin: 20px 0;">
            <p style="color: #F5A623; margin: 0; font-size: 14px;">⏰ Sale ends: <strong>{end_date}</strong></p>
        </div>
        
        <!-- CTA -->
        <div style="text-align: center; padding: 30px 0;">
            <a href="{shop_link}" style="display: inline-block; background: #F5A623; color: #000; padding: 18px 60px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px;">
                SHOP THE SALE →
            </a>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 30px 0; border-top: 1px solid #2a2a2a; margin-top: 20px;">
            <p style="color: #666; margin: 5px 0; font-size: 12px;">GameShop Nepal</p>
            <p style="color: #666; margin: 5px 0; font-size: 11px;">
                <a href="{unsubscribe_link}" style="color: #666;">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>
"""
    },
    
    "weekly_update": {
        "name": "Weekly Update",
        "subject": "📬 This Week at GameShop Nepal",
        "description": "Weekly newsletter with updates and highlights",
        "variables": ["greeting_text", "highlight_1", "highlight_2", "highlight_3", "featured_product", "featured_price", "shop_link"],
        "html": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #000000; color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #F5A623;">
            <h1 style="margin: 0; color: #F5A623; font-size: 28px; font-weight: bold;">GSN Weekly</h1>
            <p style="margin: 10px 0 0; color: #888;">Your Digital Products Update</p>
        </div>
        
        <!-- Greeting -->
        <div style="padding: 30px 0;">
            <p style="color: #cccccc; font-size: 16px; line-height: 1.8;">{greeting_text}</p>
        </div>
        
        <!-- Highlights -->
        <div style="background: #0A0A0A; border: 1px solid #2a2a2a; border-radius: 12px; padding: 25px; margin: 20px 0;">
            <h3 style="color: #F5A623; margin: 0 0 20px; font-size: 18px;">📌 This Week's Highlights</h3>
            <ul style="color: #cccccc; line-height: 2.2; padding-left: 20px; margin: 0;">
                <li>{highlight_1}</li>
                <li>{highlight_2}</li>
                <li>{highlight_3}</li>
            </ul>
        </div>
        
        <!-- Featured Product -->
        <div style="text-align: center; padding: 30px; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); border-radius: 12px; border: 1px solid #F5A623; margin: 20px 0;">
            <span style="color: #F5A623; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">Featured This Week</span>
            <h3 style="color: #fff; font-size: 24px; margin: 15px 0;">{featured_product}</h3>
            <p style="color: #F5A623; font-size: 28px; font-weight: bold; margin: 10px 0;">Rs {featured_price}</p>
            <a href="{shop_link}" style="display: inline-block; background: #F5A623; color: #000; padding: 12px 35px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 15px;">
                View Product
            </a>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 30px 0; border-top: 1px solid #2a2a2a; margin-top: 20px;">
            <p style="color: #888; margin: 5px 0;">See you next week! 👋</p>
            <p style="color: #666; margin: 15px 0 5px; font-size: 11px;">
                <a href="{unsubscribe_link}" style="color: #666;">Unsubscribe</a> | <a href="{website_link}" style="color: #666;">Visit Store</a>
            </p>
        </div>
    </div>
</body>
</html>
"""
    },
    
    "restock_alert": {
        "name": "Restock Alert",
        "subject": "🔔 {product_name} is Back in Stock!",
        "description": "Notify customers about restocked products",
        "variables": ["product_name", "product_description", "product_price", "shop_link"],
        "html": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #000000; color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #F5A623;">
            <img src="https://customer-assets.emergentagent.com/job_f826d6c3-4354-45f7-8eac-b606d3ae45c3/artifacts/vhexbuqj_gsn.png" alt="GSN" style="width: 60px; height: 60px; border-radius: 10px;" />
        </div>
        
        <!-- Alert Banner -->
        <div style="text-align: center; padding: 40px 20px; background: #0A0A0A; border: 2px solid #10B981; margin: 20px 0; border-radius: 12px;">
            <span style="background: #10B981; color: #fff; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: bold;">✓ BACK IN STOCK</span>
            <h2 style="color: #ffffff; font-size: 28px; margin: 25px 0 10px;">{product_name}</h2>
            <p style="color: #888; font-size: 14px; margin: 0;">{product_description}</p>
            <p style="color: #F5A623; font-size: 32px; font-weight: bold; margin: 20px 0;">Rs {product_price}</p>
        </div>
        
        <!-- CTA -->
        <div style="text-align: center; padding: 20px 0;">
            <p style="color: #888; margin-bottom: 20px;">⚡ Limited stock available - Order now!</p>
            <a href="{shop_link}" style="display: inline-block; background: #10B981; color: #fff; padding: 15px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Order Now →
            </a>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 30px 0; border-top: 1px solid #2a2a2a; margin-top: 20px;">
            <p style="color: #666; margin: 5px 0; font-size: 12px;">GameShop Nepal</p>
            <p style="color: #666; margin: 5px 0; font-size: 11px;">
                <a href="{unsubscribe_link}" style="color: #666;">Unsubscribe</a>
            </p>
        </div>
    </div>
</body>
</html>
"""
    },
    
    "custom": {
        "name": "Custom Email",
        "subject": "{subject}",
        "description": "Create a custom newsletter from scratch",
        "variables": ["subject", "heading", "body_text", "button_text", "button_link"],
        "html": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #000000; color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #F5A623;">
            <img src="https://customer-assets.emergentagent.com/job_f826d6c3-4354-45f7-8eac-b606d3ae45c3/artifacts/vhexbuqj_gsn.png" alt="GSN" style="width: 60px; height: 60px; border-radius: 10px;" />
            <p style="margin: 10px 0 0; color: #888;">GameShop Nepal</p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 20px;">
            <h2 style="color: #F5A623; font-size: 28px; margin: 0 0 20px; text-align: center;">{heading}</h2>
            <div style="color: #cccccc; font-size: 16px; line-height: 1.8;">
                {body_text}
            </div>
        </div>
        
        <!-- CTA Button -->
        {button_section}
        
        <!-- Footer -->
        <div style="text-align: center; padding: 30px 0; border-top: 1px solid #2a2a2a; margin-top: 30px;">
            <p style="color: #666; margin: 5px 0; font-size: 12px;">GameShop Nepal - Your Trusted Digital Store</p>
            <p style="color: #666; margin: 5px 0; font-size: 11px;">
                <a href="{unsubscribe_link}" style="color: #666;">Unsubscribe</a> | <a href="{website_link}" style="color: #666;">Visit Website</a>
            </p>
        </div>
    </div>
</body>
</html>
"""
    },
    
    "gift_card": {
        "name": "Product Delivery",
        "subject": "🎉 Your Order is Ready - {product_name}",
        "description": "Send product credentials/redeem codes to customer after purchase",
        "variables": ["customer_name", "product_name", "redeem_code", "instructions", "order_id"],
        "html": """
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; background-color: #000000; color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <!-- Header -->
        <div style="text-align: center; padding: 30px 0; border-bottom: 2px solid #F5A623;">
            <img src="https://customer-assets.emergentagent.com/job_f826d6c3-4354-45f7-8eac-b606d3ae45c3/artifacts/vhexbuqj_gsn.png" alt="GSN" style="width: 60px; height: 60px; border-radius: 10px;" />
            <p style="margin: 10px 0 0; color: #888;">GameShop Nepal</p>
        </div>
        
        <!-- Order Ready Banner -->
        <div style="text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); margin: 20px 0; border-radius: 16px; border: 2px solid #10B981; position: relative;">
            <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #10B981; color: #fff; padding: 6px 20px; border-radius: 20px; font-size: 12px; font-weight: bold;">✓ ORDER DELIVERED</div>
            
            <h2 style="color: #ffffff; font-size: 24px; margin: 20px 0 10px;">Hey {customer_name}!</h2>
            <p style="color: #888; font-size: 14px; margin: 0 0 10px;">Your order is ready. Here are your credentials:</p>
            
            <!-- Product Name -->
            <div style="background: linear-gradient(135deg, #F5A623 0%, #E8930C 100%); padding: 15px 30px; border-radius: 12px; display: inline-block; margin: 15px 0;">
                <p style="margin: 0; font-size: 20px; font-weight: bold; color: #000;">{product_name}</p>
            </div>
            
            <!-- Redeem Code / Credentials -->
            <div style="margin: 25px 0 20px;">
                <p style="color: #888; font-size: 12px; margin: 0 0 10px;">YOUR CREDENTIALS / REDEEM CODE</p>
                <div style="background: #0a0a0a; border: 2px solid #F5A623; padding: 20px; border-radius: 8px; text-align: left;">
                    <pre style="font-size: 16px; color: #F5A623; margin: 0; white-space: pre-wrap; word-wrap: break-word; font-family: 'Courier New', monospace;">{redeem_code}</pre>
                </div>
            </div>
        </div>
        
        <!-- Instructions -->
        <div style="background: #111; padding: 25px; border-radius: 12px; border-left: 4px solid #F5A623; margin: 20px 0;">
            <p style="color: #F5A623; font-size: 12px; margin: 0 0 10px; font-weight: bold;">HOW TO USE</p>
            <div style="color: #ccc; font-size: 14px; line-height: 1.8; margin: 0; white-space: pre-wrap;">{instructions}</div>
        </div>
        
        <!-- Order Reference -->
        <div style="text-align: center; padding: 15px; background: #0a0a0a; border-radius: 8px; margin: 20px 0;">
            <p style="color: #666; font-size: 12px; margin: 0;">Order ID: <span style="color: #F5A623;">{order_id}</span></p>
        </div>
        
        <!-- Support -->
        <div style="text-align: center; padding: 20px 0;">
            <p style="color: #888; font-size: 14px; margin: 0 0 15px;">Having issues? We're here to help!</p>
            <a href="https://wa.me/9779743488871" style="display: inline-block; background: #25D366; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">
                WhatsApp Support
            </a>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; padding: 30px 0; border-top: 1px solid #2a2a2a; margin-top: 20px;">
            <p style="color: #666; margin: 5px 0; font-size: 12px;">Thank you for shopping with GameShop Nepal!</p>
            <p style="color: #666; margin: 5px 0; font-size: 11px;">
                <a href="{website_link}" style="color: #666;">Visit Website</a>
            </p>
        </div>
    </div>
</body>
</html>
"""
    }
}


def get_template_list() -> List[Dict]:
    """Get list of available templates"""
    return [
        {
            "id": key,
            "name": val["name"],
            "description": val["description"],
            "variables": val["variables"],
            "subject": val["subject"]
        }
        for key, val in NEWSLETTER_TEMPLATES.items()
    ]


def render_template(template_id: str, variables: Dict, website_url: str = "https://gameshopnepal.com", colors: Dict = None) -> tuple:
    """Render a template with given variables and custom colors"""
    if template_id not in NEWSLETTER_TEMPLATES:
        raise ValueError(f"Template '{template_id}' not found")
    
    template = NEWSLETTER_TEMPLATES[template_id]
    
    # Default colors
    default_colors = {
        "primary_color": "#F5A623",
        "secondary_color": "#1F2937",
        "text_color": "#cccccc",
        "background_color": "#000000",
        "button_color": "#F5A623",
        "button_text_color": "#000000"
    }
    
    # Merge with provided colors
    if colors:
        for key, value in colors.items():
            if value:
                default_colors[key] = value
    
    # Add default variables
    variables["unsubscribe_link"] = f"{website_url}/unsubscribe"
    variables["website_link"] = website_url
    
    # Handle product image section for new_product template
    if template_id == "new_product":
        if variables.get("product_image"):
            variables["product_image_section"] = f'''
            <div style="text-align: center; margin: 20px 0;">
                <img src="{variables['product_image']}" alt="{variables.get('product_name', 'Product')}" 
                     style="max-width: 100%; height: auto; border-radius: 12px; border: 1px solid #2a2a2a;">
            </div>
            '''
        else:
            variables["product_image_section"] = ""
    
    # Handle button section for custom template
    if template_id == "custom":
        if variables.get("button_text") and variables.get("button_link"):
            variables["button_section"] = f'''
            <div style="text-align: center; padding: 20px 0;">
                <a href="{variables['button_link']}" style="display: inline-block; background: {default_colors['button_color']}; color: {default_colors['button_text_color']}; padding: 15px 50px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    {variables['button_text']}
                </a>
            </div>
            '''
        else:
            variables["button_section"] = ""
    
    # Render subject
    subject = template["subject"]
    for key, value in variables.items():
        subject = subject.replace("{" + key + "}", str(value))
    
    # Render HTML
    html = template["html"]
    for key, value in variables.items():
        html = html.replace("{" + key + "}", str(value))
    
    # Apply color customization - replace default colors with custom ones
    # Special handling: only replace the primary color, not text-in-buttons
    html = html.replace('border-bottom: 2px solid #F5A623', f'border-bottom: 2px solid {default_colors["primary_color"]}')
    html = html.replace('border: 1px solid #F5A623', f'border: 1px solid {default_colors["primary_color"]}')
    html = html.replace('border: 2px solid #F5A623', f'border: 2px solid {default_colors["primary_color"]}')
    html = html.replace('background: #F5A623', f'background: {default_colors["button_color"]}')
    html = html.replace('color: #F5A623', f'color: {default_colors["primary_color"]}')
    html = html.replace('background-color: #000000', f'background-color: {default_colors["background_color"]}')
    
    return subject, html


def send_newsletter(to_emails: List[str], subject: str, html_body: str) -> Dict:
    """Send newsletter to multiple recipients"""
    if not SMTP_USER or not SMTP_PASSWORD:
        logger.warning("SMTP credentials not configured")
        return {"success": False, "error": "SMTP not configured", "sent": 0, "failed": 0}
    
    sent_count = 0
    failed_count = 0
    failed_emails = []
    
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            
            for email in to_emails:
                try:
                    msg = MIMEMultipart("alternative")
                    msg["Subject"] = subject
                    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM_EMAIL}>"
                    msg["To"] = email
                    msg.attach(MIMEText(html_body, "html"))
                    
                    server.send_message(msg)
                    sent_count += 1
                    logger.info(f"Newsletter sent to {email}")
                except Exception as e:
                    failed_count += 1
                    failed_emails.append(email)
                    logger.error(f"Failed to send newsletter to {email}: {e}")
    except Exception as e:
        logger.error(f"SMTP connection error: {e}")
        return {"success": False, "error": str(e), "sent": sent_count, "failed": failed_count}
    
    return {
        "success": True,
        "sent": sent_count,
        "failed": failed_count,
        "failed_emails": failed_emails
    }
