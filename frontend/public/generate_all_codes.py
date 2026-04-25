#!/usr/bin/env python3
"""
Manual Trade Code Generator - Sabhi users ke liye UNIQUE codes
Ye script .env file se MONGO_URL automatically read karega
"""

import asyncio
import random
import string
import os
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load .env file from same directory
load_dotenv('/var/www/tgexchange/backend/.env')

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "tgexchange")

if not MONGO_URL:
    print("[ERROR] MONGO_URL not found in .env file!")
    exit(1)

print(f"[INFO] Connecting to MongoDB...")
print(f"[INFO] Database: {DB_NAME}")

async def generate_codes_for_all():
    """Sabhi active users ke liye unique codes generate karo"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    now = datetime.now(timezone.utc)
    today = now.date()
    
    # Evening slot - 15:00 UTC / 8:30 PM IST
    scheduled_hour = 15
    scheduled_minute = 0
    slot_name = "8:30 PM IST"
    slot = "evening"
    
    # Create scheduled start time
    scheduled_start = datetime.combine(today, datetime.min.time().replace(
        hour=scheduled_hour, 
        minute=scheduled_minute
    )).replace(tzinfo=timezone.utc)
    
    # Code expires 1 hour after scheduled start
    expires_at = scheduled_start + timedelta(hours=1)
    
    # Get all active users
    users = await db.users.find({
        "is_active": {"$ne": False}
    }).to_list(length=None)
    
    print(f"\n{'='*60}")
    print(f"[{now.isoformat()}] MANUAL CODE GENERATION")
    print(f"Slot: {slot_name} | Found {len(users)} users")
    print(f"{'='*60}")
    
    # TOP 20 COINS - Round Robin distribution
    TOP_20_COINS = [
        {"symbol": "btc", "name": "Bitcoin", "price": 69500},
        {"symbol": "eth", "name": "Ethereum", "price": 2100},
        {"symbol": "bnb", "name": "BNB", "price": 625},
        {"symbol": "sol", "name": "Solana", "price": 88},
        {"symbol": "xrp", "name": "XRP", "price": 1.38},
        {"symbol": "doge", "name": "Dogecoin", "price": 0.092},
        {"symbol": "ada", "name": "Cardano", "price": 0.26},
        {"symbol": "avax", "name": "Avalanche", "price": 9.85},
        {"symbol": "shib", "name": "Shiba Inu", "price": 0.0000085},
        {"symbol": "dot", "name": "Polkadot", "price": 1.33},
        {"symbol": "link", "name": "Chainlink", "price": 13.5},
        {"symbol": "trx", "name": "TRON", "price": 0.124},
        {"symbol": "matic", "name": "Polygon", "price": 0.22},
        {"symbol": "uni", "name": "Uniswap", "price": 6.15},
        {"symbol": "ltc", "name": "Litecoin", "price": 68.5},
        {"symbol": "atom", "name": "Cosmos", "price": 4.50},
        {"symbol": "xlm", "name": "Stellar", "price": 0.092},
        {"symbol": "near", "name": "NEAR Protocol", "price": 2.45},
        {"symbol": "apt", "name": "Aptos", "price": 5.25},
        {"symbol": "fil", "name": "Filecoin", "price": 2.80},
    ]
    
    codes_generated = 0
    codes_skipped = 0
    
    for user in users:
        user_id = user.get("user_id")
        email = user.get("email", "unknown")
        
        # Get wallet
        wallet = await db.wallets.find_one({"user_id": user_id})
        futures_balance = wallet.get("futures_balance", 0) if wallet else 0
        
        # Skip users with no futures balance
        if futures_balance <= 0:
            print(f"  [SKIP] {email}: No futures balance")
            codes_skipped += 1
            continue
        
        # Check if already has code today for this slot
        today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
        existing = await db.trade_codes.find_one({
            "user_id": user_id,
            "scheduled_slot": slot,
            "created_at": {"$gte": today_start.isoformat()}
        })
        
        if existing:
            print(f"  [SKIP] {email}: Already has code for today's {slot} slot")
            codes_skipped += 1
            continue
        
        # Generate UNIQUE 12-char code
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
        
        # Random profit 60-65%
        profit_percent = round(60 + random.random() * 5, 2)
        
        # Round-robin coin assignment (different coin for each user)
        coin_data = TOP_20_COINS[codes_generated % len(TOP_20_COINS)]
        
        # Random trade type
        trade_type = random.choice(["call", "put"])
        
        # Trade amount = 1% of futures balance
        trade_amount = futures_balance * 0.01
        potential_profit = trade_amount * (profit_percent / 100)
        
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
            "fund_percent": 1.0,
            "trade_amount": trade_amount,
            "potential_profit": potential_profit,
            "status": "active",
            "created_at": now.isoformat(),
            "auto_generated": True
        }
        
        await db.trade_codes.insert_one(trade_code)
        codes_generated += 1
        print(f"  [+] {email}")
        print(f"      Code: {code}")
        print(f"      Coin: {coin_data['name']} ({coin_data['symbol'].upper()})")
        print(f"      Profit: {profit_percent}% | Balance: ${futures_balance:.2f}")
        print()
    
    print(f"{'='*60}")
    print(f"RESULT: Generated {codes_generated} codes, Skipped {codes_skipped}")
    print(f"Expires at: {expires_at.isoformat()} UTC")
    print(f"{'='*60}")
    
    client.close()
    return codes_generated

if __name__ == "__main__":
    asyncio.run(generate_codes_for_all())
