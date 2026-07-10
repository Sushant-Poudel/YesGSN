"""
Comprehensive Backend API Tests for GameShop Nepal E-commerce
Tests: Auth, Products, Orders, Promo Codes, Credit Settings, Analytics, Daily Rewards
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthAndAuth:
    """Health check and Authentication tests"""
    
    def test_health_endpoint(self):
        """API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check passed: {data}")
    
    def test_admin_login_success(self):
        """Admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["is_admin"] == True
        print(f"✓ Admin login successful: {data['user']['username']}")
        return data["token"]
    
    def test_admin_login_invalid_password(self):
        """Admin login with invalid password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 403]
        print("✓ Invalid password correctly rejected")


class TestProducts:
    """Product API tests"""
    
    def test_get_products(self):
        """Get all products"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} products")
        if len(data) > 0:
            product = data[0]
            assert "name" in product
            assert "price" in product or "variations" in product
    
    def test_get_product_by_slug(self):
        """Get product by slug"""
        # First get products list
        products_res = requests.get(f"{BASE_URL}/api/products")
        if products_res.status_code == 200 and len(products_res.json()) > 0:
            first_product = products_res.json()[0]
            slug = first_product.get("slug")
            if slug:
                response = requests.get(f"{BASE_URL}/api/products/{slug}")
                assert response.status_code == 200
                data = response.json()
                assert data.get("slug") == slug
                print(f"✓ Product by slug retrieved: {data.get('name')}")


class TestOrders:
    """Order API tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get admin token")
    
    def test_get_orders_authenticated(self, admin_token):
        """Get orders with admin authentication"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/orders", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # API returns paginated response with 'orders' key
        assert "orders" in data or isinstance(data, list)
        orders = data.get("orders", data) if isinstance(data, dict) else data
        print(f"✓ Retrieved {len(orders)} orders")
    
    def test_get_orders_unauthenticated(self):
        """Get orders without authentication - should fail"""
        response = requests.get(f"{BASE_URL}/api/orders")
        assert response.status_code in [401, 403]
        print("✓ Unauthenticated order access correctly rejected")


class TestPromoCodes:
    """Promo Code API tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get admin token")
    
    def test_get_promo_codes(self, admin_token):
        """Get all promo codes"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/promo-codes", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Retrieved {len(data)} promo codes")
    
    def test_get_promo_analytics(self, admin_token):
        """Get promo code analytics"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/promo-codes/analytics", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert "today" in data
        assert "month" in data
        print(f"✓ Promo analytics: Today {data['today']['count']} uses, Month {data['month']['count']} uses")


class TestCreditSettings:
    """Credit Settings API tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get admin token")
    
    def test_get_credit_settings(self, admin_token):
        """Get credit settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/credits/settings", headers=headers)
        assert response.status_code == 200
        data = response.json()
        # Check for key fields
        assert "max_credit_percentage" in data or "cashback_percentage" in data
        assert "free_customer_credit_cap" in data
        print(f"✓ Credit settings: max_pct={data.get('max_credit_percentage')}, free_cap={data.get('free_customer_credit_cap')}")
    
    def test_update_credit_settings(self, admin_token):
        """Update credit settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current settings
        get_response = requests.get(f"{BASE_URL}/api/credits/settings", headers=headers)
        original = get_response.json()
        
        # Update with new max_credit_percentage
        new_pct = 25
        update_response = requests.put(f"{BASE_URL}/api/credits/settings", headers=headers, json={
            **original,
            "max_credit_percentage": new_pct
        })
        assert update_response.status_code == 200
        
        # Verify update
        verify_response = requests.get(f"{BASE_URL}/api/credits/settings", headers=headers)
        assert verify_response.json().get("max_credit_percentage") == new_pct
        print(f"✓ Updated max_credit_percentage to {new_pct}")
        
        # Restore original
        requests.put(f"{BASE_URL}/api/credits/settings", headers=headers, json=original)
        print(f"✓ Restored original credit settings")


class TestAnalytics:
    """Analytics API tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip("Could not get admin token")
    
    def test_get_analytics_summary(self, admin_token):
        """Get analytics summary"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/summary", headers=headers)
        # Analytics endpoint may vary
        if response.status_code == 404:
            pytest.skip("Analytics summary endpoint not found")
        assert response.status_code == 200
        print(f"✓ Analytics summary retrieved")


class TestDailyReward:
    """Daily Reward API tests"""
    
    def test_get_daily_reward_settings(self):
        """Get daily reward settings - public endpoint"""
        response = requests.get(f"{BASE_URL}/api/daily-reward/settings")
        assert response.status_code == 200
        data = response.json()
        print(f"✓ Daily reward settings: {data}")


class TestCategories:
    """Categories API tests"""
    
    def test_get_categories(self):
        """Get all categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Found {len(data)} categories")


class TestCustomerAuth:
    """Customer Authentication tests"""
    
    def test_customer_google_auth_endpoint_exists(self):
        """Check Google auth endpoint exists"""
        # Just check the endpoint responds (OPTIONS or POST)
        response = requests.options(f"{BASE_URL}/api/auth/google")
        # May return 405 Method Not Allowed if OPTIONS not supported
        assert response.status_code in [200, 204, 405, 422]
        print(f"✓ Google auth endpoint exists")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
