#!/usr/bin/env python3
"""
FIX TRADE CODE - Insert a working global trade code
FIXED VERSION - Reads from .env file automatically
Run: python3 fix_trade_code.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
import random
import string
from pathlib import Path

# Load .env file from same directory
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value
    print(f"✅ Loaded .env from {env_path}")
else:
    print(f"⚠️ No .env found at {env_path}")

# Get MongoDB credentials from environment
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'tgx_exchange')

if not MONGO_URL:
    print("❌ ERROR: MONGO_URL not found in environment!")
    print("   Make sure .env file exists with MONGO_URL=...")
    exit(1)

print(f"📦 DB Name: {DB_NAME}")
print(f"🔗 Connecting to MongoDB...")

async def fix_trade_code():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("🔧 FIXING TRADE CODE...")
    
    # Delete ALL old global codes first
    delete_result = await db.trade_codes.delete_many({
        "$or": [
            {"is_global": True},
            {"user_id": {"$exists": False}}
        ]
    })
    print(f"🗑️ Deleted {delete_result.deleted_count} old global codes")
    
    # Generate new code
    code = "TGX" + ''.join(random.choices(string.ascii_uppercase + string.digits, k=9))
    
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=2)  # Valid for 2 hours
    
    # Important: NO user_id field + is_global=True + status must be "active"
    trade_code = {
        "code": code,
        "coin": "btc",
        "amount": 100,
        "trade_type": "call",
        "price": 95000.0,
        "profit_percent": 35.5,
        "fund_percent": 1.0,
        "multiplier": 1,
        "status": "active",  # MUST be "active" not "scheduled"
        "is_global": True,
        "scheduled_slot": "morning",
        "slot_name": "Special Code",
        "scheduled_start": now.isoformat(),  # Start NOW
        "expires_at": expires_at.isoformat(),
        "created_at": now.isoformat()
    }
    
    await db.trade_codes.insert_one(trade_code)
    
    print(f"✅ INSERTED NEW CODE: {code}")
    print(f"   Status: active")
    print(f"   is_global: True")
    print(f"   Expires at: {expires_at.isoformat()}")
    print(f"   Valid for: 2 hours")
    
    # Verify it's queryable
    verify = await db.trade_codes.find_one({"code": code}, {"_id": 0})
    if verify:
        print(f"\n✅ VERIFIED - Code exists in DB")
        print(f"   Query test: is_global={verify.get('is_global')}, status={verify.get('status')}")
    
    client.close()
    
    print("\n🎉 DONE! Now refresh browser and check Bell icon.")
    print(f"📋 Code to copy: {code}")

if __name__ == "__main__":
    asyncio.run(fix_trade_code())
