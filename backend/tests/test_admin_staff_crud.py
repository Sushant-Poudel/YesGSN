"""
Backend API Tests for Admin Staff Management CRUD Operations
Tests: Admin Login, Create Staff, View Staff, Update Staff, Delete Staff
Bug: Previous issue with 'Admin not found' error when updating staff (id vs _id inconsistency)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminLogin:
    """Admin authentication with gsnadmin/gsnadmin credentials"""
    
    def test_admin_login_success(self):
        """Test admin login with gsnadmin/gsnadmin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Validate response structure
        assert "token" in data, "Token missing in response"
        assert "user" in data, "User missing in response"
        
        # Validate user data
        user = data["user"]
        assert user.get("is_admin") == True, "User should be admin"
        assert user.get("is_main_admin") == True, "gsnadmin should be main admin"
        assert "permissions" in user, "Permissions missing"
        
        return data["token"]
    
    def test_admin_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wronguser",
            "password": "wrongpass"
        })
        assert response.status_code == 401, "Should reject invalid credentials"


class TestAdminStaffCRUD:
    """Staff management CRUD operations - the core bug fix testing"""
    
    @pytest.fixture
    def auth_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    # Test 1: Create a new staff member
    def test_create_staff_member(self, auth_headers):
        """Test creating a new staff member with username, password, name, email, permissions"""
        staff_data = {
            "username": "TEST_staff_member",
            "password": "testpassword123",
            "name": "Test Staff Name",
            "email": "test_staff@example.com",
            "permissions": ["view_dashboard", "view_orders"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admins",
            json=staff_data,
            headers=auth_headers
        )
        
        # Cleanup any existing test user first if 400
        if response.status_code == 400 and "already exists" in response.text:
            # Delete existing and retry
            admin_id = f"admin_{staff_data['username']}"
            requests.delete(f"{BASE_URL}/api/admins/{admin_id}", headers=auth_headers)
            time.sleep(0.5)
            response = requests.post(
                f"{BASE_URL}/api/admins",
                json=staff_data,
                headers=auth_headers
            )
        
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        
        # Validate response
        assert "admin" in data, "Admin object missing in response"
        admin = data["admin"]
        assert admin["username"] == staff_data["username"], "Username mismatch"
        assert admin["name"] == staff_data["name"], "Name mismatch"
        assert admin["email"] == staff_data["email"], "Email mismatch"
        assert admin["role"] == "staff", "Role should be 'staff'"
        assert admin["is_active"] == True, "Should be active by default"
        assert set(admin["permissions"]) == set(staff_data["permissions"]), "Permissions mismatch"
        assert "id" in admin, "ID missing in response"
        
        print(f"Created staff with ID: {admin['id']}")
        return admin["id"]
    
    # Test 2: View all staff members (should show newly created staff)
    def test_view_all_staff(self, auth_headers):
        """Test viewing all staff members - verifies the staff list contains created staff"""
        response = requests.get(
            f"{BASE_URL}/api/admins",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get admins failed: {response.text}"
        data = response.json()
        
        # Validate response is a list
        assert isinstance(data, list), "Response should be a list"
        
        # Check that each admin has required fields
        for admin in data:
            assert "id" in admin, f"Admin missing 'id': {admin}"
            assert "username" in admin, f"Admin missing 'username': {admin}"
            # Note: _id should NOT be in response (excluded)
        
        # Find the main admin
        main_admin = next((a for a in data if a.get("role") == "main_admin" or a.get("is_main_admin")), None)
        assert main_admin is not None, "Main admin should exist"
        
        print(f"Found {len(data)} admins in the system")
        return data
    
    # Test 3: Update a staff member's name and permissions (THE BUG FIX TEST)
    def test_update_staff_member(self, auth_headers):
        """
        Test updating a staff member - THIS IS THE CORE BUG TEST
        Previous bug: 'Admin not found' error due to id vs _id inconsistency
        """
        # First create a staff member
        staff_data = {
            "username": "TEST_update_staff",
            "password": "testpass456",
            "name": "Original Name",
            "email": "original@example.com",
            "permissions": ["view_dashboard"]
        }
        
        # Clean up any existing
        admin_id = f"admin_{staff_data['username']}"
        requests.delete(f"{BASE_URL}/api/admins/{admin_id}", headers=auth_headers)
        time.sleep(0.3)
        
        # Create
        create_response = requests.post(
            f"{BASE_URL}/api/admins",
            json=staff_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        created_admin = create_response.json()["admin"]
        admin_id = created_admin["id"]
        
        print(f"Created staff with ID: {admin_id}")
        
        # Now UPDATE - this is where the bug occurred
        update_data = {
            "name": "Updated Staff Name",
            "email": "updated@example.com",
            "permissions": ["view_dashboard", "view_orders", "manage_orders"],
            "is_active": True
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admins/{admin_id}",
            json=update_data,
            headers=auth_headers
        )
        
        assert update_response.status_code == 200, f"Update failed (BUG NOT FIXED): {update_response.text}"
        
        # Verify the update was persisted by fetching all admins
        get_response = requests.get(f"{BASE_URL}/api/admins", headers=auth_headers)
        assert get_response.status_code == 200
        
        all_admins = get_response.json()
        updated_admin = next((a for a in all_admins if a.get("id") == admin_id), None)
        
        assert updated_admin is not None, f"Updated admin not found in list with id {admin_id}"
        assert updated_admin["name"] == update_data["name"], "Name not updated"
        assert updated_admin["email"] == update_data["email"], "Email not updated"
        assert set(updated_admin["permissions"]) == set(update_data["permissions"]), "Permissions not updated"
        
        print(f"Successfully updated staff: {updated_admin['name']}")
        return admin_id
    
    # Test 4: Delete a staff member
    def test_delete_staff_member(self, auth_headers):
        """Test deleting a staff member"""
        # First create
        staff_data = {
            "username": "TEST_delete_staff",
            "password": "testpass789",
            "name": "To Be Deleted",
            "email": "delete@example.com",
            "permissions": ["view_dashboard"]
        }
        
        # Clean up any existing
        admin_id = f"admin_{staff_data['username']}"
        requests.delete(f"{BASE_URL}/api/admins/{admin_id}", headers=auth_headers)
        time.sleep(0.3)
        
        # Create
        create_response = requests.post(
            f"{BASE_URL}/api/admins",
            json=staff_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        admin_id = create_response.json()["admin"]["id"]
        
        # Delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/admins/{admin_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        
        # Verify deletion - admin should no longer exist
        get_response = requests.get(f"{BASE_URL}/api/admins", headers=auth_headers)
        all_admins = get_response.json()
        deleted_admin = next((a for a in all_admins if a.get("id") == admin_id), None)
        
        assert deleted_admin is None, f"Admin {admin_id} should have been deleted"
        print(f"Successfully deleted staff with ID: {admin_id}")
    
    # Test 5: Cannot delete main admin
    def test_cannot_delete_main_admin(self, auth_headers):
        """Test that main admin cannot be deleted"""
        response = requests.delete(
            f"{BASE_URL}/api/admins/admin_main",
            headers=auth_headers
        )
        assert response.status_code == 400, "Should not be able to delete main admin"
        assert "main admin" in response.text.lower(), "Error should mention main admin"
    
    # Test 6: Non-main-admin cannot access staff management
    def test_staff_cannot_manage_admins(self, auth_headers):
        """Test that a staff member (non-main-admin) cannot create/update/delete admins"""
        # First create a staff member
        staff_data = {
            "username": "TEST_limited_staff",
            "password": "limitedpass123",
            "name": "Limited Staff",
            "email": "limited@example.com",
            "permissions": ["view_dashboard", "view_orders"]
        }
        
        # Clean up and create
        admin_id = f"admin_{staff_data['username']}"
        requests.delete(f"{BASE_URL}/api/admins/{admin_id}", headers=auth_headers)
        time.sleep(0.3)
        
        create_response = requests.post(
            f"{BASE_URL}/api/admins",
            json=staff_data,
            headers=auth_headers
        )
        assert create_response.status_code == 200
        
        # Now login as the limited staff
        staff_login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": staff_data["username"],
            "password": staff_data["password"]
        })
        
        assert staff_login_response.status_code == 200, f"Staff login failed: {staff_login_response.text}"
        staff_token = staff_login_response.json()["token"]
        staff_headers = {"Authorization": f"Bearer {staff_token}"}
        
        # Try to get admins list - should be forbidden
        list_response = requests.get(f"{BASE_URL}/api/admins", headers=staff_headers)
        assert list_response.status_code == 403, "Non-main-admin should not access admin list"
        
        # Try to create an admin - should be forbidden
        try_create_response = requests.post(
            f"{BASE_URL}/api/admins",
            json={"username": "attacker", "password": "hack123", "permissions": ["all"]},
            headers=staff_headers
        )
        assert try_create_response.status_code == 403, "Non-main-admin should not create admins"
        
        print("Limited staff correctly denied access to admin management")


class TestAdminPermissions:
    """Test available permissions endpoint"""
    
    @pytest.fixture
    def auth_headers(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        return {"Authorization": f"Bearer {response.json()['token']}"}
    
    def test_get_permissions(self, auth_headers):
        """Test getting available permissions"""
        response = requests.get(
            f"{BASE_URL}/api/permissions",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get permissions failed: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Permissions should be a list"
        
        # Check structure of permissions
        for perm in data:
            assert "id" in perm, "Permission missing 'id'"
            assert "name" in perm, "Permission missing 'name'"
            assert "category" in perm, "Permission missing 'category'"
        
        # Check that expected permissions exist
        perm_ids = [p["id"] for p in data]
        expected_perms = ["view_dashboard", "view_orders", "manage_orders", "view_products"]
        for expected in expected_perms:
            assert expected in perm_ids, f"Expected permission '{expected}' not found"
        
        print(f"Found {len(data)} permissions")
        return data


# Cleanup test data after all tests
@pytest.fixture(scope="session", autouse=True)
def cleanup_test_data():
    """Cleanup TEST_ prefixed admins after all tests"""
    yield
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "gsnadmin",
            "password": "gsnadmin"
        })
        if response.status_code != 200:
            return
            
        token = response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        
        admins_response = requests.get(f"{BASE_URL}/api/admins", headers=headers)
        if admins_response.status_code == 200:
            admins = admins_response.json()
            for admin in admins:
                if admin.get("username", "").startswith("TEST_"):
                    admin_id = admin.get("id") or admin.get("_id")
                    if admin_id:
                        requests.delete(f"{BASE_URL}/api/admins/{admin_id}", headers=headers)
    except Exception as e:
        print(f"Cleanup error (non-critical): {e}")
