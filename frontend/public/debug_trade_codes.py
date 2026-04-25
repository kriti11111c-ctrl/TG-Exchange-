#!/usr/bin/env python3
"""
DEBUG SCRIPT - Check Trade Codes in MongoDB
Run: python3 debug_trade_codes.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'YOUR_MONGO_URL_HERE')
DB_NAME = os.environ.get('DB_NAME', 'tgx_exchange')

async def debug_trade_codes():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 60)
    print("🔍 TRADE CODES DEBUG")
    print("=" * 60)
    
    # Get ALL trade codes
    all_codes = await db.trade_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(20)
    
    print(f"\n📊 Total codes found: {len(all_codes)}")
    
    now = datetime.now(timezone.utc)
    print(f"⏰ Current UTC time: {now.isoformat()}")
    
    for i, code in enumerate(all_codes, 1):
        print(f"\n--- Code #{i} ---")
        print(f"  Code: {code.get('code', 'N/A')}")
        print(f"  Status: {code.get('status', 'N/A')}")
        print(f"  is_global: {code.get('is_global', False)}")
        print(f"  user_id: {code.get('user_id', 'NONE (Global)')}")
        print(f"  expires_at: {code.get('expires_at', 'N/A')}")
        print(f"  created_at: {code.get('created_at', 'N/A')}")
        print(f"  coin: {code.get('coin', 'N/A')}")
        print(f"  profit_percent: {code.get('profit_percent', 'N/A')}")
        
        # Check if expired
        expires_at = code.get('expires_at')
        if expires_at:
            try:
                if isinstance(expires_at, str):
                    exp_dt = datetime.fromisoformat(expires_at.replace('Z', '+00:00'))
                else:
                    exp_dt = expires_at
                    if exp_dt.tzinfo is None:
                        exp_dt = exp_dt.replace(tzinfo=timezone.utc)
                
                if now > exp_dt:
                    print(f"  ⚠️ EXPIRED!")
                else:
                    remaining = (exp_dt - now).total_seconds()
                    print(f"  ✅ VALID - {remaining/60:.1f} mins remaining")
            except Exception as e:
                print(f"  ❌ Error parsing expires_at: {e}")
    
    # Check global codes specifically
    print("\n" + "=" * 60)
    print("🌐 GLOBAL CODES QUERY TEST")
    print("=" * 60)
    
    global_codes = await db.trade_codes.find({
        "$or": [
            {"user_id": {"$exists": False}},
            {"is_global": True}
        ],
        "status": {"$in": ["active", "scheduled", "live"]}
    }, {"_id": 0}).to_list(10)
    
    print(f"Global codes matching query: {len(global_codes)}")
    for code in global_codes:
        print(f"  - {code.get('code')} | Status: {code.get('status')} | Expires: {code.get('expires_at')}")
    
    client.close()
    print("\n✅ Debug complete!")

if __name__ == "__main__":
    asyncio.run(debug_trade_codes())
