#!/usr/bin/env python3
"""
Find user details by user_id
Run: python3 find_user.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
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

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'tgx_exchange')

USER_ID = "user_9b13d29a4416"

async def find_user():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"\n🔍 Finding user: {USER_ID}")
    
    user = await db.users.find_one({"user_id": USER_ID}, {"_id": 0})
    
    if user:
        print(f"\n✅ User Found!")
        print(f"   Name: {user.get('name', 'N/A')}")
        print(f"   Email: {user.get('email', 'N/A')}")
        print(f"   User ID: {user.get('user_id', 'N/A')}")
        print(f"   Referral Code: {user.get('referral_code', 'N/A')}")
        print(f"   Referred By: {user.get('referred_by', 'N/A')}")
        print(f"   Created: {user.get('created_at', 'N/A')}")
    else:
        print(f"\n❌ User not found!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(find_user())
