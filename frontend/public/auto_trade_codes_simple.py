#!/usr/bin/env python3
"""
TG Exchange - Auto Trade Code Generator (Simple Version)
No APScheduler - Uses simple time-based loop

Schedule:
- 10:45 AM IST (05:15 UTC) - Morning
- 8:30 PM IST (15:00 UTC) - Evening
"""

import asyncio
import random
import string
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import MongoClient
import time

# ===== MONGODB CONFIG =====
MONGO_URL = "mongodb+srv://tgadmin:2026Bhaviya%40%23143@cluster0.bcj5slz.mongodb.net/tgexchange?retryWrites=true"
DB_NAME = "tgexchange"

async_client = None
async_db = None

def get_sync_db():
    client = MongoClient(MONGO_URL)
    return client[DB_NAME]

async def get_async_db():
    global async_client, async_db
    if async_client is None:
        async_client = AsyncIOMotorClient(MONGO_URL)
        async_db = async_client[DB_NAME]
    return async_db

async def generate_codes(slot):
    """Generate trade codes for all users"""
    try:
        db = await get_async_db()
        now = datetime.now(timezone.utc)
        today = now.date()
        
        if slot == "morning":
            h, m = 5, 15
            slot_name = "10:45 AM IST"
        else:
            h, m = 15, 0
            slot_name = "8:30 PM IST"
        
        scheduled_start = datetime.combine(today, datetime.min.time().replace(hour=h, minute=m)).replace(tzinfo=timezone.utc)
        expires_at = scheduled_start + timedelta(hours=1)
        
        users = await db.users.find({"is_active": {"$ne": False}}).to_list(length=None)
        
        print(f"\n{'='*50}")
        print(f"[{now.strftime('%H:%M:%S')} UTC] Generating {slot_name} codes")
        print(f"Users: {len(users)}")
        print(f"{'='*50}")
        
        generated = 0
        skipped = 0
        
        for user in users:
            user_id = user.get("user_id")
            email = user.get("email", "unknown")
            
            # Skip if already exists
            exists = await db.trade_codes.find_one({
                "user_id": user_id,
                "scheduled_start": scheduled_start.isoformat(),
                "status": {"$in": ["pending", "active", "scheduled"]}
            })
            if exists:
                skipped += 1
                continue
            
            # Get balance
            wallet = await db.wallets.find_one({"user_id": user_id})
            balance = wallet.get("futures_balance", 0) if wallet else 0
            if balance <= 0:
                skipped += 1
                continue
            
            # Generate code
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
            profit = round(60 + random.random() * 5, 2)
            
            # Martingale check
            last = await db.trade_codes.find_one({"user_id": user_id, "status": "completed"}, sort=[("created_at", -1)])
            mult = 2.0 if (last and last.get("result") == "loss") else 1.0
            
            amount = min(balance * mult, balance)
            
            COINS = [
                {"symbol": "btc", "name": "Bitcoin", "price": 69500},
                {"symbol": "eth", "name": "Ethereum", "price": 2100},
                {"symbol": "sol", "name": "Solana", "price": 88},
                {"symbol": "xrp", "name": "XRP", "price": 1.38},
                {"symbol": "bnb", "name": "BNB", "price": 625},
            ]
            coin = COINS[generated % len(COINS)]
            
            doc = {
                "code": code,
                "user_id": user_id,
                "user_email": email,
                "coin": coin["symbol"],
                "coin_name": coin["name"],
                "price": coin["price"],
                "trade_type": random.choice(["call", "put"]),
                "scheduled_slot": slot,
                "slot_name": slot_name,
                "scheduled_start": scheduled_start.isoformat(),
                "expires_at": expires_at.isoformat(),
                "profit_percent": profit,
                "fund_percent": mult,
                "trade_amount": amount,
                "potential_profit": amount * profit / 100,
                "multiplier": mult,
                "will_fail": False,
                "status": "active",
                "created_at": now.isoformat(),
                "auto_generated": True
            }
            
            await db.trade_codes.insert_one(doc)
            generated += 1
        
        print(f"Generated: {generated}, Skipped: {skipped}")
        print(f"{'='*50}\n")
        return generated
        
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return 0

def run_slot(slot):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(generate_codes(slot))
    finally:
        loop.close()

def main():
    print("="*50)
    print("TG Exchange - Auto Trade Code Service")
    print("="*50)
    print(f"Started: {datetime.now(timezone.utc).isoformat()}")
    print("Schedule (IST):")
    print("  Morning: 10:45 AM (05:15 UTC)")
    print("  Evening: 8:30 PM (15:00 UTC)")
    print("="*50)
    
    # Test DB
    try:
        db = get_sync_db()
        count = db.users.count_documents({})
        print(f"MongoDB OK - {count} users")
    except Exception as e:
        print(f"MongoDB ERROR: {e}")
        return
    
    last_morning = None
    last_evening = None
    
    print("\nService running...\n")
    
    while True:
        now = datetime.now(timezone.utc)
        today = now.date()
        
        # Morning: 05:15 UTC = 10:45 AM IST
        if now.hour == 5 and 15 <= now.minute <= 20:
            if last_morning != today:
                print(f"[{now.strftime('%H:%M')}] Running MORNING slot...")
                run_slot("morning")
                last_morning = today
        
        # Evening: 15:00 UTC = 8:30 PM IST
        if now.hour == 15 and 0 <= now.minute <= 5:
            if last_evening != today:
                print(f"[{now.strftime('%H:%M')}] Running EVENING slot...")
                run_slot("evening")
                last_evening = today
        
        # Heartbeat every 10 mins
        if now.minute % 10 == 0 and now.second < 30:
            print(f"[HEARTBEAT] {now.strftime('%H:%M')} UTC - Waiting...")
        
        time.sleep(30)  # Check every 30 seconds

if __name__ == "__main__":
    main()
