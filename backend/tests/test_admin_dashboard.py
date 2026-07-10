"""
Tests for Admin Dashboard redesign - KPI cards, tabbed chart, recent orders, inventory stats
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://dark-commerce-dev.preview.emergentagent.com')

class TestAdminAuth:
    """Test admin authentication - required for all dashboard API calls"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Login and get admin token"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "gsnadmin", "password": "gsnadmin"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "token" in data
        return data["token"]

    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "gsnadmin", "password": "gsnadmin"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["is_admin"] == True
        print(f"Admin login successful: {data['user'].get('name', 'Admin')}")


class TestAnalyticsOverview:
    """Test /api/analytics/overview endpoint - provides today/week/month/total stats"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "gsnadmin", "password": "gsnadmin"}
        )
        return response.json()["token"]
    
    def test_analytics_overview_returns_200(self, admin_token):
        """Test analytics overview endpoint returns 200"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/overview", headers=headers)
        assert response.status_code == 200
        print(f"Analytics overview returned status 200")
    
    def test_analytics_overview_structure(self, admin_token):
        """Test analytics overview has correct data structure for KPI cards"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/overview", headers=headers)
        data = response.json()
        
        # Verify today stats structure
        assert "today" in data
        assert "orders" in data["today"]
        assert "revenue" in data["today"]
        print(f"Today's stats: {data['today']['orders']} orders, Rs {data['today']['revenue']} revenue")
        
        # Verify week stats structure
        assert "week" in data
        assert "orders" in data["week"]
        assert "revenue" in data["week"]
        print(f"This week: {data['week']['orders']} orders, Rs {data['week']['revenue']} revenue")
        
        # Verify month stats structure
        assert "month" in data
        assert "orders" in data["month"]
        assert "revenue" in data["month"]
        print(f"This month: {data['month']['orders']} orders, Rs {data['month']['revenue']} revenue")
        
        # Verify lastMonth stats for MoM comparison
        assert "lastMonth" in data
        assert "orders" in data["lastMonth"]
        assert "revenue" in data["lastMonth"]
        print(f"Last month: {data['lastMonth']['orders']} orders, Rs {data['lastMonth']['revenue']} revenue")
        
        # Verify total/all-time stats
        assert "total" in data
        assert "orders" in data["total"]
        assert "revenue" in data["total"]
        print(f"All time: {data['total']['orders']} orders, Rs {data['total']['revenue']} revenue")
        
        # Verify visits structure
        assert "visits" in data
        assert "today" in data["visits"]
        assert "week" in data["visits"]
        assert "month" in data["visits"]
        assert "total" in data["visits"]
        print(f"Visits - Today: {data['visits']['today']}, Total: {data['visits']['total']}")
    
    def test_analytics_overview_requires_auth(self):
        """Test analytics overview requires authentication"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview")
        assert response.status_code in [401, 403]
        print("Analytics overview correctly requires authentication")


class TestRevenueChart:
    """Test /api/analytics/revenue-chart endpoint - provides daily chart data"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "gsnadmin", "password": "gsnadmin"}
        )
        return response.json()["token"]
    
    def test_revenue_chart_7days(self, admin_token):
        """Test revenue chart returns 7 days of data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/revenue-chart?days=7", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Should return around 7-8 entries (depends on implementation)
        assert isinstance(data, list)
        assert len(data) >= 7
        print(f"Revenue chart returned {len(data)} days of data")
        
        # Verify data structure for each entry
        if len(data) > 0:
            entry = data[0]
            assert "date" in entry
            assert "orders" in entry
            assert "revenue" in entry
            assert "visits" in entry
            print(f"First entry: {entry['date']} - Orders: {entry['orders']}, Revenue: Rs {entry['revenue']}, Visits: {entry['visits']}")
    
    def test_revenue_chart_default_30days(self, admin_token):
        """Test revenue chart defaults to 30 days"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/revenue-chart", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) >= 30
        print(f"Revenue chart returned {len(data)} days for default request")
    
    def test_revenue_chart_requires_auth(self):
        """Test revenue chart requires authentication"""
        response = requests.get(f"{BASE_URL}/api/analytics/revenue-chart?days=7")
        assert response.status_code in [401, 403]
        print("Revenue chart correctly requires authentication")


class TestOrdersEndpoint:
    """Test /api/orders endpoint - provides recent orders list"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "gsnadmin", "password": "gsnadmin"}
        )
        return response.json()["token"]
    
    def test_orders_list_returns_200(self, admin_token):
        """Test orders endpoint returns 200"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/orders?days=7", headers=headers)
        assert response.status_code == 200
        print("Orders endpoint returned status 200")
    
    def test_orders_list_structure(self, admin_token):
        """Test orders list has correct structure for recent orders"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/orders?days=7", headers=headers)
        data = response.json()
        
        # Check response structure (could be {orders: []} or direct array)
        orders = data.get("orders", data) if isinstance(data, dict) else data
        assert isinstance(orders, list)
        print(f"Orders endpoint returned {len(orders)} orders")
        
        # If we have orders, verify structure
        if len(orders) > 0:
            order = orders[0]
            # Verify essential fields for dashboard display
            assert "id" in order or "_id" in order
            assert "status" in order
            print(f"Order status fields present. First order status: {order.get('status')}")
            
            # These fields are displayed in dashboard
            if "customer_name" in order:
                print(f"Customer name: {order['customer_name']}")
            if "total_amount" in order:
                print(f"Total amount: Rs {order['total_amount']}")


class TestProductsEndpoint:
    """Test /api/products endpoint - provides product count for bottom stats"""
    
    def test_products_list_public(self):
        """Test public products endpoint (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/products?active_only=false")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Products endpoint returned {len(data)} products")


class TestCategoriesEndpoint:
    """Test /api/categories endpoint - provides category count for bottom stats"""
    
    def test_categories_list_public(self):
        """Test public categories endpoint (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        print(f"Categories endpoint returned {len(data)} categories")


class TestDashboardDataIntegration:
    """Integration tests - verify all dashboard data sources work together"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "gsnadmin", "password": "gsnadmin"}
        )
        return response.json()["token"]
    
    def test_all_dashboard_apis_return_data(self, admin_token):
        """Test all APIs required for dashboard return valid data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # 1. Analytics Overview
        overview_resp = requests.get(f"{BASE_URL}/api/analytics/overview", headers=headers)
        assert overview_resp.status_code == 200
        overview = overview_resp.json()
        print(f"Analytics Overview: OK - Today's orders: {overview['today']['orders']}")
        
        # 2. Revenue Chart (7 days)
        chart_resp = requests.get(f"{BASE_URL}/api/analytics/revenue-chart?days=7", headers=headers)
        assert chart_resp.status_code == 200
        chart_data = chart_resp.json()
        print(f"Revenue Chart: OK - {len(chart_data)} days of data")
        
        # 3. Orders (7 days)
        orders_resp = requests.get(f"{BASE_URL}/api/orders?days=7", headers=headers)
        assert orders_resp.status_code == 200
        orders_data = orders_resp.json()
        orders_list = orders_data.get("orders", orders_data) if isinstance(orders_data, dict) else orders_data
        print(f"Orders: OK - {len(orders_list)} recent orders")
        
        # 4. Products
        products_resp = requests.get(f"{BASE_URL}/api/products?active_only=false")
        assert products_resp.status_code == 200
        products = products_resp.json()
        print(f"Products: OK - {len(products)} products")
        
        # 5. Categories
        categories_resp = requests.get(f"{BASE_URL}/api/categories")
        assert categories_resp.status_code == 200
        categories = categories_resp.json()
        print(f"Categories: OK - {len(categories)} categories")
        
        print("\n=== All Dashboard APIs Working ===")
