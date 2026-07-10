"""
Backend API Tests for GameShop Nepal - Referral & Multiplier Features
Tests: Daily Rewards, Referral Program, Multiplier Events
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dark-commerce-dev.preview.emergentagent.com')

class TestPublicAPIs:
    """Test public API endpoints (no auth required)"""
    
    def test_referral_settings_endpoint(self):
        """GET /api/referral/settings - should return referral settings"""
        response = requests.get(f"{BASE_URL}/api/referral/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "is_enabled" in data, "Missing is_enabled field"
        assert "referrer_reward" in data, "Missing referrer_reward field"
        assert "referee_reward" in data, "Missing referee_reward field"
        print(f"Referral settings: enabled={data['is_enabled']}, referrer_reward={data['referrer_reward']}, referee_reward={data['referee_reward']}")
    
    def test_active_multiplier_endpoint(self):
        """GET /api/multiplier/active - should return active multiplier event"""
        response = requests.get(f"{BASE_URL}/api/multiplier/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "is_active" in data, "Missing is_active field"
        
        if data.get("is_active"):
            assert "name" in data, "Active event should have name"
            assert "multiplier" in data, "Active event should have multiplier"
            print(f"Active multiplier: {data['name']} - {data['multiplier']}x")
        else:
            print("No active multiplier event")
    
    def test_daily_reward_settings_endpoint(self):
        """GET /api/daily-reward/settings - should return daily reward settings"""
        response = requests.get(f"{BASE_URL}/api/daily-reward/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "is_enabled" in data, "Missing is_enabled field"
        assert "reward_amount" in data, "Missing reward_amount field"
        print(f"Daily reward settings: enabled={data['is_enabled']}, amount={data['reward_amount']}")


class TestAdminAuth:
    """Test admin authentication"""
    
    def test_admin_login_success(self):
        """POST /api/auth/login - should login with valid admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "gsnadmin", "password": "gsnadmin"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data, "Missing token in response"
        assert "user" in data, "Missing user in response"
        assert data["user"]["is_admin"] == True, "User should be admin"
        print(f"Admin login successful: {data['user']['email']}")
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """POST /api/auth/login - should fail with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wronguser", "password": "wrongpass"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Invalid credentials correctly rejected")


class TestAdminProtectedAPIs:
    """Test admin-protected API endpoints"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "gsnadmin", "password": "gsnadmin"}
        )
        if response.status_code == 200:
            return response.json()["token"]
        pytest.skip("Could not get admin token")
    
    def test_get_multiplier_events(self, admin_token):
        """GET /api/multiplier/events - should return all multiplier events (admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/multiplier/events",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} multiplier events")
        
        # Check if Double Points Week exists
        double_points = [e for e in data if "Double Points" in e.get("name", "")]
        if double_points:
            print(f"Double Points Week event found: {double_points[0]['name']} - {double_points[0]['multiplier']}x")
    
    def test_get_all_referrals(self, admin_token):
        """GET /api/referrals/all - should return all referrals (admin only)"""
        response = requests.get(
            f"{BASE_URL}/api/referrals/all",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Found {len(data)} referrals")
    
    def test_auth_me_endpoint(self, admin_token):
        """GET /api/auth/me - should return current admin user"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data.get("is_admin") == True, "User should be admin"
        print(f"Current user: {data.get('email')} (admin={data.get('is_admin')})")


class TestDailyRewardFlow:
    """Test daily reward status endpoint"""
    
    def test_daily_reward_status_without_email(self):
        """GET /api/daily-reward/status - should require email parameter"""
        response = requests.get(f"{BASE_URL}/api/daily-reward/status")
        # Should return 422 (validation error) or 400
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("Email parameter correctly required")
    
    def test_daily_reward_status_with_email(self):
        """GET /api/daily-reward/status - should return status for valid email"""
        response = requests.get(f"{BASE_URL}/api/daily-reward/status?email=test@example.com")
        # Should return 200 (even for non-existent customer, returns default status)
        # or 404 if customer doesn't exist
        assert response.status_code in [200, 404], f"Expected 200/404, got {response.status_code}"
        print(f"Daily reward status response: {response.status_code}")


class TestReferralCodeFlow:
    """Test referral code endpoints"""
    
    def test_get_referral_code_without_customer(self):
        """GET /api/referral/code/{email} - should handle non-existent customer"""
        response = requests.get(f"{BASE_URL}/api/referral/code/nonexistent@test.com")
        # Should return 404 for non-existent customer
        assert response.status_code in [200, 404], f"Expected 200/404, got {response.status_code}"
        print(f"Referral code for non-existent customer: {response.status_code}")


class TestHealthAndBasics:
    """Test basic health and connectivity"""
    
    def test_api_health(self):
        """Test API is responding"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("API health check passed")
    
    def test_categories_endpoint(self):
        """GET /api/categories - basic endpoint test"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"Categories endpoint working, found {len(response.json())} categories")
    
    def test_products_endpoint(self):
        """GET /api/products - basic endpoint test"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"Products endpoint working, found {len(response.json())} products")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
