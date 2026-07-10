"""
ImgBB Image Hosting Service
Simple, free image hosting for payment screenshots
"""
import httpx
import base64
import logging
import os

logger = logging.getLogger(__name__)

IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload"

def get_imgbb_api_key():
    """Get API key dynamically to pick up env changes"""
    return os.environ.get('IMGBB_API_KEY')

async def upload_to_imgbb(image_bytes: bytes, filename: str) -> dict:
    """
    Upload image to ImgBB and return URLs
    
    Args:
        image_bytes: Image file content as bytes
        filename: Original filename
    
    Returns:
        dict with 'url', 'display_url', 'delete_url'
    """
    api_key = get_imgbb_api_key()
    if not api_key:
        raise Exception("IMGBB_API_KEY not configured in environment")
    
    try:
        # Convert image to base64
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Prepare payload
        payload = {
            'key': api_key,
            'image': image_base64,
            'name': filename
        }
        
        # Upload to ImgBB (increased timeout for larger images)
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(IMGBB_UPLOAD_URL, data=payload)
            response.raise_for_status()
            result = response.json()
        
        if not result.get('success'):
            error_msg = result.get('error', {}).get('message', 'Unknown error')
            raise Exception(f"ImgBB upload failed: {error_msg}")
        
        data = result['data']
        
        logger.info(f"✓ Uploaded to ImgBB: {filename} -> {data['url']}")
        
        return {
            'url': data['url'],  # Direct image URL
            'display_url': data['display_url'],  # ImgBB page URL
            'delete_url': data['delete_url'],  # URL to delete image
            'image_id': data['id'],
            'thumb_url': data.get('thumb', {}).get('url'),
            'medium_url': data.get('medium', {}).get('url'),
        }
    
    except httpx.HTTPStatusError as e:
        logger.error(f"ImgBB HTTP error: {e.response.status_code} - {e.response.text}")
        raise Exception(f"Image upload failed: {e.response.status_code}")
    except Exception as e:
        logger.error(f"ImgBB upload error: {str(e)}")
        raise Exception(f"Image upload failed: {str(e)}")

def get_direct_image_url(imgbb_url: str) -> str:
    """
    Extract direct image URL from ImgBB URL
    ImgBB returns direct-linkable URLs by default
    """
    return imgbb_url
