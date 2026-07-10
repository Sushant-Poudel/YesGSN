#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class GameShopNepalAPITester:
    def __init__(self, base_url="https://dark-commerce-dev.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.passed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.passed_tests.append(name)
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return True, response_data
                except:
                    return True, {}
            else:
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "response": response.text[:200] if response.text else "No response"
                })
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            self.failed_tests.append({
                "test": name,
                "error": str(e)
            })
            print(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@gameshopnepal.com", "password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_admin_register(self):
        """Test admin registration (should fail if user exists)"""
        success, response = self.run_test(
            "Admin Register (existing user)",
            "POST", 
            "auth/register",
            400,  # Expecting 400 since user should already exist
            data={"email": "admin@gameshopnepal.com", "password": "admin123", "name": "Admin"}
        )
        return success

    def test_get_me(self):
        """Test get current user"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)[0]

    def test_categories(self):
        """Test categories endpoints"""
        # Get categories
        success, categories = self.run_test("Get Categories", "GET", "categories", 200)
        if not success:
            return False
        
        print(f"   Found {len(categories)} categories")
        return True

    def test_products(self):
        """Test products endpoints"""
        # Get all products
        success, products = self.run_test("Get All Products", "GET", "products", 200)
        if not success:
            return False
        
        print(f"   Found {len(products)} products")
        
        # Test getting a specific product if any exist
        if products and len(products) > 0:
            product_id = products[0]['id']
            success, product = self.run_test(
                f"Get Product {product_id}", 
                "GET", 
                f"products/{product_id}", 
                200
            )
            if success:
                print(f"   Product details: {product.get('name', 'Unknown')}")
        
        return True

    def test_reviews(self):
        """Test reviews endpoints"""
        success, reviews = self.run_test("Get Reviews", "GET", "reviews", 200)
        if not success:
            return False
        
        print(f"   Found {len(reviews)} reviews")
        return True

    def test_social_links(self):
        """Test social links endpoints"""
        success, links = self.run_test("Get Social Links", "GET", "social-links", 200)
        if not success:
            return False
        
        print(f"   Found {len(links)} social links")
        return True

    def test_pages(self):
        """Test pages endpoints"""
        pages = ['about', 'contact', 'faq']
        all_passed = True
        
        for page in pages:
            success, page_data = self.run_test(f"Get {page.title()} Page", "GET", f"pages/{page}", 200)
            if success:
                print(f"   {page.title()} page title: {page_data.get('title', 'No title')}")
            else:
                all_passed = False
        
        return all_passed

    def test_seed_data(self):
        """Test seed data endpoint"""
        return self.run_test("Seed Data", "POST", "seed", 200)[0]

    def test_product_crud(self):
        """Test product CRUD operations (requires authentication)"""
        if not self.token:
            print("❌ Skipping CRUD tests - no authentication token")
            return False
        
        # Create a test product
        test_product = {
            "name": "Test Product",
            "description": "<p>Test product description</p>",
            "image_url": "https://via.placeholder.com/300",
            "category_id": "gaming",
            "variations": [
                {
                    "name": "Test Plan",
                    "price": 100,
                    "original_price": 150
                }
            ],
            "is_active": True,
            "is_sold_out": False
        }
        
        success, created_product = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data=test_product
        )
        
        if not success:
            return False
        
        product_id = created_product.get('id')
        if not product_id:
            print("❌ No product ID returned")
            return False
        
        # Update the product
        test_product['name'] = "Updated Test Product"
        success, updated_product = self.run_test(
            "Update Product",
            "PUT",
            f"products/{product_id}",
            200,
            data=test_product
        )
        
        if not success:
            return False
        
        # Delete the product
        success, _ = self.run_test(
            "Delete Product",
            "DELETE",
            f"products/{product_id}",
            200
        )
        
        return success

    def test_review_crud(self):
        """Test review CRUD operations (requires authentication)"""
        if not self.token:
            print("❌ Skipping Review CRUD tests - no authentication token")
            return False
        
        # Create a test review
        test_review = {
            "reviewer_name": "Test User",
            "rating": 5,
            "comment": "This is a test review",
            "review_date": datetime.now().isoformat()
        }
        
        success, created_review = self.run_test(
            "Create Review",
            "POST",
            "reviews",
            200,
            data=test_review
        )
        
        if not success:
            return False
        
        review_id = created_review.get('id')
        if not review_id:
            print("❌ No review ID returned")
            return False
        
        # Update the review
        test_review['comment'] = "Updated test review"
        success, updated_review = self.run_test(
            "Update Review",
            "PUT",
            f"reviews/{review_id}",
            200,
            data=test_review
        )
        
        if not success:
            return False
        
        # Delete the review
        success, _ = self.run_test(
            "Delete Review",
            "DELETE",
            f"reviews/{review_id}",
            200
        )
        
        return success

def main():
    print("🚀 Starting GameShop Nepal API Tests")
    print("=" * 50)
    
    tester = GameShopNepalAPITester()
    
    # Test sequence
    tests = [
        ("Root Endpoint", tester.test_root_endpoint),
        ("Seed Data", tester.test_seed_data),
        ("Admin Login", tester.test_admin_login),
        ("Admin Register (existing)", tester.test_admin_register),
        ("Get Current User", tester.test_get_me),
        ("Categories", tester.test_categories),
        ("Products", tester.test_products),
        ("Reviews", tester.test_reviews),
        ("Social Links", tester.test_social_links),
        ("Pages", tester.test_pages),
        ("Product CRUD", tester.test_product_crud),
        ("Review CRUD", tester.test_review_crud),
    ]
    
    print(f"\n📋 Running {len(tests)} test suites...")
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            test_func()
        except Exception as e:
            print(f"❌ Test suite '{test_name}' crashed: {str(e)}")
            tester.failed_tests.append({
                "test": test_name,
                "error": f"Test suite crashed: {str(e)}"
            })
    
    # Print final results
    print(f"\n{'='*50}")
    print(f"📊 FINAL RESULTS")
    print(f"{'='*50}")
    print(f"✅ Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"❌ Tests failed: {len(tester.failed_tests)}")
    
    if tester.failed_tests:
        print(f"\n❌ FAILED TESTS:")
        for i, failure in enumerate(tester.failed_tests, 1):
            print(f"   {i}. {failure.get('test', 'Unknown')}")
            if 'error' in failure:
                print(f"      Error: {failure['error']}")
            elif 'expected' in failure:
                print(f"      Expected: {failure['expected']}, Got: {failure['actual']}")
                print(f"      Response: {failure.get('response', 'No response')}")
    
    if tester.passed_tests:
        print(f"\n✅ PASSED TESTS:")
        for i, test in enumerate(tester.passed_tests, 1):
            print(f"   {i}. {test}")
    
    success_rate = (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0
    print(f"\n📈 Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())