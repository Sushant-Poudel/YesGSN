"""Chatbot, reseller plans, and SEO routes."""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import Response
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
from database import db
from dependencies import get_current_user
from emergentintegrations.llm.chat import LlmChat, UserMessage
import uuid
import os
import re
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== MODELS ====================

class ResellerPlanCreate(BaseModel):
    name: str
    price: float
    duration: str
    discount_percent: float
    features: List[str]
    is_popular: bool = False
    is_active: bool = True
    sort_order: int = 0

class ResellerPlan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    duration: str
    discount_percent: float
    features: List[str]
    is_popular: bool = False
    is_active: bool = True
    sort_order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None


# ==================== RESELLER PLANS ====================

@router.get("/reseller-plans")
async def get_reseller_plans():
    """Get all active reseller plans (public endpoint)"""
    plans = await db.reseller_plans.find({"is_active": True}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return plans

@router.get("/reseller-plans/all")
async def get_all_reseller_plans(current_user: dict = Depends(get_current_user)):
    """Get all reseller plans including inactive (admin only)"""
    plans = await db.reseller_plans.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return plans

@router.post("/reseller-plans")
async def create_reseller_plan(plan: ResellerPlanCreate, current_user: dict = Depends(get_current_user)):
    """Create a new reseller plan"""
    plan_dict = ResellerPlan(**plan.model_dump()).model_dump()
    await db.reseller_plans.insert_one(plan_dict)
    return {k: v for k, v in plan_dict.items() if k != "_id"}

@router.put("/reseller-plans/{plan_id}")
async def update_reseller_plan(plan_id: str, plan: ResellerPlanCreate, current_user: dict = Depends(get_current_user)):
    """Update an existing reseller plan"""
    result = await db.reseller_plans.update_one(
        {"id": plan_id},
        {"$set": plan.model_dump()}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": "Plan updated successfully"}

@router.delete("/reseller-plans/{plan_id}")
async def delete_reseller_plan(plan_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a reseller plan"""
    result = await db.reseller_plans.delete_one({"id": plan_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Plan not found")
    return {"message": "Plan deleted successfully"}

# ==================== CHATBOT ====================

# Store chat instances for sessions
chat_sessions = {}

OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
CHAT_API_KEY = EMERGENT_LLM_KEY or OPENAI_API_KEY  # Prefer Emergent key for reliability

async def get_store_context():
    """Get complete store info for chatbot context"""

    def strip_html(text):
        """Remove HTML tags and clean up text"""
        if not text:
            return ""
        # Remove HTML tags
        clean = re.sub(r'<[^>]+>', ' ', text)
        # Remove extra whitespace
        clean = re.sub(r'\s+', ' ', clean).strip()
        # Remove HTML entities
        clean = clean.replace('&nbsp;', ' ').replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        return clean
    
    try:
        # Products with full details
        products = await db.products.find({"is_active": True}, {"_id": 0, "name": 1, "slug": 1, "short_description": 1, "description": 1, "variations": 1, "features": 1, "category_id": 1}).to_list(50)
        categories = await db.categories.find({}, {"_id": 0, "id": 1, "name": 1, "description": 1}).to_list(20)
        faqs = await db.faqs.find({}, {"_id": 0, "question": 1, "answer": 1}).to_list(50)
        
        # Payment methods
        payment_methods = await db.payment_methods.find({"is_active": True}, {"_id": 0, "name": 1, "instructions": 1}).to_list(20)
        
        # Social links
        social_links = await db.social_links.find({}, {"_id": 0, "platform": 1, "url": 1}).to_list(20)
        
        # Site settings
        settings = await db.site_settings.find_one({"id": "main"}, {"_id": 0})
        
        # Pages (About, Terms, etc.)
        pages = await db.pages.find({}, {"_id": 0, "slug": 1, "title": 1, "content": 1}).to_list(10)
        
        # Reviews for social proof
        reviews = await db.reviews.find({"is_visible": True}, {"_id": 0, "reviewer_name": 1, "rating": 1, "review_text": 1}).sort("created_at", -1).to_list(10)
        
        # Credit system settings
        credit_settings = await db.credit_settings.find_one({"id": "main"}, {"_id": 0})
        
        # Referral program
        referral_settings = await db.referral_settings.find_one({}, {"_id": 0})
        
        # Daily rewards
        daily_rewards = await db.daily_rewards.find({}, {"_id": 0, "day": 1, "reward_amount": 1}).to_list(7)
        
        # Create category map
        category_map = {c.get('id'): c.get('name') for c in categories}
        
        # Format products with FULL details including description
        products_info = []
        for p in products:
            product_name = p.get('name', '')
            slug = p.get('slug', '')
            category_name = category_map.get(p.get('category_id'), 'General')
            
            # Get clean description
            raw_desc = p.get('description', '')
            clean_desc = strip_html(raw_desc)[:800]  # Limit to 800 chars
            
            short_desc = p.get('short_description', '')
            
            # Get all variations with details
            variations = p.get('variations', [])
            var_details = []
            for v in variations:
                var_name = v.get('name', 'Standard')
                var_price = v.get('price', 0)
                var_desc = strip_html(v.get('description', ''))[:100]
                if var_desc:
                    var_details.append(f"    • {var_name}: Rs {var_price} - {var_desc}")
                else:
                    var_details.append(f"    • {var_name}: Rs {var_price}")
            
            # Get features
            features = p.get('features', [])
            features_text = ", ".join(features) if features else ""
            
            product_entry = f"""
📦 **{product_name}**
   Category: {category_name}
   URL: /{slug}
   {f'Features: {features_text}' if features_text else ''}
   Description: {clean_desc if clean_desc else short_desc}
   
   Available Plans:
{chr(10).join(var_details)}
"""
            products_info.append(product_entry)
        
        # Format FAQs
        faq_info = [f"Q: {f.get('question')}\nA: {strip_html(f.get('answer', ''))}" for f in faqs]
        
        # Format payment methods
        payment_info = [f"- {pm.get('name')}: {strip_html(pm.get('instructions', 'Follow on-screen instructions'))[:150]}" for pm in payment_methods]
        
        # Format social links
        social_info = [f"- {s.get('platform')}: {s.get('url')}" for s in social_links]
        
        # Format reviews
        review_info = [f"- {r.get('reviewer_name')} ({r.get('rating')}★): \"{r.get('review_text', '')[:80]}...\"" for r in reviews[:5]]
        
        # Format pages content
        pages_info = {}
        for page in pages:
            pages_info[page.get('slug', '')] = strip_html(page.get('content', ''))[:500]
        
        # Format daily rewards
        rewards_info = [f"Day {d.get('day')}: Rs {d.get('reward_amount', 0)}" for d in daily_rewards]
        
        return {
            "products": "\n\n".join(products_info),
            "categories": ", ".join([f"{c.get('name')} ({c.get('description', '')})" for c in categories]),
            "faqs": "\n\n".join(faq_info),
            "payment_methods": "\n".join(payment_info) if payment_info else "eSewa, Khalti, Bank Transfer",
            "social_links": "\n".join(social_info) if social_info else "Contact us on social media",
            "about": pages_info.get('about', 'GameShop Nepal - Your trusted digital products store'),
            "terms": pages_info.get('terms', 'Standard terms and conditions apply'),
            "reviews": "\n".join(review_info) if review_info else "Excellent reviews from satisfied customers",
            "credit_system": f"Earn {credit_settings.get('cashback_percentage', 5)}% cashback on purchases" if credit_settings else "Earn cashback on purchases",
            "referral_program": f"Refer friends and earn Rs {referral_settings.get('referrer_reward', 0)} per referral" if referral_settings else "Refer friends and earn rewards",
            "daily_rewards": ", ".join(rewards_info) if rewards_info else "Daily login rewards available",
            "service_charge": settings.get('service_charge', 0) if settings else 0,
            "tax_info": f"{settings.get('tax_percentage', 0)}% {settings.get('tax_label', 'Tax')}" if settings else "No additional tax"
        }
    except Exception as e:
        logger.error(f"Error getting store context: {e}")
        return {
            "products": "", "categories": "", "faqs": "", "payment_methods": "",
            "social_links": "", "about": "", "terms": "", "reviews": "",
            "credit_system": "", "referral_program": "", "daily_rewards": "",
            "service_charge": 0, "tax_info": ""
        }

@router.post("/chat")
async def chat_endpoint(data: ChatMessage):
    """AI Chatbot endpoint"""
    if not CHAT_API_KEY:
        raise HTTPException(status_code=500, detail="Chatbot not configured")
    
    session_id = data.session_id
    user_message = data.message.strip()
    
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Get store context for the AI
    store_context = await get_store_context()
    
    # Get or create chat session
    if session_id not in chat_sessions:
        system_message = f"""You are a friendly and helpful customer support assistant for GameShop Nepal (GSN), an online store selling digital products like Netflix, Spotify, YouTube Premium, gaming subscriptions, and more.

Your personality adapts to how the user talks - if they're casual, be casual; if they're formal, be professional. Use appropriate emojis when the conversation is friendly.

═══════════════════════════════════════
STORE INFORMATION
═══════════════════════════════════════
- Store name: GameShop Nepal (GSN)
- Website: gameshopnepal.com
- Business: Digital subscriptions and gaming products
- All prices are in Nepali Rupees (Rs)
- Delivery: INSTANT digital delivery via email after payment confirmation
- Working hours: 24/7 online store, support available during business hours

═══════════════════════════════════════
PAYMENT METHODS
═══════════════════════════════════════
{store_context['payment_methods']}

How to pay:
1. Select product and plan
2. Fill in your details (name, email, phone)
3. Choose payment method
4. Make payment to the displayed QR code or account
5. Upload payment screenshot
6. Receive product via email instantly after confirmation

═══════════════════════════════════════
PRODUCTS & PRICING
═══════════════════════════════════════
{store_context['products']}

CATEGORIES: {store_context['categories']}

═══════════════════════════════════════
REWARDS & LOYALTY PROGRAMS
═══════════════════════════════════════
STORE CREDITS: {store_context['credit_system']}
- Credits can be used on future purchases
- Credits are awarded after order completion

REFERRAL PROGRAM: {store_context['referral_program']}
- Share your referral code with friends
- Earn rewards when they make purchases

DAILY REWARDS: {store_context['daily_rewards']}
- Login daily to claim rewards
- Consecutive days give bigger rewards

═══════════════════════════════════════
FREQUENTLY ASKED QUESTIONS
═══════════════════════════════════════
{store_context['faqs']}

═══════════════════════════════════════
CUSTOMER REVIEWS
═══════════════════════════════════════
{store_context['reviews']}

═══════════════════════════════════════
ABOUT US
═══════════════════════════════════════
{store_context['about']}

═══════════════════════════════════════
CONTACT & SOCIAL MEDIA
═══════════════════════════════════════
{store_context['social_links']}

═══════════════════════════════════════
PRICING & FEES
═══════════════════════════════════════
- Service Charge: Rs {store_context['service_charge']}
- Tax: {store_context['tax_info']}

═══════════════════════════════════════
GUIDELINES FOR RESPONSES
═══════════════════════════════════════
1. ALWAYS use the EXACT product information provided above - never make up prices, plans, or features
2. When asked about a specific product, provide ALL available plans with their EXACT prices
3. Use the product DESCRIPTIONS to explain what each product offers
4. Differentiate between plan types (e.g., SHARED vs PRIVATE, PROFILE vs ACCOUNT)
5. For order issues, ask for order ID and email address
6. If you don't know something specific, admit it and suggest contacting support
7. Keep responses informative but not too long
8. If asked about delivery - it's INSTANT digital delivery via email after payment confirmation
9. When recommending products, explain WHY based on the product description
10. Mention relevant benefits like Store Credits (5% cashback), Daily Rewards, Referral Program
11. Be accurate about what each plan includes based on the description
12. If a product has multiple plan types (like Profile vs Account), explain the difference"""

        chat_sessions[session_id] = LlmChat(
            api_key=CHAT_API_KEY,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o-mini")
    
    chat = chat_sessions[session_id]
    
    try:
        # Store message in database for history
        await db.chat_messages.insert_one({
            "session_id": session_id,
            "role": "user",
            "content": user_message,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        # Send message to AI
        response = await chat.send_message(UserMessage(text=user_message))
        
        # Store AI response
        await db.chat_messages.insert_one({
            "session_id": session_id,
            "role": "assistant",
            "content": response,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {"response": response, "session_id": session_id}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get response from AI")

@router.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str):
    """Get chat history for a session"""
    messages = await db.chat_messages.find(
        {"session_id": session_id},
        {"_id": 0, "role": 1, "content": 1, "created_at": 1}
    ).sort("created_at", 1).to_list(100)
    return messages


# ==================== SEO / SITEMAP ====================

@router.get("/sitemap.xml")
async def get_sitemap():
    """Generate dynamic sitemap for SEO"""
    base_url = os.environ.get("SITE_URL", "https://gameshopnepal.com")
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    static_pages = [
        {"loc": "/", "priority": "1.0", "changefreq": "daily"},
        {"loc": "/reviews", "priority": "0.8", "changefreq": "weekly"},
        {"loc": "/about", "priority": "0.5", "changefreq": "monthly"},
        {"loc": "/faq", "priority": "0.7", "changefreq": "weekly"},
        {"loc": "/blog", "priority": "0.7", "changefreq": "weekly"},
        {"loc": "/reseller-plans", "priority": "0.6", "changefreq": "monthly"},
        {"loc": "/terms", "priority": "0.3", "changefreq": "monthly"},
        {"loc": "/track-order", "priority": "0.4", "changefreq": "monthly"},
        {"loc": "/daily-reward", "priority": "0.5", "changefreq": "daily"},
    ]
    
    products = await db.products.find({"is_active": True}, {"slug": 1, "updated_at": 1, "_id": 0}).to_list(500)
    blog_posts = await db.blog_posts.find({"is_published": True}, {"slug": 1, "updated_at": 1, "_id": 0}).to_list(200)
    categories = await db.categories.find({}, {"slug": 1, "_id": 0}).to_list(100)
    
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    for page in static_pages:
        xml_content += f'''  <url>
    <loc>{base_url}{page["loc"]}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>{page["changefreq"]}</changefreq>
    <priority>{page["priority"]}</priority>
  </url>\n'''
    
    for product in products:
        if product.get("slug"):
            lastmod = product.get("updated_at", today)
            if isinstance(lastmod, str) and 'T' in lastmod:
                lastmod = lastmod.split('T')[0]
            elif not isinstance(lastmod, str):
                lastmod = today
            xml_content += f'''  <url>
    <loc>{base_url}/product/{product["slug"]}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>\n'''
    
    for post in blog_posts:
        if post.get("slug"):
            lastmod = post.get("updated_at", today)
            if isinstance(lastmod, str) and 'T' in lastmod:
                lastmod = lastmod.split('T')[0]
            elif not isinstance(lastmod, str):
                lastmod = today
            xml_content += f'''  <url>
    <loc>{base_url}/blog/{post["slug"]}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>\n'''
    
    for category in categories:
        if category.get("slug"):
            xml_content += f'''  <url>
    <loc>{base_url}/category/{category["slug"]}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n'''
    
    xml_content += '</urlset>'
    return Response(content=xml_content, media_type="application/xml")

@router.get("/seo/meta/{page_type}/{slug}")
async def get_seo_meta(page_type: str, slug: str):
    """Get SEO meta data for a specific page"""
    if page_type == "product":
        product = await db.products.find_one({"slug": slug}, {"_id": 0})
        if product:
            # Get lowest price from variations
            min_price = min([v.get("price", 0) for v in product.get("variations", [])]) if product.get("variations") else 0
            
            return {
                "title": f"{product['name']} - Buy Online | GameShop Nepal",
                "description": f"Buy {product['name']} at the best price in Nepal. Starting from Rs {min_price}. Instant delivery, 100% genuine products.",
                "keywords": f"{product['name']}, buy {product['name']} Nepal, {product['name']} price Nepal, digital products Nepal",
                "og_image": product.get("image_url"),
                "schema": {
                    "@context": "https://schema.org",
                    "@type": "Product",
                    "name": product["name"],
                    "description": product.get("description", "")[:200].replace("<p>", "").replace("</p>", ""),
                    "image": product.get("image_url"),
                    "offers": {
                        "@type": "AggregateOffer",
                        "lowPrice": min_price,
                        "priceCurrency": "NPR",
                        "availability": "https://schema.org/InStock" if not product.get("is_sold_out") else "https://schema.org/OutOfStock"
                    }
                }
            }
    
    elif page_type == "blog":
        post = await db.blog_posts.find_one({"slug": slug}, {"_id": 0})
        if post:
            return {
                "title": f"{post['title']} | GameShop Nepal Blog",
                "description": post.get("excerpt", post.get("content", "")[:160]),
                "keywords": f"{post['title']}, gaming blog Nepal, digital products guide",
                "og_image": post.get("image_url"),
                "schema": {
                    "@context": "https://schema.org",
                    "@type": "BlogPosting",
                    "headline": post["title"],
                    "description": post.get("excerpt", ""),
                    "image": post.get("image_url"),
                    "datePublished": post.get("created_at"),
                    "author": {"@type": "Organization", "name": "GameShop Nepal"}
                }
            }
    
    # Default meta
    return {
        "title": "GameShop Nepal - Digital Products at Best Prices",
        "description": "Buy Netflix, Spotify, YouTube Premium, PUBG UC and more at the best prices in Nepal. Instant delivery, 100% genuine products.",
        "keywords": "digital products Nepal, Netflix Nepal, Spotify Nepal, gaming topup Nepal"
    }

