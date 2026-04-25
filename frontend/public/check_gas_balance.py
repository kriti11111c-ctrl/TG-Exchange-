#!/usr/bin/env python3
"""
Check Gas Station Wallet Balance & Try Manual Forward
Run: python3 check_gas_balance.py
"""

import asyncio
from web3 import Web3
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

BSC_RPC_URL = os.environ.get('BSC_RPC_URL', 'https://bsc-dataseed1.binance.org/')
GAS_WALLET_MNEMONIC = os.environ.get('GAS_WALLET_MNEMONIC', '')

# Gas station address (derived from mnemonic)
from eth_account import Account
from bip_utils import Bip39SeedGenerator, Bip44, Bip44Coins, Bip44Changes

def get_gas_station_address():
    if not GAS_WALLET_MNEMONIC:
        return None, None
    
    seed = Bip39SeedGenerator(GAS_WALLET_MNEMONIC).Generate()
    bip44 = Bip44.FromSeed(seed, Bip44Coins.ETHEREUM)
    account = bip44.Purpose().Coin().Account(0).Change(Bip44Changes.CHAIN_EXT).AddressIndex(0)
    private_key = account.PrivateKey().Raw().ToHex()
    address = Account.from_key(private_key).address
    return address, private_key

async def check_balance():
    print("\n" + "="*60)
    print("⛽ GAS STATION WALLET CHECK")
    print("="*60)
    
    # Get gas station address
    gas_address, gas_pk = get_gas_station_address()
    
    if not gas_address:
        print("❌ Cannot derive gas station address - mnemonic missing!")
        return
    
    print(f"\n📍 Gas Station Address: {gas_address}")
    
    # Connect to BSC
    w3 = Web3(Web3.HTTPProvider(BSC_RPC_URL))
    
    if not w3.is_connected():
        print(f"❌ Cannot connect to BSC RPC: {BSC_RPC_URL}")
        return
    
    print(f"✅ Connected to BSC")
    
    # Check BNB balance
    balance_wei = w3.eth.get_balance(gas_address)
    balance_bnb = w3.from_wei(balance_wei, 'ether')
    
    print(f"\n💰 GAS STATION BALANCE:")
    print(f"   BNB: {balance_bnb:.6f}")
    print(f"   Wei: {balance_wei}")
    
    # Check if enough for gas
    MIN_GAS_BNB = 0.001  # Minimum BNB needed per transaction
    
    if balance_bnb < MIN_GAS_BNB:
        print(f"\n❌ INSUFFICIENT GAS!")
        print(f"   Need at least {MIN_GAS_BNB} BNB")
        print(f"   Current: {balance_bnb:.6f} BNB")
        print(f"\n⚠️ Send BNB to: {gas_address}")
    else:
        print(f"\n✅ Gas balance OK!")
        approx_txns = int(balance_bnb / MIN_GAS_BNB)
        print(f"   Can process ~{approx_txns} transactions")
    
    # Check USDT balance on gas station (shouldn't have any)
    USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955"  # BSC USDT
    
    usdt_abi = [{"constant":True,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}]
    
    try:
        usdt_contract = w3.eth.contract(address=Web3.to_checksum_address(USDT_CONTRACT), abi=usdt_abi)
        usdt_balance = usdt_contract.functions.balanceOf(gas_address).call()
        usdt_amount = usdt_balance / 10**18
        print(f"   USDT: {usdt_amount:.2f}")
    except Exception as e:
        print(f"   USDT check error: {e}")
    
    print("\n" + "="*60)
    print("📋 SUMMARY")
    print("="*60)
    
    if balance_bnb >= MIN_GAS_BNB:
        print("✅ Gas station has enough BNB for forwarding")
        print("✅ Auto-forward should work when new deposits arrive")
    else:
        print(f"❌ Need to fund gas station with BNB!")
        print(f"   Address: {gas_address}")
        print(f"   Send: 0.1 BNB (for ~100 transactions)")

if __name__ == "__main__":
    asyncio.run(check_balance())
