#!/usr/bin/env python3
"""
FIX: Reset all codes to user-specific, keep only 1 global
Run: python3 fix_global_codes.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
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

print(f"📦 DB Name: {DB_NAME}")

async def fix_global_codes():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n🔧 FIXING: Resetting global codes...")
    
    # Step 1: Remove is_global from ALL codes
    result1 = await db.trade_codes.update_many(
        {},
        {"$set": {"is_global": False}}
    )
    print(f"✅ Reset {result1.modified_count} codes to is_global=False")
    
    # Step 2: Find the LATEST active code and make ONLY that one global
    latest_code = await db.trade_codes.find_one(
        {"status": "active"},
        sort=[("created_at", -1)]
    )
    
    if latest_code:
        now = datetime.now(timezone.utc)
        new_expiry = now + timedelta(hours=2)
        
        await db.trade_codes.update_one(
            {"code": latest_code["code"]},
            {
                "$set": {
                    "is_global": True,
                    "scheduled_start": now.isoformat(),
                    "expires_at": new_expiry.isoformat()
                },
                "$unset": {"user_id": ""}
            }
        )
        print(f"✅ Made ONLY 1 code global: {latest_code['code']}")
    
    # Step 3: Count global codes to verify
    global_count = await db.trade_codes.count_documents({"is_global": True})
    print(f"\n📊 Total Global Codes Now: {global_count}")
    
    if global_count == 1:
        print("✅ SUCCESS! Only 1 global code exists now!")
    else:
        print(f"⚠️ Warning: {global_count} global codes found")
    
    client.close()
    print("\n🎉 DONE! Now only 1 code will show in Bell icon!")

if __name__ == "__main__":
    asyncio.run(fix_global_codes())
