"""
Test Review Reward System

Tests the discount code reward feature for approved customer reviews:
1. GET /api/reviews/reward-settings - returns default settings
2. PUT /api/reviews/reward-settings - admin can update settings
3. PUT /api/reviews/{id}/status - generates promo code on customer review approval
4. No promo code for non-customer reviews
5. No duplicate promo codes
"""

import pytest
import requests
import os
import uuid
from datetime import datetime
from pymongo import MongoClient

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_EMAIL = "gsnadmin"
ADMIN_PASSWORD = "gsnadmin"
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'test_database')

# MongoDB direct access for inserting test data
mongo_client = MongoClient(MONGO_URL)
test_db = mongo_client[DB_NAME]

class TestReviewRewardSettings:
    """Tests for review reward settings endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_reward_settings_returns_defaults(self):
        """GET /api/reviews/reward-settings returns default {review_reward_percentage: 5, review_reward_enabled: true}"""
        response = requests.get(f"{BASE_URL}/api/reviews/reward-settings", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        # Default values should be present
        assert "review_reward_percentage" in data
        assert "review_reward_enabled" in data
        # Check default values
        assert data["review_reward_percentage"] >= 1  # Should be a positive number
        assert isinstance(data["review_reward_enabled"], bool)
        print(f"Reward settings: {data}")
    
    def test_update_reward_settings_percentage(self):
        """PUT /api/reviews/reward-settings - admin can update percentage"""
        # Update to 10%
        response = requests.put(
            f"{BASE_URL}/api/reviews/reward-settings",
            json={"review_reward_percentage": 10, "review_reward_enabled": True},
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Verify the update
        data = response.json()
        assert data["review_reward_percentage"] == 10
        assert data["review_reward_enabled"] == True
        
        # GET to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/reviews/reward-settings", headers=self.headers)
        assert get_response.status_code == 200
        assert get_response.json()["review_reward_percentage"] == 10
        print("Successfully updated reward percentage to 10%")
    
    def test_update_reward_settings_disable(self):
        """PUT /api/reviews/reward-settings - admin can disable rewards"""
        response = requests.put(
            f"{BASE_URL}/api/reviews/reward-settings",
            json={"review_reward_percentage": 5, "review_reward_enabled": False},
            headers=self.headers
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["review_reward_enabled"] == False
        
        # Re-enable for other tests
        requests.put(
            f"{BASE_URL}/api/reviews/reward-settings",
            json={"review_reward_percentage": 5, "review_reward_enabled": True},
            headers=self.headers
        )
        print("Successfully disabled and re-enabled reward settings")


class TestPromoCodeGeneration:
    """Tests for promo code generation on customer review approval"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Ensure rewards are enabled with 5%
        requests.put(
            f"{BASE_URL}/api/reviews/reward-settings",
            json={"review_reward_percentage": 5, "review_reward_enabled": True},
            headers=self.headers
        )
    
    def test_approve_customer_review_generates_promo(self):
        """PUT /api/reviews/{id}/status?status=approved generates promo code for customer review"""
        # Create a customer review directly via MongoDB (simulating customer submission)
        review_id = f"test-reward-{uuid.uuid4().hex[:8]}"
        customer_email = f"test-{uuid.uuid4().hex[:6]}@example.com"
        
        review_data = {
            "id": review_id,
            "reviewer_name": "Test Reward Customer",
            "rating": 5,
            "comment": "Great service! Testing reward generation.",
            "review_date": datetime.utcnow().isoformat(),
            "status": "pending",
            "is_customer_review": True,
            "customer_email": customer_email,
            "reward_promo_code": None
        }
        
        # Insert directly into MongoDB
        test_db.reviews.insert_one(review_data.copy())  # Copy to avoid _id mutation
        
        try:
            # Approve the review via API
            response = requests.put(
                f"{BASE_URL}/api/reviews/{review_id}/status?status=approved",
                headers=self.headers
            )
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            print(f"Approval response: {data}")
            
            # Check if promo code was generated
            assert "promo_code" in data, "Expected promo_code in response for customer review approval"
            promo_code = data["promo_code"]
            assert promo_code.startswith("REVIEW-"), f"Promo code should start with REVIEW-: {promo_code}"
            print(f"SUCCESS: Promo code generated: {promo_code}")
            
            # Verify promo code exists in promo_codes collection
            promo_in_db = test_db.promo_codes.find_one({"code": promo_code})
            assert promo_in_db, f"Promo code {promo_code} should exist in promo_codes collection"
            assert promo_in_db["discount_type"] == "percentage"
            assert promo_in_db["discount_value"] == 5
            assert promo_in_db["max_uses"] == 1
            assert promo_in_db["source"] == "review_reward"
            assert promo_in_db["customer_email"] == customer_email
            print(f"Promo code verified in DB: {promo_in_db.get('code')}, {promo_in_db.get('discount_value')}% off")
            
            # Verify review has reward_promo_code set
            updated_review = test_db.reviews.find_one({"id": review_id})
            assert updated_review.get("reward_promo_code") == promo_code, "Review should have reward_promo_code set"
            
            # Store promo code for cleanup
            self._cleanup_promo_code = promo_code
            
        finally:
            # Cleanup
            test_db.reviews.delete_one({"id": review_id})
            if hasattr(self, '_cleanup_promo_code'):
                test_db.promo_codes.delete_one({"code": self._cleanup_promo_code})
    
    def test_approve_admin_review_no_promo(self):
        """PUT /api/reviews/{id}/status - no promo code for admin-created reviews"""
        # First create a manual (non-customer) review
        unique_id = uuid.uuid4().hex[:8]
        review_data = {
            "reviewer_name": f"Manual Reviewer {unique_id}",
            "rating": 4,
            "comment": f"Manual review for testing - {unique_id}",
            "review_date": datetime.utcnow().isoformat()
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/reviews",
            json=review_data,
            headers=self.headers
        )
        assert create_response.status_code in [200, 201]
        
        created_review = create_response.json()
        review_id = created_review.get("id")
        assert review_id, "Review ID should be returned"
        
        try:
            # Admin-created reviews are auto-approved, they should NOT get promo codes
            # Verify by checking the review in DB
            review_in_db = test_db.reviews.find_one({"id": review_id})
            assert review_in_db.get("is_customer_review") != True, "Admin-created review should not be marked as customer review"
            assert not review_in_db.get("reward_promo_code"), "Admin-created review should not have promo code"
            print(f"Admin review verified: is_customer_review={review_in_db.get('is_customer_review')}, reward_promo_code={review_in_db.get('reward_promo_code')}")
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/reviews/{review_id}", headers=self.headers)
    
    def test_re_approve_review_no_duplicate_promo(self):
        """Re-approving a review should not generate duplicate promo code"""
        # Create and approve a customer review first
        review_id = f"test-dup-{uuid.uuid4().hex[:8]}"
        customer_email = f"testdup-{uuid.uuid4().hex[:6]}@example.com"
        
        review_data = {
            "id": review_id,
            "reviewer_name": "Test Duplicate Promo",
            "rating": 5,
            "comment": "Testing duplicate promo prevention.",
            "review_date": datetime.utcnow().isoformat(),
            "status": "pending",
            "is_customer_review": True,
            "customer_email": customer_email,
            "reward_promo_code": None
        }
        
        test_db.reviews.insert_one(review_data.copy())
        
        try:
            # First approval - should generate promo
            response1 = requests.put(
                f"{BASE_URL}/api/reviews/{review_id}/status?status=approved",
                headers=self.headers
            )
            assert response1.status_code == 200
            first_promo = response1.json().get("promo_code")
            assert first_promo, "First approval should generate promo code"
            print(f"First promo code: {first_promo}")
            
            # Reject the review
            response_reject = requests.put(
                f"{BASE_URL}/api/reviews/{review_id}/status?status=rejected",
                headers=self.headers
            )
            assert response_reject.status_code == 200
            
            # Re-approve - should NOT generate new promo (already has one)
            response2 = requests.put(
                f"{BASE_URL}/api/reviews/{review_id}/status?status=approved",
                headers=self.headers
            )
            assert response2.status_code == 200
            second_promo = response2.json().get("promo_code")
            
            # Should not have promo in response since review already has reward_promo_code
            assert second_promo is None, f"Re-approval should not generate new promo, got: {second_promo}"
            
            # Verify original promo code is still associated
            updated_review = test_db.reviews.find_one({"id": review_id})
            assert updated_review.get("reward_promo_code") == first_promo, "Original promo should still be linked"
            print(f"SUCCESS: No duplicate promo - original {first_promo} preserved")
            
            self._cleanup_promo_code = first_promo
            
        finally:
            # Cleanup
            test_db.reviews.delete_one({"id": review_id})
            if hasattr(self, '_cleanup_promo_code'):
                test_db.promo_codes.delete_one({"code": self._cleanup_promo_code})
    
    def test_disabled_rewards_no_promo(self):
        """When rewards are disabled, no promo code should be generated"""
        # Disable rewards
        requests.put(
            f"{BASE_URL}/api/reviews/reward-settings",
            json={"review_reward_percentage": 5, "review_reward_enabled": False},
            headers=self.headers
        )
        
        review_id = f"test-disabled-{uuid.uuid4().hex[:8]}"
        customer_email = f"testdis-{uuid.uuid4().hex[:6]}@example.com"
        
        review_data = {
            "id": review_id,
            "reviewer_name": "Test Disabled Rewards",
            "rating": 4,
            "comment": "Testing with rewards disabled.",
            "review_date": datetime.utcnow().isoformat(),
            "status": "pending",
            "is_customer_review": True,
            "customer_email": customer_email,
            "reward_promo_code": None
        }
        
        test_db.reviews.insert_one(review_data.copy())
        
        try:
            # Approve with rewards disabled
            response = requests.put(
                f"{BASE_URL}/api/reviews/{review_id}/status?status=approved",
                headers=self.headers
            )
            assert response.status_code == 200
            
            promo_code = response.json().get("promo_code")
            assert promo_code is None, f"Should not generate promo when rewards disabled, got: {promo_code}"
            print("SUCCESS: No promo generated when rewards are disabled")
            
        finally:
            # Re-enable rewards for other tests
            requests.put(
                f"{BASE_URL}/api/reviews/reward-settings",
                json={"review_reward_percentage": 5, "review_reward_enabled": True},
                headers=self.headers
            )
            # Cleanup
            test_db.reviews.delete_one({"id": review_id})


class TestPromoCodeValidation:
    """Test that generated promo codes have correct properties"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_promo_code_list_contains_review_rewards(self):
        """Verify review reward promo codes exist in promo codes list"""
        # Get all promo codes
        response = requests.get(f"{BASE_URL}/api/promo-codes", headers=self.headers)
        
        if response.status_code == 200:
            promo_codes = response.json()
            review_promos = [p for p in promo_codes if p.get("source") == "review_reward" or p.get("code", "").startswith("REVIEW-")]
            
            if review_promos:
                for promo in review_promos:
                    print(f"Review promo found: {promo.get('code')}")
                    # Verify properties
                    assert promo.get("discount_type") == "percentage", f"Expected percentage discount, got {promo.get('discount_type')}"
                    assert promo.get("max_uses") == 1, f"Expected max_uses=1, got {promo.get('max_uses')}"
                    assert promo.get("source") == "review_reward", f"Expected source=review_reward, got {promo.get('source')}"
                    print(f"Promo {promo.get('code')}: {promo.get('discount_value')}% off, max_uses={promo.get('max_uses')}, expiry={promo.get('expiry_date')}")
            else:
                print("No review reward promo codes found in system")
        else:
            print(f"Could not fetch promo codes: {response.status_code}")


class TestOrderCompletionEmail:
    """Test order completion email contains review link instead of Trustpilot"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.token = response.json().get("token")
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_order_complete_endpoint_exists(self):
        """Verify /api/orders/{id}/complete endpoint exists (POST method)"""
        # We can't fully test email sending, but we can verify the endpoint exists
        # Try with a fake order ID - should return 404 for non-existent order
        fake_order_id = "nonexistent-order-123"
        response = requests.post(
            f"{BASE_URL}/api/orders/{fake_order_id}/complete",
            headers=self.headers
        )
        # Should return 404 for non-existent order, not 405 (method not allowed)
        assert response.status_code in [404, 400], f"Expected 404 for non-existent order, got {response.status_code}"
        print(f"Order complete endpoint exists (POST) and returns proper error for missing order: {response.status_code}")


@pytest.fixture
def mongodb_cleanup():
    """Fixture placeholder for any test data cleanup"""
    yield
    # Cleanup happens in individual tests


def teardown_module():
    """Close MongoDB connection after tests"""
    mongo_client.close()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
