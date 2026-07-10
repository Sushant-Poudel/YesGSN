"""Product and category management routes."""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
from database import db, UPLOADS_DIR
from dependencies import get_current_user, create_audit_log
from utils import generate_slug
from imgbb_service import upload_to_imgbb
import uuid
import shutil
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== MODELS ====================

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
    is_giftcard: bool = False
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductOrderUpdate(BaseModel):
    product_ids: List[str]

class CategoryCreate(BaseModel):
    name: str

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str


# ==================== IMAGE UPLOAD ====================

@router.post("/upload")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, WebP, GIF allowed.")
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{file_ext}"
    file_path = UPLOADS_DIR / filename
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"url": f"/api/uploads/{filename}"}

@router.post("/upload/payment")
async def upload_payment_image(file: UploadFile = File(...)):
    # Validate file type — only allow images
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only image files are allowed (JPG, PNG, WEBP)")
    # Validate file size — max 10MB
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 10MB")
    await file.seek(0)  # Reset file pointer after reading
    """Public endpoint for uploading payment screenshots - using ImgBB"""
    allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif", "application/octet-stream"]
    allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif']
    file_ext = file.filename.split(".")[-1].lower() if "." in file.filename else ""
    content_type_ok = file.content_type in allowed_types
    extension_ok = file_ext in allowed_extensions
    if not content_type_ok and not extension_ok:
        logger.warning(f"Invalid file type: {file.content_type}, extension: {file_ext}")
        raise HTTPException(status_code=400, detail="Invalid file type. Only JPEG, PNG, WebP, GIF, HEIC allowed.")
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB allowed.")
    try:
        if file_ext in ['heic', 'heif']:
            file_ext = 'jpg'
        elif not file_ext or file_ext not in allowed_extensions:
            file_ext = 'jpg'
        filename = f"payment_{uuid.uuid4()}.{file_ext}"
        result = await upload_to_imgbb(image_bytes=contents, filename=filename)
        logger.info(f"Payment screenshot uploaded to ImgBB: {filename}")
        return {"url": result['url'], "image_id": result['image_id'], "delete_url": result['delete_url']}
    except Exception as e:
        logger.error(f"Failed to upload payment screenshot: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload screenshot: {str(e)}")

@router.get("/uploads/{filename}")
async def get_uploaded_image(filename: str):
    from fastapi.responses import FileResponse
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)


# ==================== CATEGORIES ====================

@router.get("/categories", response_model=List[Category])
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@router.post("/categories", response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    slug = category_data.name.lower().replace(" ", "-").replace("&", "and")
    category = Category(name=category_data.name, slug=slug)
    await db.categories.insert_one(category.model_dump())
    return category

@router.put("/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.categories.find_one({"id": category_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Category not found")
    slug = category_data.name.lower().replace(" ", "-").replace("&", "and")
    await db.categories.update_one({"id": category_id}, {"$set": {"name": category_data.name, "slug": slug}})
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    return updated

@router.delete("/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}


# ==================== PRODUCTS ====================

@router.get("/products", response_model=List[Product])
async def get_products(category_id: Optional[str] = None, active_only: bool = True):
    query = {}
    if category_id:
        query["category_id"] = category_id
    if active_only:
        query["is_active"] = True
    products = await db.products.find(query, {"_id": 0}).sort([("sort_order", 1), ("created_at", -1)]).to_list(1000)
    for product in products:
        if "created_at" in product and isinstance(product["created_at"], datetime):
            product["created_at"] = product["created_at"].isoformat()
        if "updated_at" in product and isinstance(product["updated_at"], datetime):
            product["updated_at"] = product["updated_at"].isoformat()
        if "discord_webhooks" in product:
            product["discord_webhooks"] = []
    return products

@router.get("/products/search/advanced")
async def advanced_product_search(
    q: Optional[str] = None, category_id: Optional[str] = None,
    min_price: Optional[float] = None, max_price: Optional[float] = None,
    tags: Optional[str] = None, sort_by: str = "relevance", limit: int = 50
):
    query = {"is_active": True}
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"tags": {"$regex": q, "$options": "i"}}
        ]
    if category_id:
        query["category_id"] = category_id
    if tags:
        tag_list = [tag.strip() for tag in tags.split(",")]
        query["tags"] = {"$in": tag_list}
    products = await db.products.find(query, {"_id": 0}).to_list(1000)
    if min_price is not None or max_price is not None:
        filtered = []
        for product in products:
            if product.get("variations"):
                prices = [v["price"] for v in product["variations"]]
                min_p = min(prices)
                max_p = max(prices)
                if min_price and max_p < min_price:
                    continue
                if max_price and min_p > max_price:
                    continue
                filtered.append(product)
        products = filtered
    if sort_by == "price_low":
        products.sort(key=lambda p: min([v["price"] for v in p.get("variations", [{"price": 0}])]))
    elif sort_by == "price_high":
        products.sort(key=lambda p: max([v["price"] for v in p.get("variations", [{"price": 0}])]), reverse=True)
    elif sort_by == "newest":
        products.sort(key=lambda p: p.get("created_at", ""), reverse=True)
    return products[:limit]

@router.get("/products/search/suggestions")
async def search_suggestions(q: str, limit: int = 5):
    if not q or len(q) < 2:
        return []
    products = await db.products.find(
        {"is_active": True, "$or": [
            {"name": {"$regex": f"^{q}", "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0, "id": 1, "name": 1, "image_url": 1, "slug": 1}
    ).limit(limit).to_list(limit)
    return products

@router.put("/products/reorder")
async def reorder_products(order_data: ProductOrderUpdate, current_user: dict = Depends(get_current_user)):
    for index, product_id in enumerate(order_data.product_ids):
        await db.products.update_one({"id": product_id}, {"$set": {"sort_order": index}})
    return {"message": "Products reordered successfully"}

@router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"slug": product_id}, {"_id": 0})
    if not product:
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if "created_at" in product and isinstance(product["created_at"], datetime):
        product["created_at"] = product["created_at"].isoformat()
    if "updated_at" in product and isinstance(product["updated_at"], datetime):
        product["updated_at"] = product["updated_at"].isoformat()
    if "discord_webhooks" in product:
        product["discord_webhooks"] = []
    return product

@router.get("/admin/products", response_model=List[Product])
async def get_products_admin(category_id: Optional[str] = None, active_only: bool = False, current_user: dict = Depends(get_current_user)):
    query = {}
    if category_id:
        query["category_id"] = category_id
    if active_only:
        query["is_active"] = True
    products = await db.products.find(query, {"_id": 0}).sort([("sort_order", 1), ("created_at", -1)]).to_list(1000)
    for product in products:
        if "created_at" in product and isinstance(product["created_at"], datetime):
            product["created_at"] = product["created_at"].isoformat()
        if "updated_at" in product and isinstance(product["updated_at"], datetime):
            product["updated_at"] = product["updated_at"].isoformat()
        if "discord_webhooks" not in product:
            product["discord_webhooks"] = []
    return products

@router.get("/admin/products/{product_id}", response_model=Product)
async def get_product_admin(product_id: str, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"slug": product_id}, {"_id": 0})
    if not product:
        product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if "created_at" in product and isinstance(product["created_at"], datetime):
        product["created_at"] = product["created_at"].isoformat()
    if "updated_at" in product and isinstance(product["updated_at"], datetime):
        product["updated_at"] = product["updated_at"].isoformat()
    if "discord_webhooks" not in product:
        product["discord_webhooks"] = []
    return product

@router.get("/products/{product_id}/related")
async def get_related_products(product_id: str, limit: int = 4):
    product = await db.products.find_one({"$or": [{"slug": product_id}, {"id": product_id}]})
    if not product:
        return []
    related = []
    same_category = await db.products.find({
        "category_id": product.get("category_id"), "id": {"$ne": product.get("id")}, "is_active": True
    }, {"_id": 0}).limit(limit).to_list(limit)
    related.extend(same_category)
    if len(related) < limit and product.get("tags"):
        existing_ids = [p.get("id") for p in related]
        existing_ids.append(product.get("id"))
        with_tags = await db.products.find({
            "tags": {"$in": product.get("tags", [])}, "id": {"$nin": existing_ids}, "is_active": True
        }, {"_id": 0}).limit(limit - len(related)).to_list(limit - len(related))
        related.extend(with_tags)
    if len(related) < limit:
        existing_ids = [p.get("id") for p in related]
        existing_ids.append(product.get("id"))
        others = await db.products.find({
            "id": {"$nin": existing_ids}, "is_active": True
        }, {"_id": 0}).limit(limit - len(related)).to_list(limit - len(related))
        related.extend(others)
    for prod in related:
        if "created_at" in prod and isinstance(prod["created_at"], datetime):
            prod["created_at"] = prod["created_at"].isoformat()
        if "updated_at" in prod and isinstance(prod["updated_at"], datetime):
            prod["updated_at"] = prod["updated_at"].isoformat()
    return related[:limit]

@router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    max_order = await db.products.find_one(sort=[("sort_order", -1)])
    next_order = (max_order.get("sort_order", 0) + 1) if max_order else 0
    product_dict = product_data.model_dump()
    product_dict["sort_order"] = next_order
    if product_data.slug and product_data.slug.strip():
        custom_slug = product_data.slug.strip().lower().replace(' ', '-')
        existing_slug = await db.products.find_one({"slug": custom_slug})
        if existing_slug:
            raise HTTPException(status_code=400, detail="This URL slug is already in use. Please choose a different one.")
        product_dict["slug"] = custom_slug
    else:
        product_dict["slug"] = generate_slug(product_data.name)
    product = Product(**product_dict)
    await db.products.insert_one(product.model_dump())
    await create_audit_log(
        action="CREATE_PRODUCT", actor_id=current_user.get("id"),
        actor_name=current_user.get("name", current_user.get("email")),
        actor_role=current_user.get("role", "admin"),
        resource_type="product", resource_id=product.id, resource_name=product.name,
        details={"category": product_data.category_id}
    )
    return product

@router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.products.find_one({"id": product_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    update_data = product_data.model_dump()
    if product_data.slug and product_data.slug.strip():
        custom_slug = product_data.slug.strip().lower().replace(' ', '-')
        existing_slug = await db.products.find_one({"slug": custom_slug, "id": {"$ne": product_id}})
        if existing_slug:
            raise HTTPException(status_code=400, detail="This URL slug is already in use. Please choose a different one.")
        update_data["slug"] = custom_slug
    else:
        update_data["slug"] = existing.get("slug") or generate_slug(product_data.name)
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated

@router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    await create_audit_log(
        action="DELETE_PRODUCT", actor_id=current_user.get("id"),
        actor_name=current_user.get("name", current_user.get("email")),
        actor_role=current_user.get("role", "admin"),
        resource_type="product", resource_id=product_id, resource_name=product.get("name"),
        details={"category": product.get("category")}
    )
    return {"message": "Product deleted"}

@router.get("/open-time")
async def get_open_time():
    """Get the open time setting."""
    setting = await db.site_settings.find_one({"id": "open_time"}, {"_id": 0})
    if not setting:
        return {"is_active": True, "open_from": "10:00 AM", "open_to": "10:00 PM"}
    return setting

@router.put("/open-time")
async def update_open_time(data: dict, current_user: dict = Depends(get_current_user)):
    """Update the open time setting."""
    data["id"] = "open_time"
    await db.site_settings.update_one({"id": "open_time"}, {"$set": data}, upsert=True)
    return data
