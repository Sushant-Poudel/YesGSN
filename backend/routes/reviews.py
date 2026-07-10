"""Reviews and FAQ routes."""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from database import db
from dependencies import get_current_user, get_current_customer
import uuid
import os
import logging
import random
import asyncio
import re
import json as json_mod

logger = logging.getLogger(__name__)
router = APIRouter()


# ==================== MODELS ====================

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
    admin_reply: Optional[str] = None
    admin_reply_at: Optional[str] = None

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


# ==================== REVIEWS ====================

@router.get("/reviews")
async def get_reviews():
    reviews = await db.reviews.find({"status": {"$in": ["approved", None]}}, {"_id": 0}).sort("review_date", -1).to_list(20)
    for review in reviews:
        if "created_at" in review and isinstance(review["created_at"], datetime):
            review["created_at"] = review["created_at"].isoformat()
        if "review_date" in review and isinstance(review["review_date"], datetime):
            review["review_date"] = review["review_date"].isoformat()
    return reviews

@router.get("/reviews/public")
async def get_reviews_public(page: int = 1, limit: int = 20, rating: int = None):
    skip = (page - 1) * limit
    base_match = {"status": {"$in": ["approved", None]}}
    filtered_match = {**base_match, **({"rating": rating} if rating else {})}
    total = await db.reviews.count_documents(filtered_match)
    reviews = await db.reviews.find(filtered_match, {"_id": 0}).sort("review_date", -1).skip(skip).limit(limit).to_list(limit)
    for review in reviews:
        if "created_at" in review and isinstance(review["created_at"], datetime):
            review["created_at"] = review["created_at"].isoformat()
        if "review_date" in review and isinstance(review["review_date"], datetime):
            review["review_date"] = review["review_date"].isoformat()
    stats_result = await db.reviews.aggregate([
        {"$match": base_match},
        {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}, "count": {"$sum": 1}}}
    ]).to_list(1)
    avg_rating = round(stats_result[0]["avg_rating"], 1) if stats_result else 0
    dist_result = await db.reviews.aggregate([
        {"$match": base_match},
        {"$group": {"_id": "$rating", "count": {"$sum": 1}}}
    ]).to_list(5)
    distribution = {str(i): 0 for i in range(1, 6)}
    for d in dist_result:
        distribution[str(d["_id"])] = d["count"]
    return {
        "reviews": reviews, "total": total, "page": page,
        "pages": (total + limit - 1) // limit if limit > 0 else 1,
        "avg_rating": avg_rating, "distribution": distribution
    }

@router.get("/reviews/admin")
async def get_reviews_admin(current_user: dict = Depends(get_current_user)):
    reviews = await db.reviews.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    for review in reviews:
        if "created_at" in review and isinstance(review["created_at"], datetime):
            review["created_at"] = review["created_at"].isoformat()
        if "review_date" in review and isinstance(review["review_date"], datetime):
            review["review_date"] = review["review_date"].isoformat()
    return reviews

@router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    review = Review(
        reviewer_name=review_data.reviewer_name, rating=review_data.rating,
        comment=review_data.comment,
        review_date=review_data.review_date or datetime.now(timezone.utc).isoformat(),
        status="approved"
    )
    await db.reviews.insert_one(review.model_dump())
    return review

@router.post("/reviews/customer")
async def create_customer_review(review_data: CustomerReviewCreate, current_customer: dict = Depends(get_current_customer)):
    completed_order = await db.orders.find_one({
        "customer_email": current_customer["email"],
        "status": {"$regex": "^(completed|delivered|confirmed)$", "$options": "i"}
    })
    if not completed_order:
        raise HTTPException(status_code=403, detail="You need at least one completed order to leave a review")
    existing_review = await db.reviews.find_one({"customer_id": current_customer["id"], "is_customer_review": True})
    if existing_review:
        raise HTTPException(status_code=400, detail="You have already submitted a review. You can edit it instead.")
    customer_name = current_customer.get("name", current_customer.get("email", "Customer"))
    review = Review(
        reviewer_name=customer_name, rating=review_data.rating, comment=review_data.comment,
        review_date=datetime.now(timezone.utc).isoformat(),
        customer_id=current_customer["id"], customer_email=current_customer["email"],
        is_customer_review=True, status="pending", order_id=completed_order.get("id")
    )
    await db.reviews.insert_one(review.model_dump())
    return {"message": "Review submitted successfully! It will appear after admin approval.", "review_id": review.id}

@router.put("/reviews/customer")
async def update_customer_review(review_data: CustomerReviewCreate, current_customer: dict = Depends(get_current_customer)):
    existing = await db.reviews.find_one({"customer_id": current_customer["id"], "is_customer_review": True})
    if not existing:
        raise HTTPException(status_code=404, detail="You haven't submitted a review yet")
    await db.reviews.update_one(
        {"customer_id": current_customer["id"], "is_customer_review": True},
        {"$set": {"rating": review_data.rating, "comment": review_data.comment, "status": "pending", "review_date": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Review updated! It will appear after admin re-approval."}

@router.get("/reviews/my-review")
async def get_my_review(current_customer: dict = Depends(get_current_customer)):
    review = await db.reviews.find_one({"customer_id": current_customer["id"], "is_customer_review": True}, {"_id": 0})
    has_completed_order = await db.orders.count_documents({
        "customer_email": current_customer["email"],
        "status": {"$regex": "^(completed|delivered|confirmed)$", "$options": "i"}
    }) > 0
    return {"review": review, "can_review": has_completed_order}

@router.put("/reviews/{review_id}/status")
async def update_review_status(review_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Status must be approved, rejected, or pending")
    review = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.reviews.update_one({"id": review_id}, {"$set": {"status": status}})
    promo_code = None
    if status == "approved" and review.get("is_customer_review") and review.get("customer_email"):
        if not review.get("reward_promo_code"):
            reward_settings = await db.site_settings.find_one({"id": "review_reward"}, {"_id": 0})
            reward_pct = 5
            reward_enabled = True
            if reward_settings:
                reward_pct = reward_settings.get("review_reward_percentage", 5)
                reward_enabled = reward_settings.get("review_reward_enabled", True)
            if reward_enabled and reward_pct > 0:
                code_str = f"REVIEW-{review_id[:8].upper()}"
                existing_code = await db.promo_codes.find_one({"code": code_str})
                if existing_code:
                    code_str = f"REVIEW-{uuid.uuid4().hex[:8].upper()}"
                expiry = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
                promo = {
                    "id": str(uuid.uuid4()), "code": code_str, "discount_type": "percentage",
                    "discount_value": reward_pct, "min_order_amount": 0, "max_uses": 1,
                    "max_uses_per_customer": 1, "used_count": 0, "is_active": True,
                    "expiry_date": expiry, "applicable_categories": [], "applicable_products": [],
                    "first_time_only": False, "buy_quantity": None, "get_quantity": None,
                    "auto_apply": False, "stackable": False,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "source": "review_reward", "customer_email": review["customer_email"]
                }
                await db.promo_codes.insert_one(promo)
                await db.reviews.update_one({"id": review_id}, {"$set": {"reward_promo_code": code_str}})
                promo_code = code_str
                try:
                    customer_name = review.get("reviewer_name", "Customer")
                    subject = f"Thank you for your review! Here's {reward_pct}% off - GameShop Nepal"
                    html = f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a1a; color: #fff;">
                        <div style="background: linear-gradient(135deg, #F5A623 0%, #D4920D 100%); padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #000; font-size: 28px;">Thank You!</h1>
                        </div>
                        <div style="padding: 30px;">
                            <p style="color: #ccc; font-size: 16px;">Hi {customer_name},</p>
                            <p style="color: #ccc; font-size: 16px;">Thank you for sharing your experience! Here's a special discount for your next purchase:</p>
                            <div style="background: linear-gradient(135deg, #F5A623 0%, #D4920D 100%); border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center;">
                                <p style="color: #000; margin: 0 0 8px 0; font-size: 14px; font-weight: 600;">YOUR PROMO CODE</p>
                                <p style="color: #000; margin: 0; font-size: 32px; font-weight: 800; letter-spacing: 3px;">{code_str}</p>
                                <p style="color: rgba(0,0,0,0.7); margin: 10px 0 0 0; font-size: 14px;">{reward_pct}% off your next order &bull; Valid for 30 days</p>
                            </div>
                        </div>
                    </div>
                    """
                    text = f"Hi {customer_name}, thank you for your review! Use code {code_str} for {reward_pct}% off your next order. Valid for 30 days."
                    from email_service import send_email
                    send_email(review["customer_email"], subject, html, text)
                except Exception as e:
                    logger.warning(f"Failed to send review reward email: {e}")
    response = {"message": f"Review {status}"}
    if promo_code:
        response["promo_code"] = promo_code
    return response

@router.get("/reviews/reward-settings")
async def get_review_reward_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.site_settings.find_one({"id": "review_reward"}, {"_id": 0})
    if not settings:
        settings = {"id": "review_reward", "review_reward_percentage": 5, "review_reward_enabled": True}
    return settings

@router.put("/reviews/reward-settings")
async def update_review_reward_settings(data: dict, current_user: dict = Depends(get_current_user)):
    data["id"] = "review_reward"
    await db.site_settings.update_one({"id": "review_reward"}, {"$set": data}, upsert=True)
    return data

@router.put("/reviews/{review_id}")
async def update_review(review_id: str, review_data: ReviewCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.reviews.find_one({"id": review_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Review not found")
    update_data = review_data.model_dump()
    update_data["review_date"] = review_data.review_date or existing.get("review_date")
    await db.reviews.update_one({"id": review_id}, {"$set": update_data})
    updated = await db.reviews.find_one({"id": review_id}, {"_id": 0})
    return updated

@router.delete("/reviews/{review_id}")
async def delete_review(review_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.reviews.delete_one({"id": review_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Review not found")
    return {"message": "Review deleted"}


class PublicReviewCreate(BaseModel):
    reviewer_name: str
    rating: int = Field(ge=1, le=5)
    comment: str
    reviewer_email: Optional[str] = None

@router.post("/reviews/public")
async def create_public_review(review_data: PublicReviewCreate):
    """Allow anyone to submit a review — goes to pending for admin approval."""
    review = {
        "id": str(uuid.uuid4()),
        "reviewer_name": review_data.reviewer_name,
        "rating": review_data.rating,
        "comment": review_data.comment,
        "reviewer_email": review_data.reviewer_email,
        "review_date": datetime.now(timezone.utc).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source": "website",
        "status": "pending",
        "is_customer_review": False,
        "is_verified_buyer": False,
        "admin_reply": None,
        "admin_reply_at": None,
    }
    # Check if this email has a completed order — mark as verified buyer
    if review_data.reviewer_email:
        order = await db.orders.find_one({
            "customer_email": review_data.reviewer_email,
            "status": {"$regex": "^(completed|delivered|confirmed)$", "$options": "i"}
        })
        if order:
            review["is_verified_buyer"] = True
    await db.reviews.insert_one(review)
    return {"message": "Review submitted! It will appear after admin approval.", "review_id": review["id"]}


@router.put("/reviews/{review_id}/reply")
async def reply_to_review(review_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Admin reply to a review."""
    reply = data.get("reply", "").strip()
    if not reply:
        raise HTTPException(status_code=400, detail="Reply cannot be empty")
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    await db.reviews.update_one(
        {"id": review_id},
        {"$set": {
            "admin_reply": reply,
            "admin_reply_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    return {"message": "Reply posted successfully"}


# ==================== FAQS ====================

@router.get("/faqs", response_model=List[FAQItem])
async def get_faqs():
    faqs = await db.faqs.find({}, {"_id": 0}).sort("sort_order", 1).to_list(100)
    return faqs

@router.post("/faqs", response_model=FAQItem)
async def create_faq(faq_data: FAQItemCreate, current_user: dict = Depends(get_current_user)):
    max_order = await db.faqs.find_one(sort=[("sort_order", -1)])
    next_order = (max_order.get("sort_order", 0) + 1) if max_order else 0
    faq = FAQItem(question=faq_data.question, answer=faq_data.answer, sort_order=next_order)
    await db.faqs.insert_one(faq.model_dump())
    return faq

@router.put("/faqs/reorder")
async def reorder_faqs(request: Request, current_user: dict = Depends(get_current_user)):
    faq_ids = await request.json()
    for index, faq_id in enumerate(faq_ids):
        await db.faqs.update_one({"id": faq_id}, {"$set": {"sort_order": index}})
    return {"message": "FAQs reordered successfully"}

@router.put("/faqs/{faq_id}", response_model=FAQItem)
async def update_faq(faq_id: str, faq_data: FAQItemCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.faqs.find_one({"id": faq_id})
    if not existing:
        raise HTTPException(status_code=404, detail="FAQ not found")
    await db.faqs.update_one({"id": faq_id}, {"$set": faq_data.model_dump()})
    updated = await db.faqs.find_one({"id": faq_id}, {"_id": 0})
    return updated

@router.delete("/faqs/{faq_id}")
async def delete_faq(faq_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.faqs.delete_one({"id": faq_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="FAQ not found")
    return {"message": "FAQ deleted"}