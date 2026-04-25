#!/usr/bin/env python3
"""
Check Admin Wallets for all networks
Run: python3 check_admin_wallets.py
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

# Also check .env for admin wallet addresses
print("\n" + "="*70)
print("🔑 ADMIN WALLETS CHECK")
print("="*70)

print("\n📋 From .env file:")
env_wallets = [
    'ADMIN_WALLET', 'ADMIN_WALLET_BSC', 'ADMIN_WALLET_ETH', 
    'ADMIN_WALLET_TRON', 'ADMIN_WALLET_TRC20', 'ADMIN_WALLET_BTC',
    'ADMIN_WALLET_SOL', 'ADMIN_WALLET_POLYGON', 'ADMIN_WALLET_AVAX',
    'BSC_ADMIN_WALLET', 'ETH_ADMIN_WALLET', 'TRON_ADMIN_WALLET',
    'TRC20_ADMIN_WALLET', 'MAIN_WALLET', 'HOT_WALLET', 'COLD_WALLET',
    'FORWARDING_WALLET', 'COLLECTION_WALLET'
]

for key in env_wallets:
    val = os.environ.get(key)
    if val:
        print(f"   {key}: {val}")

async def check_admin_wallets():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Check settings/config collection
    print("\n📋 From database (settings/config):")
    
    collections_to_check = ['settings', 'config', 'admin_settings', 'system_config', 'wallets_config']
    
    for coll_name in collections_to_check:
        try:
            doc = await db[coll_name].find_one({}, {"_id": 0})
            if doc:
                print(f"\n   📁 {coll_name}:")
                for key, val in doc.items():
                    if 'wallet' in key.lower() or 'address' in key.lower() or 'admin' in key.lower():
                        print(f"      {key}: {val}")
        except:
            pass
    
    # Check admin_wallets collection
    print("\n📋 From admin_wallets collection:")
    admin_wallets = await db.admin_wallets.find({}, {"_id": 0}).to_list(20)
    if admin_wallets:
        for w in admin_wallets:
            print(f"   Network: {w.get('network', 'N/A')}")
            print(f"   Address: {w.get('address', w.get('wallet_address', 'N/A'))}")
            print()
    else:
        print("   Collection empty or not found")
    
    # Check forwarding_config collection
    print("\n📋 From forwarding_config:")
    fwd_config = await db.forwarding_config.find({}, {"_id": 0}).to_list(20)
    if fwd_config:
        for cfg in fwd_config:
            print(f"   {cfg}")
    else:
        print("   Collection empty or not found")
    
    # Search any collection with admin wallet info
    print("\n📋 Searching all collections for admin wallet:")
    collections = await db.list_collection_names()
    for coll_name in collections:
        try:
            doc = await db[coll_name].find_one({
                "$or": [
                    {"admin_wallet": {"$exists": True}},
                    {"admin_address": {"$exists": True}},
                    {"forwarding_address": {"$exists": True}},
                    {"collection_address": {"$exists": True}}
                ]
            }, {"_id": 0})
            if doc:
                print(f"\n   ✅ Found in {coll_name}:")
                for key, val in doc.items():
                    if 'wallet' in key.lower() or 'address' in key.lower():
                        print(f"      {key}: {val}")
        except:
            pass
    
    client.close()
    print("\n✅ Check complete!")

if __name__ == "__main__":
    asyncio.run(check_admin_wallets())
