#!/usr/bin/env python3
"""
Quick Code Generator - Run this to give 1 code to all users
Usage: python3 give_codes_now.py
"""

import asyncio
import random
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta

async def give_codes():
    print("Connecting to MongoDB...")
    client = AsyncIOMotorClient("mongodb://127.0.0.1:27017/")
    db = client["tgexchange"]
    
    print("Fetching users...")
    users = await db.users.find({}).to_list(None)  # No limit - ALL users
    print(f"Found {len(users)} users")
    
    now = datetime.now(timezone.utc)
    expires = now + timedelta(hours=2)
    
    count = 0
    for user in users:
        if user.get("role") == "admin":
            continue
        
        code = "".join(random.choices("abcdefghijklmnopqrstuvwxyz0123456789", k=12))
        
        # Determine time slot (morning or evening)
        if now.hour < 12:
            time_slot = f"morning_{now.strftime('%Y-%m-%d')}"
        else:
            time_slot = f"evening_{now.strftime('%Y-%m-%d')}"
        
        await db.trade_codes.insert_one({
            "code": code,
            "user_id": user["user_id"],
            "user_email": user.get("email", ""),
            "coin": "btc",
            "profit_percent": 62.5,
            "trade_type": "call",
            "fund_percent": 1.0,
            "status": "live",
            "auto_generated": True,
            "time_slot": time_slot,
            "created_at": now.isoformat(),
            "expires_at": expires.isoformat()
        })
        
        count += 1
        print(f"{count}. {user.get('email', user['user_id'][:8])} -> {code}")
    
    print(f"\n✅ DONE! {count} codes generated - 1 per user")
    client.close()

if __name__ == "__main__":
    asyncio.run(give_codes())
