#!/usr/bin/env python3
"""
DEBUG: Check deposits collection structure
Run: python3 debug_deposits.py
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

async def debug_deposits():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n🔍 DEBUGGING DEPOSITS COLLECTION...")
    
    # Count total deposits
    total = await db.deposits.count_documents({})
    completed = await db.deposits.count_documents({"status": "completed"})
    print(f"\n📊 Total Deposits: {total}")
    print(f"📊 Completed Deposits: {completed}")
    
    # Get sample deposit to see structure
    sample = await db.deposits.find_one({"status": "completed"}, {"_id": 0})
    print(f"\n📋 Sample Deposit Structure:")
    if sample:
        for key, value in sample.items():
            print(f"   - {key}: {type(value).__name__} = {str(value)[:50]}...")
    else:
        print("   No completed deposits found")
    
    # Check timestamp fields
    print(f"\n🕐 Timestamp Fields Check:")
    for field in ["created_at", "timestamp", "completed_at", "date", "time"]:
        count = await db.deposits.count_documents({field: {"$exists": True}})
        print(f"   - {field}: {count} documents")
    
    # Get deposits in last 24h, 7d, 30d
    now = datetime.now(timezone.utc)
    
    # Try different date formats
    print(f"\n📅 Date Range Queries (trying different formats):")
    
    for days, label in [(1, "24h"), (7, "7d"), (30, "30d")]:
        cutoff = now - timedelta(days=days)
        cutoff_str = cutoff.isoformat()
        
        # Try string format
        count_str = await db.deposits.count_documents({
            "status": "completed",
            "created_at": {"$gte": cutoff_str}
        })
        
        # Try datetime format
        count_dt = await db.deposits.count_documents({
            "status": "completed", 
            "created_at": {"$gte": cutoff}
        })
        
        # Try timestamp field
        count_ts = await db.deposits.count_documents({
            "status": "completed",
            "timestamp": {"$gte": cutoff_str}
        })
        
        print(f"   {label}: string={count_str}, datetime={count_dt}, timestamp_field={count_ts}")
    
    # Sum of all completed deposits
    pipeline = [
        {"$match": {"status": "completed"}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "total_usd": {"$sum": "$usd_amount"}}}
    ]
    result = await db.deposits.aggregate(pipeline).to_list(1)
    if result:
        print(f"\n💰 Total Completed Deposits Amount: ${result[0].get('total', 0)}")
        print(f"💰 Total USD Amount: ${result[0].get('total_usd', 0)}")
    
    client.close()
    print("\n✅ Debug complete!")

if __name__ == "__main__":
    asyncio.run(debug_deposits())
