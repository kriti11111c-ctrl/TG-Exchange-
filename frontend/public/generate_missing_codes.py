#!/usr/bin/env python3
"""
Trade Code Generator - NO LIMIT VERSION
Generates codes for ALL users (up to 10 Lakh / 1 Million)
"""

import asyncio
import random
import string
import os
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load .env file
load_dotenv('/var/www/tgexchange/backend/.env')

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "tgexchange")

if not MONGO_URL:
    print("[ERROR] MONGO_URL not found!")
    exit(1)

# TOP 20 COINS for round-robin
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

async def generate_missing_codes():
    """Generate codes for ALL users who don't have today's evening code"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    now = datetime.now(timezone.utc)
    today = now.date()
    
    # Evening slot config
    slot = "evening"
    slot_name = "8:30 PM IST"
    scheduled_hour = 15
    scheduled_minute = 0
    
    scheduled_start = datetime.combine(today, datetime.min.time().replace(
        hour=scheduled_hour, minute=scheduled_minute
    )).replace(tzinfo=timezone.utc)
    
    expires_at = scheduled_start + timedelta(hours=1)
    today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
    
    print(f"\n{'='*60}")
    print(f"TRADE CODE GENERATOR - NO LIMIT VERSION")
    print(f"Time: {now.isoformat()}")
    print(f"{'='*60}")
    
    # Get ALL users who already have today's evening code
    existing_codes = await db.trade_codes.find({
        "scheduled_slot": slot,
        "created_at": {"$gte": today_start.isoformat()}
    }, {"user_id": 1}).to_list(length=1000000)  # 10 Lakh limit
    
    users_with_codes = set(code.get("user_id") for code in existing_codes)
    print(f"Users already have code: {len(users_with_codes)}")
    
    # Get ALL wallets with futures balance > 0 (NO LIMIT - up to 10 Lakh)
    wallets = await db.wallets.find(
        {"futures_balance": {"$gt": 0}},
        {"user_id": 1, "futures_balance": 1}
    ).to_list(length=1000000)  # 10 Lakh limit
    
    print(f"Total wallets with balance: {len(wallets)}")
    
    # Filter users who don't have code yet
    missing_users = []
    for wallet in wallets:
        user_id = wallet.get("user_id")
        if user_id and user_id not in users_with_codes:
            missing_users.append(wallet)
    
    print(f"Users missing code: {len(missing_users)}")
    print(f"{'='*60}")
    
    if len(missing_users) == 0:
        print("All users already have codes!")
        client.close()
        return 0
    
    # Generate codes for missing users
    codes_generated = 0
    batch_size = 1000  # Insert in batches for better performance
    batch = []
    
    for i, wallet in enumerate(missing_users):
        user_id = wallet.get("user_id")
        futures_balance = wallet.get("futures_balance", 0)
        
        # Generate unique code
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
        
        # Random profit 60-65%
        profit_percent = round(60 + random.random() * 5, 2)
        
        # Round-robin coin
        coin_data = TOP_20_COINS[codes_generated % len(TOP_20_COINS)]
        
        # Random trade type
        trade_type = random.choice(["call", "put"])
        
        trade_code = {
            "code": code,
            "user_id": user_id,
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
            "status": "active",
            "created_at": now.isoformat(),
            "auto_generated": True
        }
        
        batch.append(trade_code)
        codes_generated += 1
        
        # Insert batch
        if len(batch) >= batch_size:
            await db.trade_codes.insert_many(batch)
            print(f"  Inserted batch: {codes_generated} codes...")
            batch = []
    
    # Insert remaining
    if batch:
        await db.trade_codes.insert_many(batch)
        print(f"  Inserted final batch: {codes_generated} codes...")
    
    print(f"\n{'='*60}")
    print(f"COMPLETE! Generated {codes_generated} codes")
    print(f"{'='*60}")
    
    client.close()
    return codes_generated

if __name__ == "__main__":
    asyncio.run(generate_missing_codes())
