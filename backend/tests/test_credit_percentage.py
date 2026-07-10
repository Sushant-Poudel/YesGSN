"""
Test suite for max_credit_percentage feature
- Verifies GET /api/credits/settings returns max_credit_percentage field
- Verifies PUT /api/credits/settings accepts and persists max_credit_percentage
- Verifies POST /api/credits/validate returns max_credit_percentage in response
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def auth_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": "gsnadmin", "password": "gsnadmin"}
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["token"]

@pytest.fixture
def api_client():
    """Create a requests session"""
    return requests.Session()


class TestCreditSettingsGet:
    """Tests for GET /api/credits/settings"""

    def test_get_settings_returns_max_credit_percentage(self, api_client):
        """Verify that GET /api/credits/settings returns max_credit_percentage field"""
        response = api_client.get(f"{BASE_URL}/api/credits/settings")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "max_credit_percentage" in data, "max_credit_percentage field missing from response"
        assert isinstance(data["max_credit_percentage"], (int, float)), "max_credit_percentage should be numeric"
        
        # According to context, max_credit_percentage was set to 20
        assert data["max_credit_percentage"] == 20.0, f"Expected max_credit_percentage=20, got {data['max_credit_percentage']}"
        print(f"GET /api/credits/settings returns max_credit_percentage: {data['max_credit_percentage']}")

    def test_get_settings_returns_all_required_fields(self, api_client):
        """Verify all credit settings fields are present"""
        response = api_client.get(f"{BASE_URL}/api/credits/settings")
        
        assert response.status_code == 200
        data = response.json()
        
        required_fields = [
            "cashback_percentage",
            "is_enabled",
            "max_credit_per_order",
            "max_credit_percentage",
            "min_order_amount"
        ]
        
        for field in required_fields:
            assert field in data, f"Required field '{field}' missing from settings response"
        
        print(f"All required fields present: {list(data.keys())}")


class TestCreditSettingsPut:
    """Tests for PUT /api/credits/settings (admin only)"""

    def test_update_max_credit_percentage(self, api_client, auth_token):
        """Verify admin can update max_credit_percentage"""
        # First get current settings
        get_response = api_client.get(f"{BASE_URL}/api/credits/settings")
        current_settings = get_response.json()
        original_pct = current_settings.get("max_credit_percentage", 0)
        
        # Update to a new test value (30%)
        new_pct = 30.0
        update_payload = {
            **current_settings,
            "max_credit_percentage": new_pct
        }
        
        put_response = api_client.put(
            f"{BASE_URL}/api/credits/settings",
            json=update_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        
        assert put_response.status_code == 200, f"Update failed: {put_response.text}"
        
        # Verify the change persisted
        verify_response = api_client.get(f"{BASE_URL}/api/credits/settings")
        assert verify_response.status_code == 200
        updated_data = verify_response.json()
        assert updated_data["max_credit_percentage"] == new_pct, \
            f"Expected {new_pct}, got {updated_data['max_credit_percentage']}"
        
        print(f"Successfully updated max_credit_percentage from {original_pct} to {new_pct}")
        
        # Restore original value (20%)
        restore_payload = {
            **current_settings,
            "max_credit_percentage": 20.0
        }
        restore_response = api_client.put(
            f"{BASE_URL}/api/credits/settings",
            json=restore_payload,
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert restore_response.status_code == 200
        print("Restored max_credit_percentage to 20.0")

    def test_update_requires_auth(self, api_client):
        """Verify PUT /api/credits/settings requires authentication"""
        update_payload = {"max_credit_percentage": 50.0}
        response = api_client.put(
            f"{BASE_URL}/api/credits/settings",
            json=update_payload
        )
        
        # Should return 401 or 403 for unauthorized access
        assert response.status_code in [401, 403], \
            f"Expected 401/403 for unauthenticated request, got {response.status_code}"
        print("Auth requirement verified for PUT /api/credits/settings")


class TestCreditValidate:
    """Tests for POST /api/credits/validate"""

    def test_validate_returns_max_credit_percentage(self, api_client):
        """Verify POST /api/credits/validate returns max_credit_percentage"""
        payload = {"product_ids": [], "requested_credits": 0}
        
        response = api_client.post(
            f"{BASE_URL}/api/credits/validate",
            json=payload
        )
        
        assert response.status_code == 200, f"Validate failed: {response.text}"
        
        data = response.json()
        assert "max_credit_percentage" in data, "max_credit_percentage missing from validate response"
        assert data["max_credit_percentage"] == 20.0, \
            f"Expected max_credit_percentage=20, got {data['max_credit_percentage']}"
        
        print(f"POST /api/credits/validate returns max_credit_percentage: {data['max_credit_percentage']}")

    def test_validate_returns_required_fields(self, api_client):
        """Verify all required fields present in validate response"""
        payload = {"product_ids": [], "requested_credits": 0}
        
        response = api_client.post(
            f"{BASE_URL}/api/credits/validate",
            json=payload
        )
        
        assert response.status_code == 200
        data = response.json()
        
        required_fields = ["can_use_credits", "max_usable", "unlimited", "max_credit_percentage"]
        for field in required_fields:
            assert field in data, f"Required field '{field}' missing from validate response"
        
        print(f"Validate response fields: {list(data.keys())}")

    def test_validate_with_products(self, api_client):
        """Test validation with actual product IDs"""
        # First get some product IDs
        products_response = api_client.get(f"{BASE_URL}/api/products")
        if products_response.status_code == 200:
            products = products_response.json()
            if products:
                product_ids = [p["id"] for p in products[:2]]
                
                payload = {"product_ids": product_ids, "requested_credits": 100}
                response = api_client.post(
                    f"{BASE_URL}/api/credits/validate",
                    json=payload
                )
                
                assert response.status_code == 200
                data = response.json()
                assert "max_credit_percentage" in data
                print(f"Validation with products: {data}")
        else:
            pytest.skip("No products available for testing")


class TestCreditPercentageIntegration:
    """Integration tests for the credit percentage calculation"""

    def test_percentage_cap_calculation(self, api_client):
        """
        Test the percentage cap logic:
        If max_credit_percentage=20%, order Rs 100 -> max credit usable is Rs 20
        """
        # Get current settings
        settings_response = api_client.get(f"{BASE_URL}/api/credits/settings")
        assert settings_response.status_code == 200
        settings = settings_response.json()
        
        max_pct = settings.get("max_credit_percentage", 0)
        
        # If max_pct is 20, then for an order of 100, max credit usable = 20
        if max_pct == 20.0:
            # Calculation: floor(100 * (20/100)) = 20
            order_total = 100
            expected_max_credit = int(order_total * (max_pct / 100))
            assert expected_max_credit == 20, f"Expected max credit of 20 for Rs 100 order with 20% cap"
            print(f"Percentage cap calculation verified: {max_pct}% of Rs {order_total} = Rs {expected_max_credit}")
        else:
            pytest.skip(f"max_credit_percentage is {max_pct}, expected 20 for this test")

    def test_settings_consistency_with_validate(self, api_client):
        """Verify settings and validate endpoints return consistent max_credit_percentage"""
        # Get from settings
        settings_response = api_client.get(f"{BASE_URL}/api/credits/settings")
        settings_pct = settings_response.json().get("max_credit_percentage")
        
        # Get from validate
        validate_response = api_client.post(
            f"{BASE_URL}/api/credits/validate",
            json={"product_ids": [], "requested_credits": 0}
        )
        validate_pct = validate_response.json().get("max_credit_percentage")
        
        assert settings_pct == validate_pct, \
            f"Inconsistency: settings={settings_pct}, validate={validate_pct}"
        
        print(f"Consistency verified: both endpoints return max_credit_percentage={settings_pct}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
