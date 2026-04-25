#!/usr/bin/env python3
"""
DEBUG API - Test trade-codes endpoint directly
Run: python3 debug_api.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
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
    print(f"✅ Loaded .env")

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'tgx_exchange')

async def debug_api():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n" + "=" * 60)
    print("🔍 DEBUG: Simulating /api/user/trade-codes query")
    print("=" * 60)
    
    # This is the EXACT query the API uses
    query = {
        "$or": [
            {"user_id": {"$exists": False}},  # Global codes without user_id
            {"is_global": True}  # Explicitly marked global codes
        ],
        "status": {"$in": ["active", "scheduled", "live", "used", "expired"]}
    }
    
    print(f"\n📋 Query: {query}")
    
    codes = await db.trade_codes.find(query, {"_id": 0}).sort("created_at", -1).to_list(20)
    
    print(f"\n📊 Found {len(codes)} codes matching query:")
    
    for i, code in enumerate(codes, 1):
        print(f"\n  [{i}] Code: {code.get('code')}")
        print(f"      Status: {code.get('status')}")
        print(f"      is_global: {code.get('is_global')}")
        print(f"      user_id: {code.get('user_id', 'NOT SET')}")
        print(f"      expires_at: {code.get('expires_at')}")
    
    # Also check ALL codes in collection
    print("\n" + "=" * 60)
    print("📦 ALL codes in trade_codes collection:")
    print("=" * 60)
    
    all_codes = await db.trade_codes.find({}, {"_id": 0, "code": 1, "status": 1, "is_global": 1, "user_id": 1}).to_list(50)
    for code in all_codes:
        print(f"  - {code.get('code')} | status={code.get('status')} | is_global={code.get('is_global')} | user_id={code.get('user_id', 'NONE')}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(debug_api())
