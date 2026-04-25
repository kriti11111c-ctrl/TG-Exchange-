#!/usr/bin/env python3
"""
Find All Addresses with Stuck USDT
Run: python3 find_stuck_usdt.py
"""

import asyncio
import os
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from web3 import Web3

# Load .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                value = value.strip('"').strip("'")
                os.environ[key] = value
    print(f"✅ Loaded .env")

MONGO_URL = os.environ.get('MONGO_URL', '')
DB_NAME = os.environ.get('DB_NAME', 'tgx_exchange')
BSC_RPC_URL = os.environ.get('BSC_RPC_URL', 'https://bsc-dataseed1.binance.org/')

# BSC USDT Contract
USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955"
USDT_ABI = [{"constant":True,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}]

async def main():
    print("\n" + "="*70)
    print("🔍 FINDING ALL ADDRESSES WITH STUCK USDT")
    print("="*70)
    
    # Connect to MongoDB
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Connect to BSC
    w3 = Web3(Web3.HTTPProvider(BSC_RPC_URL))
    if not w3.is_connected():
        print(f"❌ Cannot connect to BSC: {BSC_RPC_URL}")
        return
    
    print(f"✅ Connected to BSC")
    
    usdt_contract = w3.eth.contract(
        address=Web3.to_checksum_address(USDT_CONTRACT), 
        abi=USDT_ABI
    )
    
    # Get all deposit addresses
    addresses = await db.deposit_addresses.find(
        {"network": {"$in": ["bsc", "eth", "polygon"]}},
        {"_id": 0, "address": 1, "user_id": 1, "network": 1, "private_key_encrypted": 1}
    ).to_list(length=5000)
    
    print(f"📊 Total addresses to check: {len(addresses)}")
    
    stuck_addresses = []
    total_stuck = 0
    
    print("\n🔄 Checking balances (this may take a few minutes)...\n")
    
    # Check each unique address (EVM addresses are same across BSC/ETH/Polygon)
    checked = set()
    
    for i, addr_doc in enumerate(addresses):
        address = addr_doc.get("address", "")
        
        if not address or address in checked:
            continue
        
        checked.add(address)
        
        try:
            balance = usdt_contract.functions.balanceOf(
                Web3.to_checksum_address(address)
            ).call()
            
            usdt_amount = balance / 10**18  # BSC USDT has 18 decimals
            
            if usdt_amount >= 1:  # At least $1
                user_id = addr_doc.get("user_id", "unknown")
                has_pk = "Yes" if addr_doc.get("private_key_encrypted") else "NO ❌"
                
                stuck_addresses.append({
                    "address": address,
                    "user_id": user_id,
                    "amount": usdt_amount,
                    "has_private_key": has_pk
                })
                total_stuck += usdt_amount
                
                print(f"💰 FOUND: ${usdt_amount:.2f} USDT at {address[:10]}...{address[-6:]}")
                print(f"   User: {user_id[:15]}... | Private Key: {has_pk}")
        
        except Exception as e:
            pass  # Skip errors silently
        
        # Progress every 50 addresses
        if (i + 1) % 50 == 0:
            print(f"   Progress: {i+1}/{len(addresses)} addresses checked...")
        
        # Small delay to avoid rate limiting
        await asyncio.sleep(0.1)
    
    print("\n" + "="*70)
    print("📋 SUMMARY")
    print("="*70)
    
    if stuck_addresses:
        print(f"\n🚨 TOTAL STUCK: ${total_stuck:.2f} USDT in {len(stuck_addresses)} addresses\n")
        
        print("Addresses with stuck USDT:")
        for item in sorted(stuck_addresses, key=lambda x: -x["amount"]):
            print(f"  ${item['amount']:>10.2f} | {item['address']} | PK: {item['has_private_key']}")
        
        # Check if any missing private keys
        missing_pk = [a for a in stuck_addresses if "NO" in a["has_private_key"]]
        if missing_pk:
            print(f"\n⚠️ WARNING: {len(missing_pk)} addresses have MISSING private keys!")
            print("   These cannot be auto-forwarded!")
    else:
        print("\n✅ No stuck USDT found (or all already forwarded)")
    
    # Also check Gas Station balance
    from eth_account import Account
    from bip_utils import Bip39SeedGenerator, Bip44, Bip44Coins, Bip44Changes
    
    GAS_WALLET_MNEMONIC = os.environ.get('GAS_WALLET_MNEMONIC', '')
    
    if GAS_WALLET_MNEMONIC:
        seed = Bip39SeedGenerator(GAS_WALLET_MNEMONIC).Generate()
        bip44 = Bip44.FromSeed(seed, Bip44Coins.ETHEREUM)
        account = bip44.Purpose().Coin().Account(0).Change(Bip44Changes.CHAIN_EXT).AddressIndex(0)
        gas_address = Account.from_key(account.PrivateKey().Raw().ToHex()).address
        
        gas_balance = w3.eth.get_balance(gas_address)
        gas_bnb = w3.from_wei(gas_balance, 'ether')
        
        print(f"\n⛽ GAS STATION:")
        print(f"   Address: {gas_address}")
        print(f"   Balance: {gas_bnb:.6f} BNB")
        
        if gas_bnb < 0.001:
            print(f"\n❌ GAS STATION EMPTY! Send BNB to: {gas_address}")
        else:
            print(f"   ✅ Can process ~{int(gas_bnb/0.0003)} transactions")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
