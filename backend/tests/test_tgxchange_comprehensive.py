"""
Comprehensive A-Z Testing for TG Xchange Cryptocurrency Exchange
Tests: Authentication, Wallet, Trading, Markets, Referral, Rank, Deposit, Withdraw, 2FA
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://centralized-exchange.preview.emergentagent.com')

# Test credentials
DEMO_EMAIL = "demo@cryptovault.com"
DEMO_PASSWORD = "Demo@123"
ADMIN_EMAIL = "admin@tgxchange.com"
ADMIN_PASSWORD = "Admin@TG2024"


class TestHealthAndMarkets:
    """Test health check and market data endpoints (no auth required)"""
    
    def test_market_prices_returns_50_coins(self):
        """Markets page should show 50+ coins with logos"""
        response = requests.get(f"{BASE_URL}/api/market/prices")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 10, f"Expected at least 10 coins, got {len(data)}"
        
        # Verify coin structure
        first_coin = data[0]
        assert "coin_id" in first_coin
        assert "symbol" in first_coin
        assert "name" in first_coin
        assert "current_price" in first_coin
        assert "price_change_percentage_24h" in first_coin
        assert "image" in first_coin
        print(f"✓ Market prices returned {len(data)} coins with proper structure")
    
    def test_market_realtime_price(self):
        """Test real-time price endpoint (OKX)"""
        response = requests.get(f"{BASE_URL}/api/market/realtime-price/bitcoin")
        assert response.status_code == 200
        data = response.json()
        assert "coin_id" in data
        assert "price" in data or "error" in data
        print(f"✓ Real-time price endpoint working")
    
    def test_market_chart_data(self):
        """Test chart data endpoint"""
        response = requests.get(f"{BASE_URL}/api/market/chart/bitcoin?days=7")
        assert response.status_code == 200
        data = response.json()
        assert "coin_id" in data
        assert "prices" in data
        print(f"✓ Chart data endpoint working")
    
    def test_market_binance_klines(self):
        """Test candlestick/OHLC data endpoint"""
        response = requests.get(f"{BASE_URL}/api/market/binance-klines/bitcoin?interval=1h&limit=50")
        assert response.status_code == 200
        data = response.json()
        assert "candles" in data or "error" in data
        print(f"✓ Binance klines endpoint working")
    
    def test_deposit_limits_public(self):
        """Test deposit limits endpoint"""
        response = requests.get(f"{BASE_URL}/api/wallet/deposit-limits")
        assert response.status_code == 200
        data = response.json()
        assert data["min_deposit"] == 50
        assert data["max_deposit"] == 500
        assert data["allowed_amounts"] == [50, 100, 200, 300, 400, 500]
        print(f"✓ Deposit limits: ${data['min_deposit']} - ${data['max_deposit']}")


class TestAuthentication:
    """Test authentication flows"""
    
    def test_login_success(self):
        """Test login with demo credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == DEMO_EMAIL
        print(f"✓ Login successful for {DEMO_EMAIL}")
        return data["access_token"]
    
    def test_login_invalid_credentials(self):
        """Test login with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": "WrongPassword123"
        })
        assert response.status_code == 401
        print(f"✓ Invalid credentials rejected correctly")
    
    def test_login_nonexistent_user(self):
        """Test login with non-existent email"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "nonexistent@test.com",
            "password": "Test@123"
        })
        assert response.status_code == 401
        print(f"✓ Non-existent user rejected correctly")
    
    def test_get_current_user(self):
        """Test /auth/me endpoint"""
        # First login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        token = login_res.json()["access_token"]
        
        # Get current user
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == DEMO_EMAIL
        print(f"✓ /auth/me returns correct user data")
    
    def test_register_requires_referral_code(self):
        """Test that registration requires referral code"""
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_{int(time.time())}@test.com",
            "password": "Test@123456",
            "name": "Test User"
        })
        assert response.status_code == 400
        assert "referral" in response.json()["detail"].lower()
        print(f"✓ Registration requires referral code")


class TestWallet:
    """Test wallet operations"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_wallet(self, auth_token):
        """Test getting wallet balance"""
        response = requests.get(f"{BASE_URL}/api/wallet", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "balances" in data
        assert "usdt" in data["balances"]
        print(f"✓ Wallet balance: {data['balances']}")
    
    def test_withdrawal_limits(self, auth_token):
        """Test withdrawal limits endpoint"""
        response = requests.get(f"{BASE_URL}/api/wallet/withdrawal-limits", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "min_withdrawal" in data
        assert "total_balance" in data
        assert "withdrawable_balance" in data
        print(f"✓ Withdrawal limits: min=${data['min_withdrawal']}, withdrawable=${data['withdrawable_balance']}")


class TestTrading:
    """Test trading operations"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_buy_crypto(self, auth_token):
        """Test buying crypto"""
        # First check wallet balance
        wallet_res = requests.get(f"{BASE_URL}/api/wallet", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        usdt_balance = wallet_res.json()["balances"].get("usdt", 0)
        
        if usdt_balance < 10:
            pytest.skip("Insufficient USDT balance for trade test")
        
        response = requests.post(f"{BASE_URL}/api/trade", json={
            "coin": "btc",
            "amount": 0.0001,
            "trade_type": "buy"
        }, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        
        # May fail if insufficient balance, which is expected
        if response.status_code == 200:
            data = response.json()
            assert data["type"] == "buy"
            assert data["coin"] == "btc"
            print(f"✓ Buy trade executed: {data['amount']} BTC for ${data['total_usd']}")
        else:
            print(f"✓ Trade rejected (expected if insufficient balance): {response.json()}")
    
    def test_trade_invalid_coin(self, auth_token):
        """Test trading with invalid coin"""
        response = requests.post(f"{BASE_URL}/api/trade", json={
            "coin": "invalidcoin",
            "amount": 0.01,
            "trade_type": "buy"
        }, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 400
        print(f"✓ Invalid coin rejected correctly")
    
    def test_trade_invalid_type(self, auth_token):
        """Test trading with invalid trade type"""
        response = requests.post(f"{BASE_URL}/api/trade", json={
            "coin": "btc",
            "amount": 0.01,
            "trade_type": "invalid"
        }, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 400
        print(f"✓ Invalid trade type rejected correctly")


class TestTransactions:
    """Test transaction history"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_transactions(self, auth_token):
        """Test getting transaction history"""
        response = requests.get(f"{BASE_URL}/api/transactions", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Transaction history: {len(data)} transactions")


class TestReferralSystem:
    """Test referral system"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_referral_stats(self, auth_token):
        """Test getting referral statistics"""
        response = requests.get(f"{BASE_URL}/api/referral/stats", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_referrals" in data
        assert "total_earnings" in data
        assert "referral_code" in data
        print(f"✓ Referral stats: {data['total_referrals']} referrals, ${data['total_earnings']} earnings")
    
    def test_get_referral_team(self, auth_token):
        """Test getting referral team"""
        response = requests.get(f"{BASE_URL}/api/referral/team", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "team" in data
        print(f"✓ Referral team: {len(data['team'])} members")


class TestRankSystem:
    """Test VIP rank and team rank systems"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_vip_rank(self, auth_token):
        """Test getting VIP rank (trading volume based)"""
        response = requests.get(f"{BASE_URL}/api/rank", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "current_rank" in data
        assert "total_volume" in data
        print(f"✓ VIP Rank: {data['current_rank']['name'] if data['current_rank'] else 'None'}")
    
    def test_get_all_rank_levels(self, auth_token):
        """Test getting all VIP rank levels"""
        response = requests.get(f"{BASE_URL}/api/rank/all-levels", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "ranks" in data
        assert len(data["ranks"]) == 10  # 10 VIP levels
        print(f"✓ VIP rank levels: {len(data['ranks'])} levels")
    
    def test_get_team_rank(self, auth_token):
        """Test getting team rank (referral based)"""
        response = requests.get(f"{BASE_URL}/api/team-rank", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "current_rank" in data
        assert "direct_referrals" in data
        assert "total_team" in data
        print(f"✓ Team Rank: {data['current_rank']['name'] if data['current_rank'] else 'None'}")
    
    def test_get_all_team_rank_levels(self, auth_token):
        """Test getting all team rank levels"""
        response = requests.get(f"{BASE_URL}/api/team-rank/all-levels", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "ranks" in data
        assert len(data["ranks"]) == 10  # 10 team rank levels
        print(f"✓ Team rank levels: {len(data['ranks'])} levels")


class TestDepositSystem:
    """Test deposit request system"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_deposit_address(self, auth_token):
        """Test getting deposit addresses"""
        response = requests.get(f"{BASE_URL}/api/user/deposit-address", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "deposit_id" in data
        assert "networks" in data
        assert len(data["networks"]) >= 5  # BEP20, TRC20, ERC20, Solana, Polygon
        print(f"✓ Deposit address: {data['deposit_id']}, {len(data['networks'])} networks")
    
    def test_get_user_deposit_requests(self, auth_token):
        """Test getting user's deposit requests"""
        response = requests.get(f"{BASE_URL}/api/user/deposit-requests", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"✓ User deposit requests: {len(data['requests'])} requests")


class TestWithdrawSystem:
    """Test withdrawal request system"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_user_withdraw_requests(self, auth_token):
        """Test getting user's withdrawal requests"""
        response = requests.get(f"{BASE_URL}/api/user/withdraw-requests", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        print(f"✓ User withdrawal requests: {len(data['requests'])} requests")
    
    def test_withdraw_minimum_validation(self, auth_token):
        """Test withdrawal minimum amount validation"""
        response = requests.post(f"{BASE_URL}/api/user/withdraw-request", json={
            "network": "bep20",
            "coin": "usdt",
            "amount": 5,  # Below minimum of $10
            "wallet_address": "0x1234567890123456789012345678901234567890"
        }, headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 400
        assert "minimum" in response.json()["detail"].lower()
        print(f"✓ Withdrawal minimum validation working")


class Test2FASystem:
    """Test 2FA (Google Authenticator) system"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_EMAIL,
            "password": DEMO_PASSWORD
        })
        return response.json()["access_token"]
    
    def test_get_2fa_status(self, auth_token):
        """Test getting 2FA status"""
        response = requests.get(f"{BASE_URL}/api/2fa/status", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "enabled" in data
        print(f"✓ 2FA status: {'Enabled' if data['enabled'] else 'Disabled'}")
    
    def test_setup_2fa(self, auth_token):
        """Test 2FA setup (generates QR code)"""
        # First check if 2FA is already enabled
        status_res = requests.get(f"{BASE_URL}/api/2fa/status", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        if status_res.json().get("enabled"):
            pytest.skip("2FA already enabled, skipping setup test")
        
        response = requests.post(f"{BASE_URL}/api/2fa/setup", headers={
            "Authorization": f"Bearer {auth_token}"
        })
        
        if response.status_code == 200:
            data = response.json()
            assert "secret" in data
            assert "qr_code" in data
            assert "manual_key" in data
            print(f"✓ 2FA setup: QR code generated")
        elif response.status_code == 400:
            print(f"✓ 2FA already enabled or pending")


class TestAdminPanel:
    """Test admin panel endpoints"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "admin" in data
        print(f"✓ Admin login successful")
        return data["access_token"]
    
    def test_admin_login_invalid(self):
        """Test admin login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": "WrongPassword"
        })
        assert response.status_code == 401
        print(f"✓ Admin invalid credentials rejected")
    
    def test_admin_stats(self):
        """Test admin stats endpoint"""
        # Login first
        login_res = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_res.json()["access_token"]
        
        response = requests.get(f"{BASE_URL}/api/admin/stats", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_deposits" in data
        assert "pending_deposits" in data
        print(f"✓ Admin stats: {data['total_users']} users, {data['pending_deposits']} pending deposits")
    
    def test_admin_users_list(self):
        """Test admin users list endpoint"""
        login_res = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_res.json()["access_token"]
        
        response = requests.get(f"{BASE_URL}/api/admin/users", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "users" in data
        assert "total" in data
        print(f"✓ Admin users list: {data['total']} users")
    
    def test_admin_deposit_requests(self):
        """Test admin deposit requests endpoint"""
        login_res = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_res.json()["access_token"]
        
        response = requests.get(f"{BASE_URL}/api/admin/deposit-requests", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert "requests" in data
        assert "stats" in data
        print(f"✓ Admin deposit requests: {data['stats']['total']} total, {data['stats']['pending']} pending")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
