"""
Test 401 Error Handling for Customer Account Page
Tests that backend endpoints return proper 401 status codes for invalid/expired tokens
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test with invalid tokens
INVALID_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiaW52YWxpZC11c2VyLWlkIiwiZXhwIjoxNjA5NDU5MjAwfQ.invalid_signature"
EXPIRED_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZXhwaXJlZC11c2VyLWlkIiwiZXhwIjoxNjA5NDU5MjAwfQ.test"


class TestCustomerEndpoints401Errors:
    """Test that customer endpoints return proper 401 errors for invalid/expired tokens"""
    
    def test_customer_orders_returns_401_with_invalid_token(self):
        """Test /api/customer/orders returns 401 with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {INVALID_TOKEN}"}
        )
        # Should return 401 Unauthorized for invalid token
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"PASS: /api/customer/orders returns 401 for invalid token")
    
    def test_customer_orders_returns_401_with_expired_token(self):
        """Test /api/customer/orders returns 401 with expired token"""
        response = requests.get(
            f"{BASE_URL}/api/customer/orders",
            headers={"Authorization": f"Bearer {EXPIRED_TOKEN}"}
        )
        # Should return 401 Unauthorized for expired token
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"PASS: /api/customer/orders returns 401 for expired token")
    
    def test_customer_stats_returns_401_with_invalid_token(self):
        """Test /api/customer/stats returns 401 with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/customer/stats",
            headers={"Authorization": f"Bearer {INVALID_TOKEN}"}
        )
        # Should return 401 Unauthorized for invalid token
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"PASS: /api/customer/stats returns 401 for invalid token")
    
    def test_customer_stats_returns_401_with_expired_token(self):
        """Test /api/customer/stats returns 401 with expired token"""
        response = requests.get(
            f"{BASE_URL}/api/customer/stats",
            headers={"Authorization": f"Bearer {EXPIRED_TOKEN}"}
        )
        # Should return 401 Unauthorized for expired token
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"PASS: /api/customer/stats returns 401 for expired token")
    
    def test_customer_profile_update_returns_401_with_invalid_token(self):
        """Test PUT /api/auth/customer/profile returns 401 with invalid token"""
        response = requests.put(
            f"{BASE_URL}/api/auth/customer/profile",
            headers={"Authorization": f"Bearer {INVALID_TOKEN}"},
            params={"name": "Test Name", "phone": "1234567890"}
        )
        # Should return 401 Unauthorized for invalid token
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"PASS: PUT /api/auth/customer/profile returns 401 for invalid token")
    
    def test_customer_profile_update_returns_401_with_expired_token(self):
        """Test PUT /api/auth/customer/profile returns 401 with expired token"""
        response = requests.put(
            f"{BASE_URL}/api/auth/customer/profile",
            headers={"Authorization": f"Bearer {EXPIRED_TOKEN}"},
            params={"name": "Test Name", "phone": "1234567890"}
        )
        # Should return 401 Unauthorized for expired token
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"PASS: PUT /api/auth/customer/profile returns 401 for expired token")
    
    def test_customer_me_returns_401_with_invalid_token(self):
        """Test /api/auth/customer/me returns 401 with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/customer/me",
            headers={"Authorization": f"Bearer {INVALID_TOKEN}"}
        )
        # Should return 401 Unauthorized for invalid token
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print(f"PASS: /api/auth/customer/me returns 401 for invalid token")
    
    def test_customer_orders_returns_401_without_auth_header(self):
        """Test /api/customer/orders returns 403/401 without Authorization header"""
        response = requests.get(f"{BASE_URL}/api/customer/orders")
        # Should return 401 or 403 when no auth header provided
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}: {response.text}"
        print(f"PASS: /api/customer/orders returns {response.status_code} without auth header")
    
    def test_customer_stats_returns_401_without_auth_header(self):
        """Test /api/customer/stats returns 403/401 without Authorization header"""
        response = requests.get(f"{BASE_URL}/api/customer/stats")
        # Should return 401 or 403 when no auth header provided
        assert response.status_code in [401, 403], f"Expected 401 or 403, got {response.status_code}: {response.text}"
        print(f"PASS: /api/customer/stats returns {response.status_code} without auth header")


class TestCreditsEndpoint401Errors:
    """Test that credits endpoints handle auth properly"""
    
    def test_customer_credits_balance_requires_email(self):
        """Test GET /api/credits/balance requires email parameter"""
        response = requests.get(f"{BASE_URL}/api/credits/balance")
        # Should return 422 (Unprocessable Entity) for missing email parameter
        assert response.status_code in [422, 400], f"Expected 422/400, got {response.status_code}: {response.text}"
        print(f"PASS: /api/credits/balance returns {response.status_code} without email")
    
    def test_customer_credits_balance_with_email(self):
        """Test GET /api/credits/balance with email returns balance"""
        response = requests.get(
            f"{BASE_URL}/api/credits/balance",
            params={"email": "test@example.com"}
        )
        # Should return 200 or 404 (customer not found)
        assert response.status_code in [200, 404], f"Expected 200 or 404, got {response.status_code}: {response.text}"
        if response.status_code == 200:
            data = response.json()
            assert "credit_balance" in data, "Response should contain credit_balance field"
        print(f"PASS: /api/credits/balance returns {response.status_code} with email")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
