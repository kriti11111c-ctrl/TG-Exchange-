"""
Unique Deposit Address System with Gas Station & Auto-Forward
- Generate unique deposit addresses per user
- Monitor blockchain for incoming deposits
- Auto-send gas from Gas Fee Wallet to user's deposit address
- Auto-forward USDT to Admin wallet
"""

import os
import asyncio
import logging
import hashlib
import secrets
from datetime import datetime, timezone
from typing import Optional, Dict, List
from bip_utils import Bip39SeedGenerator, Bip39MnemonicGenerator, Bip44, Bip44Coins, Bip44Changes
from eth_account import Account
from web3 import Web3
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Admin wallet addresses (where USDT will be forwarded)
ADMIN_WALLETS = {
    "bsc": os.environ.get("ADMIN_WALLET_BSC", "0x189aeffdf472b34450a7623e8f032d5a4ac256a2"),
    "eth": os.environ.get("ADMIN_WALLET_ETH", "0x189aeffdf472b34450a7623e8f032d5a4ac256a2"),
    "tron": os.environ.get("ADMIN_WALLET_TRON", "TDqncKUgq4PpCpfZwsXeupQ5SnRKEsG9qV"),
    "solana": os.environ.get("ADMIN_WALLET_SOLANA", "6FQY4KqjyBUELJynQZXfgcC2zseURQQASBY5rJsSUHmR"),
    "polygon": os.environ.get("ADMIN_WALLET_POLYGON", "0x189aeffdf472b34450a7623e8f032d5a4ac256a2")
}

# Gas Fee Wallet Mnemonic
GAS_WALLET_MNEMONIC = os.environ.get("GAS_WALLET_MNEMONIC", "")

# API Keys
ETHERSCAN_API_KEY = os.environ.get("ETHERSCAN_API_KEY", "")
BSCSCAN_API_KEY = os.environ.get("ETHERSCAN_API_KEY", "")  # Using same key
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
        "decimals": 18,
        "gas_amount": 0.0005,  # BNB for gas
        "chain_id": 56
    },
    "eth": {
        "name": "Ethereum",
        "short": "ERC20",
        "rpc": "https://eth.llamarpc.com",
        "scanner_api": "https://api.etherscan.io/api",
        "usdt_contract": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "coin": Bip44Coins.ETHEREUM,
        "decimals": 6,
        "gas_amount": 0.002,  # ETH for gas
        "chain_id": 1
    },
    "polygon": {
        "name": "Polygon",
        "short": "MATIC",
        "rpc": "https://polygon-rpc.com/",
        "scanner_api": "https://api.polygonscan.com/api",
        "usdt_contract": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        "coin": Bip44Coins.ETHEREUM,
        "decimals": 6,
        "gas_amount": 0.01,  # MATIC for gas
        "chain_id": 137
    },
    "tron": {
        "name": "TRON",
        "short": "TRC20",
        "scanner_api": "https://apilist.tronscanapi.com/api",
        "usdt_contract": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        "decimals": 6,
        "gas_amount": 15  # TRX for energy
    },
    "solana": {
        "name": "Solana",
        "short": "SOL",
        "rpc": "https://api.mainnet-beta.solana.com",
        "scanner_api": "https://api.solscan.io",
        "usdt_contract": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        "decimals": 6,
        "gas_amount": 0.005  # SOL for fees
    }
}


class GasStationWallet:
    """Gas Fee Wallet for funding user deposit addresses"""
    
    def __init__(self, mnemonic: str):
        self.mnemonic = mnemonic
        self._evm_account = None
        self._tron_key = None
        self._solana_keypair = None
        
        if mnemonic:
            self._init_wallets()
    
    def _init_wallets(self):
        """Initialize wallet accounts from mnemonic"""
        try:
            from bip_utils import Bip39SeedGenerator, Bip44, Bip44Coins
            
            # Generate seed from mnemonic
            seed_bytes = Bip39SeedGenerator(self.mnemonic).Generate()
            
            # EVM wallet (BSC, ETH, Polygon - same address)
            bip44_ctx = Bip44.FromSeed(seed_bytes, Bip44Coins.ETHEREUM)
            bip44_acc = bip44_ctx.Purpose().Coin().Account(0).Change(Bip44Changes.CHAIN_EXT).AddressIndex(0)
            evm_private_key = bip44_acc.PrivateKey().Raw().ToHex()
            self._evm_account = Account.from_key(evm_private_key)
            
            logger.info(f"Gas Station EVM Address: {self._evm_account.address}")
            
            # TRON wallet
            try:
                from tronpy.keys import PrivateKey
                bip44_tron = Bip44.FromSeed(seed_bytes, Bip44Coins.TRON)
                bip44_tron_acc = bip44_tron.Purpose().Coin().Account(0).Change(Bip44Changes.CHAIN_EXT).AddressIndex(0)
                tron_key_bytes = bip44_tron_acc.PrivateKey().Raw().ToBytes()
                self._tron_key = PrivateKey(tron_key_bytes)
                logger.info(f"Gas Station TRON Address: {self._tron_key.public_key.to_base58check_address()}")
            except Exception as e:
                logger.warning(f"Could not init TRON wallet: {e}")
            
            # Solana wallet
            try:
                from solders.keypair import Keypair
                bip44_sol = Bip44.FromSeed(seed_bytes, Bip44Coins.SOLANA)
                bip44_sol_acc = bip44_sol.Purpose().Coin().Account(0).Change(Bip44Changes.CHAIN_EXT).AddressIndex(0)
                sol_key_bytes = bip44_sol_acc.PrivateKey().Raw().ToBytes()
                self._solana_keypair = Keypair.from_seed(sol_key_bytes[:32])
                logger.info(f"Gas Station Solana Address: {self._solana_keypair.pubkey()}")
            except Exception as e:
                logger.warning(f"Could not init Solana wallet: {e}")
                
        except Exception as e:
            logger.error(f"Error initializing gas station wallets: {e}")
    
    async def send_gas_evm(self, to_address: str, network: str) -> bool:
        """Send gas (native token) to an address on EVM chain"""
        try:
            if not self._evm_account:
                logger.error("EVM account not initialized")
                return False
            
            net_config = NETWORKS.get(network)
            if not net_config:
                return False
            
            w3 = Web3(Web3.HTTPProvider(net_config["rpc"]))
            
            # Check gas station balance
            gas_balance = w3.eth.get_balance(self._evm_account.address)
            gas_amount_wei = w3.to_wei(net_config["gas_amount"], 'ether')
            
            if gas_balance < gas_amount_wei:
                logger.warning(f"Gas station low on {network}: {w3.from_wei(gas_balance, 'ether')}")
                return False
            
            # Build transaction
            nonce = w3.eth.get_transaction_count(self._evm_account.address)
            gas_price = w3.eth.gas_price
            
            tx = {
                'nonce': nonce,
                'to': to_address,
                'value': gas_amount_wei,
                'gas': 21000,
                'gasPrice': gas_price,
                'chainId': net_config["chain_id"]
            }
            
            # Sign and send
            signed_tx = w3.eth.account.sign_transaction(tx, self._evm_account.key)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            logger.info(f"Gas sent to {to_address} on {network}: {tx_hash.hex()}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending gas on {network}: {e}")
            return False
    
    def get_evm_address(self) -> str:
        """Get EVM gas station address"""
        if self._evm_account:
            return self._evm_account.address
        return ""
    
    def get_tron_address(self) -> str:
        """Get TRON gas station address"""
        if self._tron_key:
            return self._tron_key.public_key.to_base58check_address()
        return ""


class DepositAddressGenerator:
    """Generate unique deposit addresses for users"""
    
    def __init__(self, master_seed: str = None):
        if master_seed:
            self.master_seed = master_seed
        else:
            self.master_seed = secrets.token_hex(32)
        
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
            user_hash = hashlib.sha256(f"{user_id}_{network}_{index}".encode()).hexdigest()
            
            combined_seed = hashlib.pbkdf2_hmac(
                'sha512',
                self.seed_bytes + user_hash.encode(),
                b'evm_address_derivation',
                2048
            )
            
            private_key = combined_seed[:32].hex()
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
            
            user_hash = hashlib.sha256(f"{user_id}_tron_{index}".encode()).hexdigest()
            
            combined_seed = hashlib.pbkdf2_hmac(
                'sha512',
                self.seed_bytes + user_hash.encode(),
                b'tron_address_derivation',
                2048
            )
            
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
            
            user_hash = hashlib.sha256(f"{user_id}_solana_{index}".encode()).hexdigest()
            
            combined_seed = hashlib.pbkdf2_hmac(
                'sha512',
                self.seed_bytes + user_hash.encode(),
                b'solana_address_derivation',
                2048
            )
            
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
    
    async def check_evm_deposits(self, address: str, network: str) -> List[Dict]:
        """Check for USDT deposits on EVM chains"""
        try:
            net_config = NETWORKS.get(network)
            if not net_config:
                return []
            
            api_url = net_config["scanner_api"]
            usdt_contract = net_config["usdt_contract"]
            
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
                        decimals = net_config["decimals"]
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
            
            headers = {"TRON-PRO-API-KEY": TRONSCAN_API_KEY} if TRONSCAN_API_KEY else {}
            
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
                        "confirmations": 1 if tx.get("confirmed") else 0,
                        "network": "tron"
                    })
            return transactions
        except Exception as e:
            logger.error(f"Error checking TRON deposits: {e}")
            return []
    
    async def check_deposits(self, address: str, network: str) -> List[Dict]:
        """Check deposits for any network"""
        network = network.lower()
        
        if network in ["bsc", "eth", "polygon"]:
            return await self.check_evm_deposits(address, network)
        elif network == "tron":
            return await self.check_tron_deposits(address)
        
        return []
    
    async def close(self):
        await self.http_client.aclose()


class USDTForwarder:
    """Forward USDT from user deposit address to admin wallet"""
    
    @staticmethod
    async def forward_evm_usdt(private_key: str, network: str, amount: float) -> bool:
        """Forward USDT on EVM chains"""
        try:
            net_config = NETWORKS.get(network)
            if not net_config:
                return False
            
            w3 = Web3(Web3.HTTPProvider(net_config["rpc"]))
            account = Account.from_key(private_key)
            
            # USDT contract ABI (transfer function only)
            usdt_abi = [
                {
                    "constant": False,
                    "inputs": [
                        {"name": "_to", "type": "address"},
                        {"name": "_value", "type": "uint256"}
                    ],
                    "name": "transfer",
                    "outputs": [{"name": "", "type": "bool"}],
                    "type": "function"
                }
            ]
            
            usdt_contract = w3.eth.contract(
                address=Web3.to_checksum_address(net_config["usdt_contract"]),
                abi=usdt_abi
            )
            
            # Calculate amount in token decimals
            decimals = net_config["decimals"]
            amount_wei = int(amount * (10 ** decimals))
            
            # Get admin wallet
            admin_wallet = ADMIN_WALLETS.get(network)
            if not admin_wallet:
                return False
            
            # Build transaction
            nonce = w3.eth.get_transaction_count(account.address)
            gas_price = w3.eth.gas_price
            
            tx = usdt_contract.functions.transfer(
                Web3.to_checksum_address(admin_wallet),
                amount_wei
            ).build_transaction({
                'from': account.address,
                'nonce': nonce,
                'gas': 100000,
                'gasPrice': gas_price,
                'chainId': net_config["chain_id"]
            })
            
            # Sign and send
            signed_tx = w3.eth.account.sign_transaction(tx, private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            logger.info(f"USDT forwarded on {network}: {tx_hash.hex()}")
            return True
            
        except Exception as e:
            logger.error(f"Error forwarding USDT on {network}: {e}")
            return False


# Initialize global instances
MASTER_SEED = os.environ.get("DEPOSIT_MASTER_SEED", secrets.token_hex(32))
address_generator = DepositAddressGenerator(MASTER_SEED)
blockchain_monitor = BlockchainMonitor()
gas_station = GasStationWallet(GAS_WALLET_MNEMONIC)


async def get_or_create_deposit_address(db, user_id: str, network: str) -> Dict:
    """Get existing or create new deposit address for user"""
    network = network.lower()
    
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
    
    address_data = address_generator.generate_deposit_address(user_id, network)
    
    if not address_data:
        return None
    
    await db.deposit_addresses.insert_one({
        "user_id": user_id,
        "network": network,
        "address": address_data["address"],
        "private_key_encrypted": address_data["private_key"],
        "is_active": True,
        "created_at": datetime.now(timezone.utc),
        "total_deposited": 0,
        "gas_funded": False
    })
    
    return {
        "address": address_data["address"],
        "network": network,
        "network_name": NETWORKS.get(network, {}).get("name", network.upper()),
        "network_short": NETWORKS.get(network, {}).get("short", network.upper())
    }


async def check_and_process_deposits(db):
    """Background task to check and process all pending deposits with auto-forwarding"""
    try:
        addresses = await db.deposit_addresses.find({"is_active": True}).to_list(1000)
        
        for addr_doc in addresses:
            address = addr_doc["address"]
            network = addr_doc["network"]
            user_id = addr_doc["user_id"]
            private_key = addr_doc.get("private_key_encrypted", "")
            
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
                if amount < 10:
                    continue
                
                logger.info(f"New deposit detected: {amount} USDT from {deposit['from']} on {network}")
                
                # Record as processing
                await db.processed_deposits.insert_one({
                    "tx_hash": tx_hash,
                    "user_id": user_id,
                    "network": network,
                    "amount": amount,
                    "from_address": deposit["from"],
                    "to_address": deposit["to"],
                    "timestamp": deposit["timestamp"],
                    "detected_at": datetime.now(timezone.utc),
                    "status": "detected",
                    "gas_sent": False,
                    "forwarded": False
                })
                
                # Step 1: Send gas to user's deposit address (for EVM chains)
                if network in ["bsc", "eth", "polygon"] and private_key:
                    gas_sent = await gas_station.send_gas_evm(address, network)
                    
                    if gas_sent:
                        await db.processed_deposits.update_one(
                            {"tx_hash": tx_hash},
                            {"$set": {"gas_sent": True, "status": "gas_funded"}}
                        )
                        
                        # Wait for gas to arrive
                        await asyncio.sleep(5)
                        
                        # Step 2: Forward USDT to admin wallet
                        forwarded = await USDTForwarder.forward_evm_usdt(private_key, network, amount)
                        
                        if forwarded:
                            await db.processed_deposits.update_one(
                                {"tx_hash": tx_hash},
                                {"$set": {"forwarded": True, "status": "forwarded"}}
                            )
                
                # Credit user's wallet (regardless of forwarding status)
                await db.wallets.update_one(
                    {"user_id": user_id},
                    {"$inc": {"balances.usdt": amount}}
                )
                
                await db.processed_deposits.update_one(
                    {"tx_hash": tx_hash},
                    {"$set": {"status": "credited", "credited_at": datetime.now(timezone.utc)}}
                )
                
                await db.deposit_addresses.update_one(
                    {"_id": addr_doc["_id"]},
                    {"$inc": {"total_deposited": amount}}
                )
                
                logger.info(f"Credited {amount} USDT to user {user_id} from {network}")
                
    except Exception as e:
        logger.error(f"Error in deposit processing: {e}")


# Export
__all__ = [
    'get_or_create_deposit_address',
    'check_and_process_deposits',
    'blockchain_monitor',
    'gas_station',
    'NETWORKS',
    'ADMIN_WALLETS'
]
