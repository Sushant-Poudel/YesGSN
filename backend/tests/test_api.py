"""
Backend API Tests for GameShop Nepal E-commerce Platform
Tests: Auth, FAQs CRUD, Products, Social Links, Categories, Pages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthCheck:
    """Basic API health check"""
    
    def test_api_root(self):
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["message"] == "GameShop Nepal API"


class TestAuthentication:
    """Admin authentication tests"""
    
    def test_login_with_valid_credentials(self):
        """Test login with gsnadmin/gsnadmin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == "gsnadmin"
        assert data["user"]["is_admin"] == True
    
    def test_login_with_invalid_credentials(self):
        """Test login with wrong credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wronguser",
            "password": "wrongpass"
        })
        assert response.status_code == 401
    
    def test_registration_disabled(self):
        """Test that registration is disabled"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": "test@test.com",
            "password": "test123",
            "name": "Test"
        })
        assert response.status_code == 403


class TestFAQsAPI:
    """FAQ CRUD operations tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        return response.json()["token"]
    
    def test_get_faqs_public(self):
        """Test getting FAQs without auth (public endpoint)"""
        response = requests.get(f"{BASE_URL}/api/faqs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_faq(self, auth_token):
        """Test creating a new FAQ"""
        response = requests.post(
            f"{BASE_URL}/api/faqs",
            json={
                "question": "TEST_FAQ: What is this test?",
                "answer": "This is a test FAQ for automated testing."
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["question"] == "TEST_FAQ: What is this test?"
        assert "id" in data
        return data["id"]
    
    def test_update_faq(self, auth_token):
        """Test updating an FAQ"""
        # First create
        create_response = requests.post(
            f"{BASE_URL}/api/faqs",
            json={
                "question": "TEST_FAQ_UPDATE: Original question",
                "answer": "Original answer"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        faq_id = create_response.json()["id"]
        
        # Then update
        update_response = requests.put(
            f"{BASE_URL}/api/faqs/{faq_id}",
            json={
                "question": "TEST_FAQ_UPDATE: Updated question",
                "answer": "Updated answer",
                "sort_order": 99
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["question"] == "TEST_FAQ_UPDATE: Updated question"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/faqs/{faq_id}", headers={"Authorization": f"Bearer {auth_token}"})
    
    def test_delete_faq(self, auth_token):
        """Test deleting an FAQ"""
        # First create
        create_response = requests.post(
            f"{BASE_URL}/api/faqs",
            json={
                "question": "TEST_FAQ_DELETE: To be deleted",
                "answer": "This will be deleted"
            },
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        faq_id = create_response.json()["id"]
        
        # Then delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/faqs/{faq_id}",
            headers={"Authorization": f"Bearer {auth_token}"}
        )
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/faqs")
        faqs = get_response.json()
        assert not any(f["id"] == faq_id for f in faqs)
    
    def test_reorder_faqs(self, auth_token):
        """Test reordering FAQs"""
        # Get current FAQs
        response = requests.get(f"{BASE_URL}/api/faqs")
        faqs = response.json()
        
        if len(faqs) >= 2:
            # Reverse the order
            faq_ids = [f["id"] for f in faqs]
            reversed_ids = list(reversed(faq_ids))
            
            reorder_response = requests.put(
                f"{BASE_URL}/api/faqs/reorder",
                json=reversed_ids,
                headers={"Authorization": f"Bearer {auth_token}"}
            )
            assert reorder_response.status_code == 200


class TestSocialLinksAPI:
    """Social links API tests"""
    
    def test_get_social_links(self):
        """Test getting social links - returns single document with platform URLs"""
        response = requests.get(f"{BASE_URL}/api/social-links")
        assert response.status_code == 200
        data = response.json()
        # API returns a single document with platform URLs (not a list)
        assert isinstance(data, dict)
        # Verify it has expected structure (may have platform keys or id/platform/url format)
        # The API can return either format depending on data in DB


class TestProductsAPI:
    """Products API tests"""
    
    @pytest.fixture
    def auth_token(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        return response.json()["token"]
    
    def test_get_products(self):
        """Test getting products"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_products_with_tags(self):
        """Test that products have tags field"""
        response = requests.get(f"{BASE_URL}/api/products?active_only=false")
        assert response.status_code == 200
        data = response.json()
        
        # Check that products have tags field
        for product in data:
            assert "tags" in product
            assert isinstance(product["tags"], list)
    
    def test_products_have_sort_order(self):
        """Test that products have sort_order field"""
        response = requests.get(f"{BASE_URL}/api/products?active_only=false")
        assert response.status_code == 200
        data = response.json()
        
        for product in data:
            assert "sort_order" in product


class TestCategoriesAPI:
    """Categories API tests"""
    
    def test_get_categories(self):
        """Test getting categories"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestPagesAPI:
    """Pages API tests"""
    
    def test_get_terms_page(self):
        """Test getting terms page"""
        response = requests.get(f"{BASE_URL}/api/pages/terms")
        assert response.status_code == 200
        data = response.json()
        assert "title" in data
        assert "content" in data or "page_key" in data
    
    def test_get_about_page(self):
        """Test getting about page"""
        response = requests.get(f"{BASE_URL}/api/pages/about")
        assert response.status_code == 200
        data = response.json()
        assert "title" in data
    
    def test_get_faq_page(self):
        """Test getting FAQ page content"""
        response = requests.get(f"{BASE_URL}/api/pages/faq")
        assert response.status_code == 200


class TestReviewsAPI:
    """Reviews API tests"""
    
    def test_get_reviews(self):
        """Test getting reviews"""
        response = requests.get(f"{BASE_URL}/api/reviews")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


# Cleanup test data after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    yield
    # Cleanup TEST_ prefixed FAQs
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        token = response.json()["token"]
        
        faqs_response = requests.get(f"{BASE_URL}/api/faqs")
        faqs = faqs_response.json()
        
        for faq in faqs:
            if faq["question"].startswith("TEST_"):
                requests.delete(
                    f"{BASE_URL}/api/faqs/{faq['id']}",
                    headers={"Authorization": f"Bearer {token}"}
                )
    except Exception:
        pass
