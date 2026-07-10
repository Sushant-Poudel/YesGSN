"""
Google Sheets Service for Customer Data Storage
Uses Service Account authentication via environment variable
"""
import gspread
from google.oauth2.service_account import Credentials
import logging
import os
import json

logger = logging.getLogger(__name__)

# Configuration - Read from environment variables
GOOGLE_SERVICE_ACCOUNT_JSON = os.environ.get('GOOGLE_SERVICE_ACCOUNT_JSON', '')
SPREADSHEET_ID = os.environ.get('GOOGLE_SHEETS_SPREADSHEET_ID', '1PNB6sHaawTa5vrpd6Oc4Q97HE2kBFBHEnuI6ChLMnmA')
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive"
]

# Sheet names
CUSTOMERS_SHEET = "Customers"
ORDERS_SHEET = "Orders"

_client = None

def get_sheets_client():
    """Get authenticated Google Sheets client"""
    global _client
    if _client is None:
        try:
            if not GOOGLE_SERVICE_ACCOUNT_JSON:
                logger.warning("GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set")
                return None
            
            # Parse JSON from environment variable
            service_account_info = json.loads(GOOGLE_SERVICE_ACCOUNT_JSON)
            
            creds = Credentials.from_service_account_info(
                service_account_info, 
                scopes=SCOPES
            )
            _client = gspread.authorize(creds)
            logger.info("Google Sheets client initialized")
        except json.JSONDecodeError as e:
            logger.error(f"Invalid GOOGLE_SERVICE_ACCOUNT_JSON format: {e}")
            return None
        except Exception as e:
            logger.error(f"Failed to initialize Google Sheets client: {e}")
            return None
    return _client

def get_or_create_worksheet(spreadsheet, sheet_name, headers):
    """Get existing worksheet or create new one with headers"""
    try:
        worksheet = spreadsheet.worksheet(sheet_name)
    except gspread.exceptions.WorksheetNotFound:
        worksheet = spreadsheet.add_worksheet(title=sheet_name, rows=1000, cols=20)
        worksheet.append_row(headers)
        logger.info(f"Created new worksheet: {sheet_name}")
    return worksheet

def sync_customer_to_sheets(customer: dict):
    """Sync customer data to Google Sheets"""
    try:
        client = get_sheets_client()
        if not client:
            logger.warning("Google Sheets client not available, skipping sync")
            return False
        
        spreadsheet = client.open_by_key(SPREADSHEET_ID)
        
        # Define headers for Customers sheet
        headers = ["ID", "Email", "Name", "Phone", "WhatsApp", "Created At", "Last Login", "Total Orders", "Total Spent"]
        worksheet = get_or_create_worksheet(spreadsheet, CUSTOMERS_SHEET, headers)
        
        # Check if customer already exists (by email)
        try:
            cell = worksheet.find(customer.get("email", ""), in_column=2)
            row_num = cell.row
            # Update existing row
            worksheet.update(f"A{row_num}:I{row_num}", [[
                customer.get("id", ""),
                customer.get("email", ""),
                customer.get("name", ""),
                customer.get("phone", ""),
                customer.get("whatsapp_number", ""),
                customer.get("created_at", ""),
                customer.get("last_login", ""),
                customer.get("total_orders", 0),
                customer.get("total_spent", 0)
            ]])
            logger.info(f"Updated customer in sheets: {customer.get('email')}")
        except gspread.exceptions.CellNotFound:
            # Add new row
            worksheet.append_row([
                customer.get("id", ""),
                customer.get("email", ""),
                customer.get("name", ""),
                customer.get("phone", ""),
                customer.get("whatsapp_number", ""),
                customer.get("created_at", ""),
                customer.get("last_login", ""),
                customer.get("total_orders", 0),
                customer.get("total_spent", 0)
            ])
            logger.info(f"Added new customer to sheets: {customer.get('email')}")
        
        return True
    except Exception as e:
        logger.error(f"Failed to sync customer to sheets: {e}")
        return False

def sync_order_to_sheets(order: dict):
    """Sync order data to Google Sheets"""
    try:
        client = get_sheets_client()
        if not client:
            logger.warning("Google Sheets client not available, skipping sync")
            return False
        
        spreadsheet = client.open_by_key(SPREADSHEET_ID)
        
        # Define headers for Orders sheet
        headers = ["Order ID", "Customer Name", "Customer Phone", "Customer Email", "Items", "Total Amount", "Status", "Payment Method", "Created At", "Notes"]
        worksheet = get_or_create_worksheet(spreadsheet, ORDERS_SHEET, headers)
        
        # Check if order already exists
        try:
            cell = worksheet.find(order.get("id", ""), in_column=1)
            row_num = cell.row
            # Update existing row
            worksheet.update(f"A{row_num}:J{row_num}", [[
                order.get("id", ""),
                order.get("customer_name", ""),
                order.get("customer_phone", ""),
                order.get("customer_email", ""),
                order.get("items_text", ""),
                order.get("total_amount", 0),
                order.get("status", "pending"),
                order.get("payment_method", ""),
                order.get("created_at", ""),
                order.get("remark", "")
            ]])
            logger.info(f"Updated order in sheets: {order.get('id')}")
        except gspread.exceptions.CellNotFound:
            # Add new row
            worksheet.append_row([
                order.get("id", ""),
                order.get("customer_name", ""),
                order.get("customer_phone", ""),
                order.get("customer_email", ""),
                order.get("items_text", ""),
                order.get("total_amount", 0),
                order.get("status", "pending"),
                order.get("payment_method", ""),
                order.get("created_at", ""),
                order.get("remark", "")
            ])
            logger.info(f"Added new order to sheets: {order.get('id')}")
        
        return True
    except Exception as e:
        logger.error(f"Failed to sync order to sheets: {e}")
        return False

def get_all_customers_from_sheets():
    """Get all customers from Google Sheets"""
    try:
        client = get_sheets_client()
        if not client:
            return []
        
        spreadsheet = client.open_by_key(SPREADSHEET_ID)
        worksheet = spreadsheet.worksheet(CUSTOMERS_SHEET)
        
        # Get all records
        records = worksheet.get_all_records()
        return records
    except Exception as e:
        logger.error(f"Failed to get customers from sheets: {e}")
        return []

def test_connection():
    """Test Google Sheets connection"""
    try:
        client = get_sheets_client()
        if not client:
            return {"success": False, "error": "Failed to initialize client - check GOOGLE_SERVICE_ACCOUNT_JSON env var"}
        
        spreadsheet = client.open_by_key(SPREADSHEET_ID)
        return {
            "success": True,
            "spreadsheet_title": spreadsheet.title,
            "sheets": [ws.title for ws in spreadsheet.worksheets()]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
