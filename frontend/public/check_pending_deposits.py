#!/usr/bin/env python3
"""
Check pending/unforwarded deposits
Run: python3 check_pending_deposits.py
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
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

async def check_pending():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n" + "="*60)
    print("🔍 PENDING DEPOSITS CHECK")
    print("="*60)
    
    # 1. Check deposit_requests with pending status
    print("\n📋 deposit_requests (Pending):")
    pending_requests = await db.deposit_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).to_list(100)
    
    if pending_requests:
        total_pending = sum(r.get("amount", 0) or 0 for r in pending_requests)
        print(f"   Count: {len(pending_requests)}")
        print(f"   Total Amount: ${total_pending:.2f}")
        print(f"\n   Recent pending:")
        for i, req in enumerate(pending_requests[:5], 1):
            print(f"   [{i}] User: {req.get('user_id', 'N/A')[:20]}...")
            print(f"       Amount: ${req.get('amount', 0)}")
            print(f"       Status: {req.get('status', 'N/A')}")
    else:
        print("   ✅ No pending deposit requests!")
    
    # 2. Check deposits with "detected" or "pending" status (not yet completed)
    print("\n📋 deposit_history (Not completed):")
    not_completed = await db.deposit_history.find(
        {"status": {"$nin": ["completed", "confirmed", "success"]}},
        {"_id": 0}
    ).to_list(100)
    
    if not_completed:
        total_nc = sum(r.get("amount", 0) or 0 for r in not_completed)
        print(f"   Count: {len(not_completed)}")
        print(f"   Total Amount: ${total_nc:.2f}")
        
        # Group by status
        status_counts = {}
        for dep in not_completed:
            status = dep.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        print(f"   By Status: {status_counts}")
    else:
        print("   ✅ All deposits are completed!")
    
    # 3. Check for deposits not forwarded to admin wallet
    print("\n📋 Deposits NOT forwarded to admin:")
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
        {"_id": 0}
    ).to_list(100)
    
    if not_forwarded:
        total_nf = sum(r.get("amount", 0) or 0 for r in not_forwarded)
        print(f"   Count: {len(not_forwarded)}")
        print(f"   Total Amount: ${total_nf:.2f}")
        print(f"\n   Recent not forwarded:")
        for i, dep in enumerate(not_forwarded[:5], 1):
            print(f"   [{i}] User: {dep.get('user_id', 'N/A')[:20]}...")
            print(f"       Amount: ${dep.get('amount', 0)}")
            print(f"       TX: {dep.get('tx_hash', 'N/A')[:30]}...")
    else:
        print("   ✅ All completed deposits are forwarded!")
    
    # 4. Check processed_deposits for forwarding status
    print("\n📋 processed_deposits (Forwarding status):")
    processed = await db.processed_deposits.find(
        {},
        {"_id": 0, "forwarded": 1, "amount": 1, "status": 1}
    ).to_list(200)
    
    forwarded_count = sum(1 for p in processed if p.get("forwarded") == True)
    not_forwarded_count = len(processed) - forwarded_count
    total_not_forwarded = sum(p.get("amount", 0) or 0 for p in processed if not p.get("forwarded"))
    
    print(f"   Total processed: {len(processed)}")
    print(f"   Forwarded: {forwarded_count}")
    print(f"   NOT Forwarded: {not_forwarded_count}")
    print(f"   Amount NOT forwarded: ${total_not_forwarded:.2f}")
    
    # 5. Summary
    print("\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)
    print(f"   Pending Requests: {len(pending_requests)}")
    print(f"   Not Completed: {len(not_completed)}")
    print(f"   Not Forwarded to Admin: ${total_not_forwarded:.2f}")
    
    client.close()
    print("\n✅ Check complete!")

if __name__ == "__main__":
    asyncio.run(check_pending())
