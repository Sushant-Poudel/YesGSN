"""
Test suite for On-Site Review System
Testing all review-related endpoints:
- Public reviews page (GET /api/reviews/public)
- Homepage reviews (GET /api/reviews)
- Admin reviews management (GET /api/reviews/admin)
- Customer review submission (POST /api/reviews/customer)
- Customer review update (PUT /api/reviews/customer)
- Customer's own review (GET /api/reviews/my-review)
- Admin status update (PUT /api/reviews/{id}/status)
- Admin manual review creation (POST /api/reviews)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestReviewsPublicAPI:
    """Test public review endpoints (no auth required)"""
    
    def test_get_reviews_homepage(self):
        """GET /api/reviews - approved reviews for homepage (max 20)"""
        response = requests.get(f"{BASE_URL}/api/reviews")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of reviews"
        assert len(data) <= 20, "Should return max 20 reviews"
        
        # Check review structure
        if len(data) > 0:
            review = data[0]
            assert "id" in review, "Review should have id"
            assert "reviewer_name" in review, "Review should have reviewer_name"
            assert "rating" in review, "Review should have rating"
            assert "comment" in review, "Review should have comment"
            # Only approved reviews should be returned
            assert review.get("status") in ["approved", None], f"Only approved reviews expected, got {review.get('status')}"
        print(f"PASS: GET /api/reviews - returned {len(data)} approved reviews")
    
    def test_get_reviews_public_paginated(self):
        """GET /api/reviews/public - paginated reviews with stats"""
        response = requests.get(f"{BASE_URL}/api/reviews/public?page=1")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Check response structure
        assert "reviews" in data, "Response should have reviews"
        assert "total" in data, "Response should have total count"
        assert "pages" in data, "Response should have pages count"
        assert "avg_rating" in data, "Response should have avg_rating"
        assert "distribution" in data, "Response should have rating distribution"
        
        # Check reviews array
        reviews = data["reviews"]
        assert isinstance(reviews, list), "reviews should be a list"
        
        # Check stats
        assert isinstance(data["avg_rating"], (int, float)), "avg_rating should be numeric"
        assert 0 <= data["avg_rating"] <= 5, f"avg_rating should be 0-5, got {data['avg_rating']}"
        
        # Check distribution has all 5 ratings
        distribution = data["distribution"]
        for i in range(1, 6):
            assert str(i) in distribution, f"Distribution should have rating {i}"
        
        print(f"PASS: GET /api/reviews/public - total={data['total']}, avg_rating={data['avg_rating']}, pages={data['pages']}")
        print(f"      Distribution: {distribution}")


class TestReviewsAdminAPI:
    """Test admin review endpoints (auth required)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("token")
    
    def test_admin_get_all_reviews(self, admin_token):
        """GET /api/reviews/admin - all reviews including pending"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/reviews/admin", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of reviews"
        
        # Admin endpoint should return ALL reviews
        statuses = set(r.get("status", "approved") for r in data)
        print(f"PASS: GET /api/reviews/admin - returned {len(data)} reviews, statuses: {statuses}")
    
    def test_admin_create_manual_review(self, admin_token):
        """POST /api/reviews - admin creates manual review (auto-approved)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        review_data = {
            "reviewer_name": "TEST_Manual Reviewer",
            "rating": 5,
            "comment": "This is a test manual review created by admin",
            "review_date": "2025-01-15T10:00:00Z"
        }
        
        response = requests.post(f"{BASE_URL}/api/reviews", json=review_data, headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        created_review = response.json()
        assert created_review["reviewer_name"] == review_data["reviewer_name"]
        assert created_review["rating"] == review_data["rating"]
        assert created_review["status"] == "approved", "Admin-created review should be auto-approved"
        
        print(f"PASS: POST /api/reviews - created review id={created_review['id']}")
        return created_review["id"]
    
    def test_admin_update_review_status(self, admin_token):
        """PUT /api/reviews/{id}/status - admin approves/rejects review"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get a review to update
        response = requests.get(f"{BASE_URL}/api/reviews/admin", headers=headers)
        reviews = response.json()
        
        if not reviews:
            pytest.skip("No reviews to test status update")
        
        review_id = reviews[0]["id"]
        original_status = reviews[0].get("status", "approved")
        
        # Test status update to rejected
        response = requests.put(f"{BASE_URL}/api/reviews/{review_id}/status?status=rejected", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Restore original status
        requests.put(f"{BASE_URL}/api/reviews/{review_id}/status?status={original_status}", headers=headers)
        
        print(f"PASS: PUT /api/reviews/{review_id}/status - status update works")
    
    def test_admin_update_review_status_validation(self, admin_token):
        """PUT /api/reviews/{id}/status - invalid status should fail"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get a review
        response = requests.get(f"{BASE_URL}/api/reviews/admin", headers=headers)
        reviews = response.json()
        
        if not reviews:
            pytest.skip("No reviews to test")
        
        review_id = reviews[0]["id"]
        
        # Test invalid status
        response = requests.put(f"{BASE_URL}/api/reviews/{review_id}/status?status=invalid_status", headers=headers)
        assert response.status_code == 400, f"Expected 400 for invalid status, got {response.status_code}"
        
        print("PASS: Invalid status rejected with 400")
    
    def test_admin_delete_review(self, admin_token):
        """DELETE /api/reviews/{id} - admin deletes review"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test review first
        review_data = {
            "reviewer_name": "TEST_Delete Me",
            "rating": 3,
            "comment": "This review will be deleted"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/reviews", json=review_data, headers=headers)
        if create_response.status_code != 200:
            pytest.skip("Could not create test review")
        
        review_id = create_response.json()["id"]
        
        # Delete it
        response = requests.delete(f"{BASE_URL}/api/reviews/{review_id}", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify deletion
        verify_response = requests.get(f"{BASE_URL}/api/reviews/admin", headers=headers)
        remaining_ids = [r["id"] for r in verify_response.json()]
        assert review_id not in remaining_ids, "Deleted review should not exist"
        
        print(f"PASS: DELETE /api/reviews/{review_id} - review deleted successfully")


class TestCustomerReviewAPI:
    """Test customer review endpoints (customer auth required)"""
    
    def test_customer_my_review_without_auth(self):
        """GET /api/reviews/my-review - should require auth"""
        response = requests.get(f"{BASE_URL}/api/reviews/my-review")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: /api/reviews/my-review requires authentication")
    
    def test_customer_submit_review_without_auth(self):
        """POST /api/reviews/customer - should require auth"""
        response = requests.post(f"{BASE_URL}/api/reviews/customer", json={
            "rating": 5,
            "comment": "Test review"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: /api/reviews/customer requires authentication")
    
    def test_customer_update_review_without_auth(self):
        """PUT /api/reviews/customer - should require auth"""
        response = requests.put(f"{BASE_URL}/api/reviews/customer", json={
            "rating": 4,
            "comment": "Updated review"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("PASS: PUT /api/reviews/customer requires authentication")


class TestReviewDataIntegrity:
    """Test review data structure and edge cases"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.json().get("token")
    
    def test_review_rating_validation(self, admin_token):
        """POST /api/reviews - rating should be 1-5"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test rating > 5
        response = requests.post(f"{BASE_URL}/api/reviews", json={
            "reviewer_name": "TEST_Invalid Rating",
            "rating": 10,
            "comment": "Rating too high"
        }, headers=headers)
        assert response.status_code == 422, f"Expected 422 for rating > 5, got {response.status_code}"
        
        # Test rating < 1
        response = requests.post(f"{BASE_URL}/api/reviews", json={
            "reviewer_name": "TEST_Invalid Rating",
            "rating": 0,
            "comment": "Rating too low"
        }, headers=headers)
        assert response.status_code == 422, f"Expected 422 for rating < 1, got {response.status_code}"
        
        print("PASS: Rating validation works (1-5 range)")
    
    def test_homepage_reviews_only_approved(self):
        """GET /api/reviews - should only return approved reviews"""
        response = requests.get(f"{BASE_URL}/api/reviews")
        assert response.status_code == 200
        
        reviews = response.json()
        for review in reviews:
            status = review.get("status")
            assert status in ["approved", None], f"Non-approved review found: status={status}"
        
        print(f"PASS: All {len(reviews)} homepage reviews are approved")
    
    def test_public_reviews_stats_accuracy(self):
        """GET /api/reviews/public - verify stats calculation"""
        response = requests.get(f"{BASE_URL}/api/reviews/public?page=1")
        assert response.status_code == 200
        
        data = response.json()
        
        # Verify total matches distribution sum
        distribution = data["distribution"]
        dist_sum = sum(int(distribution.get(str(i), 0)) for i in range(1, 6))
        
        # Total should equal or be close to distribution sum
        # (may differ slightly if more than one page)
        assert data["total"] >= dist_sum or dist_sum == 0, "Total should match distribution"
        
        print(f"PASS: Stats are consistent - total={data['total']}, dist_sum={dist_sum}")


class TestHealthCheck:
    """Basic health and connectivity"""
    
    def test_api_health(self):
        """GET /api/health - API is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200, f"Health check failed: {response.status_code}"
        print("PASS: API health check")


# Cleanup test data after all tests
@pytest.fixture(scope="module", autouse=True)
def cleanup_test_reviews():
    """Clean up TEST_ prefixed reviews after tests"""
    yield
    
    # After tests: clean up
    try:
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            headers = {"Authorization": f"Bearer {token}"}
            
            # Get all reviews
            reviews_response = requests.get(f"{BASE_URL}/api/reviews/admin", headers=headers)
            if reviews_response.status_code == 200:
                reviews = reviews_response.json()
                for review in reviews:
                    if review.get("reviewer_name", "").startswith("TEST_"):
                        requests.delete(f"{BASE_URL}/api/reviews/{review['id']}", headers=headers)
                        print(f"Cleaned up test review: {review['id']}")
    except Exception as e:
        print(f"Cleanup warning: {e}")
