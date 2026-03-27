"""
Admin Panel API Tests for TG Xchange
Tests: Admin Login, Dashboard Stats, Deposit Requests, Users Management
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://centralized-exchange.preview.emergentagent.com')

# Admin credentials from backend/.env
ADMIN_EMAIL = "admin@tgxchange.com"
ADMIN_PASSWORD = "Admin@TG2024"

# User credentials for testing deposit flow
USER_EMAIL = "demo@cryptovault.com"
USER_PASSWORD = "Demo@123"


class TestAdminLogin:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "access_token" in data, "Missing access_token in response"
        assert "admin" in data, "Missing admin object in response"
        assert data["admin"]["email"] == ADMIN_EMAIL
        assert "admin_id" in data["admin"]
        print(f"✓ Admin login successful: {data['admin']['email']}")
    
    def test_admin_login_invalid_email(self):
        """Test admin login with invalid email"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": "wrong@admin.com",
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid email correctly rejected")
    
    def test_admin_login_invalid_password(self):
        """Test admin login with invalid password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid password correctly rejected")


class TestAdminDashboard:
    """Admin dashboard and stats tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_admin_stats(self):
        """Test admin stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify stats structure
        assert "total_users" in data, "Missing total_users"
        assert "total_deposits" in data, "Missing total_deposits"
        assert "pending_deposits" in data, "Missing pending_deposits"
        assert "total_deposit_value" in data, "Missing total_deposit_value"
        assert "today_signups" in data, "Missing today_signups"
        
        # Verify data types
        assert isinstance(data["total_users"], int)
        assert isinstance(data["pending_deposits"], int)
        
        print(f"✓ Admin stats: {data['total_users']} users, {data['pending_deposits']} pending deposits")
    
    def test_admin_stats_unauthorized(self):
        """Test admin stats without token"""
        response = requests.get(f"{BASE_URL}/api/admin/stats")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthorized access correctly rejected")
    
    def test_admin_me(self):
        """Test admin profile endpoint"""
        response = requests.get(f"{BASE_URL}/api/admin/me", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "admin_id" in data
        assert "email" in data
        assert data["email"] == ADMIN_EMAIL
        print(f"✓ Admin profile: {data['email']}")


class TestAdminUsers:
    """Admin users management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_get_all_users(self):
        """Test getting all users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "users" in data, "Missing users array"
        assert "total" in data, "Missing total count"
        assert isinstance(data["users"], list)
        
        # If users exist, verify structure
        if len(data["users"]) > 0:
            user = data["users"][0]
            assert "user_id" in user, "Missing user_id"
            assert "email" in user, "Missing email"
            assert "wallet" in user, "Missing wallet info"
        
        print(f"✓ Retrieved {data['total']} users")
    
    def test_get_users_unauthorized(self):
        """Test getting users without admin token"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthorized access correctly rejected")


class TestAdminDepositRequests:
    """Admin deposit requests management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token before each test"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.admin_token = response.json()["access_token"]
            self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_get_all_deposit_requests(self):
        """Test getting all deposit requests"""
        response = requests.get(f"{BASE_URL}/api/admin/deposit-requests", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "requests" in data, "Missing requests array"
        assert "stats" in data, "Missing stats object"
        
        # Verify stats structure
        stats = data["stats"]
        assert "total" in stats
        assert "pending" in stats
        assert "approved" in stats
        assert "rejected" in stats
        
        print(f"✓ Deposit requests: {stats['total']} total, {stats['pending']} pending")
    
    def test_get_pending_deposit_requests(self):
        """Test filtering deposit requests by status"""
        response = requests.get(f"{BASE_URL}/api/admin/deposit-requests?status=pending", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # All returned requests should be pending
        for req in data["requests"]:
            assert req["status"] == "pending", f"Expected pending status, got {req['status']}"
        
        print(f"✓ Filtered pending requests: {len(data['requests'])} found")
    
    def test_get_approved_deposit_requests(self):
        """Test filtering deposit requests by approved status"""
        response = requests.get(f"{BASE_URL}/api/admin/deposit-requests?status=approved", headers=self.headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # All returned requests should be approved
        for req in data["requests"]:
            assert req["status"] == "approved", f"Expected approved status, got {req['status']}"
        
        print(f"✓ Filtered approved requests: {len(data['requests'])} found")


class TestUserDepositFlow:
    """Test user deposit request submission flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get user token before each test"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        if response.status_code == 200:
            self.user_token = response.json()["access_token"]
            self.user_headers = {"Authorization": f"Bearer {self.user_token}"}
        else:
            pytest.skip(f"User login failed: {response.text}")
        
        # Also get admin token
        admin_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if admin_response.status_code == 200:
            self.admin_token = admin_response.json()["access_token"]
            self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        else:
            pytest.skip("Admin login failed")
    
    def test_user_submit_deposit_request(self):
        """Test user submitting a deposit request"""
        unique_tx = f"0x{uuid.uuid4().hex}"
        
        response = requests.post(f"{BASE_URL}/api/user/deposit-request", 
            json={
                "network": "bep20",
                "coin": "USDT",
                "amount": 100.0,
                "tx_hash": unique_tx
            },
            headers=self.user_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        assert "request_id" in data
        assert data["status"] == "pending"
        
        print(f"✓ Deposit request submitted: {data['request_id']}")
        return data["request_id"]
    
    def test_user_get_deposit_requests(self):
        """Test user getting their deposit requests"""
        response = requests.get(f"{BASE_URL}/api/user/deposit-requests", headers=self.user_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "requests" in data
        assert isinstance(data["requests"], list)
        
        print(f"✓ User has {len(data['requests'])} deposit requests")


class TestDepositApprovalFlow:
    """Test full deposit approval flow: User submits -> Admin approves -> Balance updates"""
    
    def test_full_deposit_approval_flow(self):
        """Test complete deposit approval flow"""
        # Step 1: User login
        user_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        
        if user_response.status_code != 200:
            pytest.skip(f"User login failed: {user_response.text}")
        
        user_token = user_response.json()["access_token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Step 2: Get initial wallet balance
        wallet_before = requests.get(f"{BASE_URL}/api/wallet", headers=user_headers)
        assert wallet_before.status_code == 200
        initial_usdt = wallet_before.json()["balances"].get("usdt", 0)
        print(f"Initial USDT balance: {initial_usdt}")
        
        # Step 3: User submits deposit request
        unique_tx = f"0xTEST_{uuid.uuid4().hex[:16]}"
        deposit_amount = 50.0
        
        deposit_response = requests.post(f"{BASE_URL}/api/user/deposit-request",
            json={
                "network": "bep20",
                "coin": "USDT",
                "amount": deposit_amount,
                "tx_hash": unique_tx
            },
            headers=user_headers
        )
        
        assert deposit_response.status_code == 200, f"Deposit request failed: {deposit_response.text}"
        request_id = deposit_response.json()["request_id"]
        print(f"✓ Deposit request created: {request_id}")
        
        # Step 4: Admin login
        admin_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert admin_response.status_code == 200
        admin_token = admin_response.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Step 5: Admin approves the deposit
        approve_response = requests.post(f"{BASE_URL}/api/admin/deposit-requests/action",
            json={
                "request_id": request_id,
                "action": "approve",
                "admin_note": "Test approval"
            },
            headers=admin_headers
        )
        
        assert approve_response.status_code == 200, f"Approval failed: {approve_response.text}"
        print(f"✓ Deposit approved by admin")
        
        # Step 6: Verify user's balance increased
        wallet_after = requests.get(f"{BASE_URL}/api/wallet", headers=user_headers)
        assert wallet_after.status_code == 200
        final_usdt = wallet_after.json()["balances"].get("usdt", 0)
        
        expected_balance = initial_usdt + deposit_amount
        assert final_usdt == expected_balance, f"Expected {expected_balance}, got {final_usdt}"
        print(f"✓ Balance updated: {initial_usdt} -> {final_usdt} (+{deposit_amount})")
        
        # Step 7: Verify deposit request status changed
        user_requests = requests.get(f"{BASE_URL}/api/user/deposit-requests", headers=user_headers)
        assert user_requests.status_code == 200
        
        found_request = None
        for req in user_requests.json()["requests"]:
            if req["request_id"] == request_id:
                found_request = req
                break
        
        assert found_request is not None, "Deposit request not found"
        assert found_request["status"] == "approved", f"Expected approved, got {found_request['status']}"
        print(f"✓ Deposit request status: {found_request['status']}")


class TestDepositRejectionFlow:
    """Test deposit rejection flow"""
    
    def test_deposit_rejection(self):
        """Test admin rejecting a deposit request"""
        # User login
        user_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": USER_EMAIL,
            "password": USER_PASSWORD
        })
        
        if user_response.status_code != 200:
            pytest.skip(f"User login failed: {user_response.text}")
        
        user_token = user_response.json()["access_token"]
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Get initial balance
        wallet_before = requests.get(f"{BASE_URL}/api/wallet", headers=user_headers)
        initial_usdt = wallet_before.json()["balances"].get("usdt", 0)
        
        # Submit deposit request
        unique_tx = f"0xREJECT_{uuid.uuid4().hex[:16]}"
        deposit_response = requests.post(f"{BASE_URL}/api/user/deposit-request",
            json={
                "network": "trc20",
                "coin": "USDT",
                "amount": 75.0,
                "tx_hash": unique_tx
            },
            headers=user_headers
        )
        
        assert deposit_response.status_code == 200
        request_id = deposit_response.json()["request_id"]
        print(f"✓ Deposit request created: {request_id}")
        
        # Admin login and reject
        admin_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        admin_token = admin_response.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        reject_response = requests.post(f"{BASE_URL}/api/admin/deposit-requests/action",
            json={
                "request_id": request_id,
                "action": "reject",
                "admin_note": "Invalid transaction hash"
            },
            headers=admin_headers
        )
        
        assert reject_response.status_code == 200, f"Rejection failed: {reject_response.text}"
        print(f"✓ Deposit rejected by admin")
        
        # Verify balance unchanged
        wallet_after = requests.get(f"{BASE_URL}/api/wallet", headers=user_headers)
        final_usdt = wallet_after.json()["balances"].get("usdt", 0)
        
        assert final_usdt == initial_usdt, f"Balance should not change on rejection"
        print(f"✓ Balance unchanged: {final_usdt}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
