"""
GameShop Nepal - Comprehensive Backend API Tests
Tests core functionality including:
- Public endpoints (products, categories, reviews)
- Admin authentication
- Staff management (CRUD)
- Orders management
- Customer OTP authentication
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dark-commerce-dev.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_USERNAME = "gsnadmin"
ADMIN_PASSWORD = "gsnadmin"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Admin authentication failed")


@pytest.fixture
def api_client():
    """Basic requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def auth_client(api_client, admin_token):
    """Authenticated requests session"""
    api_client.headers.update({"Authorization": f"Bearer {admin_token}"})
    return api_client


# ==================== Public Endpoints Tests ====================
class TestPublicEndpoints:
    """Tests for public API endpoints (no auth required)"""

    def test_get_products(self, api_client):
        """Test fetching all products"""
        response = api_client.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Products endpoint returned {len(data)} products")

    def test_get_categories(self, api_client):
        """Test fetching categories"""
        response = api_client.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Categories endpoint returned {len(data)} categories")

    def test_get_reviews(self, api_client):
        """Test fetching reviews"""
        response = api_client.get(f"{BASE_URL}/api/reviews")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Reviews endpoint returned {len(data)} reviews")
        
    def test_get_faqs(self, api_client):
        """Test fetching FAQs"""
        response = api_client.get(f"{BASE_URL}/api/faqs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ FAQs endpoint returned {len(data)} items")

    def test_get_payment_methods(self, api_client):
        """Test fetching payment methods"""
        response = api_client.get(f"{BASE_URL}/api/payment-methods")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Payment methods endpoint returned {len(data)} methods")

    def test_get_social_links(self, api_client):
        """Test fetching social links"""
        response = api_client.get(f"{BASE_URL}/api/social-links")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Social links endpoint returned {len(data)} links")

    def test_get_notification_bar(self, api_client):
        """Test fetching notification bar"""
        response = api_client.get(f"{BASE_URL}/api/notification-bar")
        assert response.status_code == 200
        print("✓ Notification bar endpoint working")


# ==================== Admin Authentication Tests ====================
class TestAdminAuth:
    """Tests for admin authentication"""

    def test_admin_login_success(self, api_client):
        """Test successful admin login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"].get("is_admin") == True
        print(f"✓ Admin login successful - user: {data['user'].get('name')}")

    def test_admin_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wronguser",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")

    def test_get_current_user(self, auth_client):
        """Test getting current authenticated user"""
        response = auth_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data.get("is_admin") == True
        print(f"✓ Current user: {data.get('name')} - is_main_admin: {data.get('is_main_admin')}")


# ==================== Admin Analytics/Dashboard Tests ====================
class TestAdminDashboard:
    """Tests for admin dashboard endpoints"""

    def test_analytics_overview(self, auth_client):
        """Test analytics overview endpoint"""
        response = auth_client.get(f"{BASE_URL}/api/analytics/overview")
        assert response.status_code == 200
        data = response.json()
        assert "today" in data
        assert "week" in data
        assert "month" in data
        assert "total" in data
        print(f"✓ Analytics: Total orders={data['total']['orders']}, Revenue={data['total']['revenue']}")

    def test_analytics_top_products(self, auth_client):
        """Test top products analytics"""
        response = auth_client.get(f"{BASE_URL}/api/analytics/top-products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Top products: {len(data)} products returned")


# ==================== Staff Management Tests ====================
class TestStaffManagement:
    """Tests for staff CRUD operations"""

    @pytest.fixture
    def test_staff_data(self):
        """Generate unique test staff data"""
        unique_id = str(uuid.uuid4())[:8]
        return {
            "username": f"TEST_staff_{unique_id}",
            "password": "testpassword123",
            "name": f"Test Staff {unique_id}",
            "email": f"test_{unique_id}@example.com",
            "permissions": ["view_dashboard", "view_orders"]
        }

    def test_get_all_admins(self, auth_client):
        """Test fetching all admin users"""
        response = auth_client.get(f"{BASE_URL}/api/admins")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admins list returned {len(data)} users")

    def test_get_permissions(self, auth_client):
        """Test fetching available permissions"""
        response = auth_client.get(f"{BASE_URL}/api/permissions")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Permissions: {len(data)} permissions available")

    def test_staff_crud_flow(self, auth_client, test_staff_data):
        """Test complete staff CRUD: Create -> Read -> Update -> Delete"""
        
        # CREATE staff
        create_response = auth_client.post(f"{BASE_URL}/api/admins", json=test_staff_data)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        created = create_response.json()
        assert "admin" in created or "id" in created
        staff_id = created.get("admin", {}).get("id") or f"admin_{test_staff_data['username']}"
        print(f"✓ Staff created: {staff_id}")
        
        # READ - verify staff exists in list
        list_response = auth_client.get(f"{BASE_URL}/api/admins")
        assert list_response.status_code == 200
        admins = list_response.json()
        staff_found = any(a.get("username") == test_staff_data["username"] for a in admins)
        assert staff_found, "Created staff not found in list"
        print("✓ Staff verified in list")
        
        # UPDATE staff
        update_data = {
            "name": f"Updated {test_staff_data['name']}",
            "permissions": ["view_dashboard", "view_orders", "view_products"]
        }
        update_response = auth_client.put(f"{BASE_URL}/api/admins/{staff_id}", json=update_data)
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        print("✓ Staff updated successfully")
        
        # Verify update
        list_response2 = auth_client.get(f"{BASE_URL}/api/admins")
        admins2 = list_response2.json()
        updated_staff = next((a for a in admins2 if a.get("id") == staff_id), None)
        assert updated_staff is not None
        assert "view_products" in updated_staff.get("permissions", [])
        print("✓ Update verified - permissions updated")
        
        # DELETE staff
        delete_response = auth_client.delete(f"{BASE_URL}/api/admins/{staff_id}")
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print("✓ Staff deleted successfully")
        
        # Verify deletion
        list_response3 = auth_client.get(f"{BASE_URL}/api/admins")
        admins3 = list_response3.json()
        staff_exists = any(a.get("id") == staff_id for a in admins3)
        assert not staff_exists, "Staff still exists after deletion"
        print("✓ Deletion verified")


# ==================== Orders Tests ====================
class TestOrders:
    """Tests for orders management"""

    def test_get_orders(self, auth_client):
        """Test fetching orders (authenticated)"""
        response = auth_client.get(f"{BASE_URL}/api/orders")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Orders: {len(data)} orders returned")

    def test_create_order(self, api_client):
        """Test creating an order (public checkout flow)"""
        # First get a product
        products_response = api_client.get(f"{BASE_URL}/api/products")
        if products_response.status_code != 200 or not products_response.json():
            pytest.skip("No products available for order test")
        
        product = products_response.json()[0]
        variation = product.get("variations", [{}])[0] if product.get("variations") else None
        
        order_data = {
            "customer_name": "TEST_OrderCustomer",
            "customer_phone": "9779876543210",
            "customer_email": "testorder@example.com",
            "items": [{
                "name": product["name"],
                "price": variation.get("price", 100.0) if variation else 100.0,
                "quantity": 1,
                "variation": variation.get("name", "Default") if variation else "Default",
                "product_id": product.get("id"),
                "variation_id": variation.get("id") if variation else None
            }],
            "total_amount": variation.get("price", 100.0) if variation else 100.0,
            "remark": "Test order from automated test"
        }
        
        response = api_client.post(f"{BASE_URL}/api/orders/create", json=order_data)
        assert response.status_code == 200, f"Order creation failed: {response.text}"
        data = response.json()
        # Response contains order_id instead of id
        assert "order_id" in data or "id" in data
        order_id = data.get("order_id") or data.get("id")
        print(f"✓ Order created: {order_id}")
        return order_id


# ==================== Customer Auth Tests ====================
class TestCustomerAuth:
    """Tests for customer OTP authentication"""

    def test_send_otp_requires_whatsapp(self, api_client):
        """Test that OTP request requires WhatsApp number"""
        response = api_client.post(f"{BASE_URL}/api/auth/customer/send-otp", json={
            "email": "testcustomer@example.com"
        })
        # Should fail without whatsapp_number
        assert response.status_code == 422 or response.status_code == 400
        print("✓ OTP endpoint correctly requires WhatsApp number")

    def test_send_otp_success(self, api_client):
        """Test sending OTP with valid data"""
        response = api_client.post(f"{BASE_URL}/api/auth/customer/send-otp", json={
            "email": "testcustomer_otp@example.com",
            "name": "Test Customer",
            "whatsapp_number": "9779876543210"
        })
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ OTP sent: {data.get('message')}")


# ==================== Product Search Tests ====================
class TestProductSearch:
    """Tests for product search functionality"""

    def test_advanced_search(self, api_client):
        """Test advanced product search"""
        response = api_client.get(f"{BASE_URL}/api/products/search/advanced?q=netflix")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Advanced search returned {len(data)} results for 'netflix'")

    def test_search_suggestions(self, api_client):
        """Test search suggestions/autocomplete"""
        response = api_client.get(f"{BASE_URL}/api/products/search/suggestions?q=net")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Search suggestions returned {len(data)} results for 'net'")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
