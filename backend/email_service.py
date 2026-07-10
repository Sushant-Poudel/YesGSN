"""
Email Service Module
Handles all email notifications for the platform.
SMTP config priority: MongoDB > .env FILE (not env vars)
"""
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
from pathlib import Path
from dotenv import dotenv_values

ROOT_DIR = Path(__file__).parent
logger = logging.getLogger(__name__)

_FILE_CONFIG = dotenv_values(ROOT_DIR / '.env')
_FILE_SMTP_HOST = _FILE_CONFIG.get("SMTP_HOST", "smtp.gmail.com")
_FILE_SMTP_PORT = int(_FILE_CONFIG.get("SMTP_PORT", "587"))
_FILE_SMTP_USER = _FILE_CONFIG.get("SMTP_USER", "")
_FILE_SMTP_PASSWORD = _FILE_CONFIG.get("SMTP_PASSWORD", "")
_FILE_SMTP_FROM_EMAIL = _FILE_CONFIG.get("SMTP_FROM_EMAIL", "")
_FILE_SMTP_FROM_NAME = _FILE_CONFIG.get("SMTP_FROM_NAME", "GameShop Nepal")
SITE_URL = os.environ.get("SITE_URL", _FILE_CONFIG.get("SITE_URL", "https://gameshopnepal.com"))


def _get_smtp_config():
    try:
        from pymongo import MongoClient
        from database import mongo_url
        db_name = _FILE_CONFIG.get("DB_NAME", os.environ.get("DB_NAME", "gameshopnepal"))
        sync_client = MongoClient(mongo_url, serverSelectionTimeoutMS=3000)
        sync_db = sync_client[db_name]
        smtp_doc = sync_db.site_settings.find_one({"id": "smtp_config"})
        sync_client.close()
        if smtp_doc and smtp_doc.get("smtp_user"):
            return {
                "host": smtp_doc.get("smtp_host", _FILE_SMTP_HOST),
                "port": int(smtp_doc.get("smtp_port", _FILE_SMTP_PORT)),
                "user": smtp_doc.get("smtp_user"),
                "password": smtp_doc.get("smtp_password"),
                "from_email": smtp_doc.get("smtp_from_email"),
                "from_name": smtp_doc.get("smtp_from_name", _FILE_SMTP_FROM_NAME),
            }
    except Exception as e:
        logger.warning(f"Could not read SMTP from DB, using .env file: {e}")

    return {
        "host": _FILE_SMTP_HOST,
        "port": _FILE_SMTP_PORT,
        "user": _FILE_SMTP_USER,
        "password": _FILE_SMTP_PASSWORD,
        "from_email": _FILE_SMTP_FROM_EMAIL,
        "from_name": _FILE_SMTP_FROM_NAME,
    }


def send_email(to_email: str, subject: str, html_body: str, text_body: Optional[str] = None):
    cfg = _get_smtp_config()
    if not cfg["user"] or not cfg["password"]:
        logger.warning("SMTP credentials not configured. Email not sent.")
        return False
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{cfg['from_name']} <{cfg['from_email']}>"
        msg["To"] = to_email
        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
        with smtplib.SMTP(cfg["host"], cfg["port"]) as server:
            server.starttls()
            server.login(cfg["user"], cfg["password"])
            server.send_message(msg)
        logger.info(f"Email sent to {to_email} from {cfg['from_email']}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


# ─────────────────────────────────────────────
# BASE TEMPLATE  (clean white, email-safe)
# ─────────────────────────────────────────────
def _base(content: str, preview: str = "") -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GameShop Nepal</title>
<style>
  body{{margin:0;padding:0;background:#f4f4f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}}
  a{{color:inherit;text-decoration:none;}}
  @media(max-width:600px){{
    .wrap{{width:100%!important;border-radius:0!important;}}
    .pad{{padding-left:20px!important;padding-right:20px!important;}}
    .cols td{{display:block!important;width:100%!important;padding:0 0 10px!important;}}
  }}
</style>
</head>
<body>
<div style="display:none;max-height:0;overflow:hidden;">{preview}</div>
<table width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f4f4f0;">
<tr><td align="center" style="padding:30px 15px;">

  <table class="wrap" width="560" cellspacing="0" cellpadding="0" border="0"
    style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e0ddd6;">

    <!-- HEADER -->
    <tr>
      <td style="background:#111111;padding:18px 28px;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="vertical-align:middle;">
              <table cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;padding-right:10px;">
                    <img src="https://gameshopnepal.com/favicon.png" width="34" height="34"
                      style="border-radius:6px;display:block;" alt="GSN" />
                  </td>
                  <td style="vertical-align:middle;">
                    <p style="margin:0;font-size:14px;font-weight:600;color:#ffffff;">GameShop Nepal</p>
                    <p style="margin:0;font-size:10px;color:#888888;letter-spacing:0.8px;">PREMIUM DIGITAL STORE — SINCE 2021</p>
                  </td>
                </tr>
              </table>
            </td>
            <td align="right" style="vertical-align:middle;">
              <a href="{SITE_URL}"
                style="font-size:12px;color:#F5A623;border:1px solid #F5A623;padding:5px 12px;border-radius:6px;">
                Visit Store
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    {content}

    <!-- FOOTER -->
    <tr>
      <td style="background:#f9f8f5;padding:18px 28px;border-top:1px solid #e8e5de;text-align:center;">
        <p style="margin:0 0 8px;">
          <a href="{SITE_URL}" style="font-size:12px;color:#666666;margin:0 8px;">Home</a>
          <a href="{SITE_URL}/faq" style="font-size:12px;color:#666666;margin:0 8px;">FAQs</a>
          <a href="{SITE_URL}/about" style="font-size:12px;color:#666666;margin:0 8px;">About</a>
        </p>
        <p style="margin:0;font-size:11px;color:#aaaaaa;">© 2026 GameShop Nepal. All rights reserved.</p>
        <p style="margin:4px 0 0;font-size:11px;color:#aaaaaa;">Butwal, Nepal &middot; support@gameshopnepal.com</p>
      </td>
    </tr>

  </table>
</td></tr>
</table>
</body>
</html>"""


# ─────────────────────────────────────────────
# ORDER CONFIRMATION
# ─────────────────────────────────────────────
def get_order_confirmation_email(order_data: dict) -> tuple:
    order_number = order_data.get('takeapp_order_number', order_data['id'][:8].upper())
    customer_name = order_data.get('customer_name', 'Customer')
    subject = f"Order Confirmed — #{order_number} | GameShop Nepal"

    # Build items rows
    items_html = ""
    for item in order_data.get("items", []):
        name = item.get('name', 'Product')
        variation = item.get('variation', item.get('variation_name', ''))
        img_url = item.get('image_url', item.get('image', ''))
        img_tag = f'<img src="{img_url}" width="44" height="44" style="border-radius:8px;object-fit:cover;display:block;" alt="{name}" />' if img_url else f'<div style="width:44px;height:44px;background:#F5A623;border-radius:8px;text-align:center;line-height:44px;font-size:11px;font-weight:600;color:#000;">GSN</div>'
        items_html += f"""
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #f0ede6;">
            <table width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="width:52px;vertical-align:middle;">{img_tag}</td>
                <td style="padding-left:12px;vertical-align:middle;">
                  <p style="margin:0;font-size:13px;font-weight:600;color:#111111;">{name}</p>
                  <p style="margin:2px 0 0;font-size:12px;color:#888888;">{variation + ' &middot; ' if variation else ''}Qty: {item.get('quantity', 1)}</p>
                </td>
                <td align="right" style="vertical-align:middle;">
                  <p style="margin:0;font-size:14px;font-weight:600;color:#111111;">Rs {item.get('price', 0):,.0f}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>"""

    discount_row = ""
    if order_data.get('discount'):
        discount_row = f"""
        <tr>
          <td style="padding:6px 0;"><p style="margin:0;font-size:13px;color:#888888;">Discount</p></td>
          <td style="padding:6px 0;" align="right"><p style="margin:0;font-size:13px;color:#22c55e;font-weight:600;">-Rs {order_data.get('discount', 0):,.0f}</p></td>
        </tr>"""

    content = f"""
    <!-- HERO -->
    <tr>
      <td style="background:#1a1a1a;padding:36px 28px;text-align:center;">
        <div style="width:56px;height:56px;background:#F5A623;border-radius:50%;margin:0 auto 14px;text-align:center;line-height:56px;">
          <span style="font-size:26px;line-height:56px;">&#10003;</span>
        </div>
        <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#ffffff;">Order Confirmed!</p>
        <p style="margin:0;font-size:13px;color:#888888;">Thank you for your purchase, <strong style="color:#F5A623;">{customer_name}</strong></p>
      </td>
    </tr>

    <!-- ORDER META -->
    <tr>
      <td class="pad" style="padding:22px 28px 0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr class="cols">
            <td style="width:50%;padding-right:6px;vertical-align:top;">
              <div style="background:#f9f8f5;border-radius:8px;padding:12px 14px;">
                <p style="margin:0 0 4px;font-size:10px;color:#888888;letter-spacing:0.8px;">ORDER NUMBER</p>
                <p style="margin:0;font-size:14px;font-weight:700;color:#F5A623;">#{order_number}</p>
              </div>
            </td>
            <td style="width:50%;padding-left:6px;vertical-align:top;">
              <div style="background:#f9f8f5;border-radius:8px;padding:12px 14px;">
                <p style="margin:0 0 4px;font-size:10px;color:#888888;letter-spacing:0.8px;">DATE</p>
                <p style="margin:0;font-size:14px;font-weight:600;color:#333333;">{order_data.get('created_at', '')[:10]}</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- ITEMS -->
    <tr>
      <td class="pad" style="padding:20px 28px 0;">
        <p style="margin:0 0 10px;font-size:10px;color:#888888;letter-spacing:0.8px;">YOUR ITEMS</p>
        <table width="100%" cellspacing="0" cellpadding="0" border="0">
          {items_html}
        </table>
      </td>
    </tr>

    <!-- TOTALS -->
    <tr>
      <td class="pad" style="padding:16px 28px 0;">
        <div style="border:1px solid #e8e5de;border-radius:8px;padding:14px 16px;">
          <table width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td><p style="margin:0;font-size:13px;color:#888888;">Subtotal</p></td>
              <td align="right"><p style="margin:0;font-size:13px;color:#333333;">Rs {order_data.get('subtotal', order_data.get('total_amount', 0)):,.0f}</p></td>
            </tr>
            {discount_row}
            <tr><td colspan="2" style="padding:10px 0;"><div style="height:1px;background:#e8e5de;"></div></td></tr>
            <tr>
              <td><p style="margin:0;font-size:14px;font-weight:600;color:#111111;">Total Amount</p></td>
              <td align="right"><p style="margin:0;font-size:17px;font-weight:700;color:#F5A623;">Rs {order_data.get('total_amount', 0):,.0f}</p></td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <!-- WHAT HAPPENS NEXT -->
    <tr>
      <td class="pad" style="padding:16px 28px 0;">
        <div style="background:#f9f8f5;border-radius:8px;padding:16px 18px;">
          <p style="margin:0 0 12px;font-size:10px;color:#888888;letter-spacing:0.8px;">WHAT HAPPENS NEXT?</p>
          <table width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:26px;vertical-align:top;padding-top:2px;">
                <div style="width:22px;height:22px;background:#F5A623;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#000000;">1</div>
              </td>
              <td style="padding:0 0 10px 10px;"><p style="margin:0;font-size:13px;color:#444444;">We'll verify your payment</p></td>
            </tr>
            <tr>
              <td style="width:26px;vertical-align:top;padding-top:2px;">
                <div style="width:22px;height:22px;background:#F5A623;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#000000;">2</div>
              </td>
              <td style="padding:0 0 10px 10px;"><p style="margin:0;font-size:13px;color:#444444;">Your digital product will be prepared</p></td>
            </tr>
            <tr>
              <td style="width:26px;vertical-align:top;padding-top:2px;">
                <div style="width:22px;height:22px;background:#F5A623;border-radius:50%;text-align:center;line-height:22px;font-size:11px;font-weight:700;color:#000000;">3</div>
              </td>
              <td style="padding:0 0 0 10px;"><p style="margin:0;font-size:13px;color:#444444;">Delivered to you via WhatsApp</p></td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <!-- CTA BUTTONS -->
    <tr>
      <td class="pad" style="padding:16px 28px 0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr class="cols">
            <td style="width:50%;padding-right:6px;">
              <a href="{SITE_URL}/invoice/{order_data.get('id', '')}"
                style="display:block;text-align:center;background:#111111;color:#ffffff;padding:12px;border-radius:8px;font-size:13px;font-weight:600;">
                View Invoice
              </a>
            </td>
            <td style="width:50%;padding-left:6px;">
              <a href="https://wa.me/9779743488871"
                style="display:block;text-align:center;background:#25D366;color:#ffffff;padding:12px;border-radius:8px;font-size:13px;font-weight:600;">
                Chat on WhatsApp
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- REVIEW CTA -->
    <tr>
      <td class="pad" style="padding:16px 28px 24px;">
        <div style="border:1px solid #c8e6c9;background:#f1f8f1;border-radius:8px;padding:16px 18px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#2e7d32;">Enjoying GameShop Nepal?</p>
          <p style="margin:0 0 12px;font-size:12px;color:#555555;">Your review helps other Nepali customers trust us. Takes 30 seconds!</p>
          <a href="https://gameshopnepal.com/reviews#write-review"
            style="display:inline-block;background:#00b67a;color:#ffffff;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:600;">
            &#9733; Write a Review
          </a>
        </div>
      </td>
    </tr>
    """

    html = _base(content, f"Your order #{order_number} is confirmed!")
    text = f"Order Confirmed — #{order_number}\n\nThank you {customer_name}!\nTotal: Rs {order_data.get('total_amount', 0):,.0f}\n\nView invoice: {SITE_URL}/invoice/{order_data.get('id', '')}\nWhatsApp: +977 9743488871\nReview us: https://gameshopnepal.com/reviews#write-review"
    return subject, html, text


# ─────────────────────────────────────────────
# ORDER STATUS UPDATE
# ─────────────────────────────────────────────
def get_order_status_update_email(order_data: dict, new_status: str) -> tuple:
    order_number = order_data.get('takeapp_order_number', order_data['id'][:8].upper())
    customer_name = order_data.get('customer_name', 'Customer')
    subject = f"Order #{order_number} — {new_status.title()} | GameShop Nepal"

    statuses = {
        "pending":    {"color": "#F5A623", "icon_color": "#F5A623", "icon_bg": "#fff8f0", "border": "#f5d49a",
                       "icon": "&#9203;", "title": "Order Pending",
                       "msg": "Your order is waiting for payment confirmation. Once we verify your payment, we'll start processing it right away.",
                       "msg_bg": "#fff8f0", "msg_border": "#f5d49a", "msg_text": "#7a5a1a"},
        "confirmed":  {"color": "#378ADD", "icon_color": "#378ADD", "icon_bg": "#f0f7ff", "border": "#b5d4f4",
                       "icon": "&#10003;", "title": "Payment Confirmed",
                       "msg": "Great news! Your payment has been received. Our team is now preparing your digital product.",
                       "msg_bg": "#f0f7ff", "msg_border": "#b5d4f4", "msg_text": "#185FA5"},
        "processing": {"color": "#8b5cf6", "icon_color": "#8b5cf6", "icon_bg": "#f5f3ff", "border": "#c4b5fd",
                       "icon": "&#9881;", "title": "Order Processing",
                       "msg": "Your order is being actively processed. You'll receive another notification once it's complete.",
                       "msg_bg": "#f5f3ff", "msg_border": "#c4b5fd", "msg_text": "#5b21b6"},
        "completed":  {"color": "#22c55e", "icon_color": "#22c55e", "icon_bg": "#f0fdf4", "border": "#bbf7d0",
                       "icon": "&#10003;", "title": "Order Completed!",
                       "msg": "Your digital product has been delivered. Thank you for shopping with GameShop Nepal — we hope you enjoy it!",
                       "msg_bg": "#f0fdf4", "msg_border": "#bbf7d0", "msg_text": "#166534"},
        "delivered":  {"color": "#22c55e", "icon_color": "#22c55e", "icon_bg": "#f0fdf4", "border": "#bbf7d0",
                       "icon": "&#128230;", "title": "Order Delivered!",
                       "msg": "Your digital product has been successfully delivered. Enjoy your purchase!",
                       "msg_bg": "#f0fdf4", "msg_border": "#bbf7d0", "msg_text": "#166534"},
        "cancelled":  {"color": "#E24B4A", "icon_color": "#E24B4A", "icon_bg": "#fff5f5", "border": "#fca5a5",
                       "icon": "&#10005;", "title": "Order Cancelled",
                       "msg": "Your order has been cancelled. If you believe this is a mistake or if you paid, please contact our support team immediately.",
                       "msg_bg": "#fff5f5", "msg_border": "#fca5a5", "msg_text": "#991b1b"},
        "refunded":   {"color": "#378ADD", "icon_color": "#378ADD", "icon_bg": "#f0f7ff", "border": "#b5d4f4",
                       "icon": "&#8635;", "title": "Refund Processed",
                       "msg": "Your refund has been initiated. Please allow 1–3 business days for the amount to reflect in your eSewa / Khalti / Bank account.",
                       "msg_bg": "#f0f7ff", "msg_border": "#b5d4f4", "msg_text": "#185FA5"},
    }
    cfg = statuses.get(new_status.lower(), statuses["pending"])

    # Add review section for completed orders
    review_section = ""
    if new_status.lower() in ("completed", "delivered"):
        review_section = f"""
    <tr>
      <td class="pad" style="padding:0 28px 24px;">
        <div style="border:1px solid #c8e6c9;background:#f1f8f1;border-radius:8px;padding:16px 18px;text-align:center;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#2e7d32;">Enjoying your purchase?</p>
          <p style="margin:0 0 12px;font-size:12px;color:#555555;">Leave a quick review — it helps other Nepali customers!</p>
          <a href="https://gameshopnepal.com/reviews#write-review"
            style="display:inline-block;background:#00b67a;color:#ffffff;padding:10px 24px;border-radius:6px;font-size:13px;font-weight:600;">
            &#9733; Write a Review
          </a>
        </div>
      </td>
    </tr>"""

    content = f"""
    <!-- HERO -->
    <tr>
      <td style="background:#1a1a1a;padding:36px 28px;text-align:center;">
        <div style="width:56px;height:56px;background:{cfg['icon_bg']};border:2px solid {cfg['icon_color']};border-radius:50%;margin:0 auto 14px;text-align:center;line-height:52px;">
          <span style="font-size:24px;color:{cfg['icon_color']};line-height:52px;">{cfg['icon']}</span>
        </div>
        <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#ffffff;">{cfg['title']}</p>
        <p style="margin:0;font-size:13px;color:#888888;">Hi <strong style="color:#ffffff;">{customer_name}</strong>, here's your order update</p>
      </td>
    </tr>

    <!-- ORDER META -->
    <tr>
      <td class="pad" style="padding:22px 28px 0;">
        <div style="border:1px solid #e8e5de;border-radius:8px;overflow:hidden;">
          <table width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="width:50%;padding:14px 16px;border-right:1px solid #e8e5de;">
                <p style="margin:0 0 4px;font-size:10px;color:#888888;letter-spacing:0.8px;">ORDER NUMBER</p>
                <p style="margin:0;font-size:15px;font-weight:700;color:#F5A623;">#{order_number}</p>
              </td>
              <td style="width:50%;padding:14px 16px;">
                <p style="margin:0 0 4px;font-size:10px;color:#888888;letter-spacing:0.8px;">NEW STATUS</p>
                <p style="margin:0;font-size:15px;font-weight:700;color:{cfg['color']};text-transform:uppercase;">{new_status}</p>
              </td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <!-- STATUS MESSAGE -->
    <tr>
      <td class="pad" style="padding:14px 28px 0;">
        <div style="background:{cfg['msg_bg']};border:1px solid {cfg['msg_border']};border-radius:8px;padding:14px 16px;">
          <p style="margin:0;font-size:13px;color:{cfg['msg_text']};line-height:1.6;">{cfg['msg']}</p>
        </div>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td class="pad" style="padding:16px 28px 0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr class="cols">
            <td style="width:50%;padding-right:6px;">
              <a href="{SITE_URL}/account"
                style="display:block;text-align:center;background:#111111;color:#ffffff;padding:12px;border-radius:8px;font-size:13px;font-weight:600;">
                View Order Details
              </a>
            </td>
            <td style="width:50%;padding-left:6px;">
              <a href="https://wa.me/9779743488871"
                style="display:block;text-align:center;background:#25D366;color:#ffffff;padding:12px;border-radius:8px;font-size:13px;font-weight:600;">
                Chat on WhatsApp
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- HELP NOTE -->
    <tr>
      <td class="pad" style="padding:14px 28px 24px;">
        <div style="background:#f9f8f5;border-radius:8px;padding:12px 16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#666666;">Questions? We're here 24/7 &mdash; WhatsApp <strong style="color:#25D366;">+977 9743488871</strong></p>
        </div>
      </td>
    </tr>

    {review_section}
    """

    html = _base(content, f"Order #{order_number} is now {new_status}")
    text = f"Order #{order_number} — {new_status.upper()}\n\n{cfg['msg']}\n\nView order: {SITE_URL}/account\nWhatsApp: +977 9743488871"
    return subject, html, text


# ─────────────────────────────────────────────
# LOGIN NOTIFICATION
# ─────────────────────────────────────────────
def get_login_notification_email(customer: dict) -> tuple:
    name = customer.get('name', customer.get('email', 'Customer'))
    subject = f"Login Notification — GameShop Nepal"
    registered = customer.get('created_at', '')[:10]

    content = f"""
    <!-- HERO -->
    <tr>
      <td style="background:#1a1a1a;padding:36px 28px;text-align:center;">
        <div style="width:56px;height:56px;background:#1a2a3a;border:2px solid #25D366;border-radius:50%;margin:0 auto 14px;text-align:center;line-height:52px;">
          <span style="font-size:22px;line-height:52px;">&#128100;</span>
        </div>
        <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#ffffff;">New Login Detected</p>
        <p style="margin:0;font-size:13px;color:#888888;">Someone just signed into your GameShop Nepal account</p>
      </td>
    </tr>

    <!-- CONTENT -->
    <tr>
      <td class="pad" style="padding:22px 28px 0;">
        <p style="margin:0 0 16px;font-size:14px;color:#444444;">Hi <strong style="color:#111111;">{name}</strong>, here are your profile details:</p>
        <div style="border:1px solid #e8e5de;border-radius:8px;overflow:hidden;">
          <table width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr style="background:#fafaf8;">
              <td style="padding:12px 16px;border-bottom:1px solid #e8e5de;width:40%;"><p style="margin:0;font-size:13px;color:#888888;">Name</p></td>
              <td style="padding:12px 16px;border-bottom:1px solid #e8e5de;" align="right"><p style="margin:0;font-size:13px;font-weight:600;color:#111111;">{customer.get('name', 'N/A')}</p></td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #e8e5de;"><p style="margin:0;font-size:13px;color:#888888;">Email</p></td>
              <td style="padding:12px 16px;border-bottom:1px solid #e8e5de;" align="right"><p style="margin:0;font-size:13px;color:#F5A623;">{customer.get('email', 'N/A')}</p></td>
            </tr>
            <tr style="background:#fafaf8;">
              <td style="padding:12px 16px;border-bottom:1px solid #e8e5de;"><p style="margin:0;font-size:13px;color:#888888;">Phone</p></td>
              <td style="padding:12px 16px;border-bottom:1px solid #e8e5de;" align="right"><p style="margin:0;font-size:13px;font-weight:600;color:#111111;">{customer.get('phone', 'N/A')}</p></td>
            </tr>
            <tr>
              <td style="padding:12px 16px;"><p style="margin:0;font-size:13px;color:#888888;">Registered</p></td>
              <td style="padding:12px 16px;" align="right"><p style="margin:0;font-size:13px;font-weight:600;color:#111111;">{registered}</p></td>
            </tr>
          </table>
        </div>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td class="pad" style="padding:16px 28px 0;">
        <a href="{SITE_URL}/account"
          style="display:block;text-align:center;background:#F5A623;color:#000000;padding:13px;border-radius:8px;font-size:14px;font-weight:700;">
          View My Account
        </a>
      </td>
    </tr>

    <!-- SECURITY NOTICE -->
    <tr>
      <td class="pad" style="padding:14px 28px 24px;">
        <div style="background:#fff8f0;border:1px solid #f5d49a;border-radius:8px;padding:14px 16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#7a5a1a;">
            If this wasn't you, please <a href="mailto:support@gameshopnepal.com" style="color:#F5A623;font-weight:600;">contact support</a> immediately or change your password.
          </p>
        </div>
      </td>
    </tr>
    """

    html = _base(content, "A new login was detected on your account")
    text = f"New Login Detected\n\nHi {name},\nSomeone just signed into your GameShop Nepal account.\n\nIf this wasn't you, contact support@gameshopnepal.com immediately.\n\nView account: {SITE_URL}/account"
    return subject, html, text


# ─────────────────────────────────────────────
# COMPLAINT RECEIVED
# ─────────────────────────────────────────────
def get_complaint_email(customer_name: str, ticket_id: str, order_id: str, complaint_text: str, submitted_at: str = "") -> tuple:
    subject = f"Complaint Received — Ticket #{ticket_id} | GameShop Nepal"

    content = f"""
    <!-- HERO -->
    <tr>
      <td style="background:#1a1a1a;padding:36px 28px;text-align:center;">
        <div style="width:56px;height:56px;background:#1c2a3a;border:2px solid #378ADD;border-radius:50%;margin:0 auto 14px;text-align:center;line-height:52px;">
          <span style="font-size:22px;line-height:52px;">&#128172;</span>
        </div>
        <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#ffffff;">Complaint Received</p>
        <p style="margin:0;font-size:13px;color:#888888;">We've got your ticket and are looking into it</p>
      </td>
    </tr>

    <!-- CONTENT -->
    <tr>
      <td class="pad" style="padding:22px 28px 0;">
        <p style="margin:0 0 16px;font-size:14px;color:#444444;">Hi <strong style="color:#111111;">{customer_name}</strong>, thank you for reaching out. We've received your complaint and our support team will get back to you as soon as possible.</p>

        <!-- TICKET DETAILS -->
        <div style="border:1px solid #e8e5de;border-radius:8px;overflow:hidden;margin-bottom:16px;">
          <div style="background:#f9f8f5;padding:10px 16px;border-bottom:1px solid #e8e5de;">
            <p style="margin:0;font-size:10px;color:#888888;letter-spacing:0.8px;">TICKET DETAILS</p>
          </div>
          <table width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #e8e5de;width:40%;"><p style="margin:0;font-size:13px;color:#888888;">Ticket ID</p></td>
              <td style="padding:12px 16px;border-bottom:1px solid #e8e5de;" align="right"><p style="margin:0;font-size:13px;font-weight:700;color:#F5A623;">#{ticket_id}</p></td>
            </tr>
            <tr style="background:#fafaf8;">
              <td style="padding:12px 16px;border-bottom:1px solid #e8e5de;"><p style="margin:0;font-size:13px;color:#888888;">Submitted</p></td>
              <td style="padding:12px 16px;border-bottom:1px solid #e8e5de;" align="right"><p style="margin:0;font-size:13px;font-weight:600;color:#111111;">{submitted_at}</p></td>
            </tr>
            <tr>
              <td style="padding:12px 16px;border-bottom:1px solid #e8e5de;"><p style="margin:0;font-size:13px;color:#888888;">Related Order</p></td>
              <td style="padding:12px 16px;border-bottom:1px solid #e8e5de;" align="right"><p style="margin:0;font-size:13px;font-weight:600;color:#111111;">#{order_id[:8].upper() if order_id else 'N/A'}</p></td>
            </tr>
            <tr style="background:#fafaf8;">
              <td style="padding:12px 16px;"><p style="margin:0;font-size:13px;color:#888888;">Status</p></td>
              <td style="padding:12px 16px;" align="right">
                <span style="background:#fff8e6;border:1px solid #f5d49a;color:#854F0B;font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;">Under Review</span>
              </td>
            </tr>
          </table>
        </div>

        <!-- COMPLAINT SUMMARY -->
        <div style="background:#f9f8f5;border-radius:8px;padding:14px 16px;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-size:10px;color:#888888;letter-spacing:0.8px;">YOUR COMPLAINT</p>
          <p style="margin:0;font-size:13px;color:#444444;line-height:1.6;">{complaint_text}</p>
        </div>

        <!-- ADD MORE INFO -->
        <div style="border:1px solid #b5d4f4;background:#f0f7ff;border-radius:8px;padding:16px 18px;margin-bottom:16px;">
          <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#185FA5;">&#8505; Want to add more information?</p>
          <p style="margin:0 0 12px;font-size:13px;color:#444444;line-height:1.6;">
            If you have additional details, screenshots, or images related to your complaint, feel free to reply directly to this email. Our team will attach them to your ticket.
          </p>
          <div style="background:#ffffff;border:1px solid #b5d4f4;border-radius:6px;padding:10px 14px;">
            <p style="margin:0;font-size:11px;color:#888888;">Reply to</p>
            <p style="margin:2px 0 0;font-size:13px;font-weight:600;color:#378ADD;">support@gameshopnepal.com</p>
          </div>
        </div>

      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td class="pad" style="padding:0 28px 0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr class="cols">
            <td style="width:50%;padding-right:6px;">
              <a href="{SITE_URL}/account"
                style="display:block;text-align:center;background:#111111;color:#ffffff;padding:12px;border-radius:8px;font-size:13px;font-weight:600;">
                View My Ticket
              </a>
            </td>
            <td style="width:50%;padding-left:6px;">
              <a href="https://wa.me/9779743488871"
                style="display:block;text-align:center;background:#25D366;color:#ffffff;padding:12px;border-radius:8px;font-size:13px;font-weight:600;">
                Chat on WhatsApp
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- RESPONSE TIME -->
    <tr>
      <td class="pad" style="padding:14px 28px 24px;">
        <div style="background:#f9f8f5;border-radius:8px;padding:12px 16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#666666;">Our team typically responds within <strong style="color:#111111;">2–6 hours</strong> during business hours.</p>
          <p style="margin:4px 0 0;font-size:12px;color:#888888;">Urgent? WhatsApp us at <strong style="color:#25D366;">+977 9743488871</strong></p>
        </div>
      </td>
    </tr>
    """

    html = _base(content, f"We've received your complaint — Ticket #{ticket_id}")
    text = f"Complaint Received — Ticket #{ticket_id}\n\nHi {customer_name},\nWe've received your complaint and are reviewing it.\n\nTicket ID: #{ticket_id}\nStatus: Under Review\n\nTo add screenshots or more info, reply to this email: support@gameshopnepal.com\n\nWhatsApp: +977 9743488871"
    return subject, html, text


# ─────────────────────────────────────────────
# WELCOME EMAIL
# ─────────────────────────────────────────────
def get_welcome_email(customer_name: str) -> tuple:
    subject = "Welcome to GameShop Nepal!"

    content = f"""
    <!-- HERO -->
    <tr>
      <td style="background:#1a1a1a;padding:36px 28px;text-align:center;">
        <div style="width:56px;height:56px;background:#F5A623;border-radius:50%;margin:0 auto 14px;text-align:center;line-height:56px;">
          <span style="font-size:28px;line-height:56px;">&#128075;</span>
        </div>
        <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#ffffff;">Welcome, {customer_name}!</p>
        <p style="margin:0;font-size:13px;color:#888888;">You've joined Nepal's most trusted digital products store</p>
      </td>
    </tr>

    <!-- FEATURES -->
    <tr>
      <td class="pad" style="padding:22px 28px 0;">
        <table width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr class="cols">
            <td style="width:50%;padding-right:6px;vertical-align:top;">
              <div style="background:#f9f8f5;border-radius:8px;padding:14px;text-align:center;margin-bottom:10px;">
                <p style="margin:0 0 4px;font-size:20px;">&#9889;</p>
                <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#111111;">Instant Delivery</p>
                <p style="margin:0;font-size:12px;color:#888888;">Get products in minutes</p>
              </div>
            </td>
            <td style="width:50%;padding-left:6px;vertical-align:top;">
              <div style="background:#f9f8f5;border-radius:8px;padding:14px;text-align:center;margin-bottom:10px;">
                <p style="margin:0 0 4px;font-size:20px;">&#10003;</p>
                <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#111111;">100% Genuine</p>
                <p style="margin:0;font-size:12px;color:#888888;">Authentic products only</p>
              </div>
            </td>
          </tr>
          <tr class="cols">
            <td style="width:50%;padding-right:6px;vertical-align:top;">
              <div style="background:#f9f8f5;border-radius:8px;padding:14px;text-align:center;">
                <p style="margin:0 0 4px;font-size:20px;">&#128176;</p>
                <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#111111;">Best Prices</p>
                <p style="margin:0;font-size:12px;color:#888888;">Lowest prices in Nepal</p>
              </div>
            </td>
            <td style="width:50%;padding-left:6px;vertical-align:top;">
              <div style="background:#f9f8f5;border-radius:8px;padding:14px;text-align:center;">
                <p style="margin:0 0 4px;font-size:20px;">&#127873;</p>
                <p style="margin:0 0 2px;font-size:13px;font-weight:600;color:#111111;">Earn Rewards</p>
                <p style="margin:0;font-size:12px;color:#888888;">Get cashback on orders</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- POPULAR PRODUCTS -->
    <tr>
      <td class="pad" style="padding:16px 28px 0;">
        <div style="border:1px solid #f5d49a;background:#fff8f0;border-radius:8px;padding:16px 18px;">
          <p style="margin:0 0 10px;font-size:12px;font-weight:600;color:#F5A623;letter-spacing:0.8px;">&#128293; POPULAR PRODUCTS</p>
          <p style="margin:0 0 6px;font-size:13px;color:#444444;">&#8226; Netflix Premium — Starting Rs 299/month</p>
          <p style="margin:0 0 6px;font-size:13px;color:#444444;">&#8226; Spotify Premium — Starting Rs 200/month</p>
          <p style="margin:0 0 6px;font-size:13px;color:#444444;">&#8226; YouTube Premium — Starting Rs 180/month</p>
          <p style="margin:0;font-size:13px;color:#444444;">&#8226; And 35+ more products!</p>
        </div>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td class="pad" style="padding:16px 28px 24px;text-align:center;">
        <a href="{SITE_URL}/products"
          style="display:inline-block;background:#F5A623;color:#000000;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:700;">
          Start Shopping Now
        </a>
      </td>
    </tr>
    """

    html = _base(content, f"Welcome to GameShop Nepal, {customer_name}!")
    text = f"Welcome to GameShop Nepal, {customer_name}!\n\nNepal's most trusted digital products store.\n\nShop now: {SITE_URL}/products\nWhatsApp: +977 9743488871"
    return subject, html, text


# ─────────────────────────────────────────────
# OTP EMAIL
# ─────────────────────────────────────────────
def get_otp_email(email: str, otp: str) -> tuple:
    subject = "Your Login Code — GameShop Nepal"

    content = f"""
    <!-- HERO -->
    <tr>
      <td style="background:#1a1a1a;padding:36px 28px;text-align:center;">
        <div style="width:56px;height:56px;background:#1a1a2a;border:2px solid #F5A623;border-radius:50%;margin:0 auto 14px;text-align:center;line-height:52px;">
          <span style="font-size:22px;line-height:52px;">&#128274;</span>
        </div>
        <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#ffffff;">Verification Code</p>
        <p style="margin:0;font-size:13px;color:#888888;">Enter this code to login to your account</p>
      </td>
    </tr>

    <!-- OTP -->
    <tr>
      <td class="pad" style="padding:28px 28px 0;text-align:center;">
        <div style="display:inline-block;background:#f9f8f5;border:2px solid #F5A623;border-radius:12px;padding:20px 40px;">
          <p style="margin:0 0 4px;font-size:11px;color:#888888;letter-spacing:0.8px;">YOUR CODE</p>
          <p style="margin:0;font-size:38px;font-weight:700;color:#F5A623;letter-spacing:10px;font-family:'Courier New',monospace;">{otp}</p>
        </div>
        <p style="margin:14px 0 0;font-size:13px;color:#888888;">This code expires in <strong style="color:#111111;">10 minutes</strong></p>
      </td>
    </tr>

    <!-- SECURITY NOTICE -->
    <tr>
      <td class="pad" style="padding:16px 28px 24px;">
        <div style="background:#fff5f5;border:1px solid #fca5a5;border-radius:8px;padding:14px 16px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#991b1b;">
            &#9888; Never share this code with anyone. GameShop Nepal staff will never ask for your OTP.
          </p>
        </div>
      </td>
    </tr>
    """

    html = _base(content, f"Your login code is {otp}")
    text = f"Your GameShop Nepal login code is: {otp}\n\nExpires in 10 minutes.\nNever share this code with anyone."
    return subject, html, text