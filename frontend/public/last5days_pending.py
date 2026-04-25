#!/usr/bin/env python3
"""
Show last 5 days deposits that are pending (not forwarded to admin)
Run: python3 last5days_pending.py
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

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'tgx_exchange')

async def get_last5days_pending():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    now = datetime.now(timezone.utc)
    five_days_ago = now - timedelta(days=5)
    
    print("\n" + "="*70)
    print("📋 LAST 5 DAYS PENDING DEPOSITS (NOT FORWARDED TO ADMIN)")
    print(f"📅 Date Range: {five_days_ago.strftime('%Y-%m-%d')} to {now.strftime('%Y-%m-%d')}")
    print("="*70)
    
    # Get deposits from last 5 days that are not forwarded
    pending_deposits = await db.deposit_history.find(
        {
            "created_at": {"$gte": five_days_ago},
            "status": "completed",
            "$or": [
                {"forwarded": False},
                {"forwarded": {"$exists": False}},
                {"forwarded_to_admin": False},
                {"forwarded_to_admin": {"$exists": False}}
            ]
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    if not pending_deposits:
        print("\n✅ No pending deposits in last 5 days!")
        client.close()
        return
    
    total_amount = sum(d.get("amount", 0) for d in pending_deposits)
    print(f"\n📊 Total Pending: {len(pending_deposits)} deposits")
    print(f"💰 Total Amount: ${total_amount:.2f}")
    
    print("\n" + "-"*70)
    print(f"{'#':<3} {'DATE':<20} {'AMOUNT':>10} {'NETWORK':<6} {'ADDRESS':<44}")
    print("-"*70)
    
    for i, dep in enumerate(pending_deposits, 1):
        date = dep.get("created_at", "N/A")
        if isinstance(date, datetime):
            date_str = date.strftime("%Y-%m-%d %H:%M")
        else:
            date_str = str(date)[:16]
        
        amount = dep.get("amount", 0)
        network = dep.get("network", "bsc")[:6]
        address = dep.get("deposit_address", "N/A")
        
        print(f"{i:<3} {date_str:<20} ${amount:>8.2f} {network:<6} {address}")
    
    print("-"*70)
    print(f"💰 TOTAL: ${total_amount:.2f}")
    
    # Print addresses only for easy copy
    print("\n📋 ADDRESSES ONLY (Last 5 Days Pending):\n")
    unique_addresses = list(set(d.get("deposit_address") for d in pending_deposits if d.get("deposit_address")))
    for addr in unique_addresses:
        # Calculate total for this address
        addr_total = sum(d.get("amount", 0) for d in pending_deposits if d.get("deposit_address") == addr)
        print(f"{addr} - ${addr_total:.2f}")
    
    client.close()
    print("\n✅ Complete!")

if __name__ == "__main__":
    asyncio.run(get_last5days_pending())
