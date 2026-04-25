#!/usr/bin/env python3
"""
DEBUG: Find where private keys are stored
Run: python3 find_private_keys.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
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

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'tgx_exchange')

async def find_keys():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n" + "="*60)
    print("🔍 FINDING WHERE PRIVATE KEYS ARE STORED")
    print("="*60)
    
    # 1. Check deposit_addresses collection structure
    print("\n📋 deposit_addresses collection:")
    sample_addr = await db.deposit_addresses.find_one({}, {"_id": 0})
    if sample_addr:
        print(f"   Fields: {list(sample_addr.keys())}")
        for key, val in sample_addr.items():
            val_str = str(val)[:50] if val else "None"
            print(f"   - {key}: {val_str}")
    else:
        print("   Collection empty or not found")
    
    count_with_key = await db.deposit_addresses.count_documents({"private_key": {"$exists": True, "$ne": None}})
    print(f"   Documents with private_key: {count_with_key}")
    
    # 2. Check wallets collection structure
    print("\n📋 wallets collection:")
    sample_wallet = await db.wallets.find_one({}, {"_id": 0})
    if sample_wallet:
        print(f"   Fields: {list(sample_wallet.keys())}")
        # Check deposit_addresses field
        dep_addrs = sample_wallet.get("deposit_addresses")
        if dep_addrs:
            print(f"   deposit_addresses type: {type(dep_addrs).__name__}")
            if isinstance(dep_addrs, dict):
                print(f"   deposit_addresses keys: {list(dep_addrs.keys())}")
                for net, val in dep_addrs.items():
                    print(f"   - {net}: {type(val).__name__} = {str(val)[:80]}")
    
    # 3. Check user_addresses collection
    print("\n📋 user_addresses collection:")
    count_ua = await db.user_addresses.count_documents({})
    print(f"   Total documents: {count_ua}")
    sample_ua = await db.user_addresses.find_one({}, {"_id": 0})
    if sample_ua:
        print(f"   Fields: {list(sample_ua.keys())}")
        for key, val in sample_ua.items():
            val_str = str(val)[:60] if val else "None"
            print(f"   - {key}: {val_str}")
    
    # 4. Check addresses collection
    print("\n📋 addresses collection:")
    count_a = await db.addresses.count_documents({})
    print(f"   Total documents: {count_a}")
    sample_a = await db.addresses.find_one({}, {"_id": 0})
    if sample_a:
        print(f"   Fields: {list(sample_a.keys())}")
    
    # 5. Check crypto_wallets collection
    print("\n📋 crypto_wallets collection:")
    count_cw = await db.crypto_wallets.count_documents({})
    print(f"   Total documents: {count_cw}")
    sample_cw = await db.crypto_wallets.find_one({}, {"_id": 0})
    if sample_cw:
        print(f"   Fields: {list(sample_cw.keys())}")
        for key, val in sample_cw.items():
            val_str = str(val)[:60] if val else "None"
            print(f"   - {key}: {val_str}")
    
    # 6. Search for any collection with "private" in field names
    print("\n🔍 Searching all collections for 'private_key' field:")
    collections = await db.list_collection_names()
    for coll_name in collections:
        sample = await db[coll_name].find_one({"private_key": {"$exists": True}}, {"_id": 0})
        if sample:
            print(f"   ✅ Found in: {coll_name}")
            pk = sample.get("private_key")
            if pk:
                print(f"      Sample key: {str(pk)[:30]}...")
    
    client.close()
    print("\n✅ Search complete!")

if __name__ == "__main__":
    asyncio.run(find_keys())
