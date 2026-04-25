#!/usr/bin/env python3
"""
Complete API Debug - Test team-rank API for specific user
"""
import asyncio
import os
import jwt
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
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-here')

# Test token (from kriti11111a@gmail.com login)
TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzU4NGVkNGFlOWVlYSIsImVtYWlsIjoia3JpdGkxMTExMWFAZ21haWwuY29tIiwiZXhwIjoxNzQ2MTc4MjMxLCJpYXQiOjE3NDU1NzM0MzF9.ObZGGwE74CE18P5QzWGlogy8XvyAgqNDBEzIKwsp2JA"

async def test():
    print(f"\n{'='*60}")
    print("COMPLETE API DEBUG")
    print(f"{'='*60}")
    
    # Step 1: Decode token
    print("\n1. DECODING TOKEN:")
    try:
        payload = jwt.decode(TEST_TOKEN, JWT_SECRET, algorithms=["HS256"])
        token_user_id = payload.get("sub")
        token_email = payload.get("email")
        print(f"   ✅ Token valid!")
        print(f"   user_id from token: {token_user_id}")
        print(f"   email from token: {token_email}")
    except jwt.ExpiredSignatureError:
        print(f"   ❌ TOKEN EXPIRED!")
        return
    except Exception as e:
        print(f"   ❌ Token decode error: {e}")
        # Try without verification
        payload = jwt.decode(TEST_TOKEN, options={"verify_signature": False})
        token_user_id = payload.get("sub")
        print(f"   (Unverified) user_id: {token_user_id}")
    
    # Step 2: Connect to DB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Step 3: Find user by token's user_id
    print(f"\n2. FINDING USER IN DB:")
    user = await db.users.find_one({"user_id": token_user_id})
    if user:
        print(f"   ✅ User found!")
        print(f"   DB user_id: {user.get('user_id')}")
        print(f"   DB email: {user.get('email')}")
        print(f"   Match: {user.get('user_id') == token_user_id}")
    else:
        print(f"   ❌ User NOT found with user_id={token_user_id}")
    
    # Step 4: Find session
    print(f"\n3. CHECKING SESSIONS:")
    sessions = await db.sessions.find({"user_id": token_user_id}).to_list(length=10)
    print(f"   Active sessions for this user: {len(sessions)}")
    
    # Step 5: Direct referral query (same as API)
    print(f"\n4. REFERRAL QUERY (same as API):")
    all_referrals = await db.referrals.find(
        {"referrer_id": token_user_id}, 
        {"_id": 0, "referred_id": 1, "level": 1}
    ).to_list(length=100000)
    
    print(f"   Total referrals found: {len(all_referrals)}")
    
    direct = [r for r in all_referrals if r.get("level") == 1]
    print(f"   Direct (level=1): {len(direct)}")
    
    # Step 6: Check if there are referrals with DIFFERENT referrer_id format
    print(f"\n5. CHECKING REFERRER_ID FORMATS:")
    
    # Check with email
    by_email = await db.referrals.count_documents({"referrer_id": token_email})
    print(f"   Referrals with referrer_id='{token_email}': {by_email}")
    
    # Check case variations
    by_upper = await db.referrals.count_documents({"referrer_id": token_user_id.upper()})
    by_lower = await db.referrals.count_documents({"referrer_id": token_user_id.lower()})
    print(f"   Referrals with UPPER case: {by_upper}")
    print(f"   Referrals with lower case: {by_lower}")
    
    # Get sample referral to see actual referrer_id format
    sample = await db.referrals.find_one({"referred_id": {"$regex": "user_"}})
    if sample:
        print(f"\n6. SAMPLE REFERRAL DOCUMENT:")
        print(f"   referrer_id: '{sample.get('referrer_id')}'")
        print(f"   referred_id: '{sample.get('referred_id')}'")
        print(f"   level: {sample.get('level')}")
    
    # Step 7: Check for OLD accounts with different data structure
    print(f"\n7. CHECKING OLD vs NEW ACCOUNTS:")
    
    # Get oldest user
    oldest = await db.users.find_one({}, sort=[("created_at", 1)])
    newest = await db.users.find_one({}, sort=[("created_at", -1)])
    
    if oldest:
        print(f"   Oldest user: {oldest.get('email')} (user_id: {oldest.get('user_id')})")
        oldest_refs = await db.referrals.count_documents({"referrer_id": oldest.get('user_id')})
        print(f"   Oldest user referrals: {oldest_refs}")
    
    if newest:
        print(f"   Newest user: {newest.get('email')} (user_id: {newest.get('user_id')})")
        newest_refs = await db.referrals.count_documents({"referrer_id": newest.get('user_id')})
        print(f"   Newest user referrals: {newest_refs}")
    
    client.close()
    print(f"\n{'='*60}")

asyncio.run(test())
