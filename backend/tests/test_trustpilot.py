"""
Trustpilot Sync API Tests
Tests for Trustpilot configuration, sync, and review management endpoints.
All endpoints require admin authentication.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTrustpilotAPI:
    """Trustpilot sync endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token for authenticated requests"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.authenticated = True
        else:
            self.authenticated = False
            pytest.skip("Admin authentication failed - skipping Trustpilot tests")
    
    # ==================== GET /api/reviews/trustpilot-config ====================
    
    def test_get_trustpilot_config_success(self):
        """GET /api/reviews/trustpilot-config - Returns domain, last_sync, count"""
        response = self.session.get(f"{BASE_URL}/api/reviews/trustpilot-config")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "domain" in data, "Response should contain 'domain'"
        assert "last_sync" in data, "Response should contain 'last_sync'"
        assert "trustpilot_reviews_count" in data, "Response should contain 'trustpilot_reviews_count'"
        
        # Validate data types
        assert isinstance(data["domain"], str), "domain should be a string"
        assert isinstance(data["trustpilot_reviews_count"], int), "trustpilot_reviews_count should be an integer"
        
        print(f"Trustpilot config: domain={data['domain']}, count={data['trustpilot_reviews_count']}, last_sync={data['last_sync']}")
    
    def test_get_trustpilot_config_requires_auth(self):
        """GET /api/reviews/trustpilot-config - Should require admin auth"""
        # Create unauthenticated session
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/reviews/trustpilot-config")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    # ==================== PUT /api/reviews/trustpilot-config ====================
    
    def test_update_trustpilot_config_success(self):
        """PUT /api/reviews/trustpilot-config - Updates domain"""
        # First get current config
        get_response = self.session.get(f"{BASE_URL}/api/reviews/trustpilot-config")
        original_domain = get_response.json().get("domain", "")
        
        # Update domain
        test_domain = "gameshopnepal.com"
        response = self.session.put(f"{BASE_URL}/api/reviews/trustpilot-config", json={
            "domain": test_domain
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "domain" in data, "Response should contain 'domain'"
        assert data["domain"] == test_domain, f"Domain should be {test_domain}"
        
        # Verify persistence with GET
        verify_response = self.session.get(f"{BASE_URL}/api/reviews/trustpilot-config")
        assert verify_response.json()["domain"] == test_domain, "Domain should persist after update"
        
        print(f"Domain updated successfully to: {test_domain}")
    
    def test_update_trustpilot_config_empty_domain(self):
        """PUT /api/reviews/trustpilot-config - Should reject empty domain"""
        response = self.session.put(f"{BASE_URL}/api/reviews/trustpilot-config", json={
            "domain": ""
        })
        
        assert response.status_code == 400, f"Expected 400 for empty domain, got {response.status_code}"
    
    def test_update_trustpilot_config_requires_auth(self):
        """PUT /api/reviews/trustpilot-config - Should require admin auth"""
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        response = unauth_session.put(f"{BASE_URL}/api/reviews/trustpilot-config", json={
            "domain": "test.com"
        })
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    # ==================== POST /api/reviews/sync-trustpilot ====================
    
    def test_sync_trustpilot_reviews_success(self):
        """POST /api/reviews/sync-trustpilot - Syncs reviews and returns synced_count"""
        response = self.session.post(f"{BASE_URL}/api/reviews/sync-trustpilot")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Validate response structure
        assert "success" in data, "Response should contain 'success'"
        assert "synced_count" in data, "Response should contain 'synced_count'"
        assert "total_found" in data, "Response should contain 'total_found'"
        assert "message" in data, "Response should contain 'message'"
        
        # Validate data types
        assert isinstance(data["synced_count"], int), "synced_count should be an integer"
        assert isinstance(data["total_found"], int), "total_found should be an integer"
        assert data["success"] == True, "success should be True"
        
        print(f"Sync result: synced={data['synced_count']}, total_found={data['total_found']}, message={data['message']}")
    
    def test_sync_trustpilot_reviews_requires_auth(self):
        """POST /api/reviews/sync-trustpilot - Should require admin auth"""
        unauth_session = requests.Session()
        response = unauth_session.post(f"{BASE_URL}/api/reviews/sync-trustpilot")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    # ==================== GET /api/reviews/trustpilot-reviews ====================
    
    def test_get_trustpilot_reviews_success(self):
        """GET /api/reviews/trustpilot-reviews - Returns all trustpilot-sourced reviews"""
        response = self.session.get(f"{BASE_URL}/api/reviews/trustpilot-reviews")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should be a list
        assert isinstance(data, list), "Response should be a list of reviews"
        
        # If there are reviews, validate structure
        if len(data) > 0:
            review = data[0]
            assert "id" in review, "Review should have 'id'"
            assert "reviewer_name" in review, "Review should have 'reviewer_name'"
            assert "rating" in review, "Review should have 'rating'"
            assert "comment" in review, "Review should have 'comment'"
            assert "source" in review, "Review should have 'source'"
            assert review["source"] == "trustpilot", "Source should be 'trustpilot'"
            
            # Validate rating is 1-5
            assert 1 <= review["rating"] <= 5, "Rating should be between 1 and 5"
        
        print(f"Found {len(data)} Trustpilot reviews")
    
    def test_get_trustpilot_reviews_requires_auth(self):
        """GET /api/reviews/trustpilot-reviews - Should require admin auth"""
        unauth_session = requests.Session()
        response = unauth_session.get(f"{BASE_URL}/api/reviews/trustpilot-reviews")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    # ==================== DELETE /api/reviews/trustpilot-reviews ====================
    
    def test_delete_all_trustpilot_reviews_requires_auth(self):
        """DELETE /api/reviews/trustpilot-reviews - Should require admin auth"""
        unauth_session = requests.Session()
        response = unauth_session.delete(f"{BASE_URL}/api/reviews/trustpilot-reviews")
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
    
    def test_delete_all_trustpilot_reviews_success(self):
        """DELETE /api/reviews/trustpilot-reviews - Clears all trustpilot reviews"""
        # First get current count
        get_response = self.session.get(f"{BASE_URL}/api/reviews/trustpilot-reviews")
        initial_count = len(get_response.json())
        
        # Delete all
        response = self.session.delete(f"{BASE_URL}/api/reviews/trustpilot-reviews")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain 'message'"
        
        # Verify deletion with GET
        verify_response = self.session.get(f"{BASE_URL}/api/reviews/trustpilot-reviews")
        assert len(verify_response.json()) == 0, "All Trustpilot reviews should be deleted"
        
        # Verify config shows 0 count
        config_response = self.session.get(f"{BASE_URL}/api/reviews/trustpilot-config")
        assert config_response.json()["trustpilot_reviews_count"] == 0, "Config should show 0 reviews"
        
        print(f"Deleted {initial_count} Trustpilot reviews")
    
    # ==================== Integration Test: Full Workflow ====================
    
    def test_full_trustpilot_workflow(self):
        """Integration test: Configure domain -> Sync -> Verify -> Delete"""
        # Step 1: Configure domain
        domain = "gameshopnepal.com"
        config_response = self.session.put(f"{BASE_URL}/api/reviews/trustpilot-config", json={
            "domain": domain
        })
        assert config_response.status_code == 200, "Domain configuration should succeed"
        
        # Step 2: Sync reviews
        sync_response = self.session.post(f"{BASE_URL}/api/reviews/sync-trustpilot")
        assert sync_response.status_code == 200, "Sync should succeed"
        sync_data = sync_response.json()
        
        # Step 3: Verify reviews were synced
        reviews_response = self.session.get(f"{BASE_URL}/api/reviews/trustpilot-reviews")
        assert reviews_response.status_code == 200, "Get reviews should succeed"
        reviews = reviews_response.json()
        
        # Step 4: Verify config reflects synced count
        config_check = self.session.get(f"{BASE_URL}/api/reviews/trustpilot-config")
        config_data = config_check.json()
        assert config_data["domain"] == domain, "Domain should match"
        assert config_data["trustpilot_reviews_count"] == len(reviews), "Count should match reviews length"
        
        print(f"Full workflow test passed: domain={domain}, synced={sync_data['synced_count']}, total_reviews={len(reviews)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
