#!/usr/bin/env python3
"""
Check Auto-Deposit/Forwarding System Status
Run: python3 check_auto_deposit.py
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

async def check_auto_deposit():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n" + "="*70)
    print("🔄 AUTO-DEPOSIT/FORWARDING SYSTEM CHECK")
    print("="*70)
    
    now = datetime.now(timezone.utc)
    
    # 1. Check deposit_history for forwarded vs not forwarded
    print("\n📊 DEPOSIT FORWARDING STATUS:")
    
    total_deposits = await db.deposit_history.count_documents({"status": "completed"})
    forwarded = await db.deposit_history.count_documents({"status": "completed", "forwarded": True})
    not_forwarded = await db.deposit_history.count_documents({
        "status": "completed",
        "$or": [{"forwarded": False}, {"forwarded": {"$exists": False}}]
    })
    
    print(f"   Total Completed Deposits: {total_deposits}")
    print(f"   ✅ Forwarded to Admin: {forwarded}")
    print(f"   ❌ NOT Forwarded: {not_forwarded}")
    
    if total_deposits > 0:
        forward_rate = (forwarded / total_deposits) * 100
        print(f"   📈 Forward Rate: {forward_rate:.1f}%")
    
    # 2. Check recent forwarding activity (last 24h)
    print("\n📊 LAST 24 HOURS ACTIVITY:")
    
    day_ago = now - timedelta(hours=24)
    
    recent_deposits = await db.deposit_history.count_documents({
        "status": "completed",
        "created_at": {"$gte": day_ago}
    })
    recent_forwarded = await db.deposit_history.count_documents({
        "status": "completed",
        "forwarded": True,
        "created_at": {"$gte": day_ago}
    })
    
    print(f"   Deposits (24h): {recent_deposits}")
    print(f"   Forwarded (24h): {recent_forwarded}")
    
    # 3. Check gas transactions
    print("\n⛽ GAS TRANSACTIONS:")
    
    gas_txns = await db.gas_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    if gas_txns:
        print(f"   Total Gas Transactions: {len(gas_txns)}")
        print(f"\n   Recent Gas Transactions:")
        for i, tx in enumerate(gas_txns[:5], 1):
            print(f"   [{i}] To: {tx.get('to_address', 'N/A')[:30]}...")
            print(f"       Amount: {tx.get('amount', 'N/A')} | Status: {tx.get('status', 'N/A')}")
            print(f"       Date: {tx.get('created_at', 'N/A')}")
    else:
        print("   ❌ No gas transactions found")
    
    # 4. Check forwarding transactions
    print("\n📤 FORWARDING TRANSACTIONS:")
    
    fwd_txns = await db.forwarding_transactions.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    if fwd_txns:
        print(f"   Total Forwarding Transactions: {len(fwd_txns)}")
        for i, tx in enumerate(fwd_txns[:3], 1):
            print(f"   [{i}] From: {tx.get('from_address', 'N/A')[:30]}...")
            print(f"       Amount: {tx.get('amount', 'N/A')} | Status: {tx.get('status', 'N/A')}")
    else:
        print("   ❌ No forwarding transactions found")
        
        # Check alternative collection names
        alt_collections = ['forward_transactions', 'transfers', 'auto_forwards']
        for coll in alt_collections:
            count = await db[coll].count_documents({})
            if count > 0:
                print(f"   ✅ Found in '{coll}': {count} records")
    
    # 5. Check processed_deposits forwarding status
    print("\n📋 PROCESSED DEPOSITS STATUS:")
    
    processed_total = await db.processed_deposits.count_documents({})
    processed_forwarded = await db.processed_deposits.count_documents({"forwarded": True})
    processed_pending = processed_total - processed_forwarded
    
    print(f"   Total Processed: {processed_total}")
    print(f"   ✅ Forwarded: {processed_forwarded}")
    print(f"   ⏳ Pending Forward: {processed_pending}")
    
    # 6. Check last successful forward
    print("\n🕐 LAST SUCCESSFUL FORWARD:")
    
    last_forwarded = await db.deposit_history.find_one(
        {"forwarded": True},
        {"_id": 0},
        sort=[("created_at", -1)]
    )
    
    if last_forwarded:
        print(f"   Date: {last_forwarded.get('created_at', 'N/A')}")
        print(f"   Amount: ${last_forwarded.get('amount', 0)}")
        print(f"   Address: {last_forwarded.get('deposit_address', 'N/A')}")
    else:
        print("   ❌ No forwarded deposits found!")
    
    # 7. Summary
    print("\n" + "="*70)
    print("📊 SUMMARY")
    print("="*70)
    
    if forwarded > 0 and forward_rate > 50:
        print("   ✅ Auto-forwarding system APPEARS TO BE WORKING")
    elif not_forwarded > 0 and forwarded == 0:
        print("   ❌ Auto-forwarding system NOT WORKING!")
        print("   ⚠️  Check: pm2 logs tgx-deposit --lines 100")
    else:
        print("   ⚠️  Auto-forwarding partially working")
        print(f"   ⚠️  {not_forwarded} deposits pending forward")
    
    client.close()
    print("\n✅ Check complete!")

if __name__ == "__main__":
    asyncio.run(check_auto_deposit())
