#!/usr/bin/env python3
"""
QUICK FIX - Make an existing active code GLOBAL
Run: python3 quick_fix.py
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

async def quick_fix():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n🔧 QUICK FIX: Making codes global...")
    
    now = datetime.now(timezone.utc)
    new_expiry = now + timedelta(hours=2)
    
    # Option 1: Update multiple active codes to be global
    result = await db.trade_codes.update_many(
        {"status": "active"},
        {
            "$set": {
                "is_global": True,
                "expires_at": new_expiry.isoformat(),
                "scheduled_start": now.isoformat()
            },
            "$unset": {"user_id": ""}  # Remove user_id to make truly global
        }
    )
    
    print(f"✅ Updated {result.modified_count} codes to be GLOBAL")
    
    # Verify
    global_codes = await db.trade_codes.find(
        {"is_global": True, "status": "active"},
        {"_id": 0, "code": 1, "is_global": 1, "expires_at": 1}
    ).to_list(10)
    
    print(f"\n📋 Global codes now available:")
    for code in global_codes[:5]:
        print(f"  - {code.get('code')} | is_global={code.get('is_global')} | expires={code.get('expires_at')}")
    
    if global_codes:
        print(f"\n🎉 SUCCESS! {len(global_codes)} global codes ready!")
        print(f"📋 Example code to use: {global_codes[0].get('code')}")
    
    client.close()
    print("\n✅ Now refresh browser and check Bell icon!")

if __name__ == "__main__":
    asyncio.run(quick_fix())
