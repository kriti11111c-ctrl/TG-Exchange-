#!/usr/bin/env python3
"""
Auto Trade Code Generator - Round-Robin Distribution
Generates unique trade codes for eligible users at scheduled times
Uses 20 coins in round-robin: BTC→ETH→...→APT→BTC→ETH→...
"""

import asyncio
import os
import random
import string
from datetime import datetime, timezone, timedelta
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

# Load .env
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                value = value.strip('"').strip("'")
                os.environ[key] = value

MONGO_URL = os.environ.get('MONGO_URL', '')
DB_NAME = os.environ.get('DB_NAME', 'tgx_exchange')

# Top 20 Coins for Round-Robin Distribution
TOP_20_COINS = [
    'BTC', 'ETH', 'BNB', 'XRP', 'SOL',
    'ADA', 'DOGE', 'AVAX', 'DOT', 'MATIC',
    'LINK', 'SHIB', 'TRX', 'LTC', 'ATOM',
    'UNI', 'XLM', 'BCH', 'NEAR', 'APT'
]

COIN_NAMES = {
    'BTC': 'Bitcoin', 'ETH': 'Ethereum', 'BNB': 'BNB', 'XRP': 'Ripple', 'SOL': 'Solana',
    'ADA': 'Cardano', 'DOGE': 'Dogecoin', 'AVAX': 'Avalanche', 'DOT': 'Polkadot', 'MATIC': 'Polygon',
    'LINK': 'Chainlink', 'SHIB': 'Shiba Inu', 'TRX': 'TRON', 'LTC': 'Litecoin', 'ATOM': 'Cosmos',
    'UNI': 'Uniswap', 'XLM': 'Stellar', 'BCH': 'Bitcoin Cash', 'NEAR': 'NEAR Protocol', 'APT': 'Aptos'
}

# Schedule times (IST)
MORNING_HOUR = 10
MORNING_MINUTE = 45
EVENING_HOUR = 20
EVENING_MINUTE = 30

async def get_eligible_users(db):
    """Get users with futures_balance >= $50"""
    eligible = []
    
    wallets = await db.wallets.find(
        {"futures_balance": {"$gte": 50}},
        {"_id": 0, "user_id": 1, "futures_balance": 1}
    ).to_list(length=100000)
    
    for wallet in wallets:
        user_id = wallet.get("user_id")
        if user_id:
            eligible.append({
                "user_id": user_id,
                "futures_balance": wallet.get("futures_balance", 0)
            })
    
    return eligible

async def generate_trade_codes(db, session_type="morning"):
    """Generate unique trade codes for all eligible users with round-robin coin distribution"""
    
    now = datetime.now(timezone.utc)
    print(f"\n[{now.isoformat()}] Starting {session_type} trade code generation...")
    
    # Get eligible users
    eligible_users = await get_eligible_users(db)
    
    if not eligible_users:
        print(f"No eligible users found (need $50+ futures balance)")
        return 0
    
    print(f"Found {len(eligible_users)} eligible users")
    
    # Generate codes with ROUND-ROBIN coin distribution
    codes_created = 0
    
    for user_index, user_data in enumerate(eligible_users):
        user_id = user_data["user_id"]
        
        # ROUND-ROBIN: Cycle through 20 coins
        coin_index = user_index % len(TOP_20_COINS)
        coin = TOP_20_COINS[coin_index]
        coin_name = COIN_NAMES[coin]
        
        # Generate unique code
        code = coin[:3].upper() + ''.join(random.choices(string.ascii_uppercase + string.digits, k=5))
        
        # Random profit between 60-65%
        profit_percent = round(60 + random.random() * 5, 2)
        
        # Trade type
        trade_type = random.choice(['call', 'put'])
        
        # Expiry: 2 hours from now
        expires_at = now + timedelta(hours=2)
        
        trade_code_doc = {
            "code": code,
            "coin": coin,
            "coin_name": coin_name,
            "trade_type": trade_type,
            "profit_percent": profit_percent,
            "fund_percent": 1.0,  # 1% of futures balance
            "status": "active",
            "is_global": False,
            "user_id": user_id,
            "max_uses": 1,
            "current_uses": 0,
            "min_amount": 10,
            "max_amount": 50000,
            "scheduled_start": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "created_at": now.isoformat(),
            "session_type": session_type,
            "created_by": "auto_scheduler"
        }
        
        try:
            await db.trade_codes.insert_one(trade_code_doc)
            codes_created += 1
            
            if codes_created <= 10 or codes_created % 50 == 0:
                print(f"  Created: {code} ({coin}) for user {user_id[:15]}...")
        except Exception as e:
            print(f"  Error creating code for {user_id}: {e}")
    
    print(f"\n[{datetime.now(timezone.utc).isoformat()}] Created {codes_created} trade codes")
    
    # Show distribution summary
    print(f"\nCoin Distribution:")
    for i, coin in enumerate(TOP_20_COINS):
        count = (len(eligible_users) // 20) + (1 if i < (len(eligible_users) % 20) else 0)
        if count > 0:
            print(f"  {coin}: {count} users")
    
    return codes_created

async def wait_for_next_schedule():
    """Wait until next scheduled time (10:45 AM or 8:30 PM IST)"""
    while True:
        now_utc = datetime.now(timezone.utc)
        # IST = UTC + 5:30
        ist_offset = timedelta(hours=5, minutes=30)
        now_ist = now_utc + ist_offset
        
        today = now_ist.date()
        
        # Morning: 10:45 AM IST
        morning_ist = datetime(today.year, today.month, today.day, MORNING_HOUR, MORNING_MINUTE)
        # Evening: 8:30 PM IST
        evening_ist = datetime(today.year, today.month, today.day, EVENING_HOUR, EVENING_MINUTE)
        
        # Convert back to UTC for comparison
        morning_utc = morning_ist - ist_offset
        evening_utc = evening_ist - ist_offset
        
        # Make timezone aware
        morning_utc = morning_utc.replace(tzinfo=timezone.utc)
        evening_utc = evening_utc.replace(tzinfo=timezone.utc)
        
        # Find next schedule
        if now_utc < morning_utc:
            next_time = morning_utc
            session_type = "morning"
        elif now_utc < evening_utc:
            next_time = evening_utc
            session_type = "evening"
        else:
            # Tomorrow morning
            tomorrow = today + timedelta(days=1)
            next_time = datetime(tomorrow.year, tomorrow.month, tomorrow.day, MORNING_HOUR, MORNING_MINUTE)
            next_time = (next_time - ist_offset).replace(tzinfo=timezone.utc)
            session_type = "morning"
        
        wait_seconds = (next_time - now_utc).total_seconds()
        
        print(f"\n[{now_utc.isoformat()}] Scheduler running...")
        print(f"  Next {session_type} session: {next_time.isoformat()}")
        print(f"  Waiting {wait_seconds/3600:.2f} hours")
        
        return wait_seconds, session_type

async def main():
    """Main scheduler loop"""
    print("=" * 60)
    print("AUTO TRADE CODE GENERATOR - ROUND-ROBIN DISTRIBUTION")
    print("=" * 60)
    print(f"Schedule: 10:45 AM IST (Morning) & 8:30 PM IST (Evening)")
    print(f"Coins: {len(TOP_20_COINS)} (BTC, ETH, BNB, ... APT)")
    print(f"Distribution: Round-Robin (1→20, 1→20, ...)")
    print("=" * 60)
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    while True:
        try:
            wait_seconds, session_type = await wait_for_next_schedule()
            
            # Wait until scheduled time (check every 30 seconds for precision)
            while wait_seconds > 0:
                sleep_time = min(30, wait_seconds)
                await asyncio.sleep(sleep_time)
                wait_seconds -= sleep_time
            
            # Generate codes
            await generate_trade_codes(db, session_type)
            
            # Wait 1 minute before checking schedule again
            await asyncio.sleep(60)
            
        except Exception as e:
            print(f"Error in scheduler: {e}")
            await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(main())
