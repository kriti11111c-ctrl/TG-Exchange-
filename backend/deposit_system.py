"""
Unique Deposit Address System with Gas Station & Auto-Forward
- Generate unique deposit addresses per user
- Monitor blockchain for incoming deposits
- Auto-send gas from Gas Fee Wallet to user's deposit address
- Auto-forward USDT to Admin wallet
- Daily Salary Credit at Midnight (12:00 AM IST)
"""

import os
import asyncio
import logging
import hashlib
import secrets
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, List
from bip_utils import Bip39SeedGenerator, Bip39MnemonicGenerator, Bip44, Bip44Coins, Bip44Changes
from eth_account import Account
from web3 import Web3
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Referral bonus rate (5% on first deposit)
DIRECT_REFERRAL_BONUS_PERCENT = 0.05

# Team Rank Monthly Salaries (same as server.py)
TEAM_RANK_SALARIES = {
    1: 30,    # Bronze
    2: 100,   # Silver
    3: 250,   # Gold
    4: 500,   # Platinum
    5: 1000,  # Diamond
    6: 2000,  # Master
    7: 4000,  # Grandmaster
    8: 7000,  # Champion
    9: 12000, # Legend
    10: 20000 # Immortal
}

TEAM_RANK_NAMES = {
    1: "Bronze",
    2: "Silver", 
    3: "Gold",
    4: "Platinum",
    5: "Diamond",
    6: "Master",
    7: "Grandmaster",
    8: "Champion",
    9: "Legend",
    10: "Immortal"
}

# Self Deposit Required to MAINTAIN Rank (Futures Balance)
RANK_SELF_DEPOSIT_REQUIRED = {
    1: 50,      # Bronze - $50
    2: 200,     # Silver - $200
    3: 500,     # Gold - $500
    4: 1000,    # Platinum - $1K
    5: 2000,    # Diamond - $2K
    6: 5000,    # Master - $5K
    7: 10000,   # Grandmaster - $10K
    8: 15000,   # Champion - $15K
    9: 30000,   # Legend - $30K
    10: 50000   # Immortal - $50K
}

# Team Rank Requirements (same as server.py)
MIN_DEPOSIT_FOR_RANK = 50.0

TEAM_RANKS = [
    {"level": 1, "name": "Bronze", "type": "team", "team_required": 6, "bronze_required": 0, "direct_required": 0, "levelup_reward": 20},
    {"level": 2, "name": "Silver", "type": "bronze", "team_required": 30, "bronze_required": 2, "direct_required": 0, "levelup_reward": 100},
    {"level": 3, "name": "Gold", "type": "bronze", "team_required": 75, "bronze_required": 3, "direct_required": 0, "levelup_reward": 240},
    {"level": 4, "name": "Platinum", "type": "bronze", "team_required": 150, "bronze_required": 4, "direct_required": 0, "levelup_reward": 500},
    {"level": 5, "name": "Diamond", "type": "bronze", "team_required": 300, "bronze_required": 5, "direct_required": 0, "levelup_reward": 975},
    {"level": 6, "name": "Master", "type": "bronze", "team_required": 500, "bronze_required": 6, "direct_required": 0, "levelup_reward": 2000},
    {"level": 7, "name": "Grandmaster", "type": "bronze", "team_required": 1000, "bronze_required": 7, "direct_required": 0, "levelup_reward": 4000},
    {"level": 8, "name": "Champion", "type": "bronze", "team_required": 2000, "bronze_required": 8, "direct_required": 0, "levelup_reward": 7000},
    {"level": 9, "name": "Legend", "type": "bronze", "team_required": 5000, "bronze_required": 9, "direct_required": 0, "levelup_reward": 12000},
    {"level": 10, "name": "Immortal", "type": "bronze", "team_required": 10000, "bronze_required": 10, "direct_required": 0, "levelup_reward": 20000},
]

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

# Network configurations - OPTIMIZED GAS AMOUNTS (minimal for 1 token transfer)
# Using reliable free RPC endpoints
NETWORKS = {
    "bsc": {
        "name": "BNB Smart Chain",
        "short": "BSC (BEP20)",
        "rpc": "https://bsc-dataseed1.binance.org/",
        "rpc_backup": ["https://bsc-dataseed2.binance.org/", "https://bsc-dataseed3.binance.org/", "https://bsc-dataseed4.binance.org/"],
        "scanner_api": "https://api.bscscan.com/api",
        "usdt_contract": "0x55d398326f99059fF775485246999027B3197955",
        "coin": Bip44Coins.ETHEREUM,
        "decimals": 18,
        "gas_amount": 0.00015,  # ~$0.09 - enough for 1 USDT transfer
        "min_gas_required": 0.00008,  # minimum BNB needed to do transfer
        "chain_id": 56
    },
    "eth": {
        "name": "Ethereum",
        "short": "ERC20",
        "rpc": "https://ethereum.publicnode.com",
        "rpc_backup": ["https://eth.drpc.org", "https://rpc.ankr.com/eth", "https://1rpc.io/eth"],
        "scanner_api": "https://api.etherscan.io/api",
        "usdt_contract": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        "coin": Bip44Coins.ETHEREUM,
        "decimals": 6,
        "gas_amount": 0.0008,  # ~$2.50 - ETH gas is expensive
        "min_gas_required": 0.0005,
        "chain_id": 1
    },
    "polygon": {
        "name": "Polygon",
        "short": "MATIC",
        "rpc": "https://polygon.publicnode.com",
        "rpc_backup": ["https://polygon.drpc.org", "https://rpc.ankr.com/polygon", "https://1rpc.io/matic"],
        "scanner_api": "https://api.polygonscan.com/api",
        "usdt_contract": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        "coin": Bip44Coins.ETHEREUM,
        "decimals": 6,
        "gas_amount": 0.002,  # ~$0.002 - MATIC is very cheap
        "min_gas_required": 0.001,
        "chain_id": 137
    },
    "tron": {
        "name": "TRON",
        "short": "TRC20",
        "scanner_api": "https://apilist.tronscanapi.com/api",
        "usdt_contract": "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
        "decimals": 6,
        "gas_amount": 5,  # TRX - minimal amount (stake TRX for free energy)
        "min_gas_required": 2  # Minimum TRX needed
    },
    "solana": {
        "name": "Solana",
        "short": "SOL",
        "rpc": "https://api.mainnet-beta.solana.com",
        "scanner_api": "https://api.solscan.io",
        "usdt_contract": "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
        "decimals": 6,
        "gas_amount": 0.001  # ~$0.15 - SOL fees are low
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
        """Send gas (native token) to an address on EVM chain - SMART VERSION
        Only sends gas if the address doesn't have enough already"""
        try:
            if not self._evm_account:
                logger.error("EVM account not initialized")
                return False
            
            net_config = NETWORKS.get(network)
            if not net_config:
                return False
            
            w3 = Web3(Web3.HTTPProvider(net_config["rpc"]))
            to_address_checksum = w3.to_checksum_address(to_address)
            
            # Check if deposit address already has enough gas
            existing_balance = w3.eth.get_balance(to_address_checksum)
            min_required = w3.to_wei(net_config.get("min_gas_required", 0.00008), 'ether')
            
            if existing_balance >= min_required:
                logger.info(f"Address {to_address} already has enough gas: {w3.from_wei(existing_balance, 'ether')}")
                return True  # No need to send more gas
            
            # Calculate how much gas to send (only what's needed)
            gas_to_send = w3.to_wei(net_config["gas_amount"], 'ether')
            
            # Check gas station balance
            gas_station_balance = w3.eth.get_balance(self._evm_account.address)
            
            if gas_station_balance < gas_to_send:
                logger.warning(f"Gas station low on {network}: {w3.from_wei(gas_station_balance, 'ether')}")
                return False
            
            # Build transaction
            nonce = w3.eth.get_transaction_count(self._evm_account.address)
            gas_price = w3.eth.gas_price
            
            tx = {
                'nonce': nonce,
                'to': to_address_checksum,
                'value': gas_to_send,
                'gas': 21000,
                'gasPrice': gas_price,
                'chainId': net_config["chain_id"]
            }
            
            # Sign and send
            signed_tx = w3.eth.account.sign_transaction(tx, self._evm_account.key)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            logger.info(f"Gas sent to {to_address} on {network}: {tx_hash.hex()} Amount: {w3.from_wei(gas_to_send, 'ether')}")
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
        """Generate EVM-compatible address (BSC, ETH, Polygon) - SAME address for all EVM chains"""
        try:
            # Use 'evm' instead of network name so all EVM chains get SAME address
            user_hash = hashlib.sha256(f"{user_id}_evm_{index}".encode()).hexdigest()
            
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
        """Check for USDT deposits on EVM chains using direct Web3 balance check"""
        try:
            net_config = NETWORKS.get(network)
            if not net_config:
                return []
            
            # Use direct Web3 balance check instead of API (more reliable)
            w3 = Web3(Web3.HTTPProvider(net_config["rpc"]))
            usdt_contract = w3.to_checksum_address(net_config["usdt_contract"])
            address_checksum = w3.to_checksum_address(address)
            
            # ERC20 balanceOf ABI
            abi = [{'constant':True,'inputs':[{'name':'_owner','type':'address'}],'name':'balanceOf','outputs':[{'name':'balance','type':'uint256'}],'type':'function'}]
            contract = w3.eth.contract(address=usdt_contract, abi=abi)
            
            # Get current balance
            balance = contract.functions.balanceOf(address_checksum).call()
            decimals = net_config["decimals"]
            amount = balance / (10 ** decimals)
            
            logger.info(f"Direct balance check for {address} on {network}: {amount} USDT")
            
            # If balance > 0, return as a deposit
            # Use address + network + balance as unique identifier (NO timestamp!)
            if amount >= 10:  # Minimum $10
                # Create a consistent tx_hash that won't change for same balance
                balance_int = int(balance)  # Use raw balance for uniqueness
                return [{
                    "tx_hash": f"balance_{address}_{network}_{balance_int}",
                    "from": "direct_balance",
                    "to": address,
                    "amount": amount,
                    "timestamp": int(datetime.now().timestamp()),
                    "confirmations": 100,
                    "network": network
                }]
            
            # Also try BSCScan API as fallback
            try:
                api_url = net_config["scanner_api"]
                usdt_contract_addr = net_config["usdt_contract"]
                
                params = {
                    "module": "account",
                    "action": "tokentx",
                    "contractaddress": usdt_contract_addr,
                    "address": address,
                    "sort": "desc"
                }
                
                response = await self.http_client.get(api_url, params=params, timeout=10)
                data = response.json()
                
                if data.get("status") == "1":
                    transactions = []
                    for tx in data.get("result", [])[:10]:
                        if tx.get("to", "").lower() == address.lower():
                            tx_amount = int(tx.get("value", 0)) / (10 ** decimals)
                            if tx_amount >= 10:
                                transactions.append({
                                    "tx_hash": tx.get("hash"),
                                    "from": tx.get("from"),
                                    "to": tx.get("to"),
                                    "amount": tx_amount,
                                    "timestamp": int(tx.get("timeStamp", 0)),
                                    "confirmations": int(tx.get("confirmations", 0)),
                                    "network": network
                                })
                    if transactions:
                        return transactions
            except Exception as api_error:
                logger.warning(f"BSCScan API fallback failed: {api_error}")
            
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
        elif network == "solana":
            return await self.check_solana_deposits(address)
        
        return []
    
    async def check_solana_deposits(self, address: str) -> List[Dict]:
        """Check Solana USDT (SPL Token) deposits using Solana RPC"""
        try:
            # Solana USDT contract (SPL Token)
            usdt_mint = NETWORKS["solana"]["usdt_contract"]
            
            # Try multiple Solana RPC endpoints
            rpc_endpoints = [
                "https://api.mainnet-beta.solana.com",
                "https://solana-mainnet.g.alchemy.com/v2/demo",
                "https://rpc.ankr.com/solana"
            ]
            
            logger.info(f"Checking Solana deposits for {address}")
            
            for rpc_url in rpc_endpoints:
                try:
                    # Get token accounts using RPC
                    payload = {
                        "jsonrpc": "2.0",
                        "id": 1,
                        "method": "getTokenAccountsByOwner",
                        "params": [
                            address,
                            {"mint": usdt_mint},
                            {"encoding": "jsonParsed"}
                        ]
                    }
                    
                    response = await self.http_client.post(rpc_url, json=payload, timeout=15.0)
                    
                    if response.status_code == 200:
                        data = response.json()
                        result = data.get("result", {})
                        accounts = result.get("value", [])
                        
                        deposits = []
                        for account in accounts:
                            parsed = account.get("account", {}).get("data", {}).get("parsed", {})
                            info = parsed.get("info", {})
                            token_amount = info.get("tokenAmount", {})
                            amount = float(token_amount.get("uiAmount", 0))
                            
                            if amount > 0:
                                deposits.append({
                                    "tx_hash": f"sol_{address[:8]}_{int(datetime.now().timestamp())}",
                                    "from": "solana_deposit",
                                    "to": address,
                                    "amount": amount,
                                    "timestamp": int(datetime.now().timestamp()),
                                    "confirmations": 1,
                                    "network": "solana"
                                })
                                logger.info(f"Solana USDT balance for {address}: {amount}")
                        
                        return deposits
                        
                except Exception as rpc_error:
                    logger.warning(f"Solana RPC {rpc_url} failed: {rpc_error}")
                    continue
            
            return []
            
        except Exception as e:
            logger.error(f"Error checking Solana deposits: {e}")
            return []
    
    async def check_solana_deposits_helius(self, address: str) -> List[Dict]:
        """Fallback: Check Solana deposits using public RPC"""
        try:
            # Use Solana public RPC to get token accounts
            rpc_url = NETWORKS["solana"]["rpc"]
            usdt_mint = NETWORKS["solana"]["usdt_contract"]
            
            # Get token balance
            payload = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "getTokenAccountsByOwner",
                "params": [
                    address,
                    {"mint": usdt_mint},
                    {"encoding": "jsonParsed"}
                ]
            }
            
            response = await self.http_client.post(rpc_url, json=payload, timeout=30.0)
            
            if response.status_code == 200:
                data = response.json()
                result = data.get("result", {})
                accounts = result.get("value", [])
                
                for account in accounts:
                    parsed = account.get("account", {}).get("data", {}).get("parsed", {})
                    info = parsed.get("info", {})
                    token_amount = info.get("tokenAmount", {})
                    amount = float(token_amount.get("uiAmount", 0))
                    
                    if amount > 0:
                        logger.info(f"Solana USDT balance for {address}: {amount}")
            
            return []
            
        except Exception as e:
            logger.error(f"Error in Solana RPC check: {e}")
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
# Use GAS_WALLET_MNEMONIC as master seed (MUST be set in .env)
_mnemonic = os.environ.get("GAS_WALLET_MNEMONIC", "")
if _mnemonic:
    # Derive seed from mnemonic for consistent address generation
    import hashlib
    MASTER_SEED = hashlib.sha256(_mnemonic.encode()).hexdigest()
    logger.info("Using GAS_WALLET_MNEMONIC as master seed for address generation")
else:
    # Fallback - but this will cause issues! Log a warning
    MASTER_SEED = os.environ.get("DEPOSIT_MASTER_SEED", "")
    if not MASTER_SEED:
        logger.error("WARNING: No GAS_WALLET_MNEMONIC or DEPOSIT_MASTER_SEED set! Addresses will be unrecoverable!")
        MASTER_SEED = secrets.token_hex(32)
        
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


async def update_team_deposits_from_system(db, depositor_user_id: str, amount: float, timestamp):
    """
    Update team_deposits collection for all referrers up to 10 levels
    Called when auto-deposit is credited to user
    """
    try:
        visited = set()
        current_user_id = depositor_user_id
        level = 1
        
        while level <= 10 and current_user_id:
            # Find the referrer of current user
            ref_record = await db.referrals.find_one({"referred_id": current_user_id})
            if not ref_record:
                break
                
            referrer_id = ref_record.get("referrer_id")
            if not referrer_id or referrer_id in visited:
                break
                
            visited.add(referrer_id)
            
            # Create deposit entry
            deposit_entry = {
                "user_id": depositor_user_id,
                "amount": float(amount),
                "date": timestamp.isoformat(),
                "level": level
            }
            
            # Update team_deposits for this referrer
            await db.team_deposits.update_one(
                {"referrer_id": referrer_id},
                {
                    "$push": {"deposits": deposit_entry},
                    "$inc": {"total_deposits": float(amount)},
                    "$set": {"updated_at": timestamp.isoformat()}
                },
                upsert=True
            )
            
            # Move to next level
            current_user_id = referrer_id
            level += 1
            
        logger.info(f"✅ Team deposits updated for {len(visited)} referrers (auto-deposit: ${amount})")
        
    except Exception as e:
        logger.error(f"Error updating team deposits: {e}")


async def check_and_process_deposits(db):
    """Background task to check and process all pending deposits with auto-forwarding"""
    try:
        # Use the global address generator (now using GAS_WALLET_MNEMONIC)
        addr_gen = address_generator
        
        addresses = await db.deposit_addresses.find({"is_active": True}).to_list(1000)
        
        for addr_doc in addresses:
            address = addr_doc["address"]
            network = addr_doc["network"]
            user_id = addr_doc["user_id"]
            private_key = addr_doc.get("private_key_encrypted", "")
            
            # If private key not stored, regenerate it using the consistent address generator
            if not private_key and addr_gen and network in ["bsc", "eth", "polygon"]:
                addr_info = addr_gen.generate_evm_address(user_id, network, 0)
                if addr_info and addr_info["address"].lower() == address.lower():
                    private_key = addr_info["private_key"]
                    # Update stored key
                    await db.deposit_addresses.update_one(
                        {"_id": addr_doc["_id"]},
                        {"$set": {"private_key_encrypted": private_key}}
                    )
                    logger.info(f"Regenerated and stored private key for {address}")
                else:
                    logger.warning(f"Address mismatch for {user_id} on {network}: DB has {address}, generated {addr_info['address'] if addr_info else 'None'}")
            
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
                if network in ["bsc", "eth", "polygon"]:
                    # Get private key - MUST have it for forwarding
                    if not private_key:
                        logger.error(f"NO PRIVATE KEY for {address} - Cannot forward! User credited but USDT stuck.")
                        await db.processed_deposits.update_one(
                            {"tx_hash": tx_hash},
                            {"$set": {"status": "no_private_key", "error": "Private key missing"}}
                        )
                        # Still credit user but mark as stuck
                    else:
                        try:
                            gas_sent = await gas_station.send_gas_evm(address, network)
                            
                            if gas_sent:
                                await db.processed_deposits.update_one(
                                    {"tx_hash": tx_hash},
                                    {"$set": {"gas_sent": True, "status": "gas_funded"}}
                                )
                                logger.info(f"Gas sent to {address} on {network}")
                                
                                # Wait for gas to arrive
                                await asyncio.sleep(8)
                                
                                # Step 2: Forward USDT to admin wallet
                                try:
                                    forwarded = await USDTForwarder.forward_evm_usdt(private_key, network, amount)
                                    
                                    if forwarded:
                                        await db.processed_deposits.update_one(
                                            {"tx_hash": tx_hash},
                                            {"$set": {"forwarded": True, "status": "forwarded", "forwarded_at": datetime.now(timezone.utc)}}
                                        )
                                        logger.info(f"✅ USDT AUTO-FORWARDED: ${amount} on {network} to admin wallet")
                                    else:
                                        logger.warning(f"❌ USDT forward failed for {address} on {network}")
                                        await db.processed_deposits.update_one(
                                            {"tx_hash": tx_hash},
                                            {"$set": {"status": "forward_failed"}}
                                        )
                                except Exception as fwd_error:
                                    logger.error(f"Forward error: {fwd_error}")
                                    await db.processed_deposits.update_one(
                                        {"tx_hash": tx_hash},
                                        {"$set": {"status": "forward_error", "error": str(fwd_error)}}
                                    )
                            else:
                                logger.warning(f"Gas send failed for {address} on {network}")
                                await db.processed_deposits.update_one(
                                    {"tx_hash": tx_hash},
                                    {"$set": {"status": "gas_failed"}}
                                )
                        except Exception as gas_error:
                            logger.error(f"Gas send error: {gas_error}")
                            await db.processed_deposits.update_one(
                                {"tx_hash": tx_hash},
                                {"$set": {"status": "gas_error", "error": str(gas_error)}}
                            )
                
                # Credit user's wallet (regardless of forwarding status)
                # Check if this is first deposit for 5% referral bonus
                wallet = await db.wallets.find_one({"user_id": user_id})
                
                # Better check: see if referral bonus was EVER given for this user
                existing_bonus_given = await db.transactions.find_one({
                    "from_user_id": user_id,
                    "type": {"$in": ["first_deposit_referral_bonus", "referral_bonus_fix"]}
                })
                
                is_first_deposit = not existing_bonus_given
                
                # Update wallet with deposit
                update_ops = {
                    "$inc": {"balances.usdt": amount, "total_deposited": amount},
                    "$set": {"first_deposit_done": True}
                }
                
                await db.wallets.update_one(
                    {"user_id": user_id},
                    update_ops,
                    upsert=True
                )
                
                # 5% REFERRAL BONUS on first deposit
                if is_first_deposit:
                    user_doc = await db.users.find_one({"user_id": user_id})
                    referrer_id = user_doc.get("referred_by") if user_doc else None
                    
                    if referrer_id:
                        referral_bonus = round(amount * DIRECT_REFERRAL_BONUS_PERCENT, 2)  # 5%
                        
                        # Add bonus to referrer's Spot wallet
                        await db.wallets.update_one(
                            {"user_id": referrer_id},
                            {"$inc": {"balances.usdt": referral_bonus}},
                            upsert=True
                        )
                        
                        # Record bonus transaction with from_user_id for tracking
                        await db.transactions.insert_one({
                            "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
                            "user_id": referrer_id,
                            "from_user_id": user_id,  # Track who deposited
                            "type": "first_deposit_referral_bonus",
                            "coin": "usdt",
                            "amount": referral_bonus,
                            "note": f"5% bonus from {user_doc.get('name', user_id[:8])}'s first deposit of ${amount}",
                            "status": "completed",
                            "created_at": datetime.now(timezone.utc).isoformat()
                        })
                        
                        logger.info(f"AUTO 5% BONUS: Credited ${referral_bonus} USDT to {referrer_id} from {user_doc.get('name', user_id[:8])}'s deposit")
                
                await db.processed_deposits.update_one(
                    {"tx_hash": tx_hash},
                    {"$set": {"status": "credited", "credited_at": datetime.now(timezone.utc)}}
                )
                
                # UPDATE TEAM DEPOSITS - Track deposit for referral stats
                await update_team_deposits_from_system(db, user_id, amount, datetime.now(timezone.utc))
                
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
    'ADMIN_WALLETS',
    'midnight_salary_job',
    'hourly_rank_upgrade_job',
    'run_rank_upgrade_check',
    'auto_upgrade_user_rank'
]


async def credit_daily_salary(db):
    """
    Credit daily salary to all users who have achieved a team rank.
    Daily salary = Monthly salary / 30
    Runs at 12:00 AM IST every day.
    
    IMPORTANT: User must maintain required self deposit (futures balance) to receive salary.
    """
    try:
        # Find all users with team rank >= 1
        ranked_users = await db.users.find(
            {"team_rank_level": {"$gte": 1}},
            {"_id": 0, "user_id": 1, "username": 1, "team_rank_level": 1}
        ).to_list(length=10000)
        
        credited_count = 0
        skipped_count = 0
        total_salary_distributed = 0
        
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        
        for user in ranked_users:
            user_id = user["user_id"]
            rank_level = user.get("team_rank_level", 0)
            username = user.get("username", "Unknown")
            
            if rank_level < 1 or rank_level > 10:
                continue
            
            # Check if salary already credited today
            existing_salary = await db.transactions.find_one({
                "user_id": user_id,
                "type": "daily_rank_salary",
                "date": today
            })
            
            if existing_salary:
                logger.info(f"Salary already credited today for {username}")
                continue
            
            # CHECK SELF DEPOSIT REQUIREMENT
            wallet = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
            if wallet:
                futures_balance = wallet.get("futures_balance", 0) or 0
                required_deposit = RANK_SELF_DEPOSIT_REQUIRED.get(rank_level, 0)
                
                if futures_balance < required_deposit:
                    rank_name = TEAM_RANK_NAMES.get(rank_level, f"Level {rank_level}")
                    logger.info(f"SKIPPED salary for {username} ({rank_name}): Futures balance ${futures_balance} < required ${required_deposit}")
                    skipped_count += 1
                    continue
            else:
                # No wallet = no deposit = skip
                logger.info(f"SKIPPED salary for {username}: No wallet found")
                skipped_count += 1
                continue
            
            # Calculate daily salary
            monthly_salary = TEAM_RANK_SALARIES.get(rank_level, 0)
            daily_salary = round(monthly_salary / 30, 2)
            
            if daily_salary <= 0:
                continue
            
            # Credit salary to wallet
            await db.wallets.update_one(
                {"user_id": user_id},
                {"$inc": {"balances.usdt": daily_salary}},
                upsert=True
            )
            
            # Record transaction
            rank_name = TEAM_RANK_NAMES.get(rank_level, f"Level {rank_level}")
            await db.transactions.insert_one({
                "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "type": "daily_rank_salary",
                "coin": "usdt",
                "amount": daily_salary,
                "note": f"Daily {rank_name} rank salary (${monthly_salary}/month)",
                "date": today,
                "rank_level": rank_level,
                "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            
            credited_count += 1
            total_salary_distributed += daily_salary
            logger.info(f"Credited ${daily_salary} daily salary to {username} ({rank_name})")
        
        logger.info(f"Daily salary distribution complete: {credited_count} users credited, {skipped_count} skipped (low balance), ${total_salary_distributed} total")
        return {
            "credited_count": credited_count,
            "total_distributed": total_salary_distributed
        }
        
    except Exception as e:
        logger.error(f"Error in daily salary credit: {e}")
        return {"error": str(e)}


async def midnight_salary_job(db):
    """
    Background job that waits for midnight IST and credits daily salary.
    IST = UTC + 5:30
    Midnight IST = 18:30 UTC (previous day)
    """
    logger.info("Midnight salary job started")
    
    while True:
        try:
            # Get current time in IST
            utc_now = datetime.now(timezone.utc)
            ist_offset = timedelta(hours=5, minutes=30)
            ist_now = utc_now + ist_offset
            
            # Calculate time until next midnight IST
            next_midnight_ist = ist_now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
            time_until_midnight = (next_midnight_ist - ist_now).total_seconds()
            
            # If it's very close to midnight (within 1 minute), credit salary now
            if time_until_midnight > 86340:  # More than 23:59:00
                # We just passed midnight, credit now
                logger.info("Midnight detected! Crediting daily salaries...")
                await credit_daily_salary(db)
                # Wait 1 hour before checking again
                await asyncio.sleep(3600)
            else:
                # Wait until midnight
                logger.info(f"Waiting {time_until_midnight/3600:.2f} hours until midnight IST for salary credit")
                await asyncio.sleep(min(time_until_midnight, 3600))  # Check every hour max
                
        except Exception as e:
            logger.error(f"Error in midnight salary job: {e}")
            await asyncio.sleep(300)  # Wait 5 minutes on error


# ================= AUTOMATED RANK UPGRADE SYSTEM =================
async def get_user_team_stats(db, user_id: str) -> dict:
    """
    Get team stats for a user using MongoDB aggregation.
    Counts DIRECT referrals with $50+ fresh deposits (excluding welcome bonus).
    """
    try:
        # Direct referrals with $50+ fresh deposit
        direct_pipeline = [
            {"$match": {"referrer_id": user_id, "level": 1}},
            {"$lookup": {
                "from": "wallets",
                "localField": "referred_id",
                "foreignField": "user_id",
                "as": "wallet"
            }},
            {"$lookup": {
                "from": "users",
                "localField": "referred_id",
                "foreignField": "user_id",
                "as": "user"
            }},
            {"$unwind": {"path": "$wallet", "preserveNullAndEmptyArrays": True}},
            {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
            {"$addFields": {
                "fresh_deposit": {"$max": [
                    0,
                    {"$cond": {
                        "if": {"$gt": [{"$ifNull": ["$wallet.total_deposited", 0]}, 0]},
                        "then": {"$ifNull": ["$wallet.total_deposited", 0]},
                        "else": {"$subtract": [
                            {"$ifNull": ["$wallet.futures_balance", 0]},
                            {"$ifNull": ["$wallet.welcome_bonus", 0]}
                        ]}
                    }}
                ]},
                "rank_level": {"$ifNull": ["$user.team_rank_level", 0]}
            }},
            {"$group": {
                "_id": None,
                "total_direct": {"$sum": 1},
                "valid_direct": {"$sum": {"$cond": [{"$gte": ["$fresh_deposit", MIN_DEPOSIT_FOR_RANK]}, 1, 0]}},
                "bronze_members": {"$sum": {"$cond": [
                    {"$and": [
                        {"$gte": ["$fresh_deposit", MIN_DEPOSIT_FOR_RANK]},
                        {"$gte": ["$rank_level", 1]}
                    ]}, 1, 0
                ]}}
            }}
        ]
        
        direct_result = await db.referrals.aggregate(direct_pipeline).to_list(length=1)
        direct_stats = direct_result[0] if direct_result else {"total_direct": 0, "valid_direct": 0, "bronze_members": 0}
        
        # Total team count with $50+ fresh deposit
        team_pipeline = [
            {"$match": {"referrer_id": user_id}},
            {"$lookup": {
                "from": "wallets",
                "localField": "referred_id",
                "foreignField": "user_id",
                "as": "wallet"
            }},
            {"$unwind": {"path": "$wallet", "preserveNullAndEmptyArrays": True}},
            {"$addFields": {
                "fresh_deposit": {"$max": [
                    0,
                    {"$cond": {
                        "if": {"$gt": [{"$ifNull": ["$wallet.total_deposited", 0]}, 0]},
                        "then": {"$ifNull": ["$wallet.total_deposited", 0]},
                        "else": {"$subtract": [
                            {"$ifNull": ["$wallet.futures_balance", 0]},
                            {"$ifNull": ["$wallet.welcome_bonus", 0]}
                        ]}
                    }}
                ]}
            }},
            {"$group": {
                "_id": None,
                "total_team": {"$sum": 1},
                "valid_team": {"$sum": {"$cond": [{"$gte": ["$fresh_deposit", MIN_DEPOSIT_FOR_RANK]}, 1, 0]}}
            }}
        ]
        
        team_result = await db.referrals.aggregate(team_pipeline).to_list(length=1)
        team_stats = team_result[0] if team_result else {"total_team": 0, "valid_team": 0}
        
        return {
            "direct_referrals": direct_stats.get("valid_direct", 0),
            "bronze_members": direct_stats.get("bronze_members", 0),
            "total_team": team_stats.get("valid_team", 0)
        }
    except Exception as e:
        logger.error(f"Error getting team stats for {user_id}: {e}")
        return {"direct_referrals": 0, "bronze_members": 0, "total_team": 0}


def calculate_rank_level(direct_referrals: int, bronze_members: int, total_team: int) -> int:
    """
    Calculate the rank level a user qualifies for.
    Returns 0 if no rank, or 1-10 for Bronze to Immortal.
    """
    current_level = 0
    
    for rank in TEAM_RANKS:
        qualifies = False
        
        if rank["type"] == "team":
            # Bronze: 6 DIRECT referrals with $50+ deposit
            qualifies = direct_referrals >= rank["team_required"]
        else:
            # Silver onwards: Bronze members + total team
            qualifies = bronze_members >= rank["bronze_required"] and total_team >= rank["team_required"]
        
        if qualifies:
            current_level = rank["level"]
    
    return current_level


async def auto_upgrade_user_rank(db, user_id: str, username: str) -> dict:
    """
    Check and upgrade a single user's rank if they qualify.
    Returns upgrade info or None if no change.
    """
    try:
        # Get current rank
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "team_rank_level": 1})
        current_level = user.get("team_rank_level", 0) if user else 0
        
        # Get team stats
        stats = await get_user_team_stats(db, user_id)
        
        # Calculate qualifying rank
        new_level = calculate_rank_level(
            stats["direct_referrals"],
            stats["bronze_members"],
            stats["total_team"]
        )
        
        # Only upgrade, never downgrade (manual revoke required for that)
        if new_level > current_level:
            old_rank_name = TEAM_RANK_NAMES.get(current_level, "Unranked")
            new_rank_name = TEAM_RANK_NAMES.get(new_level, f"Level {new_level}")
            
            # Update user rank
            await db.users.update_one(
                {"user_id": user_id},
                {"$set": {"team_rank_level": new_level}}
            )
            
            # Credit levelup reward
            reward = 0
            for rank in TEAM_RANKS:
                if rank["level"] == new_level:
                    reward = rank.get("levelup_reward", 0)
                    break
            
            if reward > 0:
                await db.wallets.update_one(
                    {"user_id": user_id},
                    {"$inc": {"balances.usdt": reward}},
                    upsert=True
                )
                
                # Record reward transaction
                await db.transactions.insert_one({
                    "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
                    "user_id": user_id,
                    "type": "rank_levelup_reward",
                    "coin": "usdt",
                    "amount": reward,
                    "note": f"Auto-upgraded to {new_rank_name} (${reward} reward)",
                    "old_rank": current_level,
                    "new_rank": new_level,
                    "status": "completed",
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
            
            logger.info(f"AUTO-UPGRADED: {username} from {old_rank_name} to {new_rank_name} (reward: ${reward})")
            
            return {
                "user_id": user_id,
                "username": username,
                "old_rank": current_level,
                "new_rank": new_level,
                "old_rank_name": old_rank_name,
                "new_rank_name": new_rank_name,
                "reward": reward,
                "stats": stats
            }
        
        return None
    except Exception as e:
        logger.error(f"Error upgrading rank for {username}: {e}")
        return None


async def run_rank_upgrade_check(db) -> dict:
    """
    Check ALL users and upgrade their ranks if they qualify.
    Runs hourly to catch any qualifying users.
    """
    try:
        logger.info("Starting automated rank upgrade check...")
        
        # Get all users who have at least 1 direct referral (potential rank candidates)
        referrer_ids = await db.referrals.distinct("referrer_id", {"level": 1})
        
        logger.info(f"Checking {len(referrer_ids)} users with referrals...")
        
        upgraded_users = []
        checked_count = 0
        
        for user_id in referrer_ids:
            # Get username
            user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "username": 1})
            username = user.get("username", "Unknown") if user else "Unknown"
            
            # Check and upgrade
            result = await auto_upgrade_user_rank(db, user_id, username)
            if result:
                upgraded_users.append(result)
            
            checked_count += 1
            
            # Log progress every 100 users
            if checked_count % 100 == 0:
                logger.info(f"Rank check progress: {checked_count}/{len(referrer_ids)} users")
        
        summary = {
            "checked_count": checked_count,
            "upgraded_count": len(upgraded_users),
            "upgraded_users": upgraded_users,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        if upgraded_users:
            logger.info(f"Rank upgrade complete: {len(upgraded_users)} users upgraded!")
            for u in upgraded_users:
                logger.info(f"  - {u['username']}: {u['old_rank_name']} -> {u['new_rank_name']} (${u['reward']})")
        else:
            logger.info("Rank upgrade complete: No users needed upgrading")
        
        return summary
        
    except Exception as e:
        logger.error(f"Error in rank upgrade check: {e}")
        return {"error": str(e)}


async def hourly_rank_upgrade_job(db):
    """
    Background job that runs every hour to check and upgrade user ranks.
    """
    logger.info("Hourly rank upgrade job started")
    
    # Run immediately on startup
    await asyncio.sleep(10)  # Wait 10s for services to stabilize
    await run_rank_upgrade_check(db)
    
    while True:
        try:
            # Wait 1 hour
            await asyncio.sleep(3600)
            
            # Run rank check
            await run_rank_upgrade_check(db)
                
        except Exception as e:
            logger.error(f"Error in hourly rank job: {e}")
            await asyncio.sleep(300)  # Wait 5 min on error


# Main entry point for standalone execution
async def main():
    """Main function to run deposit monitoring, salary job, and rank upgrades"""
    from motor.motor_asyncio import AsyncIOMotorClient
    from dotenv import load_dotenv
    
    load_dotenv()
    
    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME", "tgx_exchange")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    logger.info("Starting deposit system with salary + rank upgrade jobs...")
    
    # Run all jobs concurrently
    await asyncio.gather(
        deposit_monitor_loop(db),
        midnight_salary_job(db),
        hourly_rank_upgrade_job(db)
    )


async def deposit_monitor_loop(db):
    """Continuous loop to monitor deposits"""
    while True:
        try:
            await check_and_process_deposits(db)
            await asyncio.sleep(30)  # Check every 30 seconds
        except Exception as e:
            logger.error(f"Error in deposit monitor: {e}")
            await asyncio.sleep(60)


if __name__ == "__main__":
    asyncio.run(main())

