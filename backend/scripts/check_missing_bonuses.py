#!/usr/bin/env python3
"""
Script to find missing 5% Direct Referral Bonuses
Run on VPS: cd /var/www/tgexchange/backend && python3 scripts/check_missing_bonuses.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone

MONGO_URL = "mongodb://127.0.0.1:27017"
DB_NAME = "tgexchange"
DIRECT_REFERRAL_BONUS_PERCENT = 0.05  # 5%

async def check_missing_bonuses():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 60)
    print("🔍 CHECKING MISSING 5% DIRECT REFERRAL BONUSES")
    print("=" * 60)
    
    # Get all credited deposits
    credited_deposits = await db.processed_deposits.find({
        "status": "credited"
    }, {"_id": 0, "user_id": 1, "amount": 1, "detected_at": 1, "tx_hash": 1}).to_list(100000)
    
    print(f"\n📊 Total credited deposits: {len(credited_deposits)}")
    
    # Get all users with their referrers
    users = await db.users.find({
        "referred_by": {"$exists": True, "$ne": None}
    }, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "referred_by": 1}).to_list(100000)
    
    users_map = {u["user_id"]: u for u in users}
    print(f"👥 Users with referrers: {len(users)}")
    
    # Get all existing bonus transactions
    existing_bonuses = await db.transactions.find({
        "type": {"$in": ["first_deposit_referral_bonus", "referral_bonus_fix"]}
    }, {"_id": 0, "from_user_id": 1, "user_id": 1, "amount": 1}).to_list(100000)
    
    # Create set of users who already got bonus given
    bonus_given_for = set(b.get("from_user_id") for b in existing_bonuses if b.get("from_user_id"))
    print(f"✅ Bonuses already given for: {len(bonus_given_for)} users")
    
    # Find first deposit for each user
    first_deposits = {}
    for dep in credited_deposits:
        uid = dep.get("user_id")
        if uid and uid not in first_deposits:
            first_deposits[uid] = dep
    
    print(f"🆕 Users with first deposits: {len(first_deposits)}")
    
    # Find missing bonuses
    missing_bonuses = []
    total_missing_amount = 0
    
    for user_id, deposit in first_deposits.items():
        # Check if user has referrer
        user = users_map.get(user_id)
        if not user:
            continue
            
        referrer_id = user.get("referred_by")
        if not referrer_id:
            continue
        
        # Check if bonus already given
        if user_id in bonus_given_for:
            continue
        
        # This user's referrer should have received bonus but didn't
        amount = float(deposit.get("amount", 0))
        bonus_amount = round(amount * DIRECT_REFERRAL_BONUS_PERCENT, 2)
        
        # Get referrer info
        referrer = await db.users.find_one({"user_id": referrer_id}, {"_id": 0, "name": 1, "email": 1})
        referrer_name = referrer.get("name", "Unknown") if referrer else "Unknown"
        referrer_email = referrer.get("email", "") if referrer else ""
        
        missing_bonuses.append({
            "depositor_id": user_id,
            "depositor_name": user.get("name", "Unknown"),
            "depositor_email": user.get("email", ""),
            "deposit_amount": amount,
            "referrer_id": referrer_id,
            "referrer_name": referrer_name,
            "referrer_email": referrer_email,
            "missing_bonus": bonus_amount,
            "deposit_date": deposit.get("detected_at", "")
        })
        total_missing_amount += bonus_amount
    
    # Print results
    print("\n" + "=" * 60)
    print(f"❌ MISSING BONUSES: {len(missing_bonuses)}")
    print(f"💰 TOTAL MISSING AMOUNT: ${total_missing_amount:.2f}")
    print("=" * 60)
    
    if missing_bonuses:
        print("\n📋 DETAILED LIST:")
        print("-" * 60)
        for i, mb in enumerate(missing_bonuses, 1):
            print(f"\n{i}. Depositor: {mb['depositor_name']} ({mb['depositor_email']})")
            print(f"   Deposit: ${mb['deposit_amount']:.2f}")
            print(f"   Referrer: {mb['referrer_name']} ({mb['referrer_email']})")
            print(f"   Missing Bonus: ${mb['missing_bonus']:.2f}")
            print(f"   Date: {mb['deposit_date']}")
    else:
        print("\n✅ No missing bonuses found! All referrers have received their 5%.")
    
    client.close()
    return missing_bonuses

if __name__ == "__main__":
    asyncio.run(check_missing_bonuses())
