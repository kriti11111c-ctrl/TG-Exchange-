"""
Unique Deposit Address System
- Generate unique deposit addresses per user
- Monitor blockchain for incoming deposits
- Auto-forward to admin wallet
- Auto-credit user balance
"""

import os
import asyncio
import logging
import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, List
from bip_utils import Bip39SeedGenerator, Bip44, Bip44Coins, Bip44Changes
from eth_account import Account
from web3 import Web3
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Admin wallet addresses
ADMIN_WALLETS = {
    "bsc": os.environ.get("ADMIN_WALLET_BSC", ""),
    "eth": os.environ.get("ADMIN_WALLET_ETH", ""),
    "tron": os.environ.get("ADMIN_WALLET_TRON", ""),
    "solana": os.environ.get("ADMIN_WALLET_SOLANA", ""),
    "polygon": os.environ.get("ADMIN_WALLET_POLYGON", "")
}

# API Keys
ETHERSCAN_API_KEY = os.environ.get("ETHERSCAN_API_KEY", "")
TRONSCAN_API_KEY = os.environ.get("TRONSCAN_API_KEY", "")
SOLSCAN_API_KEY = os.environ.get("SOLSCAN_API_KEY", "")

# Network configurations
NETWORKS = {
    "bsc": {
        "name": "BNB Smart Chain",
        "short": "BSC (BEP20)",
        "rpc": "https://bsc-dataseed1.binance.org/",
        "scanner_api": "https://api.bscscan.com/api",
        "usdt_contract": "0x55d398326f99059fF775485246999027B3197955",
        "coin": Bip44Coins.ETHEREUM,
        "decimals": 18
    },
    "eth": {
        "name": "Ethereum",
        "short": "ERC20",
        "rpc": "https://eth.llamarpc.com",
        "scanner_api": "https://api.etherscan.io/api",
        "usdt_contract": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "coin": Bip44Coins.ETHEREUM,
        "decimals": 6
    },
    "polygon": {
        "name": "Polygon",
        "short": "MATIC",
        "rpc": "https://polygon-rpc.com/",
        "scanner_api": "https://api.polygonscan.com/api",
        "usdt_contract": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        "coin": Bip44Coins.ETHEREUM,
        "decimals": 6
    },
    "tron": {
        "name": "TRON",
        "short": "TRC20",
        "scanner_api": "https://apilist.tronscanapi.com/api",
        "usdt_contract": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        "decimals": 6
    },
    "solana": {
        "name": "Solana",
        "short": "SOL",
        "rpc": "https://api.mainnet-beta.solana.com",
        "scanner_api": "https://api.solscan.io",
        "usdt_contract": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        "decimals": 6
    }
}


class DepositAddressGenerator:
    """Generate unique deposit addresses for users"""
    
    def __init__(self, master_seed: str = None):
        """
        Initialize with master seed or generate new one
        """
        if master_seed:
            self.master_seed = master_seed
        else:
            # Generate random master seed if not provided
            self.master_seed = secrets.token_hex(32)
        
        # Generate seed bytes from mnemonic-like approach
        seed_bytes = hashlib.pbkdf2_hmac(
            'sha512',
            self.master_seed.encode(),
            b'tgexchange_deposit_salt',
            2048
        )
        self.seed_bytes = seed_bytes[:64]
    
    def generate_evm_address(self, user_id: str, network: str, index: int = 0) -> Dict:
        """Generate EVM-compatible address (BSC, ETH, Polygon)"""
        try:
            # Create unique derivation based on user_id
            user_hash = hashlib.sha256(f"{user_id}_{network}_{index}".encode()).hexdigest()
            
            # Use user hash to derive private key deterministically
            combined_seed = hashlib.pbkdf2_hmac(
                'sha512',
                self.seed_bytes + user_hash.encode(),
                b'evm_address_derivation',
                2048
            )
            
            # Take first 32 bytes as private key
            private_key = combined_seed[:32].hex()
            
            # Generate account from private key
            account = Account.from_key(private_key)
            
            return {
                "address": account.address,
                "private_key": private_key,
                "network": network,
                "user_id": user_id
            }
        except Exception as e:
            logger.error(f"Error generating EVM address: {e}")
            return None
    
    def generate_tron_address(self, user_id: str, index: int = 0) -> Dict:
        """Generate TRON address"""
        try:
            from tronpy.keys import PrivateKey
            
            # Create unique derivation based on user_id
            user_hash = hashlib.sha256(f"{user_id}_tron_{index}".encode()).hexdigest()
            
            # Derive private key
            combined_seed = hashlib.pbkdf2_hmac(
                'sha512',
                self.seed_bytes + user_hash.encode(),
                b'tron_address_derivation',
                2048
            )
            
            # Take first 32 bytes as private key
            private_key_bytes = combined_seed[:32]
            private_key = PrivateKey(private_key_bytes)
            
            return {
                "address": private_key.public_key.to_base58check_address(),
                "private_key": private_key_bytes.hex(),
                "network": "tron",
                "user_id": user_id
            }
        except Exception as e:
            logger.error(f"Error generating TRON address: {e}")
            return None
    
    def generate_solana_address(self, user_id: str, index: int = 0) -> Dict:
        """Generate Solana address"""
        try:
            from solders.keypair import Keypair
            
            # Create unique derivation based on user_id
            user_hash = hashlib.sha256(f"{user_id}_solana_{index}".encode()).hexdigest()
            
            # Derive seed
            combined_seed = hashlib.pbkdf2_hmac(
                'sha512',
                self.seed_bytes + user_hash.encode(),
                b'solana_address_derivation',
                2048
            )
            
            # Create keypair from seed
            keypair = Keypair.from_seed(combined_seed[:32])
            
            return {
                "address": str(keypair.pubkey()),
                "private_key": combined_seed[:32].hex(),
                "network": "solana",
                "user_id": user_id
            }
        except Exception as e:
            logger.error(f"Error generating Solana address: {e}")
            return None
    
    def generate_deposit_address(self, user_id: str, network: str, index: int = 0) -> Dict:
        """Generate deposit address for any supported network"""
        network = network.lower()
        
        if network in ["bsc", "eth", "polygon"]:
            return self.generate_evm_address(user_id, network, index)
        elif network == "tron":
            return self.generate_tron_address(user_id, index)
        elif network == "solana":
            return self.generate_solana_address(user_id, index)
        else:
            logger.error(f"Unsupported network: {network}")
            return None


class BlockchainMonitor:
    """Monitor blockchain for incoming deposits"""
    
    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=30.0)
    
    async def check_evm_deposits(self, address: str, network: str, usdt_contract: str) -> List[Dict]:
        """Check for USDT deposits on EVM chains"""
        try:
            api_url = NETWORKS[network]["scanner_api"]
            
            params = {
                "module": "account",
                "action": "tokentx",
                "contractaddress": usdt_contract,
                "address": address,
                "sort": "desc",
                "apikey": ETHERSCAN_API_KEY
            }
            
            response = await self.http_client.get(api_url, params=params)
            data = response.json()
            
            if data.get("status") == "1":
                transactions = []
                for tx in data.get("result", [])[:10]:
                    if tx.get("to", "").lower() == address.lower():
                        decimals = NETWORKS[network]["decimals"]
                        amount = int(tx.get("value", 0)) / (10 ** decimals)
                        transactions.append({
                            "tx_hash": tx.get("hash"),
                            "from": tx.get("from"),
                            "to": tx.get("to"),
                            "amount": amount,
                            "timestamp": int(tx.get("timeStamp", 0)),
                            "confirmations": int(tx.get("confirmations", 0)),
                            "network": network
                        })
                return transactions
            return []
        except Exception as e:
            logger.error(f"Error checking EVM deposits for {network}: {e}")
            return []
    
    async def check_tron_deposits(self, address: str) -> List[Dict]:
        """Check for USDT deposits on TRON"""
        try:
            api_url = f"https://apilist.tronscanapi.com/api/token_trc20/transfers"
            
            params = {
                "relatedAddress": address,
                "limit": 10,
                "contract_address": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
            }
            
            headers = {"TRON-PRO-API-KEY": TRONSCAN_API_KEY}
            
            response = await self.http_client.get(api_url, params=params, headers=headers)
            data = response.json()
            
            transactions = []
            for tx in data.get("token_transfers", []):
                if tx.get("to_address") == address:
                    amount = int(tx.get("quant", 0)) / (10 ** 6)
                    transactions.append({
                        "tx_hash": tx.get("transaction_id"),
                        "from": tx.get("from_address"),
                        "to": tx.get("to_address"),
                        "amount": amount,
                        "timestamp": int(tx.get("block_ts", 0)) // 1000,
                        "confirmations": tx.get("confirmed", False),
                        "network": "tron"
                    })
            return transactions
        except Exception as e:
            logger.error(f"Error checking TRON deposits: {e}")
            return []
    
    async def check_solana_deposits(self, address: str) -> List[Dict]:
        """Check for USDT deposits on Solana"""
        try:
            api_url = f"https://api.solscan.io/account/token/txs"
            
            params = {
                "address": address,
                "token": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
                "limit": 10
            }
            
            headers = {"token": SOLSCAN_API_KEY}
            
            response = await self.http_client.get(api_url, params=params, headers=headers)
            data = response.json()
            
            transactions = []
            for tx in data.get("data", []):
                if tx.get("dst") == address:
                    amount = float(tx.get("amount", 0)) / (10 ** 6)
                    transactions.append({
                        "tx_hash": tx.get("txHash"),
                        "from": tx.get("src"),
                        "to": tx.get("dst"),
                        "amount": amount,
                        "timestamp": int(tx.get("blockTime", 0)),
                        "confirmations": True,
                        "network": "solana"
                    })
            return transactions
        except Exception as e:
            logger.error(f"Error checking Solana deposits: {e}")
            return []
    
    async def check_deposits(self, address: str, network: str) -> List[Dict]:
        """Check deposits for any network"""
        network = network.lower()
        
        if network in ["bsc", "eth", "polygon"]:
            usdt_contract = NETWORKS[network]["usdt_contract"]
            return await self.check_evm_deposits(address, network, usdt_contract)
        elif network == "tron":
            return await self.check_tron_deposits(address)
        elif network == "solana":
            return await self.check_solana_deposits(address)
        
        return []
    
    async def close(self):
        await self.http_client.aclose()


# Initialize global instances
MASTER_SEED = os.environ.get("DEPOSIT_MASTER_SEED", secrets.token_hex(32))
address_generator = DepositAddressGenerator(MASTER_SEED)
blockchain_monitor = BlockchainMonitor()


async def get_or_create_deposit_address(db, user_id: str, network: str) -> Dict:
    """Get existing or create new deposit address for user"""
    network = network.lower()
    
    # Check if address already exists
    existing = await db.deposit_addresses.find_one({
        "user_id": user_id,
        "network": network,
        "is_active": True
    })
    
    if existing:
        return {
            "address": existing["address"],
            "network": network,
            "network_name": NETWORKS.get(network, {}).get("name", network.upper()),
            "network_short": NETWORKS.get(network, {}).get("short", network.upper())
        }
    
    # Generate new address
    address_data = address_generator.generate_deposit_address(user_id, network)
    
    if not address_data:
        return None
    
    # Save to database
    await db.deposit_addresses.insert_one({
        "user_id": user_id,
        "network": network,
        "address": address_data["address"],
        "private_key_encrypted": address_data["private_key"],  # Should encrypt in production
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "total_deposited": 0
    })
    
    return {
        "address": address_data["address"],
        "network": network,
        "network_name": NETWORKS.get(network, {}).get("name", network.upper()),
        "network_short": NETWORKS.get(network, {}).get("short", network.upper())
    }


async def check_and_process_deposits(db):
    """Background task to check and process all pending deposits"""
    try:
        # Get all active deposit addresses
        addresses = await db.deposit_addresses.find({"is_active": True}).to_list(1000)
        
        for addr_doc in addresses:
            address = addr_doc["address"]
            network = addr_doc["network"]
            user_id = addr_doc["user_id"]
            
            # Check for new deposits
            deposits = await blockchain_monitor.check_deposits(address, network)
            
            for deposit in deposits:
                tx_hash = deposit["tx_hash"]
                amount = deposit["amount"]
                
                # Check if already processed
                existing = await db.processed_deposits.find_one({"tx_hash": tx_hash})
                if existing:
                    continue
                
                # Minimum deposit check
                if amount < 10:  # Minimum $10
                    continue
                
                # Record as processed
                await db.processed_deposits.insert_one({
                    "tx_hash": tx_hash,
                    "user_id": user_id,
                    "network": network,
                    "amount": amount,
                    "from_address": deposit["from"],
                    "to_address": deposit["to"],
                    "timestamp": deposit["timestamp"],
                    "processed_at": datetime.now(timezone.utc),
                    "status": "credited"
                })
                
                # Credit user's wallet
                await db.wallets.update_one(
                    {"user_id": user_id},
                    {"$inc": {"balances.usdt": amount}}
                )
                
                # Update deposit address total
                await db.deposit_addresses.update_one(
                    {"_id": addr_doc["_id"]},
                    {"$inc": {"total_deposited": amount}}
                )
                
                logger.info(f"Auto-credited {amount} USDT to user {user_id} from {network} tx {tx_hash}")
                
    except Exception as e:
        logger.error(f"Error in deposit processing: {e}")


# Export for use in main server
__all__ = [
    'get_or_create_deposit_address',
    'check_and_process_deposits',
    'blockchain_monitor',
    'NETWORKS',
    'ADMIN_WALLETS'
]
