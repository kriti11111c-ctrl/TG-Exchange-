#!/usr/bin/env python3
"""
DEBUG: Check Auto-Deposit/Forward System Configuration
Run: python3 debug_auto_forward.py
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

async def debug_auto_forward():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("\n" + "="*70)
    print("🔍 AUTO-DEPOSIT/FORWARD SYSTEM DEBUG")
    print("="*70)
    
    # 1. Check environment variables
    print("\n📋 ENVIRONMENT VARIABLES:")
    
    gas_mnemonic = os.environ.get('GAS_WALLET_MNEMONIC', '')
    print(f"   GAS_WALLET_MNEMONIC: {'✅ SET' if gas_mnemonic else '❌ MISSING'}")
    if gas_mnemonic:
        words = gas_mnemonic.split()
        print(f"   (Words: {len(words)}, First: {words[0]}...)")
    
    admin_bsc = os.environ.get('ADMIN_WALLET_BSC', '')
    admin_tron = os.environ.get('ADMIN_WALLET_TRON', '')
    print(f"   ADMIN_WALLET_BSC: {'✅ ' + admin_bsc[:20] + '...' if admin_bsc else '❌ MISSING'}")
    print(f"   ADMIN_WALLET_TRON: {'✅ ' + admin_tron[:20] + '...' if admin_tron else '❌ MISSING'}")
    
    bsc_rpc = os.environ.get('BSC_RPC_URL', '')
    print(f"   BSC_RPC_URL: {'✅ SET' if bsc_rpc else '❌ MISSING'}")
    
    # 2. Check deposit addresses with private keys
    print("\n📋 DEPOSIT ADDRESSES:")
    
    total_addrs = await db.deposit_addresses.count_documents({})
    with_keys = await db.deposit_addresses.count_documents({"private_key_encrypted": {"$exists": True, "$ne": ""}})
    without_keys = total_addrs - with_keys
    
    print(f"   Total Addresses: {total_addrs}")
    print(f"   With Private Key: {with_keys}")
    print(f"   WITHOUT Private Key: {without_keys} {'❌' if without_keys > 0 else '✅'}")
    
    # Sample address
    sample = await db.deposit_addresses.find_one({}, {"_id": 0, "address": 1, "user_id": 1, "network": 1, "private_key_encrypted": 1})
    if sample:
        pk = sample.get("private_key_encrypted", "")
        print(f"\n   Sample Address:")
        print(f"   - Address: {sample.get('address', 'N/A')[:30]}...")
        print(f"   - Network: {sample.get('network', 'N/A')}")
        print(f"   - Private Key: {'✅ Present (' + str(len(pk)) + ' chars)' if pk else '❌ MISSING'}")
    
    # 3. Check processed deposits statuses
    print("\n📋 PROCESSED DEPOSITS STATUS:")
    
    statuses = await db.processed_deposits.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(20)
    
    for s in statuses:
        status_icon = "✅" if s["_id"] == "forwarded" else "⚠️"
        print(f"   {status_icon} {s['_id']}: {s['count']}")
    
    # 4. Check for specific error statuses
    print("\n📋 ERROR DEPOSITS:")
    
    error_deposits = await db.processed_deposits.find({
        "status": {"$in": ["no_private_key", "gas_failed", "forward_failed", "forward_error", "gas_error"]}
    }, {"_id": 0, "status": 1, "error": 1, "amount": 1}).to_list(10)
    
    if error_deposits:
        for dep in error_deposits[:5]:
            print(f"   - Status: {dep.get('status')}, Amount: ${dep.get('amount', 0)}")
            if dep.get('error'):
                print(f"     Error: {dep.get('error')[:60]}...")
    else:
        print("   No error deposits found")
    
    # 5. Check gas station balance
    print("\n⛽ GAS STATION CHECK:")
    print("   (Need to check on VPS - this requires Web3 connection)")
    
    # 6. Recent deposit activity
    print("\n📊 RECENT DEPOSIT ACTIVITY:")
    
    recent = await db.processed_deposits.find(
        {},
        {"_id": 0, "status": 1, "amount": 1, "detected_at": 1, "forwarded": 1, "gas_sent": 1}
    ).sort("detected_at", -1).to_list(5)
    
    for i, dep in enumerate(recent, 1):
        print(f"   [{i}] ${dep.get('amount', 0):.2f} - Status: {dep.get('status')} - Gas: {dep.get('gas_sent')} - Fwd: {dep.get('forwarded')}")
    
    client.close()
    
    print("\n" + "="*70)
    print("📋 DIAGNOSIS:")
    print("="*70)
    
    issues = []
    if not gas_mnemonic:
        issues.append("❌ GAS_WALLET_MNEMONIC not set - cannot send gas fees!")
    if without_keys > 0:
        issues.append(f"❌ {without_keys} addresses missing private keys - cannot forward!")
    if not admin_bsc:
        issues.append("❌ ADMIN_WALLET_BSC not set")
    if not bsc_rpc:
        issues.append("❌ BSC_RPC_URL not set - cannot connect to blockchain!")
    
    if issues:
        print("\n🔴 ISSUES FOUND:")
        for issue in issues:
            print(f"   {issue}")
    else:
        print("\n✅ Configuration looks OK - check PM2 logs for runtime errors")
    
    print("\n✅ Debug complete!")

if __name__ == "__main__":
    asyncio.run(debug_auto_forward())
