#!/usr/bin/env python3
"""
TG Exchange - Auto Trade Code Generator for VPS
Generates trade codes at:
- 10:45 AM IST (05:15 UTC) - Morning
- 8:30 PM IST (15:00 UTC) - Evening

IMPORTANT: Update MONGO_URL below with your actual MongoDB connection string
"""

import asyncio
import random
import string
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import pytz
import time

# ===== CONFIGURATION - UPDATE THIS! =====
MONGO_URL = "mongodb+srv://tgadmin:2026Bhaviya%40%23143@cluster0.bcj5slz.mongodb.net/tgexchange?retryWrites=true"
DB_NAME = "tgexchange"
# =========================================

client = None
db = None

def get_sync_db():
    """Get synchronous MongoDB connection for PM2"""
    from pymongo import MongoClient
    sync_client = MongoClient(MONGO_URL)
    return sync_client[DB_NAME]

async def get_database():
    global client, db
    if client is None:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
    return db

async def generate_codes_for_all_users(slot: str):
    """Generate trade codes for all eligible users"""
    try:
        db = await get_database()
        now = datetime.now(timezone.utc)
        today = now.date()
        
        if slot == "morning":
            scheduled_hour = 5
            scheduled_minute = 15
            slot_name = "10:45 AM IST"
        else:
            scheduled_hour = 15
            scheduled_minute = 0
            slot_name = "8:30 PM IST"
        
        scheduled_start = datetime.combine(today, datetime.min.time().replace(
            hour=scheduled_hour, minute=scheduled_minute
        )).replace(tzinfo=timezone.utc)
        
        expires_at = scheduled_start + timedelta(hours=1)
        
        # Get all active users
        users = await db.users.find({"is_active": {"$ne": False}}).to_list(length=None)
        
        print(f"\n{'='*60}")
        print(f"[{now.isoformat()}] Generating {slot_name} trade codes for {len(users)} users")
        print(f"{'='*60}")
        
        codes_generated = 0
        codes_skipped = 0
        
        for user in users:
            user_id = user.get("user_id")
            email = user.get("email", "unknown")
            
            # Skip if code already exists for this slot today
            existing = await db.trade_codes.find_one({
                "user_id": user_id,
                "scheduled_start": scheduled_start.isoformat(),
                "status": {"$in": ["pending", "active", "scheduled"]}
            })
            
            if existing:
                codes_skipped += 1
                continue
            
            # Get wallet balance
            wallet = await db.wallets.find_one({"user_id": user_id})
            futures_balance = wallet.get("futures_balance", 0) if wallet else 0
            
            if futures_balance <= 0:
                codes_skipped += 1
                continue
            
            # Generate code
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
            profit_percent = round(60 + random.random() * 5, 2)
            
            # Check martingale
            last_trade = await db.trade_codes.find_one(
                {"user_id": user_id, "status": "completed"},
                sort=[("created_at", -1)]
            )
            multiplier = 2.0 if (last_trade and last_trade.get("result") == "loss") else 1.0
            
            trade_amount = min(futures_balance * multiplier, futures_balance)
            potential_profit = trade_amount * (profit_percent / 100)
            
            # Coins list
            COINS = [
                {"symbol": "btc", "name": "Bitcoin", "price": 69500},
                {"symbol": "eth", "name": "Ethereum", "price": 2100},
                {"symbol": "bnb", "name": "BNB", "price": 625},
                {"symbol": "sol", "name": "Solana", "price": 88},
                {"symbol": "xrp", "name": "XRP", "price": 1.38},
                {"symbol": "doge", "name": "Dogecoin", "price": 0.092},
                {"symbol": "ada", "name": "Cardano", "price": 0.26},
                {"symbol": "avax", "name": "Avalanche", "price": 9.85},
                {"symbol": "link", "name": "Chainlink", "price": 13.5},
                {"symbol": "matic", "name": "Polygon", "price": 0.22},
            ]
            
            coin_data = COINS[codes_generated % len(COINS)]
            trade_type = random.choice(["call", "put"])
            
            trade_code = {
                "code": code,
                "user_id": user_id,
                "user_email": email,
                "coin": coin_data["symbol"],
                "coin_name": coin_data["name"],
                "price": coin_data["price"],
                "trade_type": trade_type,
                "scheduled_slot": slot,
                "slot_name": slot_name,
                "scheduled_start": scheduled_start.isoformat(),
                "expires_at": expires_at.isoformat(),
                "profit_percent": profit_percent,
                "fund_percent": 1.0 * multiplier,
                "trade_amount": trade_amount,
                "potential_profit": potential_profit,
                "multiplier": multiplier,
                "will_fail": False,
                "status": "active",
                "created_at": now.isoformat(),
                "auto_generated": True
            }
            
            await db.trade_codes.insert_one(trade_code)
            codes_generated += 1
            
            if codes_generated <= 10:  # Log first 10 only
                print(f"  [+] {email}: {code}")
        
        print(f"\n[{datetime.now(timezone.utc).isoformat()}] Generated: {codes_generated}, Skipped: {codes_skipped}")
        print(f"{'='*60}\n")
        
        return codes_generated
        
    except Exception as e:
        print(f"[ERROR] {str(e)}")
        import traceback
        traceback.print_exc()
        return 0

def run_morning():
    """Morning slot - 10:45 AM IST"""
    print(f"\n[{datetime.now(timezone.utc).isoformat()}] TRIGGER: MORNING")
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(generate_codes_for_all_users("morning"))
    finally:
        loop.close()

def run_evening():
    """Evening slot - 8:30 PM IST"""
    print(f"\n[{datetime.now(timezone.utc).isoformat()}] TRIGGER: EVENING")
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(generate_codes_for_all_users("evening"))
    finally:
        loop.close()

def main():
    print("="*60)
    print("TG Exchange - Auto Trade Code Generator")
    print("="*60)
    print(f"Started: {datetime.now(timezone.utc).isoformat()} UTC")
    print(f"MongoDB: Connected to {DB_NAME}")
    print("")
    print("Schedule (IST):")
    print("  - Morning: 10:45 AM IST (05:15 UTC)")
    print("  - Evening: 8:30 PM IST (15:00 UTC)")
    print("="*60)
    
    # Test MongoDB connection
    try:
        sync_db = get_sync_db()
        user_count = sync_db.users.count_documents({})
        print(f"\nMongoDB Test: Found {user_count} users")
    except Exception as e:
        print(f"\n[ERROR] MongoDB connection failed: {e}")
        return
    
    # Create scheduler
    scheduler = BackgroundScheduler(timezone=pytz.UTC)
    
    # Morning: 05:15 UTC = 10:45 AM IST
    scheduler.add_job(run_morning, CronTrigger(hour=5, minute=15, timezone=pytz.UTC),
                      id='morning', name='Morning 10:45 AM IST')
    
    # Evening: 15:00 UTC = 8:30 PM IST
    scheduler.add_job(run_evening, CronTrigger(hour=15, minute=0, timezone=pytz.UTC),
                      id='evening', name='Evening 8:30 PM IST')
    
    scheduler.start()
    
    print("\nScheduler running. Next jobs:")
    for job in scheduler.get_jobs():
        print(f"  - {job.name}: {job.next_run_time}")
    
    # Check if within window to run immediately
    now = datetime.now(timezone.utc)
    if now.hour == 5 and 10 <= now.minute <= 20:
        print("\n[INFO] Within morning window - running now...")
        run_morning()
    elif now.hour == 15 and 0 <= now.minute <= 5:
        print("\n[INFO] Within evening window - running now...")
        run_evening()
    
    print(f"\nService running... Press Ctrl+C to stop.")
    
    try:
        while True:
            time.sleep(300)  # Heartbeat every 5 minutes
            print(f"[HEARTBEAT] {datetime.now(timezone.utc).isoformat()} UTC - Active")
    except KeyboardInterrupt:
        print("\nShutting down...")
        scheduler.shutdown()

if __name__ == "__main__":
    main()
