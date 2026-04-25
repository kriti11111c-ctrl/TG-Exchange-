#!/usr/bin/env python3
"""
TEST: Generate 1 test trade code for testing
Run: python3 test_code.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
import random
import string
from pathlib import Path

# Load .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value
    print(f"✅ Loaded .env")

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'tgx_exchange')

print(f"📦 DB Name: {DB_NAME}")

# Coin list for random selection
COINS = ["btc", "eth", "bnb", "sol", "xrp", "doge", "ada", "avax", "shib", "dot"]

async def generate_test_code():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n🔧 GENERATING TEST TRADE CODE...")
    
    # Generate random code
    code = "TGX" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=9))
    
    now = datetime.now(timezone.utc)
    scheduled_start = now  # Start immediately
    expires_at = now + timedelta(hours=1)  # Valid for 1 hour
    
    # Random coin and profit
    coin = random.choice(COINS)
    profit_percent = round(random.uniform(25, 65), 1)
    
    # Create global trade code
    trade_code = {
        "code": code,
        "coin": coin,
        "amount": 100,
        "trade_type": random.choice(["call", "put"]),
        "price": 0,  # Will be fetched at execution
        "profit_percent": profit_percent,
        "fund_percent": 1.0,
        "multiplier": 1,
        "status": "active",
        "is_global": True,
        "scheduled_slot": "test",
        "slot_name": "Test Code",
        "scheduled_start": scheduled_start.isoformat(),
        "expires_at": expires_at.isoformat(),
        "created_at": now.isoformat()
    }
    
    await db.trade_codes.insert_one(trade_code)
    
    print(f"\n✅ TEST CODE GENERATED!")
    print(f"   Code: {code}")
    print(f"   Coin: {coin.upper()}")
    print(f"   Profit: {profit_percent}%")
    print(f"   Expires: {expires_at.strftime('%H:%M UTC')} (1 hour)")
    print(f"   Status: active")
    print(f"   is_global: True")
    
    # Verify
    verify = await db.trade_codes.find_one({"code": code}, {"_id": 0})
    if verify:
        print(f"\n✅ VERIFIED in database!")
    
    client.close()
    
    print(f"\n🔔 Now refresh browser and check Bell icon!")
    print(f"📋 Code to copy: {code}")

if __name__ == "__main__":
    asyncio.run(generate_test_code())
