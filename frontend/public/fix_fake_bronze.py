#!/usr/bin/env python3
"""
Fix Fake Bronze Rank Rewards
Find users who got Bronze rank reward ($20) but had no real deposit
Deduct $20 from their Spot balance
"""

import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv('/var/www/tgexchange/backend/.env')

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "tgexchange")

MIN_DEPOSIT_FOR_RANK = 50.0  # Minimum real deposit required for Bronze
BRONZE_REWARD = 20.0  # Bronze rank reward amount

async def fix_fake_bronze_rewards():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    now = datetime.now(timezone.utc)
    
    print(f"\n{'='*60}")
    print(f"FIX FAKE BRONZE RANK REWARDS")
    print(f"Finding users who got Bronze reward without real deposit")
    print(f"{'='*60}")
    
    # Find all Bronze rank reward transactions
    bronze_rewards = await db.transactions.find({
        "$or": [
            {"type": "rank_reward", "note": {"$regex": "Bronze|Level 1|Rank 1", "$options": "i"}},
            {"type": "levelup_reward"},
            {"type": "rank_levelup"},
            {"note": {"$regex": "Bronze.*reward|rank.*reward|Level 1.*reward", "$options": "i"}}
        ]
    }).to_list(length=1000000)
    
    print(f"Found {len(bronze_rewards)} rank reward transactions")
    
    # Get unique user IDs who received rank rewards
    reward_users = {}
    for reward in bronze_rewards:
        user_id = reward.get("user_id")
        if user_id:
            amount = abs(reward.get("amount", 0))
            if user_id not in reward_users:
                reward_users[user_id] = 0
            reward_users[user_id] += amount
    
    print(f"Unique users with rank rewards: {len(reward_users)}")
    
    # Also check users table for claimed_rank_rewards
    users_with_claimed = await db.users.find({
        "claimed_rank_rewards": {"$exists": True, "$ne": []}
    }).to_list(length=1000000)
    
    print(f"Users with claimed_rank_rewards field: {len(users_with_claimed)}")
    
    for user in users_with_claimed:
        user_id = user.get("user_id")
        claimed = user.get("claimed_rank_rewards", [])
        if user_id and 1 in claimed:  # Level 1 = Bronze
            if user_id not in reward_users:
                reward_users[user_id] = BRONZE_REWARD
    
    print(f"Total users to check: {len(reward_users)}")
    print(f"{'='*60}")
    
    fixed_count = 0
    skipped_real_deposit = 0
    skipped_no_balance = 0
    
    for user_id, reward_amount in reward_users.items():
        # Get wallet
        wallet = await db.wallets.find_one({"user_id": user_id})
        if not wallet:
            skipped_no_balance += 1
            continue
        
        # Check real_futures_balance
        real_balance = wallet.get("real_futures_balance")
        if real_balance is None:
            # Fallback calculation
            futures = wallet.get("futures_balance", 0) or 0
            welcome = wallet.get("welcome_bonus", 0) or 0
            real_balance = max(0, futures - welcome)
        
        # If user has real deposit >= $50, they legitimately earned Bronze
        if real_balance >= MIN_DEPOSIT_FOR_RANK:
            skipped_real_deposit += 1
            continue
        
        # User got Bronze reward without real deposit - DEDUCT
        spot_balance = wallet.get("balances", {}).get("usdt", 0)
        
        # Deduct $20 (or whatever they have)
        deduct_amount = min(BRONZE_REWARD, spot_balance)
        
        if deduct_amount <= 0:
            print(f"  [SKIP] {user_id}: No spot balance to deduct (real=${real_balance:.2f})")
            skipped_no_balance += 1
            continue
        
        new_spot = spot_balance - deduct_amount
        
        # Update wallet
        await db.wallets.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "balances.usdt": new_spot,
                    "updated_at": now.isoformat()
                }
            }
        )
        
        # Remove Bronze from claimed rewards
        await db.users.update_one(
            {"user_id": user_id},
            {
                "$pull": {"claimed_rank_rewards": 1},
                "$set": {"team_rank_level": 0}  # Reset rank to 0
            }
        )
        
        # Record fix transaction
        await db.transactions.insert_one({
            "tx_id": f"fix_bronze_{user_id[:8]}_{now.timestamp()}",
            "user_id": user_id,
            "type": "fake_rank_fix",
            "coin": "usdt",
            "amount": -deduct_amount,
            "note": f"Deducted ${deduct_amount} - Bronze reward was given without real deposit (real_balance=${real_balance:.2f})",
            "status": "completed",
            "created_at": now.isoformat()
        })
        
        fixed_count += 1
        print(f"  [FIXED] {user_id}: Spot ${spot_balance:.2f} → ${new_spot:.2f} (real_deposit=${real_balance:.2f})")
    
    print(f"\n{'='*60}")
    print(f"COMPLETE!")
    print(f"  Fixed (deducted $20): {fixed_count} users")
    print(f"  Skipped (has real deposit): {skipped_real_deposit} users")
    print(f"  Skipped (no balance): {skipped_no_balance} users")
    print(f"{'='*60}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_fake_bronze_rewards())
