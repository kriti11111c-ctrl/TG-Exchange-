#!/usr/bin/env python3
"""
DEBUG: Test period-based deposit query
Run: python3 debug_period_query.py
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

async def debug_period_query():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n🔍 DEBUG: Period-based deposit query...")
    
    # Check deposit_history sample
    print("\n📋 Sample deposit_history document:")
    sample = await db.deposit_history.find_one({}, {"_id": 0})
    if sample:
        for key, value in sample.items():
            val_type = type(value).__name__
            val_str = str(value)[:60]
            print(f"   {key}: ({val_type}) {val_str}")
    
    # Check status values
    print("\n📊 Status values in deposit_history:")
    statuses = await db.deposit_history.distinct("status")
    print(f"   Unique statuses: {statuses}")
    
    # Check created_at format
    print("\n🕐 created_at format check:")
    doc_with_date = await db.deposit_history.find_one({"created_at": {"$exists": True}})
    if doc_with_date:
        created_at = doc_with_date.get("created_at")
        print(f"   Type: {type(created_at).__name__}")
        print(f"   Value: {created_at}")
    
    # Test date range queries
    now = datetime.now(timezone.utc)
    print(f"\n📅 Testing date range queries:")
    print(f"   Current time (UTC): {now.isoformat()}")
    
    for days, label in [(1, "24h"), (7, "7d"), (30, "30d"), (365, "1year")]:
        cutoff = now - timedelta(days=days)
        cutoff_str = cutoff.isoformat()
        
        # Try with string comparison
        count_str = await db.deposit_history.count_documents({
            "created_at": {"$gte": cutoff_str}
        })
        
        # Try with datetime object
        try:
            count_dt = await db.deposit_history.count_documents({
                "created_at": {"$gte": cutoff}
            })
        except:
            count_dt = "Error"
        
        # Try with $gt instead of $gte
        count_gt = await db.deposit_history.count_documents({
            "created_at": {"$gt": cutoff_str}
        })
        
        print(f"   {label}: $gte(str)={count_str}, $gte(dt)={count_dt}, $gt={count_gt}")
    
    # Sum deposits for each period
    print(f"\n💰 Sum of deposits by period:")
    for days, label in [(1, "24h"), (7, "7d"), (30, "30d"), (365, "1year")]:
        cutoff = (now - timedelta(days=days)).isoformat()
        
        pipeline = [
            {"$match": {"created_at": {"$gte": cutoff}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
        ]
        result = await db.deposit_history.aggregate(pipeline).to_list(1)
        total = result[0]["total"] if result else 0
        print(f"   {label}: ${total}")
    
    # All time total
    pipeline_all = [
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    result_all = await db.deposit_history.aggregate(pipeline_all).to_list(1)
    total_all = result_all[0]["total"] if result_all else 0
    print(f"   ALL: ${total_all}")
    
    client.close()
    print("\n✅ Debug complete!")

if __name__ == "__main__":
    asyncio.run(debug_period_query())
