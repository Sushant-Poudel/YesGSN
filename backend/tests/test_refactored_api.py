"""
Test suite for refactored GameShop Nepal API.
This tests all endpoints after the server.py refactoring from 6000+ lines to modular route files.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_EMAIL = "gsnadmin"
ADMIN_PASSWORD = "gsnadmin"

class TestHealthCheck:
    """Health check endpoint tests - Run first to verify server is up"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "database" in data
        print(f"✓ Health check passed: {data}")

    def test_root_health(self):
        """Test root health endpoint"""
        response = requests.get(f"{BASE_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print(f"✓ Root health check passed: {data}")

    def test_api_root(self):
        """Test API root endpoint with stats"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert data["name"] == "GameShop Nepal API"
        assert "stats" in data
        print(f"✓ API root passed: {data}")


class TestAuthRoutes:
    """Authentication route tests (routes/auth.py)"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["is_admin"] == True
        print(f"✓ Admin login successful: user={data['user']}")
        return data["token"]

    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wronguser",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected correctly")

    def test_auth_me_with_token(self):
        """Test getting current user with valid token"""
        # First login to get token
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_resp.json()["token"]
        
        # Test /auth/me endpoint
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_admin"] == True
        print(f"✓ Auth me endpoint working: {data}")


class TestPublicProductRoutes:
    """Public product and category routes (routes/products.py)"""
    
    def test_get_categories(self):
        """Test public categories endpoint"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Categories returned: {len(data)} categories")
        if data:
            assert "name" in data[0]
            assert "id" in data[0]

    def test_get_products_public(self):
        """Test public products endpoint"""
        response = requests.get(f"{BASE_URL}/api/products", params={"active_only": "true"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Products returned: {len(data)} products")
        if data:
            assert "name" in data[0]
            assert "variations" in data[0]


class TestPublicReviewRoutes:
    """Public review routes (routes/reviews.py)"""
    
    def test_get_reviews(self):
        """Test public reviews endpoint"""
        response = requests.get(f"{BASE_URL}/api/reviews")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Reviews returned: {len(data)} reviews")

    def test_get_reviews_public_with_stats(self):
        """Test reviews public endpoint with stats"""
        response = requests.get(f"{BASE_URL}/api/reviews/public")
        assert response.status_code == 200
        data = response.json()
        assert "reviews" in data
        assert "total" in data
        assert "avg_rating" in data
        print(f"✓ Reviews public stats: total={data['total']}, avg_rating={data['avg_rating']}")


class TestPublicFAQRoutes:
    """Public FAQ routes (routes/reviews.py)"""
    
    def test_get_faqs(self):
        """Test public FAQs endpoint"""
        response = requests.get(f"{BASE_URL}/api/faqs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ FAQs returned: {len(data)} FAQs")


class TestPublicPromotionRoutes:
    """Public promotion routes (routes/promotions.py)"""
    
    def test_get_bundles(self):
        """Test public bundles endpoint"""
        response = requests.get(f"{BASE_URL}/api/bundles")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Bundles returned: {len(data)} bundles")


class TestPublicResellerRoutes:
    """Public reseller routes (routes/chatbot.py)"""
    
    def test_get_reseller_plans(self):
        """Test public reseller plans endpoint"""
        response = requests.get(f"{BASE_URL}/api/reseller-plans")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Reseller plans returned: {len(data)} plans")


class TestPublicEngagementRoutes:
    """Public engagement routes (routes/engagement.py)"""
    
    def test_get_recent_purchases(self):
        """Test recent purchases for live ticker"""
        response = requests.get(f"{BASE_URL}/api/recent-purchases")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Recent purchases returned: {len(data)} items")


class TestPublicContentRoutes:
    """Public content routes (routes/content.py)"""
    
    def test_get_payment_methods(self):
        """Test payment methods endpoint"""
        response = requests.get(f"{BASE_URL}/api/payment-methods")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Payment methods returned: {len(data)} methods")


@pytest.fixture(scope="class")
def admin_token():
    """Get admin token for authenticated tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["token"]
    pytest.skip("Could not get admin token")


class TestAdminProductRoutes:
    """Admin product routes (routes/products.py)"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_token):
        self.token = admin_token
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_admin_products(self):
        """Test admin products endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/admin/products",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin products returned: {len(data)} products")


class TestAdminOrderRoutes:
    """Admin order routes (routes/orders.py)"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_token):
        self.token = admin_token
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_orders(self):
        """Test admin orders endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/orders",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "orders" in data
        assert "total" in data
        print(f"✓ Admin orders returned: {data['total']} orders")

    def test_get_new_confirmed_count(self):
        """Test new confirmed orders count endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/orders/new-confirmed-count",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "count" in data
        print(f"✓ New confirmed count: {data['count']}")


class TestAdminReviewRoutes:
    """Admin review routes (routes/reviews.py)"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_token):
        self.token = admin_token
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_admin_reviews(self):
        """Test admin reviews endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/reviews/admin",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin reviews returned: {len(data)} reviews")

    def test_get_review_reward_settings(self):
        """Test review reward settings endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/reviews/reward-settings",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "review_reward_percentage" in data
        print(f"✓ Review reward settings: {data}")


class TestAdminPromoRoutes:
    """Admin promotion routes (routes/promotions.py)"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_token):
        self.token = admin_token
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_promo_codes(self):
        """Test admin promo codes endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/promo-codes",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Promo codes returned: {len(data)} codes")

    def test_get_credit_settings(self):
        """Test credit settings endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/credits/settings",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "cashback_percentage" in data
        print(f"✓ Credit settings: cashback={data['cashback_percentage']}%")


class TestAdminAnalyticsRoutes:
    """Admin analytics routes (routes/analytics.py)"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_token):
        self.token = admin_token
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_analytics_overview(self):
        """Test analytics overview endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/overview",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "today" in data
        assert "week" in data
        assert "month" in data
        print(f"✓ Analytics overview: today_orders={data['today']['orders']}")


class TestAdminEngagementRoutes:
    """Admin engagement routes (routes/engagement.py)"""
    
    @pytest.fixture(autouse=True)
    def setup(self, admin_token):
        self.token = admin_token
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_referral_settings(self):
        """Test referral settings endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/referral/settings",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "referrer_reward" in data
        print(f"✓ Referral settings: referrer_reward={data['referrer_reward']}")

    def test_get_newsletter_stats(self):
        """Test newsletter stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/newsletter/stats",
            headers=self.headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "active" in data
        print(f"✓ Newsletter stats: total={data['total']}, active={data['active']}")


class TestTrackVisit:
    """Visit tracking endpoint (routes/analytics.py)"""
    
    def test_track_visit(self):
        """Test visit tracking endpoint"""
        response = requests.post(
            f"{BASE_URL}/api/track-visit",
            headers={"X-Visitor-ID": "test-visitor-123"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        print("✓ Visit tracking working")


class TestAdminAdRoutes:
    """Admin ad routes (routes/ads.py)"""
    
    def test_get_active_ads_home_banner(self):
        """Test active ads for home banner"""
        response = requests.get(f"{BASE_URL}/api/ads/active", params={"position": "home_banner"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Active home banner ads: {len(data)}")

    def test_get_active_ads_popup(self):
        """Test active ads for popup"""
        response = requests.get(f"{BASE_URL}/api/ads/active", params={"position": "popup"})
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Active popup ads: {len(data)}")


class TestContentRoutes:
    """Content routes (routes/content.py)"""
    
    def test_get_social_links(self):
        """Test social links endpoint"""
        response = requests.get(f"{BASE_URL}/api/social-links")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Social links returned: {len(data)}")

    def test_get_notification_bar(self):
        """Test notification bar endpoint"""
        response = requests.get(f"{BASE_URL}/api/notification-bar")
        # This can return 200 with data or 200 with null/empty
        assert response.status_code == 200
        print("✓ Notification bar endpoint working")

    def test_get_blog(self):
        """Test blog posts endpoint"""
        response = requests.get(f"{BASE_URL}/api/blog")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Blog posts returned: {len(data)}")


class TestWishlistRoutes:
    """Wishlist routes (routes/engagement.py)"""
    
    def test_get_wishlist(self):
        """Test wishlist endpoint"""
        visitor_id = "test-visitor-abc123"
        response = requests.get(f"{BASE_URL}/api/wishlist/{visitor_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Wishlist returned: {len(data)} items")


class TestDailyRewardRoutes:
    """Daily reward routes (routes/engagement.py)"""
    
    def test_get_daily_reward_settings(self):
        """Test daily reward settings public endpoint"""
        response = requests.get(f"{BASE_URL}/api/daily-reward/settings")
        assert response.status_code == 200
        data = response.json()
        assert "is_enabled" in data
        assert "reward_amount" in data
        print(f"✓ Daily reward settings: amount={data['reward_amount']}")


class TestMultiplierRoutes:
    """Multiplier event routes (routes/engagement.py)"""
    
    def test_get_active_multiplier(self):
        """Test active multiplier public endpoint"""
        response = requests.get(f"{BASE_URL}/api/multiplier/active")
        assert response.status_code == 200
        data = response.json()
        assert "is_active" in data
        assert "multiplier" in data
        print(f"✓ Active multiplier: {data['multiplier']}x (active={data['is_active']})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
