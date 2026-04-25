#!/usr/bin/env python3
"""
Debug Team Rank API - Check what data the API returns
Run: python3 debug_team_rank.py
"""

import asyncio
import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

# Load .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                value = value.strip('"').strip("'")
                os.environ[key] = value
    print(f"✅ Loaded .env")

MONGO_URL = os.environ.get('MONGO_URL', '')
DB_NAME = os.environ.get('DB_NAME', 'tgx_exchange')

# Target user to debug
TEST_EMAIL = "kriti11111a@gmail.com"

async def main():
    print("\n" + "="*70)
    print("🔍 DEBUG TEAM RANK DATA")
    print("="*70)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"\n📧 Checking user: {TEST_EMAIL}")
    
    # Step 1: Find user
    user = await db.users.find_one({"email": TEST_EMAIL}, {"_id": 0})
    
    if not user:
        print(f"❌ User not found: {TEST_EMAIL}")
        client.close()
        return
    
    user_id = user.get("user_id")
    print(f"✅ User found: {user_id}")
    print(f"   Name: {user.get('name', 'N/A')}")
    print(f"   Referral Code: {user.get('referral_code', 'N/A')}")
    print(f"   Team Rank Level: {user.get('team_rank_level', 0)}")
    
    # Step 2: Count referrals directly
    all_referrals = await db.referrals.find({"referrer_id": user_id}, {"_id": 0, "referred_id": 1, "level": 1}).to_list(length=100000)
    
    print(f"\n📊 REFERRALS FROM DATABASE:")
    print(f"   Total referrals: {len(all_referrals)}")
    
    # Direct referrals = level 1 only
    direct_referrals = [r for r in all_referrals if r.get("level") == 1]
    print(f"   Direct (Level 1): {len(direct_referrals)}")
    
    # Step 3: Check wallets for valid counts
    referred_ids = [r.get("referred_id") for r in all_referrals if r.get("referred_id")]
    
    if referred_ids:
        wallets = await db.wallets.find(
            {"user_id": {"$in": referred_ids}},
            {"_id": 0, "user_id": 1, "futures_balance": 1}
        ).to_list(length=100000)
        
        wallets_map = {w["user_id"]: w.get("futures_balance", 0) or 0 for w in wallets}
        
        # Users data for rank check
        users = await db.users.find(
            {"user_id": {"$in": referred_ids}},
            {"_id": 0, "user_id": 1, "team_rank_level": 1, "name": 1, "email": 1}
        ).to_list(length=100000)
        
        users_map = {u["user_id"]: u for u in users}
        
        # Count valid ($50+) and bronze members
        valid_direct = 0
        valid_team = 0
        bronze_members = 0
        
        print(f"\n👥 DIRECT TEAM MEMBERS (first 20):")
        for i, ref in enumerate(direct_referrals[:20]):
            ref_id = ref.get("referred_id")
            futures_bal = wallets_map.get(ref_id, 0)
            user_info = users_map.get(ref_id, {})
            rank_level = user_info.get("team_rank_level", 0)
            name = user_info.get("name", "Unknown")
            
            status = "✅ Valid ($50+)" if futures_bal >= 50 else "❌ Low Balance"
            print(f"   {i+1}. {name[:15]:15} | ${futures_bal:>8.2f} | Rank: {rank_level} | {status}")
        
        # Count all valid members
        for ref in all_referrals:
            ref_id = ref.get("referred_id")
            futures_bal = wallets_map.get(ref_id, 0)
            user_info = users_map.get(ref_id, {})
            rank_level = user_info.get("team_rank_level", 0) or 0
            
            if futures_bal >= 50:
                valid_team += 1
                if ref.get("level") == 1:
                    valid_direct += 1
                    if rank_level >= 1:
                        bronze_members += 1
        
        print(f"\n📈 SUMMARY:")
        print(f"   Total Direct (Level 1): {len(direct_referrals)}")
        print(f"   Valid Direct ($50+): {valid_direct}")
        print(f"   Bronze Members (Direct with Rank>=1): {bronze_members}")
        print(f"   Total Team (All Levels): {len(all_referrals)}")
        print(f"   Valid Team ($50+): {valid_team}")
    else:
        print(f"\n⚠️ No referrals found for this user!")
    
    # Step 4: Check user's own wallet
    user_wallet = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
    if user_wallet:
        print(f"\n💰 USER'S OWN WALLET:")
        print(f"   Futures Balance: ${user_wallet.get('futures_balance', 0):.2f}")
        print(f"   Welcome Bonus: ${user_wallet.get('welcome_bonus', 0):.2f}")
        print(f"   Total Deposited: ${user_wallet.get('total_deposited', 0):.2f}")
        print(f"   Spot USDT: ${user_wallet.get('balances', {}).get('usdt', 0):.2f}")
    
    client.close()
    print("\n" + "="*70)

if __name__ == "__main__":
    asyncio.run(main())
