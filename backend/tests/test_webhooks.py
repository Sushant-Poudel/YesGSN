"""
Test Admin Webhooks API Endpoints
Tests for: GET/PUT global webhooks, GET/PUT templates, POST test webhook, POST reset templates
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = "gsnadmin"
ADMIN_PASSWORD = "gsnadmin"

# ===================== FIXTURES =====================

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def auth_token(api_client):
    """Get admin authentication token"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        token = response.json().get("token")
        if token:
            return token
    pytest.skip("Admin authentication failed - skipping webhook tests")


@pytest.fixture(scope="module")
def authenticated_client(api_client, auth_token):
    """Session with auth header"""
    api_client.headers.update({"Authorization": f"Bearer {auth_token}"})
    return api_client


# ===================== TEST: GLOBAL WEBHOOKS =====================

class TestGlobalWebhooks:
    """Tests for global webhook settings (order + payment)"""
    
    def test_get_global_webhooks_requires_auth(self, api_client):
        """GET /api/admin/webhooks/global should require authentication"""
        # Reset client headers to remove auth
        client = requests.Session()
        response = client.get(f"{BASE_URL}/api/admin/webhooks/global")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ GET global webhooks requires auth")
    
    def test_get_global_webhooks_with_auth(self, authenticated_client):
        """GET /api/admin/webhooks/global should return webhook settings"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/webhooks/global")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Check structure
        assert "order_webhook" in data or "env_order_webhook" in data, "Missing order_webhook field"
        print(f"✅ GET global webhooks returned: order_webhook present, payment_webhook={'payment_webhook' in data}")
    
    def test_put_global_webhooks_with_auth(self, authenticated_client):
        """PUT /api/admin/webhooks/global should save webhook URLs"""
        # First get current values
        get_response = authenticated_client.get(f"{BASE_URL}/api/admin/webhooks/global")
        current_data = get_response.json()
        
        # Update with test values
        test_payload = {
            "order_webhook": current_data.get("order_webhook", current_data.get("env_order_webhook", "")),
            "payment_webhook": "https://discord.com/api/webhooks/test_payment_123/token"
        }
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/webhooks/global", 
            json=test_payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Missing success message"
        print(f"✅ PUT global webhooks saved successfully: {data['message']}")
        
        # Verify persistence
        verify_response = authenticated_client.get(f"{BASE_URL}/api/admin/webhooks/global")
        verify_data = verify_response.json()
        assert verify_data.get("payment_webhook") == test_payload["payment_webhook"], "Payment webhook not persisted"
        print("✅ Verified global webhooks persisted correctly")


# ===================== TEST: PRODUCT WEBHOOKS =====================

class TestProductWebhooks:
    """Tests for product-specific webhook settings"""
    
    def test_get_product_webhooks_requires_auth(self, api_client):
        """GET /api/admin/webhooks/products should require authentication"""
        client = requests.Session()
        response = client.get(f"{BASE_URL}/api/admin/webhooks/products")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ GET product webhooks requires auth")
    
    def test_get_product_webhooks_with_auth(self, authenticated_client):
        """GET /api/admin/webhooks/products should return products with webhooks"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/webhooks/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of products"
        
        # If there are products with webhooks, validate structure
        if len(data) > 0:
            product = data[0]
            assert "id" in product, "Product missing id"
            assert "name" in product, "Product missing name"
            assert "discord_webhooks" in product, "Product missing discord_webhooks"
            print(f"✅ GET product webhooks returned {len(data)} products with webhooks")
        else:
            print("✅ GET product webhooks returned empty list (no products with webhooks)")


# ===================== TEST: MESSAGE TEMPLATES =====================

class TestMessageTemplates:
    """Tests for webhook message templates"""
    
    def test_get_templates_requires_auth(self, api_client):
        """GET /api/admin/webhooks/templates should require authentication"""
        client = requests.Session()
        response = client.get(f"{BASE_URL}/api/admin/webhooks/templates")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ GET templates requires auth")
    
    def test_get_templates_with_auth(self, authenticated_client):
        """GET /api/admin/webhooks/templates should return 4 templates with placeholders"""
        response = authenticated_client.get(f"{BASE_URL}/api/admin/webhooks/templates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "templates" in data, "Missing templates field"
        assert "placeholders" in data, "Missing placeholders field"
        
        templates = data["templates"]
        # Should have 4 templates: new_order, order_confirmed, payment_screenshot, status_update
        expected_templates = ["new_order", "order_confirmed", "payment_screenshot", "status_update"]
        for tpl_name in expected_templates:
            assert tpl_name in templates, f"Missing template: {tpl_name}"
            assert "title" in templates[tpl_name], f"Template {tpl_name} missing title"
            assert "content" in templates[tpl_name], f"Template {tpl_name} missing content"
        
        print(f"✅ GET templates returned {len(templates)} templates with {len(data['placeholders'])} placeholders")
    
    def test_put_templates_with_auth(self, authenticated_client):
        """PUT /api/admin/webhooks/templates should save edited templates"""
        # Get current templates
        get_response = authenticated_client.get(f"{BASE_URL}/api/admin/webhooks/templates")
        current_data = get_response.json()
        templates = current_data["templates"]
        
        # Modify a template
        original_title = templates["new_order"]["title"]
        templates["new_order"]["title"] = "TEST - New Order #{order_number}"
        
        # Update templates
        payload = {"templates": {}}
        for key, val in templates.items():
            payload["templates"][key] = {"title": val["title"], "content": val["content"]}
        
        response = authenticated_client.put(
            f"{BASE_URL}/api/admin/webhooks/templates", 
            json=payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Missing success message"
        print(f"✅ PUT templates saved successfully: {data['message']}")
        
        # Verify persistence
        verify_response = authenticated_client.get(f"{BASE_URL}/api/admin/webhooks/templates")
        verify_data = verify_response.json()
        assert verify_data["templates"]["new_order"]["title"] == "TEST - New Order #{order_number}", "Template not persisted"
        print("✅ Verified templates persisted correctly")
        
        # Restore original
        payload["templates"]["new_order"]["title"] = original_title
        authenticated_client.put(f"{BASE_URL}/api/admin/webhooks/templates", json=payload)
    
    def test_reset_templates(self, authenticated_client):
        """POST /api/admin/webhooks/templates/reset should reset to defaults"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/admin/webhooks/templates/reset",
            json={}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "message" in data, "Missing success message"
        assert "templates" in data, "Missing templates in response"
        
        # Verify default templates are returned
        templates = data["templates"]
        assert "new_order" in templates, "Missing default new_order template"
        assert "New Order #{order_number}" in templates["new_order"]["title"], "Default title not restored"
        print(f"✅ POST reset templates worked: {data['message']}")


# ===================== TEST: WEBHOOK TEST ENDPOINT =====================

class TestWebhookTest:
    """Tests for webhook test functionality"""
    
    def test_test_webhook_requires_auth(self, api_client):
        """POST /api/admin/webhooks/test should require authentication"""
        client = requests.Session()
        response = client.post(f"{BASE_URL}/api/admin/webhooks/test", json={"webhook_url": "test"})
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✅ POST test webhook requires auth")
    
    def test_test_webhook_empty_url(self, authenticated_client):
        """POST /api/admin/webhooks/test should fail with empty URL"""
        response = authenticated_client.post(
            f"{BASE_URL}/api/admin/webhooks/test",
            json={"webhook_url": ""}
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("✅ POST test webhook rejects empty URL")
    
    def test_test_webhook_with_real_url(self, authenticated_client):
        """POST /api/admin/webhooks/test should work with real Discord webhook"""
        # Get global webhooks to find a real URL
        global_response = authenticated_client.get(f"{BASE_URL}/api/admin/webhooks/global")
        global_data = global_response.json()
        
        webhook_url = global_data.get("order_webhook") or global_data.get("env_order_webhook")
        
        if not webhook_url or not webhook_url.startswith("https://discord"):
            pytest.skip("No valid Discord webhook URL configured")
        
        response = authenticated_client.post(
            f"{BASE_URL}/api/admin/webhooks/test",
            json={"webhook_url": webhook_url}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # The test endpoint can return success or failure based on Discord response
        # We just check the structure
        assert "success" in data or "message" in data, "Missing response structure"
        print(f"✅ POST test webhook returned: {data}")


# ===================== RUN TESTS =====================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
