#!/usr/bin/env python3
"""
FINAL FIX: Set ALL active codes to scheduled status
Only codes within their time window will show
Run: python3 final_fix_codes.py
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

print(f"📦 DB Name: {DB_NAME}")

async def final_fix():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n🔧 FINAL FIX: Resetting ALL trade codes...")
    
    # Step 1: Set ALL codes to scheduled (not active)
    result1 = await db.trade_codes.update_many(
        {"status": "active"},
        {"$set": {"status": "scheduled"}}
    )
    print(f"✅ Changed {result1.modified_count} codes from 'active' to 'scheduled'")
    
    # Step 2: Make sure NO codes are global
    result2 = await db.trade_codes.update_many(
        {"is_global": True},
        {"$set": {"is_global": False}}
    )
    print(f"✅ Removed global flag from {result2.modified_count} codes")
    
    # Step 3: Verify counts
    active_count = await db.trade_codes.count_documents({"status": "active"})
    scheduled_count = await db.trade_codes.count_documents({"status": "scheduled"})
    live_count = await db.trade_codes.count_documents({"status": "live"})
    global_count = await db.trade_codes.count_documents({"is_global": True})
    
    print(f"\n📊 Final Code Status:")
    print(f"   - Active codes: {active_count} (should be 0)")
    print(f"   - Scheduled codes: {scheduled_count}")
    print(f"   - Live codes: {live_count}")
    print(f"   - Global codes: {global_count} (should be 0)")
    
    if active_count == 0 and global_count == 0:
        print("\n✅ SUCCESS!")
        print("🔔 Bell icon will now show:")
        print("   - Codes ONLY during scheduled time window")
        print("   - Morning 10:45 AM IST = 1 code appears")
        print("   - Evening slot = 1 code appears")
        print("   - Other times = 'No active codes'")
    else:
        print(f"\n⚠️ Warning: {active_count} active, {global_count} global codes still exist")
    
    client.close()
    print("\n⚠️ Restart backend: pm2 restart tgx-backend")

if __name__ == "__main__":
    asyncio.run(final_fix())
