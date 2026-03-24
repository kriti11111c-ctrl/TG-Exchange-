from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import jwt, JWTError
import httpx
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24 * 7  # 7 days

# Simple in-memory cache for prices
price_cache = {
    "data": None,
    "timestamp": None,
    "ttl": 60  # Cache for 60 seconds
}

chart_cache = {}

# CoinGecko API Base URL
COINGECKO_API_URL = "https://api.coingecko.com/api/v3"

# Create the main app
app = FastAPI(title="CryptoVault Exchange")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ================= MODELS =================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class WalletResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    balances: Dict[str, float]
    updated_at: datetime

class DepositRequest(BaseModel):
    coin: str
    amount: float
    tx_hash: str  # Simulated blockchain tx hash

class WithdrawRequest(BaseModel):
    coin: str
    amount: float
    address: str

class TradeRequest(BaseModel):
    coin: str
    amount: float
    trade_type: str  # "buy" or "sell"

class TransactionResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tx_id: str
    user_id: str
    type: str
    coin: str
    amount: float
    price_usd: Optional[float] = None
    total_usd: Optional[float] = None
    status: str
    created_at: datetime

class CryptoPrice(BaseModel):
    coin_id: str
    symbol: str
    name: str
    current_price: float
    price_change_24h: float
    price_change_percentage_24h: float
    market_cap: float
    volume_24h: float
    image: Optional[str] = None

# ================= AUTH HELPERS =================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    # Check cookie first
    session_token = request.cookies.get("session_token")
    
    # Then check Authorization header
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Check if it's a Google OAuth session
    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if session:
        expires_at = session.get("expires_at")
        if isinstance(expires_at, str):
            expires_at = datetime.fromisoformat(expires_at)
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
        
        user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    
    # Try JWT token
    try:
        payload = jwt.decode(session_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ================= AUTH ROUTES =================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate, response: Response):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "picture": None,
        "created_at": now.isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create wallet with initial balances
    wallet_doc = {
        "user_id": user_id,
        "balances": {
            "btc": 0.0,
            "eth": 0.0,
            "usdt": 1000.0,  # Give 1000 USDT for testing
            "bnb": 0.0,
            "xrp": 0.0,
            "sol": 0.0
        },
        "updated_at": now.isoformat()
    }
    await db.wallets.insert_one(wallet_doc)
    
    token = create_jwt_token(user_id, user_data.email)
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRATION_HOURS * 3600,
        path="/"
    )
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user_id,
            email=user_data.email,
            name=user_data.name,
            picture=None,
            created_at=now
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["user_id"], user["email"])
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=JWT_EXPIRATION_HOURS * 3600,
        path="/"
    )
    
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user["user_id"],
            email=user["email"],
            name=user["name"],
            picture=user.get("picture"),
            created_at=created_at
        )
    )

@api_router.post("/auth/session")
async def process_google_session(request: Request, response: Response):
    """Process Google OAuth session from Emergent Auth"""
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Call Emergent Auth to get session data
    async with httpx.AsyncClient() as client:
        try:
            auth_response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id},
                timeout=10.0
            )
            if auth_response.status_code != 200:
                raise HTTPException(status_code=401, detail="Invalid session")
            
            session_data = auth_response.json()
        except Exception as e:
            logger.error(f"Error fetching session data: {e}")
            raise HTTPException(status_code=500, detail="Authentication service error")
    
    email = session_data.get("email")
    name = session_data.get("name", email.split("@")[0])
    picture = session_data.get("picture")
    session_token = session_data.get("session_token")
    
    # Find or create user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    now = datetime.now(timezone.utc)
    
    if user:
        user_id = user["user_id"]
        # Update user info
        await db.users.update_one(
            {"email": email},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        user_doc = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "password_hash": None,  # Google users don't have password
            "created_at": now.isoformat()
        }
        await db.users.insert_one(user_doc)
        
        # Create wallet
        wallet_doc = {
            "user_id": user_id,
            "balances": {
                "btc": 0.0,
                "eth": 0.0,
                "usdt": 1000.0,
                "bnb": 0.0,
                "xrp": 0.0,
                "sol": 0.0
            },
            "updated_at": now.isoformat()
        }
        await db.wallets.insert_one(wallet_doc)
    
    # Store session
    expires_at = now + timedelta(days=7)
    await db.user_sessions.update_one(
        {"user_id": user_id},
        {"$set": {
            "user_id": user_id,
            "session_token": session_token,
            "expires_at": expires_at.isoformat(),
            "created_at": now.isoformat()
        }},
        upsert=True
    )
    
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 3600,
        path="/"
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return UserResponse(
        user_id=user["user_id"],
        email=user["email"],
        name=user["name"],
        picture=user.get("picture"),
        created_at=created_at
    )

@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    # Delete session
    await db.user_sessions.delete_one({"user_id": user["user_id"]})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ================= WALLET ROUTES =================

@api_router.get("/wallet", response_model=WalletResponse)
async def get_wallet(user: dict = Depends(get_current_user)):
    wallet = await db.wallets.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    updated_at = wallet.get("updated_at")
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at)
    
    return WalletResponse(
        user_id=wallet["user_id"],
        balances=wallet["balances"],
        updated_at=updated_at
    )

@api_router.post("/wallet/deposit", response_model=TransactionResponse)
async def deposit_crypto(deposit: DepositRequest, user: dict = Depends(get_current_user)):
    coin = deposit.coin.lower()
    valid_coins = ["btc", "eth", "usdt", "bnb", "xrp", "sol"]
    
    if coin not in valid_coins:
        raise HTTPException(status_code=400, detail=f"Invalid coin. Supported: {valid_coins}")
    
    if deposit.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    now = datetime.now(timezone.utc)
    tx_id = f"tx_{uuid.uuid4().hex[:16]}"
    
    # Update wallet balance
    await db.wallets.update_one(
        {"user_id": user["user_id"]},
        {
            "$inc": {f"balances.{coin}": deposit.amount},
            "$set": {"updated_at": now.isoformat()}
        }
    )
    
    # Record transaction
    tx_doc = {
        "tx_id": tx_id,
        "user_id": user["user_id"],
        "type": "deposit",
        "coin": coin,
        "amount": deposit.amount,
        "tx_hash": deposit.tx_hash,
        "status": "completed",
        "created_at": now.isoformat()
    }
    await db.transactions.insert_one(tx_doc)
    
    return TransactionResponse(
        tx_id=tx_id,
        user_id=user["user_id"],
        type="deposit",
        coin=coin,
        amount=deposit.amount,
        status="completed",
        created_at=now
    )

@api_router.post("/wallet/withdraw", response_model=TransactionResponse)
async def withdraw_crypto(withdraw: WithdrawRequest, user: dict = Depends(get_current_user)):
    coin = withdraw.coin.lower()
    valid_coins = ["btc", "eth", "usdt", "bnb", "xrp", "sol"]
    
    if coin not in valid_coins:
        raise HTTPException(status_code=400, detail=f"Invalid coin. Supported: {valid_coins}")
    
    if withdraw.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Check balance
    wallet = await db.wallets.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not wallet or wallet["balances"].get(coin, 0) < withdraw.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    now = datetime.now(timezone.utc)
    tx_id = f"tx_{uuid.uuid4().hex[:16]}"
    
    # Update wallet balance
    await db.wallets.update_one(
        {"user_id": user["user_id"]},
        {
            "$inc": {f"balances.{coin}": -withdraw.amount},
            "$set": {"updated_at": now.isoformat()}
        }
    )
    
    # Record transaction
    tx_doc = {
        "tx_id": tx_id,
        "user_id": user["user_id"],
        "type": "withdraw",
        "coin": coin,
        "amount": withdraw.amount,
        "address": withdraw.address,
        "status": "pending",  # In real app, this would be processed
        "created_at": now.isoformat()
    }
    await db.transactions.insert_one(tx_doc)
    
    return TransactionResponse(
        tx_id=tx_id,
        user_id=user["user_id"],
        type="withdraw",
        coin=coin,
        amount=withdraw.amount,
        status="pending",
        created_at=now
    )

# ================= TRADING ROUTES =================

@api_router.post("/trade", response_model=TransactionResponse)
async def execute_trade(trade: TradeRequest, user: dict = Depends(get_current_user)):
    coin = trade.coin.lower()
    valid_coins = ["btc", "eth", "bnb", "xrp", "sol"]
    
    if coin not in valid_coins:
        raise HTTPException(status_code=400, detail=f"Invalid coin. Supported: {valid_coins}")
    
    if trade.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    if trade.trade_type not in ["buy", "sell"]:
        raise HTTPException(status_code=400, detail="Trade type must be 'buy' or 'sell'")
    
    # Get current price - try cache first, then API
    coin_id_map = {"btc": "bitcoin", "eth": "ethereum", "bnb": "binancecoin", "xrp": "ripple", "sol": "solana"}
    coin_id = coin_id_map.get(coin, coin)
    
    # Fallback prices
    fallback_prices = {"btc": 69500, "eth": 2100, "bnb": 625, "xrp": 1.38, "sol": 88}
    current_price = fallback_prices.get(coin, 100)
    
    # Try to get from cache first
    if price_cache["data"]:
        for p in price_cache["data"]:
            if p.get('id') == coin_id or p.get('symbol') == coin:
                current_price = p.get('current_price', current_price)
                break
    else:
        # Try to fetch fresh
        try:
            async with httpx.AsyncClient(timeout=5.0) as http_client:
                response = await http_client.get(
                    f"{COINGECKO_API_URL}/simple/price",
                    params={"ids": coin_id, "vs_currencies": "usd"}
                )
                if response.status_code == 200:
                    data = response.json()
                    if coin_id in data:
                        current_price = data[coin_id].get('usd', current_price)
        except Exception as e:
            logger.warning(f"Could not fetch price for {coin}, using fallback: {e}")
    
    total_usd = trade.amount * current_price
    wallet = await db.wallets.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    now = datetime.now(timezone.utc)
    tx_id = f"tx_{uuid.uuid4().hex[:16]}"
    
    if trade.trade_type == "buy":
        # Check USDT balance
        if wallet["balances"].get("usdt", 0) < total_usd:
            raise HTTPException(status_code=400, detail="Insufficient USDT balance")
        
        # Deduct USDT, add crypto
        await db.wallets.update_one(
            {"user_id": user["user_id"]},
            {
                "$inc": {
                    "balances.usdt": -total_usd,
                    f"balances.{coin}": trade.amount
                },
                "$set": {"updated_at": now.isoformat()}
            }
        )
    else:  # sell
        # Check crypto balance
        if wallet["balances"].get(coin, 0) < trade.amount:
            raise HTTPException(status_code=400, detail=f"Insufficient {coin.upper()} balance")
        
        # Deduct crypto, add USDT
        await db.wallets.update_one(
            {"user_id": user["user_id"]},
            {
                "$inc": {
                    f"balances.{coin}": -trade.amount,
                    "balances.usdt": total_usd
                },
                "$set": {"updated_at": now.isoformat()}
            }
        )
    
    # Record transaction
    tx_doc = {
        "tx_id": tx_id,
        "user_id": user["user_id"],
        "type": trade.trade_type,
        "coin": coin,
        "amount": trade.amount,
        "price_usd": current_price,
        "total_usd": total_usd,
        "status": "completed",
        "created_at": now.isoformat()
    }
    await db.transactions.insert_one(tx_doc)
    
    return TransactionResponse(
        tx_id=tx_id,
        user_id=user["user_id"],
        type=trade.trade_type,
        coin=coin,
        amount=trade.amount,
        price_usd=current_price,
        total_usd=total_usd,
        status="completed",
        created_at=now
    )

# ================= TRANSACTION ROUTES =================

@api_router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(limit: int = 50, user: dict = Depends(get_current_user)):
    transactions = await db.transactions.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(limit)
    
    result = []
    for tx in transactions:
        created_at = tx.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at)
        
        result.append(TransactionResponse(
            tx_id=tx["tx_id"],
            user_id=tx["user_id"],
            type=tx["type"],
            coin=tx["coin"],
            amount=tx["amount"],
            price_usd=tx.get("price_usd"),
            total_usd=tx.get("total_usd"),
            status=tx["status"],
            created_at=created_at
        ))
    
    return result

# ================= MARKET DATA ROUTES =================

async def fetch_coingecko_prices():
    """Fetch prices from CoinGecko with timeout and caching"""
    global price_cache
    
    # Check cache
    if price_cache["data"] and price_cache["timestamp"]:
        age = (datetime.now(timezone.utc) - price_cache["timestamp"]).total_seconds()
        if age < price_cache["ttl"]:
            return price_cache["data"]
    
    # Fetch from API with timeout
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                f"{COINGECKO_API_URL}/coins/markets",
                params={
                    "vs_currency": "usd",
                    "ids": "bitcoin,ethereum,binancecoin,ripple,solana,cardano,dogecoin,polkadot",
                    "order": "market_cap_desc",
                    "per_page": 10,
                    "page": 1,
                    "sparkline": "false",
                    "price_change_percentage": "24h"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                price_cache["data"] = data
                price_cache["timestamp"] = datetime.now(timezone.utc)
                return data
            else:
                logger.warning(f"CoinGecko API returned {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error fetching from CoinGecko: {e}")
            return None

def get_fallback_prices():
    """Return fallback prices when API fails"""
    return [
        {"id": "bitcoin", "symbol": "btc", "name": "Bitcoin", "current_price": 69500, "price_change_24h": -850, "price_change_percentage_24h": -1.21, "market_cap": 1390000000000, "total_volume": 38000000000, "image": "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png"},
        {"id": "ethereum", "symbol": "eth", "name": "Ethereum", "current_price": 2100, "price_change_24h": -25, "price_change_percentage_24h": -1.18, "market_cap": 253000000000, "total_volume": 17000000000, "image": "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png"},
        {"id": "binancecoin", "symbol": "bnb", "name": "BNB", "current_price": 625, "price_change_24h": -10, "price_change_percentage_24h": -1.57, "market_cap": 85000000000, "total_volume": 1100000000, "image": "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png"},
        {"id": "ripple", "symbol": "xrp", "name": "XRP", "current_price": 1.38, "price_change_24h": -0.05, "price_change_percentage_24h": -3.5, "market_cap": 85000000000, "total_volume": 2200000000, "image": "https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png"},
        {"id": "solana", "symbol": "sol", "name": "Solana", "current_price": 88, "price_change_24h": -1.2, "price_change_percentage_24h": -1.34, "market_cap": 50000000000, "total_volume": 4000000000, "image": "https://coin-images.coingecko.com/coins/images/4128/large/solana.png"},
        {"id": "cardano", "symbol": "ada", "name": "Cardano", "current_price": 0.26, "price_change_24h": -0.002, "price_change_percentage_24h": -0.76, "market_cap": 9500000000, "total_volume": 420000000, "image": "https://coin-images.coingecko.com/coins/images/975/large/cardano.png"},
        {"id": "dogecoin", "symbol": "doge", "name": "Dogecoin", "current_price": 0.092, "price_change_24h": -0.001, "price_change_percentage_24h": -1.07, "market_cap": 14000000000, "total_volume": 1100000000, "image": "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png"},
        {"id": "polkadot", "symbol": "dot", "name": "Polkadot", "current_price": 1.37, "price_change_24h": -0.05, "price_change_percentage_24h": -3.52, "market_cap": 2300000000, "total_volume": 190000000, "image": "https://coin-images.coingecko.com/coins/images/12171/large/polkadot.jpg"},
    ]

@api_router.get("/market/prices", response_model=List[CryptoPrice])
async def get_market_prices():
    """Get current prices for major cryptocurrencies"""
    data = await fetch_coingecko_prices()
    
    if not data:
        # Use fallback data
        data = get_fallback_prices()
    
    result = []
    for coin in data:
        result.append(CryptoPrice(
            coin_id=coin.get('id', coin.get('coin_id', '')),
            symbol=coin['symbol'],
            name=coin['name'],
            current_price=coin.get('current_price', 0) or 0,
            price_change_24h=coin.get('price_change_24h', 0) or 0,
            price_change_percentage_24h=coin.get('price_change_percentage_24h', 0) or 0,
            market_cap=coin.get('market_cap', 0) or 0,
            volume_24h=coin.get('total_volume', coin.get('volume_24h', 0)) or 0,
            image=coin.get('image')
        ))
    
    return result

@api_router.get("/market/chart/{coin_id}")
async def get_price_chart(coin_id: str, days: int = 7):
    """Get historical price data for charts"""
    global chart_cache
    
    cache_key = f"{coin_id}_{days}"
    
    # Check cache (5 min TTL)
    if cache_key in chart_cache:
        cached = chart_cache[cache_key]
        age = (datetime.now(timezone.utc) - cached["timestamp"]).total_seconds()
        if age < 300:  # 5 minutes
            return cached["data"]
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(
                f"{COINGECKO_API_URL}/coins/{coin_id}/market_chart",
                params={
                    "vs_currency": "usd",
                    "days": days
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                result = {
                    "coin_id": coin_id,
                    "days": days,
                    "prices": data.get('prices', []),
                    "market_caps": data.get('market_caps', []),
                    "volumes": data.get('total_volumes', [])
                }
                
                chart_cache[cache_key] = {
                    "data": result,
                    "timestamp": datetime.now(timezone.utc)
                }
                
                return result
            else:
                raise HTTPException(status_code=500, detail="Failed to fetch chart data")
        except httpx.TimeoutException:
            logger.error(f"Timeout fetching chart for {coin_id}")
            # Return empty chart data instead of error
            return {
                "coin_id": coin_id,
                "days": days,
                "prices": [],
                "market_caps": [],
                "volumes": []
            }
        except Exception as e:
            logger.error(f"Error fetching chart data: {e}")
            return {
                "coin_id": coin_id,
                "days": days,
                "prices": [],
                "market_caps": [],
                "volumes": []
            }

# OHLC cache
ohlc_cache = {}

@api_router.get("/market/ohlc/{coin_id}")
async def get_ohlc_data(coin_id: str, days: int = 1):
    """Get OHLC (candlestick) data from CoinGecko
    days: 1 = 30min candles, 7 = 4h candles, 30 = 4h candles, 90/365 = daily candles
    """
    global ohlc_cache
    
    cache_key = f"ohlc_{coin_id}_{days}"
    
    # Check cache (2 min TTL for real-time feel)
    if cache_key in ohlc_cache:
        cached = ohlc_cache[cache_key]
        age = (datetime.now(timezone.utc) - cached["timestamp"]).total_seconds()
        if age < 120:  # 2 minutes
            return cached["data"]
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(
                f"{COINGECKO_API_URL}/coins/{coin_id}/ohlc",
                params={
                    "vs_currency": "usd",
                    "days": days
                }
            )
            
            if response.status_code == 200:
                ohlc_data = response.json()
                # Format: [[timestamp, open, high, low, close], ...]
                candles = []
                for item in ohlc_data:
                    if len(item) >= 5:
                        candles.append({
                            "time": item[0],
                            "open": item[1],
                            "high": item[2],
                            "low": item[3],
                            "close": item[4]
                        })
                
                result = {
                    "coin_id": coin_id,
                    "days": days,
                    "candles": candles
                }
                
                ohlc_cache[cache_key] = {
                    "data": result,
                    "timestamp": datetime.now(timezone.utc)
                }
                
                return result
            else:
                logger.warning(f"CoinGecko OHLC returned {response.status_code}")
                return {"coin_id": coin_id, "days": days, "candles": []}
                
        except httpx.TimeoutException:
            logger.error(f"Timeout fetching OHLC for {coin_id}")
            return {"coin_id": coin_id, "days": days, "candles": []}
        except Exception as e:
            logger.error(f"Error fetching OHLC data: {e}")
            return {"coin_id": coin_id, "days": days, "candles": []}

# ================= ROOT ROUTE =================

@api_router.get("/")
async def root():
    return {"message": "CryptoVault Exchange API", "version": "1.0.0"}

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
