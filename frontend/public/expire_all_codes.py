#!/usr/bin/env python3
"""
EXPIRE ALL OLD CODES - Only scheduled slot codes will work
Run: python3 expire_all_codes.py
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

async def expire_all_codes():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n🔧 EXPIRING ALL OLD TRADE CODES...")
    
    # Set expires_at to PAST for ALL codes (so they don't show as LIVE)
    past_time = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    
    # Step 1: Expire ALL codes that are not "used"
    result1 = await db.trade_codes.update_many(
        {"status": {"$nin": ["used", "expired"]}},
        {
            "$set": {
                "status": "expired",
                "expires_at": past_time
            }
        }
    )
    print(f"✅ Expired {result1.modified_count} codes")
    
    # Step 2: Verify counts
    active_count = await db.trade_codes.count_documents({"status": "active"})
    scheduled_count = await db.trade_codes.count_documents({"status": "scheduled"})
    live_count = await db.trade_codes.count_documents({"status": "live"})
    expired_count = await db.trade_codes.count_documents({"status": "expired"})
    used_count = await db.trade_codes.count_documents({"status": "used"})
    
    print(f"\n📊 Final Code Status:")
    print(f"   - Active: {active_count}")
    print(f"   - Scheduled: {scheduled_count}")
    print(f"   - Live: {live_count}")
    print(f"   - Expired: {expired_count}")
    print(f"   - Used: {used_count}")
    
    print("\n✅ ALL OLD CODES EXPIRED!")
    print("🔔 Bell icon will now show: 'No active codes'")
    print("📅 New codes will auto-generate at scheduled times:")
    print("   - Morning: 10:45 AM IST")
    print("   - Evening: As configured")
    
    client.close()
    print("\n⚠️ Run: pm2 restart tgx-backend")

if __name__ == "__main__":
    asyncio.run(expire_all_codes())
