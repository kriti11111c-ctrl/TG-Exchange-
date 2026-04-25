#!/usr/bin/env python3
"""
DEBUG: Check all collections for deposit/transaction data
Run: python3 debug_collections.py
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

print(f"📦 DB Name: {DB_NAME}")

async def debug_collections():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n🔍 CHECKING ALL COLLECTIONS...")
    
    # List all collections
    collections = await db.list_collection_names()
    print(f"\n📋 All Collections ({len(collections)}):")
    
    for coll_name in sorted(collections):
        count = await db[coll_name].count_documents({})
        print(f"   - {coll_name}: {count} documents")
    
    # Check specific collections for transaction/deposit data
    check_collections = ['transactions', 'deposits', 'wallet_transactions', 
                         'deposit_history', 'funding_history', 'transfers']
    
    print(f"\n💰 Checking for deposit/transaction data:")
    for coll_name in check_collections:
        if coll_name in collections:
            count = await db[coll_name].count_documents({})
            sample = await db[coll_name].find_one({}, {"_id": 0})
            print(f"\n   📁 {coll_name}: {count} documents")
            if sample:
                print(f"   Sample fields: {list(sample.keys())}")
        else:
            print(f"   📁 {coll_name}: NOT FOUND")
    
    # Check wallets for deposit tracking
    print(f"\n💳 Checking wallets structure:")
    wallet_sample = await db.wallets.find_one({}, {"_id": 0})
    if wallet_sample:
        print(f"   Wallet fields: {list(wallet_sample.keys())}")
        for key in ['total_deposited', 'deposit_history', 'last_deposit', 'deposit_count']:
            if key in wallet_sample:
                print(f"   - {key}: {wallet_sample.get(key)}")
    
    # Check if there's deposit data in referrals
    print(f"\n👥 Checking referrals structure:")
    ref_sample = await db.referrals.find_one({}, {"_id": 0})
    if ref_sample:
        print(f"   Referral fields: {list(ref_sample.keys())}")
    
    client.close()
    print("\n✅ Debug complete!")

if __name__ == "__main__":
    asyncio.run(debug_collections())
