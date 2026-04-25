#!/usr/bin/env python3
"""
FIX: Reset Trade Code System - Proper Scheduled Codes
- Remove all global flags
- Only scheduled codes will appear at their specific times
Run: python3 fix_scheduled_codes.py
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

async def fix_scheduled_codes():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n🔧 FIXING TRADE CODE SYSTEM...")
    
    # Step 1: Remove is_global from ALL codes - make them user-specific again
    result1 = await db.trade_codes.update_many(
        {"is_global": True},
        {"$set": {"is_global": False}}
    )
    print(f"✅ Removed global flag from {result1.modified_count} codes")
    
    # Step 2: Set all active codes back to "scheduled" status (not active)
    # So they only appear at their scheduled time
    result2 = await db.trade_codes.update_many(
        {"status": "active", "scheduled_slot": {"$exists": True}},
        {"$set": {"status": "scheduled"}}
    )
    print(f"✅ Reset {result2.modified_count} codes to 'scheduled' status")
    
    # Step 3: Count codes by status
    active_count = await db.trade_codes.count_documents({"status": "active"})
    scheduled_count = await db.trade_codes.count_documents({"status": "scheduled"})
    global_count = await db.trade_codes.count_documents({"is_global": True})
    
    print(f"\n📊 Current Code Status:")
    print(f"   - Active codes: {active_count}")
    print(f"   - Scheduled codes: {scheduled_count}")
    print(f"   - Global codes: {global_count}")
    
    # Step 4: Show scheduled slots
    print(f"\n📅 Scheduled Slots System:")
    print(f"   - Morning: 10:45 AM IST - Code will appear automatically")
    print(f"   - Evening: As configured - Code will appear automatically")
    print(f"   - Codes become 'active' only during their time window")
    
    client.close()
    
    print("\n✅ DONE!")
    print("🔔 Bell icon will now show:")
    print("   - 0 codes (if no scheduled time active)")
    print("   - 1 code (when morning/evening slot is live)")
    print("\n⚠️ Restart backend: pm2 restart tgx-backend")

if __name__ == "__main__":
    asyncio.run(fix_scheduled_codes())
