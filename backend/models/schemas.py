from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from enum import Enum
from datetime import datetime, timezone
import uuid


class UserCreate(BaseModel):
    email: str
    password: str
    name: str = "Admin"

class UserLogin(BaseModel):
    email: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    is_admin: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CustomerProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: Optional[str] = None
    phone: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None

class OTPRequest(BaseModel):
    email: str
    name: Optional[str] = None
    whatsapp_number: str

class OTPVerify(BaseModel):
    email: str
    otp: str

class OTPRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    otp: str
    expires_at: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    verified: bool = False

class ProductVariation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    original_price: Optional[float] = None
    cost_price: Optional[float] = None
    description: Optional[str] = None
    stock: int = 0

class ProductFormField(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    label: str
    placeholder: str = ""
    required: bool = False

class ProductCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    description: str
    image_url: str
    category_id: str
    variations: List[ProductVariation] = []
    tags: List[str] = []
    sort_order: int = 0
    custom_fields: List[ProductFormField] = []
    is_active: bool = True
    is_sold_out: bool = False
    stock_quantity: Optional[int] = None
    flash_sale_end: Optional[str] = None
    flash_sale_label: Optional[str] = None
    whatsapp_only: bool = False
    whatsapp_message: Optional[str] = None
    discord_webhooks: List[str] = []

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: Optional[str] = None
    description: str
    image_url: str
    category_id: str
    variations: List[ProductVariation] = []
    tags: List[str] = []
    sort_order: int = 0
    custom_fields: List[ProductFormField] = []
    is_active: bool = True
    is_sold_out: bool = False
    stock_quantity: Optional[int] = None
    flash_sale_end: Optional[str] = None
    flash_sale_label: Optional[str] = None
    whatsapp_only: bool = False
    whatsapp_message: Optional[str] = None
    discord_webhooks: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductOrderUpdate(BaseModel):
    product_ids: List[str]

class AdPosition(str, Enum):
    HOME_BANNER = "home_banner"
    HOME_SIDEBAR = "home_sidebar"
    PRODUCT_INLINE = "product_inline"
    PRODUCT_SIDEBAR = "product_sidebar"
    FOOTER = "footer"
    POPUP = "popup"

class AdCreate(BaseModel):
    name: str
    position: str
    image_url: str
    target_url: str
    alt_text: Optional[str] = ""
    is_active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: int = 0

class Ad(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    position: str
    image_url: str
    target_url: str
    alt_text: str = ""
    is_active: bool = True
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    priority: int = 0
    impressions: int = 0
    clicks: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ReviewCreate(BaseModel):
    reviewer_name: str
    rating: int = Field(ge=1, le=5)
    comment: str
    review_date: Optional[str] = None

class CustomerReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: str

class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    reviewer_name: str
    rating: int
    comment: str
    review_date: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    source: Optional[str] = None
    customer_id: Optional[str] = None
    customer_email: Optional[str] = None
    is_customer_review: bool = False
    status: str = "approved"
    order_id: Optional[str] = None

class PageContent(BaseModel):
    model_config = ConfigDict(extra="ignore")
    page_key: str
    title: str
    content: str
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SocialLinkCreate(BaseModel):
    platform: str
    url: str
    icon: Optional[str] = None

class SocialLink(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    platform: str
    url: str
    icon: Optional[str] = None

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

class CategoryCreate(BaseModel):
    name: str

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str

class FAQItemCreate(BaseModel):
    question: str
    answer: str
    category: str = "General"
    sort_order: int = 0

class FAQItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    question: str
    answer: str
    category: str = "General"
    sort_order: int = 0

class FAQReorderRequest(BaseModel):
    faq_ids: List[str]

class PromoCodeCreate(BaseModel):
    code: str
    discount_type: str = "percentage"
    discount_value: float
    min_order_amount: float = 0
    max_uses: Optional[int] = None
    max_uses_per_customer: Optional[int] = None
    is_active: bool = True
    expiry_date: Optional[str] = None
    applicable_categories: List[str] = []
    applicable_products: List[str] = []
    first_time_only: bool = False
    buy_quantity: Optional[int] = None
    get_quantity: Optional[int] = None
    auto_apply: bool = False
    stackable: bool = False

class PromoCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    discount_type: str = "percentage"
    discount_value: float
    min_order_amount: float = 0
    max_uses: Optional[int] = None
    max_uses_per_customer: Optional[int] = None
    used_count: int = 0
    is_active: bool = True
    expiry_date: Optional[str] = None
    applicable_categories: List[str] = []
    applicable_products: List[str] = []
    first_time_only: bool = False
    buy_quantity: Optional[int] = None
    get_quantity: Optional[int] = None
    auto_apply: bool = False
    stackable: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CreditSettings(BaseModel):
    cashback_percentage: float = 5.0
    is_enabled: bool = True
    eligible_categories: List[str] = []
    eligible_products: List[str] = []
    min_order_amount: float = 0
    usable_categories: List[str] = []
    usable_products: List[str] = []
    max_credit_per_order: float = 0
    max_credit_percentage: float = 0
    free_customer_credit_cap: float = 0

class CustomerCreditUpdate(BaseModel):
    customer_id: str
    amount: float
    reason: str = "Manual adjustment"

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    variation_id: Optional[str] = None
    variation_name: Optional[str] = None
    price: float
    quantity: int = 1
    custom_fields: dict = {}

class CreateOrderRequest(BaseModel):
    customer_name: str
    customer_email: str
    customer_phone: str
    items: List[OrderItem]
    payment_method: str
    total_amount: float
    promo_code: Optional[str] = None
    discount_amount: float = 0
    whatsapp_number: Optional[str] = None
    credits_used: float = 0
    credit_discount: float = 0

class PaymentMethod(BaseModel):
    name: str
    type: str = "bank"
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    bank_name: Optional[str] = None
    qr_code_url: Optional[str] = None
    instructions: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0
    icon: Optional[str] = None
    whatsapp_number: Optional[str] = None
    redirect_url: Optional[str] = None

class PaymentScreenshotUpload(BaseModel):
    screenshot_url: str
    payment_method: Optional[str] = None
    payment_note: Optional[str] = None
    sender_name: Optional[str] = None

class NotificationBar(BaseModel):
    text: str
    link: Optional[str] = None
    is_active: bool = True
    bg_color: str = "#f59e0b"
    text_color: str = "#000000"
    link_text: Optional[str] = None

class BlogPost(BaseModel):
    title: str
    slug: Optional[str] = None
    content: str
    excerpt: Optional[str] = None
    featured_image: Optional[str] = None
    is_published: bool = True
    tags: List[str] = []
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None

class BulkDeleteRequest(BaseModel):
    order_ids: List[str]

class WebhookTestRequest(BaseModel):
    webhook_url: str
    message: str = "Test webhook from GameShop Nepal"

class WishlistItem(BaseModel):
    product_id: str
    variation_id: Optional[str] = None

class WishlistCreate(BaseModel):
    visitor_id: str
    product_id: str
    variation_id: Optional[str] = None
    email: Optional[str] = None

class NewsletterSubscribe(BaseModel):
    email: str
    name: Optional[str] = None
    source: str = "website"

class CustomerLogin(BaseModel):
    email: str
    otp: Optional[str] = None

class CustomerProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class GoogleAuthRequest(BaseModel):
    credential: str

class GoogleProfileCompletion(BaseModel):
    email: str
    phone: str

class DailyRewardSettings(BaseModel):
    is_enabled: bool = True
    base_credit_amount: float = 1.0
    streak_bonus_enabled: bool = True
    streak_milestones: dict = {}
    max_streak_bonus: float = 5.0
    notification_enabled: bool = True
    notification_message: str = ""

class ReferralSettings(BaseModel):
    is_enabled: bool = True
    referrer_reward: float = 10.0
    referee_reward: float = 5.0
    min_purchase_amount: float = 0
    max_referrals_per_user: int = 0
    reward_type: str = "credits"
    description: str = ""

class MultiplierEvent(BaseModel):
    name: str
    event_type: str = "daily_reward"
    multiplier: float = 2.0
    start_date: str = ""
    end_date: str = ""
    is_active: bool = True
    description: str = ""

class NewsletterColors(BaseModel):
    header_bg: str = "#f59e0b"
    header_text: str = "#000000"
    body_bg: str = "#1a1a2e"
    body_text: str = "#e0e0e0"
    button_bg: str = "#f59e0b"
    button_text: str = "#000000"

class NewsletterSendRequest(BaseModel):
    subject: str
    content: str
    preview_text: Optional[str] = None
    colors: Optional[NewsletterColors] = None
    test_email: Optional[str] = None
    cta_text: Optional[str] = None
    cta_url: Optional[str] = None

class BundleProduct(BaseModel):
    product_id: str
    variation_id: Optional[str] = None

class BundleCreate(BaseModel):
    name: str
    description: str = ""
    products: List[BundleProduct] = []
    bundle_price: float
    original_price: float = 0
    image_url: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0

class Bundle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    products: List[BundleProduct] = []
    bundle_price: float
    original_price: float = 0
    image_url: Optional[str] = None
    is_active: bool = True
    sort_order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CreditValidationRequest(BaseModel):
    customer_email: str
    amount: float
    items: List[dict] = []

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None
