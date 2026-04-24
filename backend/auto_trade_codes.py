#!/usr/bin/env python3
"""
Automatic Trade Code Generation Service
Generates trade codes for all eligible users at scheduled times:
- 10:45 AM IST (05:15 UTC) - Morning slot
- 8:30 PM IST (15:00 UTC) - Evening slot
"""

import asyncio
import random
import string
import os
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import schedule
import time

# MongoDB connection
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "tgexchange")

client = None
db = None

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
        
        # Determine scheduled time based on slot
        if slot == "morning":
            scheduled_hour = 5
            scheduled_minute = 15
            slot_name = "10:45 AM IST"
        else:  # evening
            scheduled_hour = 15
            scheduled_minute = 0
            slot_name = "8:30 PM IST"
        
        # Create scheduled start time
        scheduled_start = datetime.combine(today, datetime.min.time().replace(
            hour=scheduled_hour, 
            minute=scheduled_minute
        )).replace(tzinfo=timezone.utc)
        
        # Code expires 1 hour after scheduled start
        expires_at = scheduled_start + timedelta(hours=1)
        
        # Get all active users with futures balance > 0
        users = await db.users.find({
            "is_active": {"$ne": False}
        }).to_list(length=None)
        
        print(f"\n{'='*60}")
        print(f"[{now.isoformat()}] Generating {slot_name} trade codes for {len(users)} users")
        print(f"{'='*60}")
        
        codes_generated = 0
        codes_skipped = 0
        
        for user in users:
            user_id = user.get("user_id")
            email = user.get("email", "unknown")
            
            # Check if user already has an active code for this slot today
            existing_code = await db.trade_codes.find_one({
                "user_id": user_id,
                "scheduled_start": scheduled_start,
                "status": {"$in": ["pending", "active"]}
            })
            
            if existing_code:
                codes_skipped += 1
                continue
            
            # Get user's wallet for futures balance
            wallet = await db.wallets.find_one({"user_id": user_id})
            futures_balance = wallet.get("futures_balance", 0) if wallet else 0
            
            # Only generate codes for users with futures balance
            if futures_balance <= 0:
                codes_skipped += 1
                continue
            
            # Generate unique code
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
            
            # Generate random profit percentage between 60-65%
            profit_percent = round(60 + random.random() * 5, 2)
            
            # Check user's last trade for Martingale multiplier
            last_trade = await db.trade_codes.find_one(
                {"user_id": user_id, "status": "completed"},
                sort=[("created_at", -1)]
            )
            
            multiplier = 1.0
            if last_trade and last_trade.get("result") == "loss":
                multiplier = 2.0
            
            # Calculate trade amount (user's futures balance * multiplier, capped)
            trade_amount = min(futures_balance * multiplier, futures_balance)
            potential_profit = trade_amount * (profit_percent / 100)
            
            # Create trade code
            trade_code = {
                "code": code,
                "user_id": user_id,
                "user_email": email,
                "scheduled_slot": slot,
                "scheduled_start": scheduled_start,
                "expires_at": expires_at,
                "profit_percent": profit_percent,
                "trade_amount": trade_amount,
                "potential_profit": potential_profit,
                "multiplier": multiplier,
                "status": "pending",  # Will become "active" at scheduled time
                "created_at": now,
                "auto_generated": True
            }
            
            await db.trade_codes.insert_one(trade_code)
            codes_generated += 1
        
        print(f"[{datetime.now(timezone.utc).isoformat()}] Generated: {codes_generated}, Skipped: {codes_skipped}")
        print(f"{'='*60}\n")
        
        return codes_generated
        
    except Exception as e:
        print(f"[ERROR] Failed to generate trade codes: {str(e)}")
        import traceback
        traceback.print_exc()
        return 0

def run_morning_generation():
    """Run morning trade code generation (05:15 UTC / 10:45 AM IST)"""
    print(f"\n[{datetime.now(timezone.utc).isoformat()}] Starting MORNING trade code generation...")
    asyncio.get_event_loop().run_until_complete(generate_codes_for_all_users("morning"))

def run_evening_generation():
    """Run evening trade code generation (15:00 UTC / 8:30 PM IST)"""
    print(f"\n[{datetime.now(timezone.utc).isoformat()}] Starting EVENING trade code generation...")
    asyncio.get_event_loop().run_until_complete(generate_codes_for_all_users("evening"))

def main():
    print("="*60)
    print("TG Exchange - Automatic Trade Code Generation Service")
    print("="*60)
    print(f"Started at: {datetime.now(timezone.utc).isoformat()} UTC")
    print("")
    print("Scheduled times (IST):")
    print("  - Morning: 10:45 AM IST (05:15 UTC)")
    print("  - Evening: 8:30 PM IST (15:00 UTC)")
    print("="*60)
    
    # Schedule morning generation at 05:15 UTC
    schedule.every().day.at("05:15").do(run_morning_generation)
    
    # Schedule evening generation at 15:00 UTC
    schedule.every().day.at("15:00").do(run_evening_generation)
    
    # Also run immediately if within 5 minutes of scheduled time
    now = datetime.now(timezone.utc)
    current_time = now.strftime("%H:%M")
    
    # Check if we should run immediately (within 5 min window)
    if "05:10" <= current_time <= "05:20":
        print("\n[INFO] Within morning window - generating codes now...")
        run_morning_generation()
    elif "14:55" <= current_time <= "15:05":
        print("\n[INFO] Within evening window - generating codes now...")
        run_evening_generation()
    
    print(f"\n[{datetime.now(timezone.utc).isoformat()}] Scheduler running... Press Ctrl+C to stop.")
    
    while True:
        schedule.run_pending()
        time.sleep(30)  # Check every 30 seconds

if __name__ == "__main__":
    main()
