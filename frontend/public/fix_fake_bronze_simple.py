#!/usr/bin/env python3
"""
Simple Fix - Deduct $20 from users who got fake Bronze reward
Only deduct from users whose real_futures_balance < $50
"""

import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/var/www/tgexchange/backend/.env')

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "tgexchange")

async def fix_fake_rewards():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    now = datetime.now(timezone.utc)
    
    print(f"\n{'='*60}")
    print(f"DEDUCT $20 FROM FAKE BRONZE USERS")
    print(f"{'='*60}")
    
    # Find users who claimed Bronze reward (Level 1)
    users_with_bronze = await db.users.find({
        "claimed_rank_rewards": 1  # Level 1 = Bronze
    }).to_list(length=1000000)
    
    print(f"Users who claimed Bronze reward: {len(users_with_bronze)}")
    
    fixed_count = 0
    skipped_real = 0
    skipped_no_spot = 0
    
    for user in users_with_bronze:
        user_id = user.get("user_id")
        
        # Get wallet
        wallet = await db.wallets.find_one({"user_id": user_id})
        if not wallet:
            continue
        
        # Check real_futures_balance
        real_balance = wallet.get("real_futures_balance", 0) or 0
        
        # If real balance >= $50, they legitimately earned Bronze - SKIP
        if real_balance >= 50:
            skipped_real += 1
            continue
        
        # Fake Bronze - Deduct $20 from Spot
        spot_balance = wallet.get("balances", {}).get("usdt", 0)
        
        if spot_balance < 20:
            print(f"  [SKIP] {user_id}: Spot=${spot_balance:.2f} (not enough)")
            skipped_no_spot += 1
            continue
        
        new_spot = spot_balance - 20
        
        await db.wallets.update_one(
            {"user_id": user_id},
            {"$set": {"balances.usdt": new_spot}}
        )
        
        # Record transaction
        await db.transactions.insert_one({
            "tx_id": f"fix_{user_id[:8]}_{int(now.timestamp())}",
            "user_id": user_id,
            "type": "fake_bronze_fix",
            "coin": "usdt",
            "amount": -20,
            "note": "Deducted $20 - Fake Bronze reward (no real deposit)",
            "status": "completed",
            "created_at": now.isoformat()
        })
        
        fixed_count += 1
        print(f"  [FIXED] {user_id}: Spot ${spot_balance:.2f} → ${new_spot:.2f}")
    
    print(f"\n{'='*60}")
    print(f"DONE!")
    print(f"  Deducted $20: {fixed_count} users")
    print(f"  Skipped (real deposit): {skipped_real} users")
    print(f"  Skipped (no spot balance): {skipped_no_spot} users")
    print(f"{'='*60}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_fake_rewards())
