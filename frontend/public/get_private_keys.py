#!/usr/bin/env python3
"""
Extract private keys for deposits not forwarded to admin - FIXED
Run: python3 get_private_keys.py
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

async def get_private_keys():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n" + "="*60)
    print("🔑 PRIVATE KEYS FOR NOT FORWARDED DEPOSITS")
    print("⚠️  WARNING: KEEP THIS DATA SECURE!")
    print("="*60)
    
    # Get deposits not forwarded
    not_forwarded = await db.deposit_history.find(
        {
            "$or": [
                {"forwarded": False},
                {"forwarded": {"$exists": False}},
                {"forwarded_to_admin": False},
                {"forwarded_to_admin": {"$exists": False}}
            ],
            "status": "completed"
        },
        {"_id": 0, "user_id": 1, "deposit_address": 1, "amount": 1, "network": 1}
    ).to_list(200)
    
    print(f"\n📋 Total Not Forwarded: {len(not_forwarded)}")
    
    # Get unique deposit addresses
    deposit_addresses = list(set(d.get("deposit_address") for d in not_forwarded if d.get("deposit_address")))
    print(f"📋 Unique Deposit Addresses: {len(deposit_addresses)}")
    
    # Get all private keys from deposit_addresses collection first
    all_addr_docs = await db.deposit_addresses.find(
        {"address": {"$in": deposit_addresses}},
        {"_id": 0, "address": 1, "private_key": 1}
    ).to_list(500)
    
    # Create address to private key map
    addr_to_key = {doc.get("address"): doc.get("private_key") for doc in all_addr_docs}
    
    print(f"\n🔑 Private Keys:\n")
    
    total_amount = 0
    for i, deposit in enumerate(not_forwarded, 1):
        user_id = deposit.get("user_id", "N/A")
        address = deposit.get("deposit_address", "N/A")
        amount = deposit.get("amount", 0)
        network = deposit.get("network", "N/A")
        total_amount += amount
        
        # Get private key from our map
        private_key = addr_to_key.get(address, "NOT FOUND")
        
        # If not found, try wallets collection
        if private_key == "NOT FOUND":
            wallet = await db.wallets.find_one(
                {"user_id": user_id},
                {"_id": 0, "deposit_addresses": 1}
            )
            if wallet and wallet.get("deposit_addresses"):
                dep_addrs = wallet.get("deposit_addresses", {})
                # Could be dict or list
                if isinstance(dep_addrs, dict):
                    for net, addr_info in dep_addrs.items():
                        if isinstance(addr_info, dict) and addr_info.get("address") == address:
                            private_key = addr_info.get("private_key", "NOT FOUND")
                            break
                elif isinstance(dep_addrs, list):
                    for addr_info in dep_addrs:
                        if isinstance(addr_info, dict) and addr_info.get("address") == address:
                            private_key = addr_info.get("private_key", "NOT FOUND")
                            break
        
        print(f"[{i}] User: {user_id}")
        print(f"    Amount: ${amount}")
        print(f"    Network: {network}")
        print(f"    Address: {address}")
        print(f"    Private Key: {private_key}")
        print()
    
    print("="*60)
    print(f"💰 TOTAL AMOUNT TO FORWARD: ${total_amount:.2f}")
    print("="*60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(get_private_keys())
