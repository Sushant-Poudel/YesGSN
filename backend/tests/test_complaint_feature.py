"""
Test suite for Order Complaint Feature
Tests:
- POST /api/orders/{order_id}/complaint - validates whatsapp required, reason min 20 words
- GET /api/admin/webhooks/global - returns complaint_webhook field
- PUT /api/admin/webhooks/global - accepts complaint_webhook field
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
TEST_ORDER_ID = "fae58734-7c41-45b8-9b20-7ed04b4bc48e"

class TestComplaintEndpoint:
    """Tests for POST /api/orders/{order_id}/complaint"""
    
    def test_complaint_missing_whatsapp_returns_400(self):
        """Complaint without WhatsApp should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/orders/{TEST_ORDER_ID}/complaint",
            json={"email": "test@test.com", "reason": "short reason"}
        )
        assert response.status_code == 400
        data = response.json()
        assert "WhatsApp" in data.get("detail", "")
        print("PASS: Missing WhatsApp returns 400")
    
    def test_complaint_short_reason_returns_400(self):
        """Complaint with less than 20 words reason should return 400"""
        response = requests.post(
            f"{BASE_URL}/api/orders/{TEST_ORDER_ID}/complaint",
            json={
                "whatsapp": "9841234567",
                "email": "test@test.com",
                "reason": "This is a short reason with less than twenty words"
            }
        )
        assert response.status_code == 400
        data = response.json()
        assert "20 words" in data.get("detail", "")
        print("PASS: Short reason returns 400")
    
    def test_complaint_nonexistent_order_returns_404(self):
        """Complaint for non-existent order should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/orders/nonexistent-order-id-12345/complaint",
            json={
                "whatsapp": "9841234567",
                "email": "test@test.com",
                "reason": "This is a test complaint with more than twenty words to ensure the validation passes correctly. I am testing the complaint feature for the order system to verify it works as expected."
            }
        )
        assert response.status_code == 404
        data = response.json()
        assert "not found" in data.get("detail", "").lower()
        print("PASS: Non-existent order returns 404")
    
    def test_complaint_valid_data_returns_200(self):
        """Valid complaint should return 200"""
        response = requests.post(
            f"{BASE_URL}/api/orders/{TEST_ORDER_ID}/complaint",
            json={
                "whatsapp": "9841234567",
                "email": "test@test.com",
                "reason": "This is a test complaint with more than twenty words to ensure the validation passes correctly. I am testing the complaint feature for the order system to verify it works as expected and properly."
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "success" in data["message"].lower()
        print("PASS: Valid complaint returns 200")
    
    def test_complaint_without_email_returns_200(self):
        """Complaint without email (optional) should still return 200"""
        response = requests.post(
            f"{BASE_URL}/api/orders/{TEST_ORDER_ID}/complaint",
            json={
                "whatsapp": "9841234567",
                "reason": "This is a test complaint with more than twenty words to ensure the validation passes correctly. I am testing the complaint feature for the order system to verify it works as expected and properly."
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print("PASS: Complaint without email returns 200")


class TestWebhookConfigComplaintField:
    """Tests for complaint_webhook field in webhook config endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "gsnadmin", "password": "gsnadmin"}
        )
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Admin authentication failed")
    
    def test_get_webhooks_returns_complaint_webhook_field(self, admin_token):
        """GET /api/admin/webhooks/global should return complaint_webhook field"""
        response = requests.get(
            f"{BASE_URL}/api/admin/webhooks/global",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # complaint_webhook should be present (even if empty)
        assert "complaint_webhook" in data or data.get("complaint_webhook") is not None or "complaint_webhook" in str(data)
        print(f"PASS: GET webhooks returns complaint_webhook field: {data.get('complaint_webhook', 'N/A')}")
    
    def test_put_webhooks_accepts_complaint_webhook(self, admin_token):
        """PUT /api/admin/webhooks/global should accept complaint_webhook field"""
        # First get current settings
        get_response = requests.get(
            f"{BASE_URL}/api/admin/webhooks/global",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        original_settings = get_response.json()
        
        # Update with complaint_webhook
        test_complaint_webhook = "https://discord.com/api/webhooks/test_complaint_12345/token"
        response = requests.put(
            f"{BASE_URL}/api/admin/webhooks/global",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "order_webhook": original_settings.get("order_webhook", ""),
                "payment_webhook": original_settings.get("payment_webhook", ""),
                "complaint_webhook": test_complaint_webhook
            }
        )
        assert response.status_code == 200
        print("PASS: PUT webhooks accepts complaint_webhook")
        
        # Verify it was saved
        verify_response = requests.get(
            f"{BASE_URL}/api/admin/webhooks/global",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        verify_data = verify_response.json()
        assert verify_data.get("complaint_webhook") == test_complaint_webhook
        print("PASS: complaint_webhook was persisted correctly")
        
        # Restore original settings
        requests.put(
            f"{BASE_URL}/api/admin/webhooks/global",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "order_webhook": original_settings.get("order_webhook", ""),
                "payment_webhook": original_settings.get("payment_webhook", ""),
                "complaint_webhook": original_settings.get("complaint_webhook", "")
            }
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
