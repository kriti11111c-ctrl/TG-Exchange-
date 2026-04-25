#!/usr/bin/env python3
"""
Extract private keys for deposits not forwarded to admin
Run: python3 get_private_keys.py
WARNING: This contains sensitive data - keep secure!
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
    
    # Get private keys from deposit_addresses collection
    print(f"\n🔑 Private Keys:\n")
    
    total_amount = 0
    for i, deposit in enumerate(not_forwarded, 1):
        user_id = deposit.get("user_id", "N/A")
        address = deposit.get("deposit_address", "N/A")
        amount = deposit.get("amount", 0)
        network = deposit.get("network", "N/A")
        total_amount += amount
        
        # Get private key from deposit_addresses collection
        addr_doc = await db.deposit_addresses.find_one(
            {"address": address},
            {"_id": 0, "private_key": 1, "address": 1}
        )
        
        # Also check wallets collection
        if not addr_doc:
            wallet = await db.wallets.find_one(
                {"user_id": user_id},
                {"_id": 0, "deposit_addresses": 1}
            )
            if wallet and wallet.get("deposit_addresses"):
                for addr_info in wallet.get("deposit_addresses", []):
                    if addr_info.get("address") == address:
                        addr_doc = addr_info
                        break
        
        private_key = addr_doc.get("private_key", "NOT FOUND") if addr_doc else "NOT FOUND"
        
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
