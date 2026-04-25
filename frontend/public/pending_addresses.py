#!/usr/bin/env python3
"""
Get list of deposit addresses with pending funds (not forwarded to admin)
Run: python3 pending_addresses.py
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

async def get_pending_addresses():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n" + "="*70)
    print("📋 DEPOSIT ADDRESSES WITH PENDING FUNDS (NOT FORWARDED TO ADMIN)")
    print("="*70)
    
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
    ).to_list(500)
    
    # Group by address and sum amounts
    address_totals = {}
    for dep in not_forwarded:
        addr = dep.get("deposit_address", "")
        amount = dep.get("amount", 0)
        network = dep.get("network", "bsc")
        
        if addr:
            if addr not in address_totals:
                address_totals[addr] = {"amount": 0, "network": network, "count": 0}
            address_totals[addr]["amount"] += amount
            address_totals[addr]["count"] += 1
    
    # Sort by amount descending
    sorted_addresses = sorted(address_totals.items(), key=lambda x: x[1]["amount"], reverse=True)
    
    print(f"\n📊 Total Unique Addresses: {len(sorted_addresses)}")
    print(f"💰 Total Pending Amount: ${sum(a[1]['amount'] for a in sorted_addresses):.2f}")
    
    print("\n" + "-"*70)
    print(f"{'#':<4} {'ADDRESS':<44} {'AMOUNT':>10} {'NETWORK':<8}")
    print("-"*70)
    
    for i, (addr, info) in enumerate(sorted_addresses, 1):
        print(f"{i:<4} {addr:<44} ${info['amount']:>8.2f} {info['network']:<8}")
    
    print("-"*70)
    
    # Also print just addresses for easy copy
    print("\n📋 ADDRESSES ONLY (for easy copy):\n")
    for addr, info in sorted_addresses:
        print(addr)
    
    client.close()
    print("\n✅ Complete!")

if __name__ == "__main__":
    asyncio.run(get_pending_addresses())
