#!/usr/bin/env python3
"""
DEBUG: Check if referred user deposits are in deposit_history
Run: python3 debug_referred_deposits.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import os
from pathlib import Path

# Load .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value
    print(f"✅ Loaded .env")

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'tgx_exchange')

# Test user - the one with 3787 referrals
TEST_USER_EMAIL = "kriti11111a@gmail.com"

async def debug_referred_deposits():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"\n🔍 DEBUG: Checking referred user deposits...")
    print(f"📧 Test User: {TEST_USER_EMAIL}")
    
    # Get test user's ID
    test_user = await db.users.find_one({"email": TEST_USER_EMAIL}, {"_id": 0, "user_id": 1})
    if not test_user:
        print(f"❌ User not found!")
        client.close()
        return
    
    user_id = test_user["user_id"]
    print(f"👤 User ID: {user_id}")
    
    # Get all referred user IDs
    referrals = await db.referrals.find({"referrer_id": user_id}, {"_id": 0, "referred_id": 1}).to_list(100000)
    referred_ids = [r["referred_id"] for r in referrals]
    print(f"👥 Total Referred Users: {len(referred_ids)}")
    
    # Check how many of these have deposits
    deposits_count = await db.deposit_history.count_documents({"user_id": {"$in": referred_ids}})
    print(f"💰 Referred users with deposits: {deposits_count}")
    
    # Get sample deposit from referred users
    sample_deposit = await db.deposit_history.find_one({"user_id": {"$in": referred_ids}}, {"_id": 0})
    if sample_deposit:
        print(f"\n📋 Sample deposit from referred user:")
        for key, value in sample_deposit.items():
            print(f"   {key}: {value}")
    
    # Calculate period-based deposits for referred users
    now = datetime.now(timezone.utc)
    print(f"\n💵 Deposits from referred users by period:")
    
    for days, label in [(1, "24h"), (7, "7d"), (30, "30d")]:
        cutoff = now - timedelta(days=days)
        
        # Query with datetime object
        pipeline = [
            {"$match": {
                "user_id": {"$in": referred_ids},
                "status": "completed",
                "created_at": {"$gte": cutoff}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
        ]
        result = await db.deposit_history.aggregate(pipeline).to_list(1)
        
        if result:
            print(f"   {label}: ${result[0]['total']:.2f} ({result[0]['count']} deposits)")
        else:
            print(f"   {label}: $0 (0 deposits)")
    
    # All time from referred users
    pipeline_all = [
        {"$match": {
            "user_id": {"$in": referred_ids},
            "status": "completed"
        }},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    result_all = await db.deposit_history.aggregate(pipeline_all).to_list(1)
    if result_all:
        print(f"   ALL: ${result_all[0]['total']:.2f} ({result_all[0]['count']} deposits)")
    else:
        print(f"   ALL: $0 (0 deposits)")
    
    # Compare with wallets total (current business)
    wallets = await db.wallets.find(
        {"user_id": {"$in": referred_ids}},
        {"_id": 0, "futures_balance": 1, "welcome_bonus": 1}
    ).to_list(100000)
    
    total_futures = sum(w.get("futures_balance", 0) or 0 for w in wallets)
    total_bonus = sum(w.get("welcome_bonus", 0) or 0 for w in wallets)
    real_balance = total_futures - total_bonus
    
    print(f"\n📊 Wallets Total (for comparison):")
    print(f"   Futures Balance: ${total_futures:.2f}")
    print(f"   Welcome Bonus: ${total_bonus:.2f}")
    print(f"   Real Balance (futures - bonus): ${real_balance:.2f}")
    
    client.close()
    print("\n✅ Debug complete!")

if __name__ == "__main__":
    asyncio.run(debug_referred_deposits())
