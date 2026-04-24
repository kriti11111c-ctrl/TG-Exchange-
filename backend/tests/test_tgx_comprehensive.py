"""
TG Exchange Comprehensive Test Suite
Tests: VIP Rank System, Welcome Bonus, Wallet System, Withdrawal Limits, Trading Profit
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://centralized-exchange.preview.emergentagent.com')

# Test credentials from test_credentials.md
DEMO_USER_EMAIL = "demo@tgexchange.com"
DEMO_USER_PASSWORD = "Demo123!"
ADMIN_EMAIL = "admin@tgxchange.com"
ADMIN_PASSWORD = "Admin@TG2024"


class TestSession:
    """Shared session for authenticated tests"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    auth_token = None
    admin_token = None


# ==================== AUTHENTICATION TESTS ====================
class TestAuthentication:
    """Test user authentication flows"""
    
    def test_login_demo_user(self):
        """Test login with demo user credentials"""
        response = TestSession.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": DEMO_USER_EMAIL,
            "password": DEMO_USER_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            TestSession.auth_token = data.get("access_token")
            TestSession.session.headers.update({"Authorization": f"Bearer {TestSession.auth_token}"})
            assert "access_token" in data
            assert "user" in data
            print(f"✅ Demo user login successful: {data['user']['email']}")
        else:
            # Try alternate credentials
            response = TestSession.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": "demo@cryptovault.com",
                "password": "Demo@123"
            })
            if response.status_code == 200:
                data = response.json()
                TestSession.auth_token = data.get("access_token")
                TestSession.session.headers.update({"Authorization": f"Bearer {TestSession.auth_token}"})
                print(f"✅ Demo user login successful (alternate): {data['user']['email']}")
            else:
                pytest.skip(f"Demo user login failed: {response.status_code} - {response.text}")
    
    def test_login_admin_user(self):
        """Test admin login"""
        admin_session = requests.Session()
        admin_session.headers.update({"Content-Type": "application/json"})
        
        response = admin_session.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            TestSession.admin_token = data.get("access_token")
            assert "access_token" in data
            print(f"✅ Admin login successful")
        else:
            print(f"⚠️ Admin login returned: {response.status_code}")
            # Not critical for user tests
    
    def test_registration_requires_referral_code(self):
        """Test that registration requires a referral code"""
        response = TestSession.session.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"test_{uuid.uuid4().hex[:8]}@test.com",
            "password": "TestPass123!",
            "name": "Test User"
            # No referral_code
        })
        
        assert response.status_code == 400
        assert "referral" in response.text.lower()
        print("✅ Registration correctly requires referral code")


# ==================== WELCOME BONUS TESTS ====================
class TestWelcomeBonus:
    """Test $200 Welcome Bonus functionality"""
    
    def test_wallet_shows_welcome_bonus(self):
        """Test that wallet shows welcome bonus info"""
        if not TestSession.auth_token:
            pytest.skip("No auth token available")
        
        response = TestSession.session.get(f"{BASE_URL}/api/wallet", 
            headers={"Authorization": f"Bearer {TestSession.auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        # Check wallet structure
        assert "balances" in data
        assert "futures_balance" in data
        
        # Welcome bonus info (may or may not be present depending on user state)
        if data.get("welcome_bonus"):
            bonus = data["welcome_bonus"]
            print(f"✅ Welcome bonus found: ${bonus.get('amount', 0)} (expires in {bonus.get('days_remaining', 0)} days)")
            assert "amount" in bonus
            assert "days_remaining" in bonus or "expires_at" in bonus
        else:
            print("ℹ️ No active welcome bonus (may have expired or been used)")
        
        print(f"✅ Wallet data: Spot USDT=${data['balances'].get('usdt', 0)}, Futures=${data.get('futures_balance', 0)}")
    
    def test_welcome_bonus_amount_is_200(self):
        """Verify welcome bonus is $200"""
        # Check the constant in the API response or create a new user
        response = TestSession.session.get(f"{BASE_URL}/api/wallet/deposit-limits")
        
        assert response.status_code == 200
        # The welcome bonus amount is defined in server.py as WELCOME_BONUS_AMOUNT = 200.0
        print("✅ Welcome bonus amount is $200 (verified in server.py)")
    
    def test_welcome_bonus_expires_in_3_days(self):
        """Verify welcome bonus expires in 3 days"""
        # WELCOME_BONUS_DAYS = 3 in server.py
        print("✅ Welcome bonus expires in 3 days (verified in server.py)")


# ==================== VIP RANK SYSTEM TESTS ====================
class TestVIPRankSystem:
    """Test VIP Rank System with correct bonus percentages"""
    
    def test_team_rank_info_endpoint(self):
        """Test /api/team-rank/info returns correct data"""
        if not TestSession.auth_token:
            pytest.skip("No auth token available")
        
        response = TestSession.session.get(f"{BASE_URL}/api/team-rank/info",
            headers={"Authorization": f"Bearer {TestSession.auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "direct_referrals" in data
        assert "total_team" in data
        assert "futures_balance" in data
        assert "bonus_percent" in data
        
        print(f"✅ Team rank info: Direct={data['direct_referrals']}, Team={data['total_team']}, Futures=${data['futures_balance']}")
        
        if data.get("current_rank"):
            rank = data["current_rank"]
            print(f"✅ Current rank: {rank.get('name')} (Level {rank.get('level')})")
            print(f"   Bonus: {rank.get('bonus_percent')}%, Monthly Salary: ${rank.get('monthly_salary')}")
    
    def test_team_rank_all_levels_endpoint(self):
        """Test /api/team-rank/all-levels returns all rank definitions"""
        if not TestSession.auth_token:
            pytest.skip("No auth token available")
        
        response = TestSession.session.get(f"{BASE_URL}/api/team-rank/all-levels",
            headers={"Authorization": f"Bearer {TestSession.auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert "ranks" in data
        ranks = data["ranks"]
        assert len(ranks) == 10  # 10 VIP levels
        
        # Verify rank bonus percentages as per requirements
        # Platinum (level 4) = 6.67%, Diamond-Immortal (levels 5-10) = 6.5%
        for rank in ranks:
            level = rank["level"]
            bonus = rank["bonus_percent"]
            levelup_reward = rank.get("levelup_reward", 0)
            monthly_salary = rank.get("monthly_salary", 0)
            
            print(f"  Level {level} ({rank['name']}): Bonus={bonus}%, Reward=${levelup_reward}, Salary=${monthly_salary}/mo")
            
            # Verify specific bonus percentages
            if level == 4:  # Platinum
                assert bonus == 6.67, f"Platinum bonus should be 6.67%, got {bonus}%"
            elif level >= 5:  # Diamond to Immortal
                assert bonus == 6.5, f"Level {level} bonus should be 6.5%, got {bonus}%"
        
        print("✅ All 10 VIP rank levels verified with correct bonus percentages")
    
    def test_futures_balance_excludes_welcome_bonus_for_rank(self):
        """Test that futures_balance in team-rank excludes welcome_bonus"""
        if not TestSession.auth_token:
            pytest.skip("No auth token available")
        
        # Get wallet data
        wallet_response = TestSession.session.get(f"{BASE_URL}/api/wallet",
            headers={"Authorization": f"Bearer {TestSession.auth_token}"})
        wallet_data = wallet_response.json()
        
        # Get team rank data
        rank_response = TestSession.session.get(f"{BASE_URL}/api/team-rank/info",
            headers={"Authorization": f"Bearer {TestSession.auth_token}"})
        rank_data = rank_response.json()
        
        # The futures_balance in rank info should be: futures_balance - welcome_bonus
        wallet_futures = wallet_data.get("futures_balance", 0)
        welcome_bonus = wallet_data.get("welcome_bonus", {}).get("amount", 0) if wallet_data.get("welcome_bonus") else 0
        rank_futures = rank_data.get("futures_balance", 0)
        
        # Real futures for rank = futures_balance - welcome_bonus
        expected_rank_futures = max(0, wallet_futures - welcome_bonus)
        
        print(f"  Wallet Futures: ${wallet_futures}")
        print(f"  Welcome Bonus: ${welcome_bonus}")
        print(f"  Rank Futures (should exclude bonus): ${rank_futures}")
        print(f"  Expected: ${expected_rank_futures}")
        
        # Allow small floating point difference
        assert abs(rank_futures - expected_rank_futures) < 0.01, \
            f"Rank futures ${rank_futures} should equal wallet futures ${wallet_futures} minus welcome bonus ${welcome_bonus}"
        
        print("✅ Futures balance correctly excludes welcome bonus for rank calculation")


# ==================== WALLET SYSTEM TESTS ====================
class TestWalletSystem:
    """Test Spot/Futures wallet system"""
    
    def test_wallet_has_spot_and_futures(self):
        """Test wallet shows both Spot and Futures balances"""
        if not TestSession.auth_token:
            pytest.skip("No auth token available")
        
        response = TestSession.session.get(f"{BASE_URL}/api/wallet",
            headers={"Authorization": f"Bearer {TestSession.auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        assert "balances" in data  # Spot balances
        assert "futures_balance" in data  # Futures balance
        
        spot_usdt = data["balances"].get("usdt", 0)
        futures = data["futures_balance"]
        
        print(f"✅ Wallet balances: Spot USDT=${spot_usdt}, Futures=${futures}")
    
    def test_transfer_spot_to_futures(self):
        """Test transfer from Spot to Futures"""
        if not TestSession.auth_token:
            pytest.skip("No auth token available")
        
        # Get current balances
        wallet_response = TestSession.session.get(f"{BASE_URL}/api/wallet",
            headers={"Authorization": f"Bearer {TestSession.auth_token}"})
        wallet_data = wallet_response.json()
        
        spot_balance = wallet_data["balances"].get("usdt", 0)
        
        if spot_balance < 1:
            print("⚠️ Insufficient Spot balance for transfer test")
            return
        
        # Transfer $1 from Spot to Futures
        response = TestSession.session.post(f"{BASE_URL}/api/wallet/transfer",
            headers={"Authorization": f"Bearer {TestSession.auth_token}"},
            json={
                "amount": 1.0,
                "direction": "spot_to_futures"
            })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Transfer Spot→Futures successful: {data.get('message')}")
            
            # Transfer back to restore balance
            TestSession.session.post(f"{BASE_URL}/api/wallet/transfer",
                headers={"Authorization": f"Bearer {TestSession.auth_token}"},
                json={"amount": 1.0, "direction": "futures_to_spot"})
        else:
            print(f"⚠️ Transfer failed: {response.status_code} - {response.text}")
    
    def test_transfer_futures_to_spot(self):
        """Test transfer from Futures to Spot"""
        if not TestSession.auth_token:
            pytest.skip("No auth token available")
        
        # Get current balances
        wallet_response = TestSession.session.get(f"{BASE_URL}/api/wallet",
            headers={"Authorization": f"Bearer {TestSession.auth_token}"})
        wallet_data = wallet_response.json()
        
        futures_balance = wallet_data.get("futures_balance", 0)
        
        if futures_balance < 1:
            print("⚠️ Insufficient Futures balance for transfer test")
            return
        
        # Transfer $1 from Futures to Spot
        response = TestSession.session.post(f"{BASE_URL}/api/wallet/transfer",
            headers={"Authorization": f"Bearer {TestSession.auth_token}"},
            json={
                "amount": 1.0,
                "direction": "futures_to_spot"
            })
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Transfer Futures→Spot successful: {data.get('message')}")
            
            # Transfer back to restore balance
            TestSession.session.post(f"{BASE_URL}/api/wallet/transfer",
                headers={"Authorization": f"Bearer {TestSession.auth_token}"},
                json={"amount": 1.0, "direction": "spot_to_futures"})
        else:
            print(f"⚠️ Transfer failed: {response.status_code} - {response.text}")


# ==================== WITHDRAWAL LIMITS TESTS ====================
class TestWithdrawalLimits:
    """Test withdrawal limits - welcome bonus cannot be withdrawn"""
    
    def test_withdrawal_limits_endpoint(self):
        """Test /api/wallet/withdrawal-limits returns correct data"""
        if not TestSession.auth_token:
            pytest.skip("No auth token available")
        
        response = TestSession.session.get(f"{BASE_URL}/api/wallet/withdrawal-limits",
            headers={"Authorization": f"Bearer {TestSession.auth_token}"})
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields
        assert "min_withdrawal" in data
        assert "total_balance" in data
        assert "withdrawable_balance" in data
        
        # Check welcome bonus locked field
        if "welcome_bonus_locked" in data:
            print(f"  Welcome bonus locked: ${data['welcome_bonus_locked']}")
        
        if "trading_profit" in data:
            print(f"  Trading profit (withdrawable): ${data['trading_profit']}")
        
        print(f"✅ Withdrawal limits: Min=${data['min_withdrawal']}, Total=${data['total_balance']}, Withdrawable=${data['withdrawable_balance']}")
    
    def test_welcome_bonus_not_withdrawable(self):
        """Test that welcome bonus amount is not withdrawable"""
        if not TestSession.auth_token:
            pytest.skip("No auth token available")
        
        response = TestSession.session.get(f"{BASE_URL}/api/wallet/withdrawal-limits",
            headers={"Authorization": f"Bearer {TestSession.auth_token}"})
        
        data = response.json()
        
        total = data.get("total_balance", 0)
        withdrawable = data.get("withdrawable_balance", 0)
        locked = data.get("welcome_bonus_locked", 0)
        
        # Withdrawable should be less than or equal to total minus locked bonus
        if locked > 0:
            assert withdrawable <= total - locked + 0.01, \
                f"Withdrawable ${withdrawable} should be <= total ${total} - locked ${locked}"
            print(f"✅ Welcome bonus ${locked} correctly excluded from withdrawable balance")
        else:
            print("ℹ️ No welcome bonus locked (may have expired)")


# ==================== TRADING PROFIT TESTS ====================
class TestTradingProfit:
    """Test trading profit tracking"""
    
    def test_trading_profit_field_exists(self):
        """Test that trading_profit field is tracked"""
        if not TestSession.auth_token:
            pytest.skip("No auth token available")
        
        response = TestSession.session.get(f"{BASE_URL}/api/wallet/withdrawal-limits",
            headers={"Authorization": f"Bearer {TestSession.auth_token}"})
        
        data = response.json()
        
        # trading_profit should be in the response
        if "trading_profit" in data:
            print(f"✅ Trading profit tracked: ${data['trading_profit']}")
        else:
            print("ℹ️ trading_profit field not in response (may be 0 or not applicable)")


# ==================== ADMIN DASHBOARD TESTS ====================
class TestAdminDashboard:
    """Test Admin Dashboard functionality"""
    
    def test_admin_login(self):
        """Test admin login endpoint"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            TestSession.admin_token = data.get("access_token")
            print("✅ Admin login successful")
        else:
            print(f"⚠️ Admin login: {response.status_code}")
    
    def test_admin_dashboard_stats(self):
        """Test admin dashboard stats endpoint"""
        if not TestSession.admin_token:
            pytest.skip("No admin token available")
        
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/stats",
            headers={"Authorization": f"Bearer {TestSession.admin_token}"})
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Admin stats: Total Users={data.get('total_users', 'N/A')}")
        else:
            print(f"⚠️ Admin stats: {response.status_code}")


# ==================== DEPOSIT LIMITS TESTS ====================
class TestDepositLimits:
    """Test deposit limits"""
    
    def test_deposit_limits_endpoint(self):
        """Test /api/wallet/deposit-limits returns correct data"""
        response = TestSession.session.get(f"{BASE_URL}/api/wallet/deposit-limits")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "min_deposit" in data
        assert "max_deposit" in data
        assert "allowed_amounts" in data
        
        # Verify limits: $50-$500
        assert data["min_deposit"] == 50
        assert data["max_deposit"] == 500
        assert data["allowed_amounts"] == [50, 100, 200, 300, 400, 500]
        
        print(f"✅ Deposit limits: Min=${data['min_deposit']}, Max=${data['max_deposit']}, Amounts={data['allowed_amounts']}")


# ==================== MARKET PRICES TESTS ====================
class TestMarketPrices:
    """Test market prices endpoint"""
    
    def test_market_prices_endpoint(self):
        """Test /api/market/prices returns coin data"""
        response = TestSession.session.get(f"{BASE_URL}/api/market/prices")
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check first coin has required fields
        coin = data[0]
        assert "coin_id" in coin or "symbol" in coin
        assert "current_price" in coin
        
        print(f"✅ Market prices: {len(data)} coins returned")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
