"""Ads management routes."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime, timezone
from database import db
from dependencies import get_current_user, create_audit_log
import uuid

router = APIRouter()


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


@router.get("/ads")
async def get_all_ads(current_user: dict = Depends(get_current_user)):
    ads = await db.ads.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return ads

@router.get("/ads/active")
async def get_active_ads(position: Optional[str] = None):
    now = datetime.now(timezone.utc).isoformat()
    query = {"is_active": True, "$or": [{"start_date": None}, {"start_date": {"$lte": now}}]}
    if position:
        query["position"] = position
    ads = await db.ads.find(query, {"_id": 0}).sort("priority", -1).to_list(50)
    active_ads = [ad for ad in ads if not (ad.get("end_date") and ad["end_date"] < now)]
    return active_ads

@router.post("/ads", response_model=Ad)
async def create_ad(ad_data: AdCreate, current_user: dict = Depends(get_current_user)):
    ad = Ad(**ad_data.model_dump())
    await db.ads.insert_one(ad.model_dump())
    await create_audit_log(
        action="CREATE_AD", actor_id=current_user.get("id"),
        actor_name=current_user.get("name", current_user.get("email")),
        actor_role=current_user.get("role", "admin"),
        resource_type="ad", resource_id=ad.id, resource_name=ad.name,
        details={"position": ad.position, "target_url": ad.target_url}
    )
    return ad

@router.put("/ads/{ad_id}")
async def update_ad(ad_id: str, ad_data: AdCreate, current_user: dict = Depends(get_current_user)):
    existing = await db.ads.find_one({"id": ad_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Ad not found")
    await db.ads.update_one({"id": ad_id}, {"$set": ad_data.model_dump()})
    updated = await db.ads.find_one({"id": ad_id}, {"_id": 0})
    return updated

@router.delete("/ads/{ad_id}")
async def delete_ad(ad_id: str, current_user: dict = Depends(get_current_user)):
    existing = await db.ads.find_one({"id": ad_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Ad not found")
    await db.ads.delete_one({"id": ad_id})
    await create_audit_log(
        action="DELETE_AD", actor_id=current_user.get("id"),
        actor_name=current_user.get("name", current_user.get("email")),
        actor_role=current_user.get("role", "admin"),
        resource_type="ad", resource_id=ad_id, resource_name=existing.get("name"),
        details={"position": existing.get("position")}
    )
    return {"message": "Ad deleted"}

@router.post("/ads/{ad_id}/impression")
async def track_ad_impression(ad_id: str):
    await db.ads.update_one({"id": ad_id}, {"$inc": {"impressions": 1}})
    return {"success": True}

@router.post("/ads/{ad_id}/click")
async def track_ad_click(ad_id: str):
    await db.ads.update_one({"id": ad_id}, {"$inc": {"clicks": 1}})
    return {"success": True}

@router.get("/ads/stats")
async def get_ad_stats(current_user: dict = Depends(get_current_user)):
    ads = await db.ads.find({}, {"_id": 0}).to_list(100)
    total_impressions = sum(ad.get("impressions", 0) for ad in ads)
    total_clicks = sum(ad.get("clicks", 0) for ad in ads)
    active_ads = sum(1 for ad in ads if ad.get("is_active"))
    ads_with_ctr = []
    for ad in ads:
        impressions = ad.get("impressions", 0)
        clicks = ad.get("clicks", 0)
        ctr = (clicks / impressions * 100) if impressions > 0 else 0
        ads_with_ctr.append({
            "id": ad.get("id"), "name": ad.get("name"), "position": ad.get("position"),
            "impressions": impressions, "clicks": clicks, "ctr": round(ctr, 2)
        })
    top_ads = sorted(ads_with_ctr, key=lambda x: x["clicks"], reverse=True)[:5]
    return {
        "total_ads": len(ads), "active_ads": active_ads,
        "total_impressions": total_impressions, "total_clicks": total_clicks,
        "overall_ctr": round((total_clicks / total_impressions * 100), 2) if total_impressions > 0 else 0,
        "top_ads": top_ads
    }

@router.get("/ads/positions")
async def get_ad_positions():
    return {
        "positions": [
            {"value": "home_banner", "label": "Homepage Banner", "description": "Large banner at top of homepage"},
            {"value": "home_sidebar", "label": "Homepage Sidebar", "description": "Sidebar ad on homepage"},
            {"value": "product_inline", "label": "Product Inline", "description": "Between product listings"},
            {"value": "product_sidebar", "label": "Product Page Sidebar", "description": "Sidebar on product pages"},
            {"value": "footer", "label": "Footer Banner", "description": "Banner in footer area"},
            {"value": "popup", "label": "Popup Ad", "description": "Popup advertisement"}
        ]
    }
