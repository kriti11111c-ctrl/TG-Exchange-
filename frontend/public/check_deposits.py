#!/usr/bin/env python3
"""
CHECK: Verify deposit flow is working properly
Run: python3 check_deposits.py
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

async def check_deposits():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n" + "="*60)
    print("🔍 DEPOSIT SYSTEM CHECK")
    print("="*60)
    
    # 1. Check deposit_history collection
    total_deposits = await db.deposit_history.count_documents({})
    completed_deposits = await db.deposit_history.count_documents({"status": "completed"})
    print(f"\n📊 deposit_history Collection:")
    print(f"   Total records: {total_deposits}")
    print(f"   Completed deposits: {completed_deposits}")
    
    # 2. Recent deposits (last 7 days)
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    
    recent_deposits = await db.deposit_history.find(
        {"created_at": {"$gte": week_ago}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    
    print(f"\n📅 Recent Deposits (Last 7 days): {len(recent_deposits)}")
    for i, dep in enumerate(recent_deposits[:5], 1):
        print(f"\n   [{i}] User: {dep.get('user_id', 'N/A')[:20]}...")
        print(f"       Amount: ${dep.get('amount', 0)}")
        print(f"       Status: {dep.get('status', 'N/A')}")
        print(f"       Date: {dep.get('created_at', 'N/A')}")
        print(f"       Network: {dep.get('network', 'N/A')}")
    
    # 3. Latest deposit (most recent)
    latest = await db.deposit_history.find_one(
        {"status": "completed"},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    print(f"\n🕐 Latest Completed Deposit:")
    if latest:
        print(f"   User: {latest.get('user_id', 'N/A')}")
        print(f"   Amount: ${latest.get('amount', 0)}")
        print(f"   Date: {latest.get('created_at', 'N/A')}")
        print(f"   TX Hash: {latest.get('tx_hash', 'N/A')[:40]}...")
    else:
        print("   No completed deposits found")
    
    # 4. Check processed_deposits collection
    processed_count = await db.processed_deposits.count_documents({})
    print(f"\n📦 processed_deposits Collection: {processed_count} records")
    
    # 5. Check deposit_requests (pending)
    pending_requests = await db.deposit_requests.count_documents({"status": "pending"})
    total_requests = await db.deposit_requests.count_documents({})
    print(f"\n📋 deposit_requests Collection:")
    print(f"   Total: {total_requests}")
    print(f"   Pending: {pending_requests}")
    
    # 6. Deposit totals by period
    print(f"\n💰 Total Deposits by Period:")
    
    for days, label in [(1, "24H"), (7, "7D"), (30, "30D")]:
        cutoff = now - timedelta(days=days)
        pipeline = [
            {"$match": {"status": "completed", "created_at": {"$gte": cutoff}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
        ]
        result = await db.deposit_history.aggregate(pipeline).to_list(1)
        if result:
            print(f"   {label}: ${result[0]['total']:.2f} ({result[0]['count']} deposits)")
        else:
            print(f"   {label}: $0 (0 deposits)")
    
    # All time
    pipeline_all = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    result_all = await db.deposit_history.aggregate(pipeline_all).to_list(1)
    if result_all:
        print(f"   ALL: ${result_all[0]['total']:.2f} ({result_all[0]['count']} deposits)")
    
    # 7. Check tgx-deposit service status
    print(f"\n✅ Deposit system check complete!")
    print(f"\n💡 If deposits are not recording, check:")
    print(f"   1. pm2 logs tgx-deposit --lines 50")
    print(f"   2. Blockchain network connectivity")
    print(f"   3. Deposit address monitoring")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_deposits())
