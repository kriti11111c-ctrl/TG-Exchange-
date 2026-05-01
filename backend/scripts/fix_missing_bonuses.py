#!/usr/bin/env python3
"""
Script to FIX missing 5% Direct Referral Bonuses
Run on VPS: cd /var/www/tgexchange/backend && python3 scripts/fix_missing_bonuses.py

⚠️ WARNING: This will credit REAL money to referrer wallets!
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid

MONGO_URL = "mongodb://127.0.0.1:27017"
DB_NAME = "tgexchange"
DIRECT_REFERRAL_BONUS_PERCENT = 0.05  # 5%

async def fix_missing_bonuses():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 60)
    print("🔧 FIXING MISSING 5% DIRECT REFERRAL BONUSES")
    print("=" * 60)
    
    # Get all credited deposits
    credited_deposits = await db.processed_deposits.find({
        "status": "credited"
    }, {"_id": 0, "user_id": 1, "amount": 1, "detected_at": 1}).to_list(100000)
    
    # Get all users with their referrers
    users = await db.users.find({
        "referred_by": {"$exists": True, "$ne": None}
    }, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "referred_by": 1}).to_list(100000)
    
    users_map = {u["user_id"]: u for u in users}
    
    # Get all existing bonus transactions
    existing_bonuses = await db.transactions.find({
        "type": {"$in": ["first_deposit_referral_bonus", "referral_bonus_fix"]}
    }, {"_id": 0, "from_user_id": 1}).to_list(100000)
    
    bonus_given_for = set(b.get("from_user_id") for b in existing_bonuses if b.get("from_user_id"))
    
    # Find first deposit for each user
    first_deposits = {}
    for dep in credited_deposits:
        uid = dep.get("user_id")
        if uid and uid not in first_deposits:
            first_deposits[uid] = dep
    
    # Find and fix missing bonuses
    fixed_count = 0
    total_fixed_amount = 0
    
    for user_id, deposit in first_deposits.items():
        user = users_map.get(user_id)
        if not user:
            continue
            
        referrer_id = user.get("referred_by")
        if not referrer_id:
            continue
        
        if user_id in bonus_given_for:
            continue
        
        # Calculate bonus
        amount = float(deposit.get("amount", 0))
        bonus_amount = round(amount * DIRECT_REFERRAL_BONUS_PERCENT, 2)
        
        if bonus_amount <= 0:
            continue
        
        # Credit to referrer's Futures wallet
        await db.wallets.update_one(
            {"user_id": referrer_id},
            {"$inc": {"futures_balance": bonus_amount}},
            upsert=True
        )
        
        # Record transaction
        await db.transactions.insert_one({
            "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
            "user_id": referrer_id,
            "from_user_id": user_id,
            "type": "referral_bonus_fix",
            "coin": "usdt",
            "amount": bonus_amount,
            "note": f"5% Direct Reward (Fixed) from {user.get('name', user_id[:8])}'s deposit of ${amount}",
            "status": "completed",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        fixed_count += 1
        total_fixed_amount += bonus_amount
        
        referrer = await db.users.find_one({"user_id": referrer_id}, {"_id": 0, "name": 1, "email": 1})
        print(f"✅ Fixed: ${bonus_amount} → {referrer.get('name', 'Unknown') if referrer else 'Unknown'} (from {user.get('name', 'Unknown')})")
    
    print("\n" + "=" * 60)
    print(f"🎉 FIXED {fixed_count} MISSING BONUSES")
    print(f"💰 TOTAL CREDITED: ${total_fixed_amount:.2f}")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    confirm = input("\n⚠️ This will credit REAL money to wallets. Type 'YES' to confirm: ")
    if confirm == "YES":
        asyncio.run(fix_missing_bonuses())
    else:
        print("❌ Cancelled.")
