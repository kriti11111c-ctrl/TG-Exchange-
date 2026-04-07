"""
TG Exchange - Full Flow Testing
Tests: Registration, Login, Wallet, Deposit Address, Trading, Referral, Team Rank, Profile, Admin
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://centralized-exchange.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@tgxchange.com"
ADMIN_PASSWORD = "Admin@TG2024"
DEMO_EMAIL = "demo@cryptovault.com"
DEMO_PASSWORD = "Demo@123"

# Generate unique test user
TEST_USER_EMAIL = f"test_{uuid.uuid4().hex[:8]}@test.com"
TEST_USER_PASSWORD = "TestPass@123"
TEST_USER_NAME = "Test User"

class TestHealthAndMarket:
    """Basic API health and market data tests"""
    
    def test_market_prices_endpoint(self):
        """Test market prices API - should return coin data"""
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/market/prices", timeout=15)
        elapsed = time.time() - start
        
        assert response.status_code == 200, f"Market prices failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of coins"
        assert len(data) > 0, "Expected at least one coin"
        
        # Check first coin has required fields
        coin = data[0]
        assert "symbol" in coin, "Missing symbol"
        assert "current_price" in coin, "Missing current_price"
        
        print(f"Market prices: {len(data)} coins, response time: {elapsed:.2f}s")
        assert elapsed < 5, f"API too slow: {elapsed:.2f}s"


class TestUserRegistration:
    """User registration flow tests"""
    
    def test_registration_requires_referral_code(self):
        """Registration should require a referral code"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"noreferral_{uuid.uuid4().hex[:6]}@test.com",
            "password": "TestPass@123",
            "name": "No Referral User"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "referral" in response.text.lower(), "Should mention referral code required"
        print("Registration correctly requires referral code")
    
    def test_registration_with_invalid_referral(self):
        """Registration with invalid referral code should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"invalidref_{uuid.uuid4().hex[:6]}@test.com",
            "password": "TestPass@123",
            "name": "Invalid Ref User",
            "referral_code": "INVALIDCODE123"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Invalid referral code correctly rejected")
    
    def test_registration_with_admin_referral(self):
        """Registration with admin referral code should work"""
        global TEST_USER_EMAIL
        TEST_USER_EMAIL = f"test_{uuid.uuid4().hex[:8]}@test.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME,
            "referral_code": "TGADMIN2024"  # Admin referral code
        })
        
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token"
        assert "user" in data, "Missing user data"
        assert data["user"]["email"] == TEST_USER_EMAIL
        print(f"User registered successfully: {TEST_USER_EMAIL}")
        return data["access_token"]


class TestUserLogin:
    """User login flow tests"""
    
    def test_login_with_invalid_credentials(self):
        """Login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": "WrongPassword123"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Invalid credentials correctly rejected")
    
    def test_login_with_demo_user(self):
        """Login with demo user credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token"
        assert "user" in data, "Missing user data"
        print(f"Demo user login successful: {data['user']['email']}")
        return data["access_token"]
    
    def test_login_response_time(self):
        """Login should be fast"""
        start = time.time()
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        elapsed = time.time() - start
        
        assert response.status_code == 200
        print(f"Login response time: {elapsed:.2f}s")
        assert elapsed < 3, f"Login too slow: {elapsed:.2f}s"


class TestWalletAndBalance:
    """Wallet balance and operations tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for demo user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_wallet_balance_display(self, auth_token):
        """Wallet should show balance correctly"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/wallet", headers=headers)
        
        assert response.status_code == 200, f"Wallet fetch failed: {response.text}"
        data = response.json()
        
        assert "balances" in data, "Missing balances"
        assert "futures_balance" in data, "Missing futures_balance"
        assert "user_id" in data, "Missing user_id"
        
        print(f"Wallet balances: {data['balances']}")
        print(f"Futures balance: {data['futures_balance']}")
    
    def test_deposit_limits(self, auth_token):
        """Get deposit limits"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/wallet/deposit-limits", headers=headers)
        
        assert response.status_code == 200, f"Deposit limits failed: {response.text}"
        data = response.json()
        
        assert "min_deposit" in data, "Missing min_deposit"
        assert "max_deposit" in data, "Missing max_deposit"
        assert "allowed_amounts" in data, "Missing allowed_amounts"
        
        print(f"Deposit limits: min=${data['min_deposit']}, max=${data['max_deposit']}")
        print(f"Allowed amounts: {data['allowed_amounts']}")


class TestDepositAddressGeneration:
    """Deposit address generation tests for all networks"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for demo user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_all_deposit_addresses(self, auth_token):
        """Get all deposit addresses at once"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/user/deposit-address", headers=headers)
        elapsed = time.time() - start
        
        assert response.status_code == 200, f"Deposit addresses failed: {response.text}"
        data = response.json()
        
        # Should return list of networks with addresses
        assert "user_id" in data or isinstance(data, list), "Invalid response format"
        print(f"All deposit addresses fetched in {elapsed:.2f}s")
        print(f"Response: {data}")
    
    def test_bsc_deposit_address(self, auth_token):
        """Generate BSC (BEP20) deposit address"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/user/deposit-address?network=bsc", headers=headers)
        elapsed = time.time() - start
        
        assert response.status_code == 200, f"BSC address failed: {response.text}"
        data = response.json()
        
        assert "address" in data, "Missing address"
        assert data["address"].startswith("0x"), "Invalid BSC address format"
        assert len(data["address"]) == 42, "Invalid BSC address length"
        
        print(f"BSC address: {data['address']} (generated in {elapsed:.2f}s)")
    
    def test_eth_deposit_address(self, auth_token):
        """Generate ETH (ERC20) deposit address"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/user/deposit-address?network=eth", headers=headers)
        
        assert response.status_code == 200, f"ETH address failed: {response.text}"
        data = response.json()
        
        assert "address" in data, "Missing address"
        assert data["address"].startswith("0x"), "Invalid ETH address format"
        print(f"ETH address: {data['address']}")
    
    def test_polygon_deposit_address(self, auth_token):
        """Generate Polygon deposit address"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/user/deposit-address?network=polygon", headers=headers)
        
        assert response.status_code == 200, f"Polygon address failed: {response.text}"
        data = response.json()
        
        assert "address" in data, "Missing address"
        print(f"Polygon address: {data['address']}")
    
    def test_tron_deposit_address(self, auth_token):
        """Generate TRON (TRC20) deposit address"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/user/deposit-address?network=tron", headers=headers)
        
        assert response.status_code == 200, f"TRON address failed: {response.text}"
        data = response.json()
        
        assert "address" in data, "Missing address"
        assert data["address"].startswith("T"), "Invalid TRON address format"
        print(f"TRON address: {data['address']}")
    
    def test_solana_deposit_address(self, auth_token):
        """Generate Solana deposit address"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/user/deposit-address?network=solana", headers=headers)
        
        assert response.status_code == 200, f"Solana address failed: {response.text}"
        data = response.json()
        
        assert "address" in data, "Missing address"
        print(f"Solana address: {data['address']}")


class TestTradingPage:
    """Trading page and chart data tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for demo user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_chart_data_endpoint(self, auth_token):
        """Get chart data for BTC"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        start = time.time()
        response = requests.get(f"{BASE_URL}/api/market/chart/bitcoin?days=1", headers=headers)
        elapsed = time.time() - start
        
        # Chart data might use fallback if CoinGecko rate limited
        assert response.status_code in [200, 429], f"Chart data failed: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"Chart data received in {elapsed:.2f}s")
        else:
            print(f"Chart data rate limited (expected), response time: {elapsed:.2f}s")


class TestReferralSystem:
    """Referral link and stats tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for demo user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_referral_stats(self, auth_token):
        """Get referral statistics"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/referral/stats", headers=headers)
        
        assert response.status_code == 200, f"Referral stats failed: {response.text}"
        data = response.json()
        
        assert "total_referrals" in data, "Missing total_referrals"
        assert "total_earnings" in data, "Missing total_earnings"
        print(f"Referral stats: {data['total_referrals']} referrals, ${data['total_earnings']} earnings")
    
    def test_referral_link_generation(self, auth_token):
        """User should have a referral code"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200, f"Auth me failed: {response.text}"
        data = response.json()
        
        assert "referral_code" in data, "Missing referral_code"
        assert len(data["referral_code"]) > 0, "Empty referral code"
        print(f"Referral code: {data['referral_code']}")


class TestTeamRankPage:
    """Team rank display tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for demo user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_team_rank_info(self, auth_token):
        """Get team rank information"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/team-rank/info", headers=headers)
        
        assert response.status_code == 200, f"Team rank info failed: {response.text}"
        data = response.json()
        
        assert "direct_referrals" in data, "Missing direct_referrals"
        assert "total_team" in data, "Missing total_team"
        print(f"Team rank: {data.get('current_rank', 'No rank')}, direct: {data['direct_referrals']}, team: {data['total_team']}")


class TestProfilePage:
    """Profile page tests"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for demo user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_profile_data(self, auth_token):
        """Get user profile data"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
        
        assert response.status_code == 200, f"Profile fetch failed: {response.text}"
        data = response.json()
        
        assert "user_id" in data, "Missing user_id"
        assert "email" in data, "Missing email"
        assert "name" in data, "Missing name"
        print(f"Profile: {data['name']} ({data['email']})")


class TestAdminPanel:
    """Admin login and dashboard tests"""
    
    def test_admin_login(self):
        """Admin login should work"""
        start = time.time()
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        elapsed = time.time() - start
        
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data, "Missing access_token"
        print(f"Admin login successful in {elapsed:.2f}s")
        return data["access_token"]
    
    def test_admin_dashboard_stats(self):
        """Admin dashboard should show stats"""
        # First login
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_response.json()["access_token"]
        
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers=headers)
        
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        data = response.json()
        
        assert "total_users" in data, "Missing total_users"
        print(f"Admin stats: {data['total_users']} users")


class TestAPIResponseTimes:
    """Test API response times for slowness"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for demo user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_wallet_response_time(self, auth_token):
        """Wallet API should be fast"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        times = []
        for _ in range(3):
            start = time.time()
            response = requests.get(f"{BASE_URL}/api/wallet", headers=headers)
            elapsed = time.time() - start
            times.append(elapsed)
            assert response.status_code == 200
        
        avg_time = sum(times) / len(times)
        print(f"Wallet API avg response time: {avg_time:.2f}s (samples: {times})")
        assert avg_time < 2, f"Wallet API too slow: {avg_time:.2f}s"
    
    def test_market_prices_response_time(self):
        """Market prices should be fast"""
        times = []
        for _ in range(3):
            start = time.time()
            response = requests.get(f"{BASE_URL}/api/market/prices")
            elapsed = time.time() - start
            times.append(elapsed)
            assert response.status_code == 200
        
        avg_time = sum(times) / len(times)
        print(f"Market prices avg response time: {avg_time:.2f}s")
        assert avg_time < 3, f"Market prices too slow: {avg_time:.2f}s"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
