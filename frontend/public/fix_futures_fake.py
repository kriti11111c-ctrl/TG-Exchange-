#!/usr/bin/env python3
"""
Fix users who transferred fake $20 from Spot to Futures
Find users with real_futures_balance but no actual deposits
"""

import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/var/www/tgexchange/backend/.env')

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "tgexchange")

async def fix_futures_fake_bonus():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    now = datetime.now(timezone.utc)
    
    print(f"\n{'='*60}")
    print(f"FIX FAKE $20 IN FUTURES")
    print(f"Users who transferred fake bonus to Futures")
    print(f"{'='*60}")
    
    # Find users who claimed Bronze reward
    users_with_bronze = await db.users.find({
        "claimed_rank_rewards": 1
    }).to_list(length=1000000)
    
    print(f"Bronze claimers: {len(users_with_bronze)}")
    
    fixed_count = 0
    skipped_count = 0
    
    for user in users_with_bronze:
        user_id = user.get("user_id")
        
        wallet = await db.wallets.find_one({"user_id": user_id})
        if not wallet:
            continue
        
        real_futures = wallet.get("real_futures_balance", 0) or 0
        total_deposited = wallet.get("total_deposited", 0) or 0
        futures_balance = wallet.get("futures_balance", 0) or 0
        
        # If user has real_futures_balance but no deposits
        # They might have transferred fake $20 to futures
        if real_futures > 0 and total_deposited == 0:
            # Check how much to deduct (max $20)
            deduct = min(20, real_futures)
            
            new_real = real_futures - deduct
            new_futures = futures_balance - deduct
            
            await db.wallets.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "real_futures_balance": max(0, new_real),
                        "futures_balance": max(0, new_futures)
                    }
                }
            )
            
            await db.transactions.insert_one({
                "tx_id": f"fix_fut_{user_id[:8]}_{int(now.timestamp())}",
                "user_id": user_id,
                "type": "fake_futures_fix",
                "coin": "usdt",
                "amount": -deduct,
                "note": f"Deducted ${deduct} from Futures - fake bonus transfer",
                "status": "completed",
                "created_at": now.isoformat()
            })
            
            fixed_count += 1
            print(f"  [FIXED] {user_id}: real_futures ${real_futures:.2f} → ${new_real:.2f}")
        else:
            skipped_count += 1
    
    print(f"\n{'='*60}")
    print(f"DONE!")
    print(f"  Fixed: {fixed_count} users")
    print(f"  Skipped: {skipped_count} users")
    print(f"{'='*60}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_futures_fake_bonus())
