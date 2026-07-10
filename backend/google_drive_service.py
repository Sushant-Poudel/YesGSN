"""
Google Drive Service for Payment Screenshots
Uses service account for simple, admin-controlled storage
"""
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload, MediaIoBaseUpload
import os
import io
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Service account credentials file
ROOT_DIR = Path(__file__).parent
SERVICE_ACCOUNT_FILE = ROOT_DIR / 'google_drive_credentials.json'

# Google Drive folder ID (create a folder in Drive and get its ID from the URL)
# If not set, files will be uploaded to root
DRIVE_FOLDER_ID = os.getenv('GOOGLE_DRIVE_FOLDER_ID', None)

# Scopes
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def get_drive_service():
    """Get Google Drive service using service account"""
    try:
        credentials = service_account.Credentials.from_service_account_file(
            str(SERVICE_ACCOUNT_FILE),
            scopes=SCOPES
        )
        service = build('drive', 'v3', credentials=credentials)
        return service
    except Exception as e:
        logger.error(f"Failed to create Drive service: {str(e)}")
        raise

def upload_payment_screenshot(file_content: bytes, filename: str, mime_type: str = 'image/jpeg'):
    """
    Upload payment screenshot to Google Drive
    Returns public shareable link
    """
    try:
        service = get_drive_service()
        
        # Prepare file metadata
        file_metadata = {
            'name': filename,
            'parents': [DRIVE_FOLDER_ID] if DRIVE_FOLDER_ID else []
        }
        
        # Upload file
        media = MediaIoBaseUpload(
            io.BytesIO(file_content),
            mimetype=mime_type,
            resumable=True
        )
        
        file = service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, webViewLink, webContentLink'
        ).execute()
        
        file_id = file.get('id')
        
        # Make file publicly viewable
        permission = {
            'type': 'anyone',
            'role': 'reader'
        }
        service.permissions().create(
            fileId=file_id,
            body=permission
        ).execute()
        
        # Get direct view link
        view_link = f"https://drive.google.com/uc?id={file_id}&export=view"
        
        logger.info(f"Uploaded payment screenshot to Drive: {filename} (ID: {file_id})")
        
        return {
            'file_id': file_id,
            'view_link': view_link,
            'web_view_link': file.get('webViewLink'),
            'download_link': file.get('webContentLink')
        }
    
    except Exception as e:
        logger.error(f"Failed to upload to Drive: {str(e)}")
        raise Exception(f"Drive upload failed: {str(e)}")

def delete_payment_screenshot(file_id: str):
    """Delete file from Google Drive"""
    try:
        service = get_drive_service()
        service.files().delete(fileId=file_id).execute()
        logger.info(f"Deleted file from Drive: {file_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to delete from Drive: {str(e)}")
        return False

def get_file_info(file_id: str):
    """Get file metadata from Google Drive"""
    try:
        service = get_drive_service()
        file = service.files().get(
            fileId=file_id,
            fields='id, name, mimeType, size, createdTime, webViewLink'
        ).execute()
        return file
    except Exception as e:
        logger.error(f"Failed to get file info: {str(e)}")
        return None

def create_folder_if_not_exists(folder_name: str = "Payment Screenshots"):
    """Create a folder in Google Drive and return its ID"""
    try:
        service = get_drive_service()
        
        # Check if folder already exists
        query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = service.files().list(
            q=query,
            spaces='drive',
            fields='files(id, name)'
        ).execute()
        
        folders = results.get('files', [])
        if folders:
            folder_id = folders[0]['id']
            logger.info(f"Found existing folder: {folder_name} (ID: {folder_id})")
            return folder_id
        
        # Create new folder
        file_metadata = {
            'name': folder_name,
            'mimeType': 'application/vnd.google-apps.folder'
        }
        folder = service.files().create(
            body=file_metadata,
            fields='id'
        ).execute()
        
        folder_id = folder.get('id')
        logger.info(f"Created new folder: {folder_name} (ID: {folder_id})")
        
        return folder_id
    
    except Exception as e:
        logger.error(f"Failed to create folder: {str(e)}")
        raise
