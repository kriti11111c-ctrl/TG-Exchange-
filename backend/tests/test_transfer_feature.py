"""
Test Suite for Spot/Futures Wallet Split and Transfer Feature
Tests the Transfer API between Spot and Futures accounts
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://centralized-exchange.preview.emergentagent.com')

class TestTransferFeature:
    """Tests for Spot/Futures Transfer functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@cryptovault.com", "password": "Demo@123"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Login failed - skipping transfer tests")
    
    def test_get_wallet_shows_spot_and_futures_balance(self):
        """Test that wallet endpoint returns both Spot and Futures balances"""
        response = self.session.get(f"{BASE_URL}/api/wallet")
        
        assert response.status_code == 200
        data = response.json()
        
        # Check Spot balance (in balances.usdt)
        assert "balances" in data
        assert "usdt" in data["balances"]
        assert isinstance(data["balances"]["usdt"], (int, float))
        
        # Check Futures balance
        assert "futures_balance" in data
        assert isinstance(data["futures_balance"], (int, float))
        
        print(f"Spot USDT: ${data['balances']['usdt']:.2f}")
        print(f"Futures Balance: ${data['futures_balance']:.2f}")
    
    def test_transfer_spot_to_futures(self):
        """Test transferring USDT from Spot to Futures"""
        # Get initial balances
        initial_wallet = self.session.get(f"{BASE_URL}/api/wallet").json()
        initial_spot = initial_wallet["balances"]["usdt"]
        initial_futures = initial_wallet["futures_balance"]
        
        # Transfer $10 from Spot to Futures
        transfer_amount = 10.0
        response = self.session.post(
            f"{BASE_URL}/api/wallet/transfer",
            json={"amount": transfer_amount, "direction": "spot_to_futures"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "Spot to Futures" in data["message"]
        
        # Verify balances updated correctly
        assert data["spot_balance"] == pytest.approx(initial_spot - transfer_amount, rel=0.01)
        assert data["futures_balance"] == pytest.approx(initial_futures + transfer_amount, rel=0.01)
        
        print(f"Transferred ${transfer_amount} from Spot to Futures")
        print(f"New Spot: ${data['spot_balance']:.2f}, New Futures: ${data['futures_balance']:.2f}")
    
    def test_transfer_futures_to_spot(self):
        """Test transferring USDT from Futures to Spot"""
        # Get initial balances
        initial_wallet = self.session.get(f"{BASE_URL}/api/wallet").json()
        initial_spot = initial_wallet["balances"]["usdt"]
        initial_futures = initial_wallet["futures_balance"]
        
        # Transfer $5 from Futures to Spot
        transfer_amount = 5.0
        response = self.session.post(
            f"{BASE_URL}/api/wallet/transfer",
            json={"amount": transfer_amount, "direction": "futures_to_spot"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == True
        assert "Futures to Spot" in data["message"]
        
        # Verify balances updated correctly
        assert data["spot_balance"] == pytest.approx(initial_spot + transfer_amount, rel=0.01)
        assert data["futures_balance"] == pytest.approx(initial_futures - transfer_amount, rel=0.01)
        
        print(f"Transferred ${transfer_amount} from Futures to Spot")
        print(f"New Spot: ${data['spot_balance']:.2f}, New Futures: ${data['futures_balance']:.2f}")
    
    def test_transfer_insufficient_spot_balance(self):
        """Test transfer fails with insufficient Spot balance"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/transfer",
            json={"amount": 999999999, "direction": "spot_to_futures"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "Insufficient Spot balance" in data["detail"]
        print("✓ Correctly rejected transfer with insufficient Spot balance")
    
    def test_transfer_insufficient_futures_balance(self):
        """Test transfer fails with insufficient Futures balance"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/transfer",
            json={"amount": 999999999, "direction": "futures_to_spot"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "Insufficient Futures balance" in data["detail"]
        print("✓ Correctly rejected transfer with insufficient Futures balance")
    
    def test_transfer_invalid_direction(self):
        """Test transfer fails with invalid direction"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/transfer",
            json={"amount": 10, "direction": "invalid_direction"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "Invalid direction" in data["detail"]
        print("✓ Correctly rejected transfer with invalid direction")
    
    def test_transfer_zero_amount(self):
        """Test transfer fails with zero amount"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/transfer",
            json={"amount": 0, "direction": "spot_to_futures"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "positive" in data["detail"].lower()
        print("✓ Correctly rejected transfer with zero amount")
    
    def test_transfer_negative_amount(self):
        """Test transfer fails with negative amount"""
        response = self.session.post(
            f"{BASE_URL}/api/wallet/transfer",
            json={"amount": -10, "direction": "spot_to_futures"}
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "positive" in data["detail"].lower()
        print("✓ Correctly rejected transfer with negative amount")


class TestWalletBalanceDisplay:
    """Tests for wallet balance display"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup - Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "demo@cryptovault.com", "password": "Demo@123"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Login failed")
    
    def test_wallet_has_all_required_fields(self):
        """Test wallet response has all required fields"""
        response = self.session.get(f"{BASE_URL}/api/wallet")
        
        assert response.status_code == 200
        data = response.json()
        
        # Required fields
        assert "user_id" in data
        assert "balances" in data
        assert "futures_balance" in data
        assert "updated_at" in data
        
        # Balances should have all supported coins
        supported_coins = ["btc", "eth", "usdt", "bnb", "xrp", "sol"]
        for coin in supported_coins:
            assert coin in data["balances"], f"Missing {coin} in balances"
        
        print("✓ Wallet has all required fields")
    
    def test_futures_balance_is_separate_from_spot(self):
        """Test that futures_balance is separate from spot balances"""
        response = self.session.get(f"{BASE_URL}/api/wallet")
        data = response.json()
        
        spot_usdt = data["balances"]["usdt"]
        futures_balance = data["futures_balance"]
        
        # They should be separate values (not the same reference)
        assert spot_usdt != futures_balance or (spot_usdt == 0 and futures_balance == 0)
        
        print(f"✓ Spot USDT (${spot_usdt:.2f}) is separate from Futures (${futures_balance:.2f})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
