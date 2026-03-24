import requests
import sys
import json
from datetime import datetime

class CryptoExchangeAPITester:
    def __init__(self, base_url="https://centralized-exchange.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.session_token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
            
        if self.session_token:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {response_data}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_market_prices(self):
        """Test market prices endpoint (public)"""
        success, response = self.run_test(
            "Market Prices",
            "GET",
            "market/prices",
            200
        )
        if success and isinstance(response, list) and len(response) > 0:
            print(f"   Found {len(response)} crypto prices")
            return True
        return False

    def test_register(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "name": f"Test User {timestamp}",
            "email": f"test.user.{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if success and 'access_token' in response and 'user' in response:
            self.session_token = response['access_token']
            self.user_data = response['user']
            print(f"   Registered user: {self.user_data['email']}")
            print(f"   User gets 1000 USDT for testing")
            return True
        return False

    def test_login(self):
        """Test user login with existing credentials"""
        if not self.user_data:
            print("❌ No user data available for login test")
            return False
            
        login_data = {
            "email": self.user_data['email'],
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST", 
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'access_token' in response:
            self.session_token = response['access_token']
            print(f"   Login successful for: {response['user']['email']}")
            return True
        return False

    def test_auth_me(self):
        """Test getting current user info"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        
        if success and 'user_id' in response:
            print(f"   User ID: {response['user_id']}")
            print(f"   Email: {response['email']}")
            return True
        return False

    def test_wallet(self):
        """Test wallet endpoint"""
        success, response = self.run_test(
            "Get Wallet",
            "GET",
            "wallet",
            200
        )
        
        if success and 'balances' in response:
            balances = response['balances']
            print(f"   USDT Balance: {balances.get('usdt', 0)}")
            print(f"   BTC Balance: {balances.get('btc', 0)}")
            print(f"   ETH Balance: {balances.get('eth', 0)}")
            return True
        return False

    def test_deposit(self):
        """Test crypto deposit"""
        deposit_data = {
            "coin": "btc",
            "amount": 0.001,
            "tx_hash": f"test_tx_{datetime.now().strftime('%H%M%S')}"
        }
        
        success, response = self.run_test(
            "Crypto Deposit",
            "POST",
            "wallet/deposit",
            200,
            data=deposit_data
        )
        
        if success and response.get('status') == 'completed':
            print(f"   Deposited: {response['amount']} {response['coin'].upper()}")
            return True
        return False

    def test_trade_buy(self):
        """Test buying crypto with USDT"""
        trade_data = {
            "coin": "btc",
            "amount": 0.0001,
            "trade_type": "buy"
        }
        
        success, response = self.run_test(
            "Buy Crypto Trade",
            "POST",
            "trade",
            200,
            data=trade_data
        )
        
        if success and response.get('status') == 'completed':
            print(f"   Bought: {response['amount']} {response['coin'].upper()}")
            print(f"   Price: ${response.get('price_usd', 0)}")
            print(f"   Total: ${response.get('total_usd', 0)}")
            return True
        return False

    def test_trade_sell(self):
        """Test selling crypto for USDT"""
        trade_data = {
            "coin": "btc", 
            "amount": 0.00005,
            "trade_type": "sell"
        }
        
        success, response = self.run_test(
            "Sell Crypto Trade",
            "POST",
            "trade", 
            200,
            data=trade_data
        )
        
        if success and response.get('status') == 'completed':
            print(f"   Sold: {response['amount']} {response['coin'].upper()}")
            print(f"   Price: ${response.get('price_usd', 0)}")
            print(f"   Total: ${response.get('total_usd', 0)}")
            return True
        return False

    def test_transactions(self):
        """Test transaction history"""
        success, response = self.run_test(
            "Transaction History",
            "GET",
            "transactions",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} transactions")
            if len(response) > 0:
                latest = response[0]
                print(f"   Latest: {latest['type']} {latest['amount']} {latest['coin'].upper()}")
            return True
        return False

    def test_withdraw(self):
        """Test crypto withdrawal"""
        withdraw_data = {
            "coin": "usdt",
            "amount": 10.0,
            "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f3e472"
        }
        
        success, response = self.run_test(
            "Crypto Withdrawal",
            "POST",
            "wallet/withdraw",
            200,
            data=withdraw_data
        )
        
        if success and response.get('status') in ['completed', 'pending']:
            print(f"   Withdrew: {response['amount']} {response['coin'].upper()}")
            print(f"   Status: {response['status']}")
            return True
        return False

    def test_market_chart(self):
        """Test market chart data"""
        success, response = self.run_test(
            "Market Chart Data",
            "GET",
            "market/chart/bitcoin?days=7",
            200
        )
        
        if success and 'prices' in response:
            prices = response['prices']
            print(f"   Chart data points: {len(prices)}")
            if len(prices) > 0:
                print(f"   Price range: ${prices[0][1]:.2f} - ${prices[-1][1]:.2f}")
            return True
        return False

    def test_logout(self):
        """Test user logout"""
        success, response = self.run_test(
            "User Logout",
            "POST",
            "auth/logout",
            200
        )
        
        if success:
            print("   Logout successful")
            self.session_token = None
            return True
        return False

def main():
    print("🚀 Starting CryptoVault Exchange API Tests")
    print("=" * 50)
    
    tester = CryptoExchangeAPITester()
    
    # Test sequence
    test_results = []
    
    # Public endpoints first
    test_results.append(("Market Prices", tester.test_market_prices()))
    test_results.append(("Market Chart", tester.test_market_chart()))
    
    # Authentication flow
    test_results.append(("User Registration", tester.test_register()))
    test_results.append(("Get Current User", tester.test_auth_me()))
    test_results.append(("Get Wallet", tester.test_wallet()))
    
    # Trading operations
    test_results.append(("Crypto Deposit", tester.test_deposit()))
    test_results.append(("Buy Trade", tester.test_trade_buy()))
    test_results.append(("Sell Trade", tester.test_trade_sell()))
    test_results.append(("Transaction History", tester.test_transactions()))
    test_results.append(("Crypto Withdrawal", tester.test_withdraw()))
    
    # Logout
    test_results.append(("User Logout", tester.test_logout()))
    
    # Test login with existing user (after logout)
    test_results.append(("User Login", tester.test_login()))
    
    # Print summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in test_results if result)
    total = len(test_results)
    
    for test_name, result in test_results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\n🎯 Results: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    if passed == total:
        print("🎉 All tests passed! CryptoVault Exchange API is working correctly.")
        return 0
    else:
        print("⚠️  Some tests failed. Check the API implementation.")
        return 1

if __name__ == "__main__":
    sys.exit(main())