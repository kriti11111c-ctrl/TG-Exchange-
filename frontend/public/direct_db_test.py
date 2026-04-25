#!/usr/bin/env python3
"""
Direct test - Check referrals for user_584ed4ae9eea
"""
import asyncio
import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

# Load .env
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            if line.strip() and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ[k] = v.strip().strip('"').strip("'")

MONGO_URL = os.environ.get('MONGO_URL', '')
DB_NAME = os.environ.get('DB_NAME', 'tgx_exchange')
USER_ID = "user_584ed4ae9eea"

async def test():
    print(f"\n{'='*50}")
    print(f"DIRECT DB TEST for {USER_ID}")
    print(f"{'='*50}")
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Test 1: Count referrals
    count = await db.referrals.count_documents({"referrer_id": USER_ID})
    print(f"\n1. Total referrals count: {count}")
    
    # Test 2: Get some referrals
    refs = await db.referrals.find({"referrer_id": USER_ID}).limit(5).to_list(length=5)
    print(f"\n2. Sample referrals (first 5):")
    for r in refs:
        print(f"   - referred_id: {r.get('referred_id')}, level: {r.get('level')}")
    
    # Test 3: Check user exists
    user = await db.users.find_one({"user_id": USER_ID})
    print(f"\n3. User exists: {bool(user)}")
    if user:
        print(f"   - Email: {user.get('email')}")
        print(f"   - Name: {user.get('name')}")
    
    # Test 4: Direct referrals only (level 1)
    direct = await db.referrals.count_documents({"referrer_id": USER_ID, "level": 1})
    print(f"\n4. Direct referrals (level=1): {direct}")
    
    # Test 5: Check if referrer_id field exists
    sample = await db.referrals.find_one({"referrer_id": USER_ID})
    if sample:
        print(f"\n5. Sample referral document keys: {list(sample.keys())}")
    
    client.close()
    print(f"\n{'='*50}")

asyncio.run(test())
