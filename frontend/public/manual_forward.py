#!/usr/bin/env python3
"""
Manual USDT Forward - Force forward stuck USDT to Admin wallet
Run: python3 manual_forward.py
"""

import asyncio
import os
from pathlib import Path
from web3 import Web3
from eth_account import Account

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

BSC_RPC_URL = os.environ.get('BSC_RPC_URL', 'https://bsc-dataseed1.binance.org/')
GAS_WALLET_MNEMONIC = os.environ.get('GAS_WALLET_MNEMONIC', '')
ADMIN_WALLET_BSC = os.environ.get('ADMIN_WALLET_BSC', '0x189aeffdf472b34450a7623e8f032d5a4ac256a2')
DEPOSIT_MASTER_SEED = os.environ.get('DEPOSIT_MASTER_SEED', '')

# BSC USDT Contract
USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955"

# The address with stuck USDT
STUCK_ADDRESS = "0x88F68046BfFfeAd87D70f02a6fdD7A479FF92319"

def get_gas_station():
    """Get gas station wallet from mnemonic"""
    from bip_utils import Bip39SeedGenerator, Bip44, Bip44Coins, Bip44Changes
    
    if not GAS_WALLET_MNEMONIC:
        return None, None
    
    seed = Bip39SeedGenerator(GAS_WALLET_MNEMONIC).Generate()
    bip44 = Bip44.FromSeed(seed, Bip44Coins.ETHEREUM)
    account = bip44.Purpose().Coin().Account(0).Change(Bip44Changes.CHAIN_EXT).AddressIndex(0)
    private_key = account.PrivateKey().Raw().ToHex()
    address = Account.from_key(private_key).address
    return address, private_key

async def main():
    print("\n" + "="*60)
    print("🚀 MANUAL USDT FORWARD")
    print("="*60)
    
    w3 = Web3(Web3.HTTPProvider(BSC_RPC_URL))
    
    if not w3.is_connected():
        print(f"❌ Cannot connect to BSC")
        return
    
    print(f"✅ Connected to BSC")
    print(f"📍 Target Address: {STUCK_ADDRESS}")
    print(f"📍 Admin Wallet: {ADMIN_WALLET_BSC}")
    
    # Get gas station
    gas_address, gas_pk = get_gas_station()
    print(f"⛽ Gas Station: {gas_address}")
    
    # Check USDT balance on stuck address
    usdt_abi = [
        {"constant":True,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},
        {"constant":False,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"type":"function"}
    ]
    
    usdt_contract = w3.eth.contract(address=Web3.to_checksum_address(USDT_CONTRACT), abi=usdt_abi)
    
    usdt_balance = usdt_contract.functions.balanceOf(Web3.to_checksum_address(STUCK_ADDRESS)).call()
    usdt_amount = usdt_balance / 10**18
    
    print(f"\n💰 USDT Balance: ${usdt_amount:.2f}")
    
    if usdt_amount < 1:
        print("❌ No USDT to forward!")
        return
    
    # Check BNB balance on stuck address
    bnb_balance = w3.eth.get_balance(Web3.to_checksum_address(STUCK_ADDRESS))
    bnb_amount = w3.from_wei(bnb_balance, 'ether')
    print(f"⛽ BNB Balance: {bnb_amount:.6f}")
    
    # Need to regenerate private key for stuck address
    # Using DEPOSIT_MASTER_SEED
    import hashlib
    
    print("\n🔑 Regenerating private key for stuck address...")
    
    # Try to find the user_id for this address from MongoDB
    from motor.motor_asyncio import AsyncIOMotorClient
    
    MONGO_URL = os.environ.get('MONGO_URL', '')
    DB_NAME = os.environ.get('DB_NAME', 'tgx_exchange')
    
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Find the deposit address record
    addr_doc = await db.deposit_addresses.find_one({
        "address": {"$regex": STUCK_ADDRESS, "$options": "i"}
    })
    
    if not addr_doc:
        print(f"❌ Address not found in database!")
        client.close()
        return
    
    user_id = addr_doc.get("user_id", "")
    stored_pk = addr_doc.get("private_key_encrypted", "")
    
    print(f"👤 User ID: {user_id[:20]}...")
    
    if stored_pk:
        print("✅ Private key found in database!")
        deposit_pk = stored_pk
    else:
        # Regenerate using master seed
        print("🔄 Regenerating private key from master seed...")
        
        if not DEPOSIT_MASTER_SEED:
            # Use mnemonic-derived seed
            seed_bytes = hashlib.sha256(GAS_WALLET_MNEMONIC.encode()).hexdigest()
        else:
            seed_bytes = DEPOSIT_MASTER_SEED
        
        master_seed = bytes.fromhex(seed_bytes) if len(seed_bytes) == 64 else seed_bytes.encode()
        
        user_hash = hashlib.sha256(f"{user_id}_evm_0".encode()).hexdigest()
        
        combined_seed = hashlib.pbkdf2_hmac(
            'sha512',
            master_seed + user_hash.encode(),
            b'evm_address_derivation',
            2048
        )
        
        deposit_pk = combined_seed[:32].hex()
        derived_account = Account.from_key(deposit_pk)
        
        if derived_account.address.lower() != STUCK_ADDRESS.lower():
            print(f"❌ Derived address mismatch!")
            print(f"   Expected: {STUCK_ADDRESS}")
            print(f"   Got: {derived_account.address}")
            client.close()
            return
        
        print(f"✅ Private key regenerated successfully!")
    
    # Create account from private key
    deposit_account = Account.from_key(deposit_pk)
    
    # Step 1: Send gas if needed
    MIN_GAS = 0.0001  # Minimum BNB for transfer
    
    if float(bnb_amount) < MIN_GAS:
        print(f"\n⛽ Sending gas to deposit address...")
        
        gas_station_account = Account.from_key(gas_pk)
        gas_to_send = w3.to_wei(0.0003, 'ether')  # ~$0.20 worth
        
        nonce = w3.eth.get_transaction_count(gas_station_account.address)
        gas_price = w3.eth.gas_price
        
        tx = {
            'nonce': nonce,
            'to': Web3.to_checksum_address(STUCK_ADDRESS),
            'value': gas_to_send,
            'gas': 21000,
            'gasPrice': gas_price,
            'chainId': 56
        }
        
        signed_tx = w3.eth.account.sign_transaction(tx, gas_pk)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        print(f"✅ Gas sent! TX: {tx_hash.hex()}")
        print("⏳ Waiting for confirmation...")
        
        await asyncio.sleep(5)
    
    # Step 2: Forward USDT to admin wallet
    print(f"\n💸 Forwarding ${usdt_amount:.2f} USDT to Admin wallet...")
    
    # Get fresh nonce
    nonce = w3.eth.get_transaction_count(deposit_account.address)
    gas_price = w3.eth.gas_price
    
    # Build USDT transfer transaction
    tx = usdt_contract.functions.transfer(
        Web3.to_checksum_address(ADMIN_WALLET_BSC),
        usdt_balance
    ).build_transaction({
        'from': deposit_account.address,
        'nonce': nonce,
        'gas': 100000,
        'gasPrice': gas_price,
        'chainId': 56
    })
    
    # Sign and send
    signed_tx = w3.eth.account.sign_transaction(tx, deposit_pk)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    
    print(f"\n✅ USDT FORWARDED!")
    print(f"📝 TX Hash: {tx_hash.hex()}")
    print(f"💰 Amount: ${usdt_amount:.2f} USDT")
    print(f"📍 To: {ADMIN_WALLET_BSC}")
    
    # Verify
    print("\n⏳ Waiting for confirmation...")
    await asyncio.sleep(10)
    
    # Check new balance
    new_balance = usdt_contract.functions.balanceOf(Web3.to_checksum_address(STUCK_ADDRESS)).call()
    new_amount = new_balance / 10**18
    
    print(f"\n📊 New balance at stuck address: ${new_amount:.2f}")
    
    if new_amount < 1:
        print("✅ SUCCESS! USDT forwarded to admin wallet!")
    else:
        print("⚠️ Some USDT might still be remaining")
    
    client.close()
    print("\n" + "="*60)

if __name__ == "__main__":
    asyncio.run(main())
