from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import random
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import jwt, JWTError
import httpx
import asyncio
import math
import pyotp
import qrcode
import io
import base64
import json

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

# Blockchain API Keys
ETHERSCAN_API_KEY = os.environ.get('ETHERSCAN_API_KEY', '')
TRONSCAN_API_KEY = os.environ.get('TRONSCAN_API_KEY', '')
SOLSCAN_API_KEY = os.environ.get('SOLSCAN_API_KEY', '')

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
app = FastAPI(title="TG Exchange Exchange")

# Create router with /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ================= MODELS =================

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str
    referral_code: Optional[str] = None  # Optional referral code

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None  # For 2FA

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

# ================= REFERRAL MODELS =================

class ReferralStats(BaseModel):
    total_referrals: int
    total_earnings: float
    level_stats: List[Dict]

class ReferralUser(BaseModel):
    user_id: str
    email: str
    name: str
    level: int
    joined_at: datetime
    earnings_from: float

# Referral commission rates per level (10 levels) - Active
REFERRAL_COMMISSION_RATES = {
    1: 0.006,   # 0.6%
    2: 0.006,   # 0.6%
    3: 0.006,   # 0.6%
    4: 0.006,   # 0.6%
    5: 0.006,   # 0.6%
    6: 0.006,   # 0.6%
    7: 0.006,   # 0.6%
    8: 0.006,   # 0.6%
    9: 0.006,   # 0.6%
    10: 0.006   # 0.6%
}

# ================= KYC MODELS =================

class KYCSubmit(BaseModel):
    aadhar_number: str = Field(..., min_length=12, max_length=12)
    phone_number: str = Field(..., min_length=10, max_length=15)
    date_of_birth: str  # Format: YYYY-MM-DD
    country: str

class KYCAction(BaseModel):
    kyc_id: str
    action: str  # "approve" or "reject"
    rejection_reason: Optional[str] = None

# ================= MARGIN TRADING MODELS =================

class MarginPosition(BaseModel):
    coin: str
    side: str  # "long" or "short"
    leverage: int = Field(ge=1, le=125)
    amount: float = Field(gt=0)
    entry_price: Optional[float] = None

class ClosePosition(BaseModel):
    position_id: str

# Margin trading constants
MAX_LEVERAGE = 125
MAINTENANCE_MARGIN_RATE = 0.005  # 0.5% maintenance margin
LIQUIDATION_FEE_RATE = 0.005  # 0.5% liquidation fee

# ================= BONUS & LIMITS CONFIG =================
WELCOME_BONUS_AMOUNT = 200.0  # $200 welcome bonus
WELCOME_BONUS_DAYS = 3  # Bonus valid for 3 days
DIRECT_REFERRAL_BONUS_PERCENT = 0.05  # 5% bonus on direct referral first deposit

# Deposit limits
MIN_DEPOSIT = 50.0
MAX_DEPOSIT = 500.0
ALLOWED_DEPOSIT_AMOUNTS = [50, 100, 200, 300, 400, 500]

# Withdrawal limits
MIN_WITHDRAWAL = 10.0

# ================= TEAM RANK SYSTEM =================
# Team Building Ranks based on direct referrals and Bronze rank members
# Bronze: 6 Direct with $50+ deposit
# Silver onwards: X Bronze rank users + Y total team
MIN_DEPOSIT_FOR_RANK = 50.0

TEAM_RANKS = [
    {
        "level": 1, 
        "name": "Bronze", 
        "emoji": "🥉",
        "direct_required": 0,
        "bronze_required": 0,
        "team_required": 6,
        "type": "team",
        "bonus_percent": 0.50,
        "monthly_salary": 30,
        "levelup_reward": 20,
        "color": "#9CA3AF"
    },
    {
        "level": 2, 
        "name": "Silver", 
        "emoji": "🥈",
        "direct_required": 0,
        "bronze_required": 2,
        "team_required": 30,
        "type": "bronze",
        "bonus_percent": 1.00,
        "monthly_salary": 100,
        "levelup_reward": 100,
        "color": "#60A5FA"
    },
    {
        "level": 3, 
        "name": "Gold", 
        "emoji": "🥇",
        "direct_required": 0,
        "bronze_required": 3,
        "team_required": 75,
        "type": "bronze",
        "bonus_percent": 1.50,
        "monthly_salary": 250,
        "levelup_reward": 240,
        "color": "#34D399"
    },
    {
        "level": 4, 
        "name": "Platinum", 
        "emoji": "💎",
        "direct_required": 0,
        "bronze_required": 4,
        "team_required": 150,
        "type": "bronze",
        "bonus_percent": 2.00,
        "monthly_salary": 500,
        "levelup_reward": 500,
        "color": "#FBBF24"
    },
    {
        "level": 5, 
        "name": "Diamond", 
        "emoji": "💠",
        "direct_required": 0,
        "bronze_required": 5,
        "team_required": 300,
        "type": "bronze",
        "bonus_percent": 2.50,
        "monthly_salary": 1000,
        "levelup_reward": 975,
        "color": "#F97316"
    },
    {
        "level": 6, 
        "name": "Master", 
        "emoji": "⭐",
        "direct_required": 0,
        "bronze_required": 6,
        "team_required": 600,
        "type": "bronze",
        "bonus_percent": 3.00,
        "monthly_salary": 2000,
        "levelup_reward": 1950,
        "color": "#3B82F6"
    },
    {
        "level": 7, 
        "name": "Grandmaster", 
        "emoji": "🌟",
        "direct_required": 0,
        "bronze_required": 7,
        "team_required": 1000,
        "type": "bronze",
        "bonus_percent": 3.50,
        "monthly_salary": 4000,
        "levelup_reward": 3250,
        "color": "#8B5CF6"
    },
    {
        "level": 8, 
        "name": "Champion", 
        "emoji": "🏆",
        "direct_required": 0,
        "bronze_required": 8,
        "team_required": 2000,
        "type": "bronze",
        "bonus_percent": 4.00,
        "monthly_salary": 7000,
        "levelup_reward": 6500,
        "color": "#EC4899"
    },
    {
        "level": 9, 
        "name": "Legend", 
        "emoji": "👑",
        "direct_required": 0,
        "bronze_required": 9,
        "team_required": 4000,
        "type": "bronze",
        "bonus_percent": 4.50,
        "monthly_salary": 12000,
        "levelup_reward": 13000,
        "color": "#F59E0B"
    },
    {
        "level": 10, 
        "name": "Immortal", 
        "emoji": "🔱",
        "direct_required": 0,
        "bronze_required": 10,
        "team_required": 8000,
        "type": "bronze",
        "bonus_percent": 5.00,
        "monthly_salary": 20000,
        "levelup_reward": 26000,
        "color": "#EF4444"
    }
]

async def get_team_stats(user_id: str) -> dict:
    """Get user's team statistics - counts users with $50+ CURRENT BALANCE (not deposits)
    Optimized with MongoDB aggregation to avoid N+1 queries"""
    
    # Get direct referrals count with balance check using aggregation
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
            "current_balance": {"$ifNull": ["$wallet.balances.usdt", 0]},
            "rank_level": {"$ifNull": ["$user.team_rank_level", 0]}
        }},
        {"$group": {
            "_id": None,
            "total_direct": {"$sum": 1},
            "valid_direct": {"$sum": {"$cond": [{"$gte": ["$current_balance", MIN_DEPOSIT_FOR_RANK]}, 1, 0]}},
            "bronze_members": {"$sum": {"$cond": [
                {"$and": [
                    {"$gte": ["$current_balance", MIN_DEPOSIT_FOR_RANK]},
                    {"$gte": ["$rank_level", 1]}
                ]}, 1, 0
            ]}}
        }}
    ]
    
    direct_result = await db.referrals.aggregate(direct_pipeline).to_list(length=1)
    direct_stats = direct_result[0] if direct_result else {"total_direct": 0, "valid_direct": 0, "bronze_members": 0}
    
    # Get all team count with balance check
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
            "current_balance": {"$ifNull": ["$wallet.balances.usdt", 0]}
        }},
        {"$group": {
            "_id": None,
            "total_team": {"$sum": 1},
            "valid_team": {"$sum": {"$cond": [{"$gte": ["$current_balance", MIN_DEPOSIT_FOR_RANK]}, 1, 0]}}
        }}
    ]
    
    team_result = await db.referrals.aggregate(team_pipeline).to_list(length=1)
    team_stats = team_result[0] if team_result else {"total_team": 0, "valid_team": 0}
    
    return {
        "direct_referrals": direct_stats.get("valid_direct", 0),
        "bronze_members": direct_stats.get("bronze_members", 0),
        "total_team": team_stats.get("valid_team", 0),
        "total_direct_all": direct_stats.get("total_direct", 0),
        "total_team_all": team_stats.get("total_team", 0)
    }

def get_team_rank(direct_referrals: int, bronze_members: int, total_team: int) -> dict:
    """Get user's team rank based on direct referrals, bronze members, and team size"""
    current_rank = None
    next_rank = TEAM_RANKS[0]  # Default next rank is first rank
    
    for i, rank in enumerate(TEAM_RANKS):
        # Check if user qualifies for this rank
        qualifies = False
        
        if rank["type"] == "team":
            # Bronze rank - needs total team members
            qualifies = total_team >= rank["team_required"]
        elif rank["type"] == "direct":
            # Needs direct referrals
            qualifies = direct_referrals >= rank["direct_required"] and total_team >= rank["team_required"]
        else:
            # Silver onwards - needs Bronze rank members
            qualifies = bronze_members >= rank["bronze_required"] and total_team >= rank["team_required"]
        
        if qualifies:
            current_rank = rank
            next_rank = TEAM_RANKS[i + 1] if i + 1 < len(TEAM_RANKS) else None
    
    # Calculate progress
    progress = 0
    if current_rank and next_rank:
        # Progress based on next rank requirements
        if next_rank["type"] == "bronze":
            bronze_range = next_rank["bronze_required"] - (current_rank.get("bronze_required", 0))
            bronze_progress = bronze_members - (current_rank.get("bronze_required", 0))
            progress = min(100, (bronze_progress / bronze_range) * 100) if bronze_range > 0 else 100
        else:
            team_range = next_rank["team_required"] - current_rank["team_required"]
            team_progress = total_team - current_rank["team_required"]
            progress = min(100, (team_progress / team_range) * 100) if team_range > 0 else 100
    elif not current_rank and next_rank:
        # Progress to first rank (Bronze)
        if next_rank["type"] == "team":
            progress = min(100, (total_team / next_rank["team_required"]) * 100) if next_rank["team_required"] > 0 else 100
        elif next_rank["type"] == "direct":
            progress = min(100, (direct_referrals / next_rank["direct_required"]) * 100) if next_rank["direct_required"] > 0 else 100
    
    return {
        "current_rank": current_rank,
        "next_rank": next_rank,
        "progress": progress,
        "direct_referrals": direct_referrals,
        "bronze_members": bronze_members,
        "total_team": total_team
    }

# ================= VIP RANK SYSTEM (Trading Volume Based) =================
# Rank definitions with volume thresholds (in USDT)
RANK_LEVELS = [
    {"level": 1, "name": "1st ⭐", "emoji": "⭐", "min_volume": 0, "fee_discount": 0, "withdrawal_limit": 1000, "color": "#9CA3AF"},
    {"level": 2, "name": "2nd ⭐⭐", "emoji": "⭐⭐", "min_volume": 100, "fee_discount": 5, "withdrawal_limit": 5000, "color": "#60A5FA"},
    {"level": 3, "name": "3rd ⭐⭐⭐", "emoji": "⭐⭐⭐", "min_volume": 1000, "fee_discount": 10, "withdrawal_limit": 10000, "color": "#34D399"},
    {"level": 4, "name": "4th ⭐⭐⭐⭐", "emoji": "⭐⭐⭐⭐", "min_volume": 10000, "fee_discount": 15, "withdrawal_limit": 25000, "color": "#FBBF24"},
    {"level": 5, "name": "5th ⭐⭐⭐⭐⭐", "emoji": "⭐⭐⭐⭐⭐", "min_volume": 50000, "fee_discount": 20, "withdrawal_limit": 50000, "color": "#F97316"},
    {"level": 6, "name": "6th ⭐", "emoji": "🌟", "min_volume": 100000, "fee_discount": 25, "withdrawal_limit": 100000, "color": "#3B82F6"},
    {"level": 7, "name": "7th ⭐⭐", "emoji": "🌟🌟", "min_volume": 500000, "fee_discount": 30, "withdrawal_limit": 250000, "color": "#8B5CF6"},
    {"level": 8, "name": "8th ⭐⭐⭐", "emoji": "🌟🌟🌟", "min_volume": 1000000, "fee_discount": 35, "withdrawal_limit": 500000, "color": "#EC4899"},
    {"level": 9, "name": "9th ⭐⭐⭐⭐", "emoji": "🌟🌟🌟🌟", "min_volume": 5000000, "fee_discount": 40, "withdrawal_limit": 1000000, "color": "#F59E0B"},
    {"level": 10, "name": "10th ⭐⭐⭐⭐⭐", "emoji": "🌟🌟🌟🌟🌟", "min_volume": 10000000, "fee_discount": 50, "withdrawal_limit": 999999999, "color": "#EF4444"}
]

def get_user_rank(total_volume: float) -> dict:
    """Get user rank based on total trading volume"""
    current_rank = RANK_LEVELS[0]
    next_rank = RANK_LEVELS[1] if len(RANK_LEVELS) > 1 else None
    
    for i, rank in enumerate(RANK_LEVELS):
        if total_volume >= rank["min_volume"]:
            current_rank = rank
            next_rank = RANK_LEVELS[i + 1] if i + 1 < len(RANK_LEVELS) else None
    
    # Calculate progress to next rank
    progress = 100
    volume_needed = 0
    if next_rank:
        volume_range = next_rank["min_volume"] - current_rank["min_volume"]
        volume_progress = total_volume - current_rank["min_volume"]
        progress = min(100, (volume_progress / volume_range) * 100) if volume_range > 0 else 100
        volume_needed = next_rank["min_volume"] - total_volume
    
    return {
        "current_rank": current_rank,
        "next_rank": next_rank,
        "progress": progress,
        "volume_needed": max(0, volume_needed),
        "total_volume": total_volume
    }

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
    # REFERRAL CODE IS REQUIRED
    if not user_data.referral_code or not user_data.referral_code.strip():
        raise HTTPException(status_code=400, detail="Referral code is required to register")
    
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    ref_code = user_data.referral_code.strip().upper()
    
    # SPECIAL ADMIN REFERRAL CODES - Always accepted
    ADMIN_REFERRAL_CODES = ["TGADMIN2024", "ADMIN2024", "TGADMIN", "ADMINCODE"]
    
    referrer_user = None
    referrer_id = None
    
    if ref_code in ADMIN_REFERRAL_CODES:
        # Admin referral code - find or create admin as referrer
        admin_user = await db.users.find_one({"role": "admin"}, {"_id": 0})
        if admin_user:
            referrer_user = admin_user
            referrer_id = admin_user["user_id"]
        else:
            # No admin exists - allow registration without referrer
            referrer_id = None
    else:
        # Validate normal referral code exists
        referrer_user = await db.users.find_one({"referral_code": ref_code}, {"_id": 0})
        if not referrer_user:
            raise HTTPException(status_code=400, detail="Invalid referral code. Please enter a valid referral code.")
        referrer_id = referrer_user["user_id"]
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    referral_code = f"CV{uuid.uuid4().hex[:8].upper()}"  # Generate unique referral code
    deposit_id = f"TGX{uuid.uuid4().hex[:6].upper()}"  # Unique deposit reference ID
    now = datetime.now(timezone.utc)
    
    # Welcome bonus expires after 5 days
    welcome_bonus_expires = now + timedelta(days=WELCOME_BONUS_DAYS)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "picture": None,
        "referral_code": referral_code,
        "deposit_id": deposit_id,  # Unique deposit reference
        "referred_by": referrer_id,
        "welcome_bonus": WELCOME_BONUS_AMOUNT,
        "welcome_bonus_expires_at": welcome_bonus_expires.isoformat(),
        "created_at": now.isoformat()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create referral chain (10 levels) - referrer is always present now
    await create_referral_chain(user_id, referrer_id, now)
    
    # NOTE: NO referral bonus on Welcome Bonus
    # 5% bonus will be given only on FIRST REAL DEPOSIT
    
    # Create wallet with welcome bonus in FUTURES (not Spot)
    wallet_doc = {
        "user_id": user_id,
        "balances": {
            "btc": 0.0,
            "eth": 0.0,
            "usdt": 0.0,  # Spot balance starts at 0
            "bnb": 0.0,
            "xrp": 0.0,
            "sol": 0.0
        },
        "futures_balance": WELCOME_BONUS_AMOUNT,  # Welcome bonus goes to Futures
        "welcome_bonus": WELCOME_BONUS_AMOUNT,
        "welcome_bonus_expires_at": welcome_bonus_expires.isoformat(),
        "first_deposit_done": False,  # Track if first deposit bonus given
        "updated_at": now.isoformat()
    }
    await db.wallets.insert_one(wallet_doc)
    
    # Record welcome bonus transaction
    await db.transactions.insert_one({
        "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": "welcome_bonus",
        "coin": "usdt",
        "amount": WELCOME_BONUS_AMOUNT,
        "note": f"Welcome bonus - valid for {WELCOME_BONUS_DAYS} days",
        "status": "completed",
        "created_at": now.isoformat()
    })
    
    token = create_jwt_token(user_id, user_data.email)
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
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

async def create_referral_chain(new_user_id: str, direct_referrer_id: str, now: datetime):
    """Create referral relationships for 10 levels"""
    current_referrer_id = direct_referrer_id
    level = 1
    
    while current_referrer_id and level <= 10:
        # Create referral record
        referral_doc = {
            "referral_id": f"ref_{uuid.uuid4().hex[:12]}",
            "referrer_id": current_referrer_id,
            "referred_id": new_user_id,
            "level": level,
            "commission_rate": REFERRAL_COMMISSION_RATES.get(level, 0),
            "total_earnings": 0.0,
            "created_at": now.isoformat()
        }
        await db.referrals.insert_one(referral_doc)
        
        # Get next level referrer
        referrer = await db.users.find_one({"user_id": current_referrer_id}, {"_id": 0})
        current_referrer_id = referrer.get("referred_by") if referrer else None
        level += 1

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin, response: Response):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Check if 2FA is enabled
    if user.get("two_fa_enabled"):
        if not credentials.totp_code:
            raise HTTPException(
                status_code=403, 
                detail="2FA_REQUIRED",
                headers={"X-2FA-Required": "true"}
            )
        
        # Verify TOTP code
        secret = user.get("two_fa_secret")
        if secret:
            totp = pyotp.TOTP(secret)
            if not totp.verify(credentials.totp_code, valid_window=1):
                raise HTTPException(status_code=401, detail="Invalid 2FA code")
    
    token = create_jwt_token(user["user_id"], user["email"])
    
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
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
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 3600,
        path="/"
    )
    
    return {
        "user_id": user_id,
        "email": email,
        "name": name,
        "picture": picture
    }

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    created_at = user.get("created_at")
    if isinstance(created_at, str):
        created_at = datetime.fromisoformat(created_at)
    
    return {
        "user_id": user["user_id"],
        "email": user["email"],
        "name": user["name"],
        "picture": user.get("picture"),
        "referral_code": user.get("referral_code", ""),
        "created_at": created_at.isoformat() if created_at else None
    }

@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    # Delete session
    await db.user_sessions.delete_one({"user_id": user["user_id"]})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ================= WALLET ROUTES =================

async def check_and_expire_welcome_bonus(user_id: str):
    """Check if welcome bonus has expired and remove it from FUTURES balance"""
    wallet = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
    if not wallet:
        return None
    
    welcome_bonus = wallet.get("welcome_bonus", 0)
    expires_at_str = wallet.get("welcome_bonus_expires_at")
    
    if welcome_bonus > 0 and expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        
        if now > expires_at:
            # Welcome bonus expired - remove it from FUTURES balance (not Spot)
            current_futures = wallet.get("futures_balance", 0)
            new_futures = max(0, current_futures - welcome_bonus)
            
            await db.wallets.update_one(
                {"user_id": user_id},
                {
                    "$set": {
                        "futures_balance": new_futures,
                        "welcome_bonus": 0,
                        "welcome_bonus_expired": True,
                        "updated_at": now.isoformat()
                    }
                }
            )
            
            # Record the bonus expiry transaction
            await db.transactions.insert_one({
                "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "type": "welcome_bonus_expired",
                "coin": "usdt",
                "amount": -welcome_bonus,
                "note": "Welcome bonus expired after 5 days - deducted from Futures",
                "status": "completed",
                "created_at": now.isoformat()
            })
            
            return {"expired": True, "amount": welcome_bonus}
    
    return {"expired": False}

@api_router.get("/wallet")
async def get_wallet(user: dict = Depends(get_current_user)):
    # Check and expire welcome bonus if needed
    await check_and_expire_welcome_bonus(user["user_id"])
    
    wallet = await db.wallets.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    updated_at = wallet.get("updated_at")
    if isinstance(updated_at, str):
        updated_at = datetime.fromisoformat(updated_at)
    
    # Calculate welcome bonus remaining time
    welcome_bonus_info = None
    welcome_bonus = wallet.get("welcome_bonus", 0)
    expires_at_str = wallet.get("welcome_bonus_expires_at")
    
    if welcome_bonus > 0 and expires_at_str:
        expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        
        now = datetime.now(timezone.utc)
        remaining = expires_at - now
        
        if remaining.total_seconds() > 0:
            days_remaining = remaining.days
            hours_remaining = remaining.seconds // 3600
            # Show actual futures balance (which decreases with losses), not original welcome_bonus
            actual_bonus_remaining = min(wallet.get("futures_balance", 0), welcome_bonus)
            welcome_bonus_info = {
                "amount": round(actual_bonus_remaining, 2),
                "original_amount": welcome_bonus,
                "expires_at": expires_at_str,
                "days_remaining": days_remaining,
                "hours_remaining": hours_remaining
            }
    
    # Get futures balance
    futures_balance = wallet.get("futures_balance", 0)
    
    return {
        "user_id": wallet["user_id"],
        "balances": wallet["balances"],  # Spot balances
        "futures_balance": futures_balance,  # Futures USDT balance
        "welcome_bonus": welcome_bonus_info,
        "updated_at": updated_at.isoformat() if updated_at else None
    }

# Transfer between Spot and Futures
class TransferRequest(BaseModel):
    amount: float
    direction: str  # "spot_to_futures" or "futures_to_spot"

@api_router.post("/wallet/transfer")
async def transfer_funds(transfer: TransferRequest, user: dict = Depends(get_current_user)):
    """Transfer USDT between Spot and Futures accounts"""
    user_id = user["user_id"]
    amount = transfer.amount
    direction = transfer.direction
    
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Get wallet
    wallet = await db.wallets.find_one({"user_id": user_id})
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    spot_balance = wallet.get("balances", {}).get("usdt", 0)
    futures_balance = wallet.get("futures_balance", 0)
    
    now = datetime.now(timezone.utc)
    
    if direction == "spot_to_futures":
        # Transfer from Spot to Futures
        if spot_balance < amount:
            raise HTTPException(status_code=400, detail="Insufficient Spot balance")
        
        await db.wallets.update_one(
            {"user_id": user_id},
            {
                "$inc": {
                    "balances.usdt": -amount,
                    "futures_balance": amount
                },
                "$set": {"updated_at": now.isoformat()}
            }
        )
        
        message = f"Transferred ${amount} from Spot to Futures"
        
    elif direction == "futures_to_spot":
        # Transfer from Futures to Spot
        if futures_balance < amount:
            raise HTTPException(status_code=400, detail="Insufficient Futures balance")
        
        await db.wallets.update_one(
            {"user_id": user_id},
            {
                "$inc": {
                    "futures_balance": -amount,
                    "balances.usdt": amount
                },
                "$set": {"updated_at": now.isoformat()}
            }
        )
        
        message = f"Transferred ${amount} from Futures to Spot"
    else:
        raise HTTPException(status_code=400, detail="Invalid direction")
    
    # Record transaction
    await db.transactions.insert_one({
        "tx_id": f"transfer_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": "internal_transfer",
        "direction": direction,
        "coin": "usdt",
        "amount": amount,
        "status": "completed",
        "created_at": now.isoformat()
    })
    
    # Get updated wallet
    updated_wallet = await db.wallets.find_one({"user_id": user_id})
    
    return {
        "success": True,
        "message": message,
        "spot_balance": updated_wallet.get("balances", {}).get("usdt", 0),
        "futures_balance": updated_wallet.get("futures_balance", 0)
    }

@api_router.post("/wallet/deposit", response_model=TransactionResponse)
async def deposit_crypto(deposit: DepositRequest, user: dict = Depends(get_current_user)):
    coin = deposit.coin.lower()
    valid_coins = ["btc", "eth", "usdt", "bnb", "xrp", "sol"]
    
    if coin not in valid_coins:
        raise HTTPException(status_code=400, detail=f"Invalid coin. Supported: {valid_coins}")
    
    if deposit.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # For USDT deposits, enforce limits
    if coin == "usdt":
        if deposit.amount < MIN_DEPOSIT:
            raise HTTPException(status_code=400, detail=f"Minimum deposit is ${MIN_DEPOSIT}")
        if deposit.amount > MAX_DEPOSIT:
            raise HTTPException(status_code=400, detail=f"Maximum deposit is ${MAX_DEPOSIT}")
        if deposit.amount not in ALLOWED_DEPOSIT_AMOUNTS:
            raise HTTPException(status_code=400, detail=f"Please select from allowed amounts: {ALLOWED_DEPOSIT_AMOUNTS}")
    
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

@api_router.get("/wallet/deposit-limits")
async def get_deposit_limits():
    """Get deposit limits and allowed amounts"""
    return {
        "min_deposit": MIN_DEPOSIT,
        "max_deposit": MAX_DEPOSIT,
        "allowed_amounts": ALLOWED_DEPOSIT_AMOUNTS,
        "currency": "USDT"
    }

@api_router.post("/wallet/withdraw", response_model=TransactionResponse)
async def withdraw_crypto(withdraw: WithdrawRequest, user: dict = Depends(get_current_user)):
    coin = withdraw.coin.lower()
    valid_coins = ["btc", "eth", "usdt", "bnb", "xrp", "sol"]
    
    if coin not in valid_coins:
        raise HTTPException(status_code=400, detail=f"Invalid coin. Supported: {valid_coins}")
    
    if withdraw.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    
    # Minimum withdrawal check for USDT
    if coin == "usdt" and withdraw.amount < MIN_WITHDRAWAL:
        raise HTTPException(status_code=400, detail=f"Minimum withdrawal is ${MIN_WITHDRAWAL}")
    
    # Check and expire welcome bonus first
    await check_and_expire_welcome_bonus(user["user_id"])
    
    # Get updated wallet
    wallet = await db.wallets.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # Check balance - Welcome bonus is LOCKED until expired
    current_balance = wallet["balances"].get(coin, 0)
    welcome_bonus = wallet.get("welcome_bonus", 0) if coin == "usdt" else 0
    
    # Calculate pending withdrawals for this coin
    pending_withdrawals = await db.transactions.find({
        "user_id": user["user_id"],
        "type": "withdraw",
        "coin": coin,
        "status": "pending"
    }).to_list(1000)
    pending_amount = sum(w.get("amount", 0) for w in pending_withdrawals)
    
    # Withdrawable = Total - Welcome Bonus (locked) - Pending Withdrawals
    withdrawable_balance = current_balance - welcome_bonus - pending_amount
    
    if withdrawable_balance < withdraw.amount:
        if pending_amount > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient balance. Available: ${withdrawable_balance:.2f} (Pending withdrawals: ${pending_amount:.2f})"
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient balance. Withdrawable: ${withdrawable_balance:.2f} (Welcome bonus ${welcome_bonus:.2f} is locked)"
            )
    
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

@api_router.get("/wallet/withdrawal-limits")
async def get_withdrawal_limits(user: dict = Depends(get_current_user)):
    """Get withdrawal limits - Welcome bonus locked for 5 days, then auto-deducted"""
    # First check and expire welcome bonus if 5 days passed
    await check_and_expire_welcome_bonus(user["user_id"])
    
    wallet = await db.wallets.find_one({"user_id": user["user_id"]}, {"_id": 0})
    usdt_balance = wallet["balances"].get("usdt", 0) if wallet else 0
    welcome_bonus = wallet.get("welcome_bonus", 0) if wallet else 0
    
    # Withdrawable = Total balance - Welcome bonus (if still locked)
    withdrawable = max(0, usdt_balance - welcome_bonus)
    
    return {
        "min_withdrawal": MIN_WITHDRAWAL,
        "total_balance": usdt_balance,
        "welcome_bonus": welcome_bonus,  # Locked amount
        "withdrawable_balance": withdrawable,  # Can withdraw this
        "currency": "USDT"
    }

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

@api_router.get("/wallet/all-history")
async def get_all_wallet_history(request: Request, limit: int = 100):
    """Get complete wallet history including deposits, withdrawals, bonuses, trades, referrals"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user["user_id"]
    history = []
    
    # 1. Get all transactions
    transactions = await db.transactions.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    for tx in transactions:
        created_at = tx.get("created_at") or tx.get("timestamp", "")
        if isinstance(created_at, datetime):
            created_at = created_at.isoformat()
        
        # Parse for IST display
        try:
            dt = datetime.fromisoformat(str(created_at).replace('Z', '+00:00'))
            ist_dt = dt + timedelta(hours=5, minutes=30)
            date_str = ist_dt.strftime("%Y-%m-%d")
            time_str = ist_dt.strftime("%H:%M:%S")
        except:
            date_str = "N/A"
            time_str = "N/A"
        
        tx_type = tx.get("type", "unknown")
        amount = tx.get("amount", 0)
        total_usd = tx.get("total_usd", tx.get("profit_usdt", amount))
        
        # Determine if income or expense
        is_income = tx_type in ["deposit", "bonus", "welcome_bonus", "referral", "referral_bonus", 
                                "salary", "trade_code", "trade_profit", "commission"]
        
        history.append({
            "id": tx.get("tx_id") or tx.get("transaction_id", f"tx_{len(history)}"),
            "type": tx_type,
            "category": get_tx_category(tx_type),
            "description": get_tx_description(tx_type, tx),
            "amount": abs(float(total_usd or amount or 0)),
            "coin": tx.get("coin", "USDT"),
            "is_income": is_income,
            "status": tx.get("status", "completed"),
            "date": date_str,
            "time": time_str,
            "timestamp": created_at,
            "details": tx
        })
    
    # 2. Get deposit requests (approved)
    deposits = await db.deposit_requests.find(
        {"user_id": user_id, "status": "approved"},
        {"_id": 0}
    ).sort("approved_at", -1).to_list(limit)
    
    for dep in deposits:
        created_at = dep.get("approved_at") or dep.get("created_at", "")
        try:
            dt = datetime.fromisoformat(str(created_at).replace('Z', '+00:00'))
            ist_dt = dt + timedelta(hours=5, minutes=30)
            date_str = ist_dt.strftime("%Y-%m-%d")
            time_str = ist_dt.strftime("%H:%M:%S")
        except:
            date_str = "N/A"
            time_str = "N/A"
        
        # Check if already in history
        dep_id = dep.get("request_id", "")
        if not any(h.get("id") == dep_id for h in history):
            history.append({
                "id": dep_id,
                "type": "deposit",
                "category": "Deposit",
                "description": f"Deposit via {dep.get('payment_method', 'Bank Transfer')}",
                "amount": float(dep.get("amount", 0)),
                "coin": "USDT",
                "is_income": True,
                "status": "completed",
                "date": date_str,
                "time": time_str,
                "timestamp": created_at,
                "details": dep
            })
    
    # 3. Get withdrawal requests (completed)
    withdrawals = await db.withdrawal_requests.find(
        {"user_id": user_id, "status": "completed"},
        {"_id": 0}
    ).sort("processed_at", -1).to_list(limit)
    
    for wd in withdrawals:
        created_at = wd.get("processed_at") or wd.get("created_at", "")
        try:
            dt = datetime.fromisoformat(str(created_at).replace('Z', '+00:00'))
            ist_dt = dt + timedelta(hours=5, minutes=30)
            date_str = ist_dt.strftime("%Y-%m-%d")
            time_str = ist_dt.strftime("%H:%M:%S")
        except:
            date_str = "N/A"
            time_str = "N/A"
        
        wd_id = wd.get("request_id", "")
        if not any(h.get("id") == wd_id for h in history):
            history.append({
                "id": wd_id,
                "type": "withdrawal",
                "category": "Withdrawal",
                "description": f"Withdrawal to {wd.get('bank_name', 'Bank')}",
                "amount": float(wd.get("amount", 0)),
                "coin": "USDT",
                "is_income": False,
                "status": "completed",
                "date": date_str,
                "time": time_str,
                "timestamp": created_at,
                "details": wd
            })
    
    # 4. Get trade codes (used)
    trade_codes = await db.trade_codes.find(
        {"user_id": user_id, "status": "used"},
        {"_id": 0}
    ).sort("used_at", -1).to_list(limit)
    
    for tc in trade_codes:
        created_at = tc.get("used_at") or tc.get("created_at", "")
        try:
            dt = datetime.fromisoformat(str(created_at).replace('Z', '+00:00'))
            ist_dt = dt + timedelta(hours=5, minutes=30)
            date_str = ist_dt.strftime("%Y-%m-%d")
            time_str = ist_dt.strftime("%H:%M:%S")
        except:
            date_str = "N/A"
            time_str = "N/A"
        
        tc_id = tc.get("code", "")
        if not any(h.get("id") == tc_id for h in history):
            history.append({
                "id": tc_id,
                "type": "trade_profit",
                "category": "Trade Profit",
                "description": f"Trade {tc.get('trade_type', 'CALL').upper()} - {tc.get('coin', 'BTC').upper()}USDT",
                "amount": float(tc.get("actual_profit", 0)),
                "coin": tc.get("coin", "BTC").upper(),
                "is_income": True,
                "status": "completed",
                "date": date_str,
                "time": time_str,
                "timestamp": created_at,
                "details": {
                    "profit_percent": tc.get("profit_percent"),
                    "trade_amount": tc.get("actual_trade_amount"),
                    "trade_type": tc.get("trade_type")
                }
            })
    
    # 5. Get welcome bonus from user record
    user_record = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if user_record and user_record.get("welcome_bonus_received"):
        bonus_date = user_record.get("welcome_bonus_date") or user_record.get("created_at", "")
        try:
            dt = datetime.fromisoformat(str(bonus_date).replace('Z', '+00:00'))
            ist_dt = dt + timedelta(hours=5, minutes=30)
            date_str = ist_dt.strftime("%Y-%m-%d")
            time_str = ist_dt.strftime("%H:%M:%S")
        except:
            date_str = "N/A"
            time_str = "N/A"
        
        if not any(h.get("type") == "welcome_bonus" for h in history):
            history.append({
                "id": f"welcome_{user_id}",
                "type": "welcome_bonus",
                "category": "Bonus",
                "description": "Welcome Bonus",
                "amount": 200.0,
                "coin": "USDT",
                "is_income": True,
                "status": "completed",
                "date": date_str,
                "time": time_str,
                "timestamp": bonus_date,
                "details": {"note": "Welcome bonus credited to Futures wallet"}
            })
    
    # Sort by timestamp descending
    history.sort(key=lambda x: x.get("timestamp", "") or "", reverse=True)
    
    # Calculate totals
    total_income = sum(h["amount"] for h in history if h["is_income"])
    total_expense = sum(h["amount"] for h in history if not h["is_income"])
    
    return {
        "history": history[:limit],
        "count": len(history),
        "total_income": round(total_income, 2),
        "total_expense": round(total_expense, 2),
        "net_balance": round(total_income - total_expense, 2)
    }

def get_tx_category(tx_type: str) -> str:
    categories = {
        "deposit": "Deposit",
        "withdrawal": "Withdrawal",
        "welcome_bonus": "Bonus",
        "bonus": "Bonus",
        "referral": "Referral Income",
        "referral_bonus": "Referral Income",
        "commission": "Referral Income",
        "salary": "Salary Income",
        "trade_code": "Trade Profit",
        "trade_profit": "Trade Profit",
        "trade": "Trade",
        "transfer": "Transfer",
        "spot_to_futures": "Transfer",
        "futures_to_spot": "Transfer"
    }
    return categories.get(tx_type, "Other")

def get_tx_description(tx_type: str, tx: dict) -> str:
    if tx_type == "deposit":
        return f"Deposit via {tx.get('method', 'Bank Transfer')}"
    elif tx_type == "withdrawal":
        return f"Withdrawal to Bank"
    elif tx_type in ["welcome_bonus", "bonus"]:
        return "Welcome Bonus"
    elif tx_type in ["referral", "referral_bonus", "commission"]:
        return f"Referral Commission - Level {tx.get('level', 1)}"
    elif tx_type == "salary":
        return f"Salary Income - Day {tx.get('day', 1)}"
    elif tx_type in ["trade_code", "trade_profit"]:
        return f"Trade Profit - {tx.get('coin', 'BTC').upper()}"
    elif tx_type == "spot_to_futures":
        return "Transfer: Spot → Futures"
    elif tx_type == "futures_to_spot":
        return "Transfer: Futures → Spot"
    else:
        return tx_type.replace("_", " ").title()

# ================= MARKET DATA ROUTES =================

async def fetch_coingecko_prices():
    """Fetch prices from CoinGecko with timeout and caching"""
    global price_cache
    
    # Check cache
    if price_cache["data"] and price_cache["timestamp"]:
        age = (datetime.now(timezone.utc) - price_cache["timestamp"]).total_seconds()
        if age < price_cache["ttl"]:
            return price_cache["data"]
    
    # Fetch from API with timeout - Get 50+ coins for Markets page
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                f"{COINGECKO_API_URL}/coins/markets",
                params={
                    "vs_currency": "usd",
                    "ids": "bitcoin,ethereum,binancecoin,ripple,solana,cardano,dogecoin,polkadot,avalanche-2,chainlink,polygon,shiba-inu,tron,litecoin,uniswap,stellar,near,pepe,sui,aptos,cosmos,monero,ethereum-classic,hedera,filecoin,lido-dao,immutable-x,internet-computer,render-token,arbitrum,optimism,injective-protocol,the-graph,aave,maker,fantom,theta-token,algorand,flow,kucoin-token,gala,eos,neo,iota,vechain,zilliqa,1inch,sushi,compound,yearn-finance",
                    "order": "market_cap_desc",
                    "per_page": 50,
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
    """Return fallback prices when API fails - 50 coins"""
    return [
        {"id": "bitcoin", "symbol": "btc", "name": "Bitcoin", "current_price": 69500, "price_change_24h": -850, "price_change_percentage_24h": -2.91, "market_cap": 1390000000000, "total_volume": 38000000000, "image": "https://assets.coingecko.com/coins/images/1/small/bitcoin.png"},
        {"id": "ethereum", "symbol": "eth", "name": "Ethereum", "current_price": 2070, "price_change_24h": -95, "price_change_percentage_24h": -4.33, "market_cap": 253000000000, "total_volume": 17000000000, "image": "https://assets.coingecko.com/coins/images/279/small/ethereum.png"},
        {"id": "binancecoin", "symbol": "bnb", "name": "BNB", "current_price": 631, "price_change_24h": -16, "price_change_percentage_24h": -2.51, "market_cap": 85000000000, "total_volume": 1100000000, "image": "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png"},
        {"id": "ripple", "symbol": "xrp", "name": "XRP", "current_price": 1.37, "price_change_24h": -0.05, "price_change_percentage_24h": -3.28, "market_cap": 85000000000, "total_volume": 2200000000, "image": "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png"},
        {"id": "solana", "symbol": "sol", "name": "Solana", "current_price": 87, "price_change_24h": -4.5, "price_change_percentage_24h": -4.86, "market_cap": 50000000000, "total_volume": 4000000000, "image": "https://assets.coingecko.com/coins/images/4128/small/solana.png"},
        {"id": "cardano", "symbol": "ada", "name": "Cardano", "current_price": 0.26, "price_change_24h": -0.013, "price_change_percentage_24h": -4.68, "market_cap": 9500000000, "total_volume": 420000000, "image": "https://assets.coingecko.com/coins/images/975/small/cardano.png"},
        {"id": "dogecoin", "symbol": "doge", "name": "Dogecoin", "current_price": 0.092, "price_change_24h": -0.003, "price_change_percentage_24h": -3.81, "market_cap": 14000000000, "total_volume": 1100000000, "image": "https://assets.coingecko.com/coins/images/5/small/dogecoin.png"},
        {"id": "polkadot", "symbol": "dot", "name": "Polkadot", "current_price": 1.33, "price_change_24h": -0.03, "price_change_percentage_24h": -2.04, "market_cap": 2300000000, "total_volume": 190000000, "image": "https://assets.coingecko.com/coins/images/12171/small/polkadot.png"},
        {"id": "avalanche-2", "symbol": "avax", "name": "Avalanche", "current_price": 9.85, "price_change_24h": 0.25, "price_change_percentage_24h": 2.61, "market_cap": 4100000000, "total_volume": 150000000, "image": "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png"},
        {"id": "chainlink", "symbol": "link", "name": "Chainlink", "current_price": 13.5, "price_change_24h": 0.45, "price_change_percentage_24h": 3.45, "market_cap": 8500000000, "total_volume": 350000000, "image": "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png"},
        {"id": "polygon", "symbol": "matic", "name": "Polygon", "current_price": 0.22, "price_change_24h": -0.005, "price_change_percentage_24h": -2.22, "market_cap": 2200000000, "total_volume": 180000000, "image": "https://assets.coingecko.com/coins/images/4713/small/polygon.png"},
        {"id": "shiba-inu", "symbol": "shib", "name": "Shiba Inu", "current_price": 0.0000085, "price_change_24h": 0.0000003, "price_change_percentage_24h": 3.66, "market_cap": 5000000000, "total_volume": 220000000, "image": "https://assets.coingecko.com/coins/images/11939/small/shiba.png"},
        {"id": "tron", "symbol": "trx", "name": "TRON", "current_price": 0.124, "price_change_24h": 0.002, "price_change_percentage_24h": 1.64, "market_cap": 10800000000, "total_volume": 320000000, "image": "https://assets.coingecko.com/coins/images/1094/small/tron-logo.png"},
        {"id": "litecoin", "symbol": "ltc", "name": "Litecoin", "current_price": 68.5, "price_change_24h": -1.5, "price_change_percentage_24h": -2.14, "market_cap": 5200000000, "total_volume": 280000000, "image": "https://assets.coingecko.com/coins/images/2/small/litecoin.png"},
        {"id": "uniswap", "symbol": "uni", "name": "Uniswap", "current_price": 6.15, "price_change_24h": 0.18, "price_change_percentage_24h": 3.01, "market_cap": 3700000000, "total_volume": 95000000, "image": "https://assets.coingecko.com/coins/images/12504/small/uniswap-uni.png"},
        {"id": "stellar", "symbol": "xlm", "name": "Stellar", "current_price": 0.092, "price_change_24h": -0.002, "price_change_percentage_24h": -2.13, "market_cap": 2800000000, "total_volume": 85000000, "image": "https://assets.coingecko.com/coins/images/100/small/Stellar_symbol_black_RGB.png"},
        {"id": "near", "symbol": "near", "name": "NEAR Protocol", "current_price": 2.45, "price_change_24h": 0.12, "price_change_percentage_24h": 5.15, "market_cap": 2900000000, "total_volume": 180000000, "image": "https://assets.coingecko.com/coins/images/10365/small/near.jpg"},
        {"id": "pepe", "symbol": "pepe", "name": "Pepe", "current_price": 0.0000068, "price_change_24h": 0.0000005, "price_change_percentage_24h": 7.94, "market_cap": 2800000000, "total_volume": 650000000, "image": "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg"},
        {"id": "sui", "symbol": "sui", "name": "Sui", "current_price": 1.85, "price_change_24h": 0.15, "price_change_percentage_24h": 8.82, "market_cap": 6200000000, "total_volume": 520000000, "image": "https://assets.coingecko.com/coins/images/26375/small/sui_asset.jpeg"},
        {"id": "aptos", "symbol": "apt", "name": "Aptos", "current_price": 5.25, "price_change_24h": -0.15, "price_change_percentage_24h": -2.78, "market_cap": 2800000000, "total_volume": 120000000, "image": "https://assets.coingecko.com/coins/images/26455/small/aptos_round.png"},
        {"id": "cosmos", "symbol": "atom", "name": "Cosmos", "current_price": 4.12, "price_change_24h": -0.08, "price_change_percentage_24h": -1.90, "market_cap": 1600000000, "total_volume": 95000000, "image": "https://assets.coingecko.com/coins/images/1481/small/cosmos_hub.png"},
        {"id": "monero", "symbol": "xmr", "name": "Monero", "current_price": 185, "price_change_24h": 3.5, "price_change_percentage_24h": 1.93, "market_cap": 3400000000, "total_volume": 75000000, "image": "https://assets.coingecko.com/coins/images/69/small/monero_logo.png"},
        {"id": "ethereum-classic", "symbol": "etc", "name": "Ethereum Classic", "current_price": 15.8, "price_change_24h": -0.4, "price_change_percentage_24h": -2.47, "market_cap": 2300000000, "total_volume": 85000000, "image": "https://assets.coingecko.com/coins/images/453/small/ethereum-classic-logo.png"},
        {"id": "hedera", "symbol": "hbar", "name": "Hedera", "current_price": 0.048, "price_change_24h": -0.001, "price_change_percentage_24h": -2.04, "market_cap": 1800000000, "total_volume": 45000000, "image": "https://assets.coingecko.com/coins/images/3688/small/hbar.png"},
        {"id": "filecoin", "symbol": "fil", "name": "Filecoin", "current_price": 2.85, "price_change_24h": 0.05, "price_change_percentage_24h": 1.79, "market_cap": 1700000000, "total_volume": 65000000, "image": "https://assets.coingecko.com/coins/images/12817/small/filecoin.png"},
        {"id": "arbitrum", "symbol": "arb", "name": "Arbitrum", "current_price": 0.38, "price_change_24h": -0.01, "price_change_percentage_24h": -2.56, "market_cap": 1500000000, "total_volume": 120000000, "image": "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg"},
        {"id": "optimism", "symbol": "op", "name": "Optimism", "current_price": 0.95, "price_change_24h": -0.02, "price_change_percentage_24h": -2.06, "market_cap": 1100000000, "total_volume": 85000000, "image": "https://assets.coingecko.com/coins/images/25244/small/Optimism.png"},
        {"id": "injective-protocol", "symbol": "inj", "name": "Injective", "current_price": 12.5, "price_change_24h": 0.35, "price_change_percentage_24h": 2.88, "market_cap": 1200000000, "total_volume": 55000000, "image": "https://assets.coingecko.com/coins/images/12882/small/Secondary_Symbol.png"},
        {"id": "the-graph", "symbol": "grt", "name": "The Graph", "current_price": 0.11, "price_change_24h": 0.003, "price_change_percentage_24h": 2.80, "market_cap": 1050000000, "total_volume": 35000000, "image": "https://assets.coingecko.com/coins/images/13397/small/Graph_Token.png"},
        {"id": "aave", "symbol": "aave", "name": "Aave", "current_price": 165, "price_change_24h": 4.5, "price_change_percentage_24h": 2.80, "market_cap": 2500000000, "total_volume": 120000000, "image": "https://assets.coingecko.com/coins/images/12645/small/AAVE.png"},
        {"id": "maker", "symbol": "mkr", "name": "Maker", "current_price": 1350, "price_change_24h": -25, "price_change_percentage_24h": -1.82, "market_cap": 1250000000, "total_volume": 45000000, "image": "https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png"},
        {"id": "fantom", "symbol": "ftm", "name": "Fantom", "current_price": 0.32, "price_change_24h": 0.008, "price_change_percentage_24h": 2.56, "market_cap": 900000000, "total_volume": 55000000, "image": "https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png"},
        {"id": "theta-token", "symbol": "theta", "name": "Theta Network", "current_price": 0.85, "price_change_24h": -0.02, "price_change_percentage_24h": -2.30, "market_cap": 850000000, "total_volume": 25000000, "image": "https://assets.coingecko.com/coins/images/2538/small/theta-token-logo.png"},
        {"id": "algorand", "symbol": "algo", "name": "Algorand", "current_price": 0.12, "price_change_24h": -0.003, "price_change_percentage_24h": -2.44, "market_cap": 980000000, "total_volume": 35000000, "image": "https://assets.coingecko.com/coins/images/4380/small/download.png"},
        {"id": "flow", "symbol": "flow", "name": "Flow", "current_price": 0.42, "price_change_24h": -0.01, "price_change_percentage_24h": -2.33, "market_cap": 650000000, "total_volume": 25000000, "image": "https://assets.coingecko.com/coins/images/13446/small/5f6294c0c7a8cda55cb1c936_Flow_Wordmark.png"},
        {"id": "gala", "symbol": "gala", "name": "Gala", "current_price": 0.018, "price_change_24h": 0.0005, "price_change_percentage_24h": 2.86, "market_cap": 700000000, "total_volume": 85000000, "image": "https://assets.coingecko.com/coins/images/12493/small/GALA-COINGECKO.png"},
        {"id": "eos", "symbol": "eos", "name": "EOS", "current_price": 0.52, "price_change_24h": -0.01, "price_change_percentage_24h": -1.89, "market_cap": 800000000, "total_volume": 65000000, "image": "https://assets.coingecko.com/coins/images/738/small/eos-eos-logo.png"},
        {"id": "neo", "symbol": "neo", "name": "Neo", "current_price": 7.8, "price_change_24h": 0.15, "price_change_percentage_24h": 1.96, "market_cap": 550000000, "total_volume": 25000000, "image": "https://assets.coingecko.com/coins/images/480/small/NEO_512_512.png"},
        {"id": "iota", "symbol": "iota", "name": "IOTA", "current_price": 0.12, "price_change_24h": -0.002, "price_change_percentage_24h": -1.64, "market_cap": 420000000, "total_volume": 15000000, "image": "https://assets.coingecko.com/coins/images/692/small/IOTA_Swirl.png"},
        {"id": "vechain", "symbol": "vet", "name": "VeChain", "current_price": 0.022, "price_change_24h": -0.0005, "price_change_percentage_24h": -2.22, "market_cap": 1600000000, "total_volume": 35000000, "image": "https://assets.coingecko.com/coins/images/1167/small/VeChain-Logo-768x725.png"},
        {"id": "zilliqa", "symbol": "zil", "name": "Zilliqa", "current_price": 0.012, "price_change_24h": 0.0003, "price_change_percentage_24h": 2.56, "market_cap": 230000000, "total_volume": 15000000, "image": "https://assets.coingecko.com/coins/images/2687/small/Zilliqa-logo.png"},
        {"id": "1inch", "symbol": "1inch", "name": "1inch", "current_price": 0.25, "price_change_24h": 0.005, "price_change_percentage_24h": 2.04, "market_cap": 320000000, "total_volume": 18000000, "image": "https://assets.coingecko.com/coins/images/13469/small/1inch-token.png"},
        {"id": "sushi", "symbol": "sushi", "name": "Sushi", "current_price": 0.58, "price_change_24h": 0.015, "price_change_percentage_24h": 2.65, "market_cap": 150000000, "total_volume": 12000000, "image": "https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png"},
        {"id": "compound", "symbol": "comp", "name": "Compound", "current_price": 42, "price_change_24h": 1.2, "price_change_percentage_24h": 2.94, "market_cap": 380000000, "total_volume": 25000000, "image": "https://assets.coingecko.com/coins/images/10775/small/COMP.png"},
        {"id": "yearn-finance", "symbol": "yfi", "name": "yearn.finance", "current_price": 5200, "price_change_24h": -85, "price_change_percentage_24h": -1.61, "market_cap": 180000000, "total_volume": 15000000, "image": "https://assets.coingecko.com/coins/images/11849/small/yearn.jpg"},
        {"id": "render-token", "symbol": "rndr", "name": "Render", "current_price": 4.15, "price_change_24h": 0.12, "price_change_percentage_24h": 2.98, "market_cap": 2100000000, "total_volume": 95000000, "image": "https://assets.coingecko.com/coins/images/11636/small/rndr.png"},
        {"id": "immutable-x", "symbol": "imx", "name": "Immutable", "current_price": 0.85, "price_change_24h": 0.02, "price_change_percentage_24h": 2.41, "market_cap": 1400000000, "total_volume": 35000000, "image": "https://assets.coingecko.com/coins/images/17233/small/immutableX-symbol-BLK-RGB.png"},
        {"id": "lido-dao", "symbol": "ldo", "name": "Lido DAO", "current_price": 1.05, "price_change_24h": 0.03, "price_change_percentage_24h": 2.94, "market_cap": 950000000, "total_volume": 45000000, "image": "https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png"},
        {"id": "internet-computer", "symbol": "icp", "name": "Internet Computer", "current_price": 5.85, "price_change_24h": -0.12, "price_change_percentage_24h": -2.01, "market_cap": 2700000000, "total_volume": 55000000, "image": "https://assets.coingecko.com/coins/images/14495/small/Internet_Computer_logo.png"},
        {"id": "ton", "symbol": "ton", "name": "Toncoin", "current_price": 2.95, "price_change_24h": 0.08, "price_change_percentage_24h": 2.79, "market_cap": 7500000000, "total_volume": 180000000, "image": "https://assets.coingecko.com/coins/images/17980/small/ton_symbol.png"},
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

@api_router.get("/market/realtime-price/{coin_id}")
async def get_realtime_price(coin_id: str):
    """Get real-time price from OKX API (matches exchanges exactly)"""
    symbol = OKX_SYMBOLS.get(coin_id.lower(), "BTC-USDT")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(
                f"{OKX_API_URL}/market/ticker",
                params={"instId": symbol}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "0" and data.get("data"):
                    ticker = data["data"][0]
                    return {
                        "coin_id": coin_id,
                        "symbol": symbol,
                        "price": float(ticker.get("last", 0)),
                        "high_24h": float(ticker.get("high24h", 0)),
                        "low_24h": float(ticker.get("low24h", 0)),
                        "volume_24h": float(ticker.get("vol24h", 0)),
                        "change_24h": float(ticker.get("sodUtc8", 0)) if ticker.get("sodUtc8") else 0,
                        "timestamp": int(ticker.get("ts", 0))
                    }
        except Exception as e:
            logger.error(f"Error fetching OKX ticker: {e}")
    
    # Fallback
    return {"coin_id": coin_id, "price": 0, "error": "Could not fetch price"}

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

# OKX API Base URL (no geo restrictions)
OKX_API_URL = "https://www.okx.com/api/v5"

# Symbol mapping for OKX (format: BTC-USDT)
OKX_SYMBOLS = {
    "bitcoin": "BTC-USDT",
    "ethereum": "ETH-USDT", 
    "binancecoin": "BNB-USDT",
    "ripple": "XRP-USDT",
    "solana": "SOL-USDT",
    "cardano": "ADA-USDT",
    "dogecoin": "DOGE-USDT",
    "polkadot": "DOT-USDT",
    "btc": "BTC-USDT",
    "eth": "ETH-USDT",
    "bnb": "BNB-USDT",
    "xrp": "XRP-USDT",
    "sol": "SOL-USDT",
    "ada": "ADA-USDT",
    "doge": "DOGE-USDT",
    "dot": "DOT-USDT"
}

# Interval mapping for OKX
OKX_INTERVALS = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "30m": "30m",
    "1h": "1H",
    "4h": "4H",
    "1d": "1D",
    "1w": "1W"
}

@api_router.get("/market/binance-klines/{coin_id}")
async def get_binance_klines(coin_id: str, interval: str = "1h", limit: int = 100):
    """Get REAL OHLC (candlestick) data from OKX API (matches real exchanges)
    interval: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w
    limit: number of candles (max 300)
    """
    global ohlc_cache
    
    # Get OKX symbol
    symbol = OKX_SYMBOLS.get(coin_id.lower(), "BTC-USDT")
    okx_interval = OKX_INTERVALS.get(interval.lower(), "1H")
    
    cache_key = f"okx_{symbol}_{okx_interval}_{limit}"
    
    # Check cache (30 sec TTL for real-time feel)
    if cache_key in ohlc_cache:
        cached = ohlc_cache[cache_key]
        age = (datetime.now(timezone.utc) - cached["timestamp"]).total_seconds()
        if age < 30:  # 30 seconds cache for fresher data
            return cached["data"]
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(
                f"{OKX_API_URL}/market/candles",
                params={
                    "instId": symbol,
                    "bar": okx_interval,
                    "limit": min(limit, 300)
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("code") == "0" and data.get("data"):
                    # OKX format: [timestamp, open, high, low, close, vol, volCcy, volCcyQuote, confirm]
                    klines_data = data["data"]
                    candles = []
                    # OKX returns newest first, so reverse
                    for item in reversed(klines_data):
                        candles.append({
                            "time": int(item[0]),  # Timestamp in ms
                            "open": float(item[1]),
                            "high": float(item[2]),
                            "low": float(item[3]),
                            "close": float(item[4]),
                            "volume": float(item[5])
                        })
                    
                    result = {
                        "coin_id": coin_id,
                        "symbol": symbol,
                        "interval": interval,
                        "candles": candles
                    }
                    
                    ohlc_cache[cache_key] = {
                        "data": result,
                        "timestamp": datetime.now(timezone.utc)
                    }
                    
                    return result
            
            logger.warning(f"OKX API returned {response.status_code}")
            # Fallback to CoinGecko if OKX fails
            return await get_ohlc_data(coin_id, 1)
                
        except Exception as e:
            logger.error(f"Error fetching OKX klines: {e}")
            # Fallback to CoinGecko
            return await get_ohlc_data(coin_id, 1)

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
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(
                f"{COINGECKO_API_URL}/coins/{coin_id}/ohlc",
                params={
                    "vs_currency": "usd",
                    "days": str(days)
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
                # Return fallback data for larger timeframes
                return generate_fallback_ohlc(coin_id, days)
                
        except Exception as e:
            logger.error(f"Error fetching OHLC data: {e}")
            return generate_fallback_ohlc(coin_id, days)

def generate_fallback_ohlc(coin_id: str, days: int):
    """Generate fallback OHLC data when API fails"""
    base_prices = {
        "bitcoin": 69500,
        "ethereum": 2100,
        "binancecoin": 625,
        "ripple": 1.38,
        "solana": 88
    }
    base_price = base_prices.get(coin_id, 69500)
    
    candles = []
    now = datetime.now(timezone.utc)
    
    if days <= 1:
        # 30 min candles for 1 day
        num_candles = 48
        interval_ms = 30 * 60 * 1000
    elif days <= 14:
        # 4H candles
        num_candles = days * 6
        interval_ms = 4 * 60 * 60 * 1000
    elif days <= 30:
        # 4H candles
        num_candles = min(days * 6, 180)
        interval_ms = 4 * 60 * 60 * 1000
    else:
        # Daily candles
        num_candles = min(days, 90)
        interval_ms = 24 * 60 * 60 * 1000
    
    volatility = 0.01 if days <= 7 else 0.02 if days <= 30 else 0.03
    last_close = base_price * 0.95
    
    for i in range(num_candles):
        candle_time = int((now.timestamp() - (num_candles - i) * interval_ms / 1000) * 1000)
        
        trend = math.sin(i / (num_candles / 6)) * volatility
        random_move = (hash(f"{coin_id}{i}{days}") % 1000 / 1000 - 0.5) * volatility * 2
        
        open_price = last_close
        change = trend + random_move
        close_price = open_price * (1 + change)
        high_price = max(open_price, close_price) * (1 + abs(random_move) * 0.3)
        low_price = min(open_price, close_price) * (1 - abs(random_move) * 0.3)
        
        candles.append({
            "time": candle_time,
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(close_price, 2)
        })
        
        last_close = close_price
    
    return {
        "coin_id": coin_id,
        "days": days,
        "candles": candles
    }

# ================= ROOT ROUTE =================

@api_router.get("/")
async def root():
    return {"message": "TG Exchange Exchange API", "version": "1.0.0"}

# ================= REFERRAL ROUTES =================

@api_router.get("/referral/stats")
async def get_referral_stats(user: dict = Depends(get_current_user)):
    """Get referral statistics for the current user"""
    user_id = user["user_id"]
    
    # Get user's referral code
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    referral_code = user_doc.get("referral_code", "")
    
    # If no referral code, generate one
    if not referral_code:
        referral_code = f"CV{uuid.uuid4().hex[:8].upper()}"
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"referral_code": referral_code}}
        )
    
    # Get all referrals where this user is the referrer
    referrals = await db.referrals.find({"referrer_id": user_id}, {"_id": 0}).to_list(length=1000)
    
    # Calculate stats per level
    level_stats = []
    total_referrals = 0
    total_earnings = 0.0
    
    for level in range(1, 11):
        level_referrals = [r for r in referrals if r.get("level") == level]
        count = len(level_referrals)
        earnings = sum(r.get("total_earnings", 0) for r in level_referrals)
        commission_rate = REFERRAL_COMMISSION_RATES.get(level, 0) * 100  # Convert to percentage
        
        level_stats.append({
            "level": level,
            "count": count,
            "earnings": earnings,
            "commission_rate": commission_rate
        })
        
        total_referrals += count
        total_earnings += earnings
    
    return {
        "user_id": user_id,
        "referral_code": referral_code,
        "total_referrals": total_referrals,
        "total_earnings": total_earnings,
        "level_stats": level_stats
    }

@api_router.get("/referral/team")
async def get_referral_team(user: dict = Depends(get_current_user), level: int = 0):
    """Get list of referred users"""
    user_id = user["user_id"]
    
    # Build query
    query = {"referrer_id": user_id}
    if level > 0:
        query["level"] = level
    
    # Get referrals
    referrals = await db.referrals.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=100)
    
    # Get user details for each referral
    team_members = []
    for ref in referrals:
        referred_user = await db.users.find_one({"user_id": ref["referred_id"]}, {"_id": 0})
        if referred_user:
            # Get wallet balance
            wallet = await db.wallets.find_one({"user_id": ref["referred_id"]}, {"_id": 0})
            total_balance = 0
            if wallet:
                for coin, balance in wallet.get("balances", {}).items():
                    if coin == "usdt":
                        total_balance += balance
                    else:
                        # Convert to USDT using simple price estimation
                        total_balance += balance * 50000 if coin == "btc" else balance * 3000 if coin == "eth" else balance
            
            # Mask email
            email = referred_user.get("email", "")
            local_part = email.split("@")[0] if "@" in email else email
            masked_email = local_part[:2] + "****" + ("@" + email.split("@")[1] if "@" in email else "")
            
            team_members.append({
                "user_id": ref["referred_id"],
                "name": referred_user.get("name", "User"),
                "email": masked_email,
                "level": ref.get("level", 1),
                "joined_at": ref.get("created_at"),
                "earnings_from": ref.get("total_earnings", 0),
                "fund": round(total_balance, 2)
            })
    
    return {
        "team_members": team_members,
        "total": len(team_members)
    }

@api_router.post("/referral/claim-commission")
async def claim_referral_commission(user: dict = Depends(get_current_user)):
    """Claim accumulated referral commission"""
    user_id = user["user_id"]
    
    # Get all referrals for this user
    referrals = await db.referrals.find({"referrer_id": user_id}, {"_id": 0}).to_list(length=1000)
    
    total_unclaimed = sum(r.get("total_earnings", 0) for r in referrals)
    
    if total_unclaimed <= 0:
        raise HTTPException(status_code=400, detail="No commission to claim")
    
    # Add to wallet
    await db.wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"balances.usdt": total_unclaimed}}
    )
    
    # Reset earnings
    await db.referrals.update_many(
        {"referrer_id": user_id},
        {"$set": {"total_earnings": 0}}
    )
    
    # Create transaction record
    tx_doc = {
        "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": "referral_commission",
        "coin": "usdt",
        "amount": total_unclaimed,
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(tx_doc)
    
    return {
        "success": True,
        "claimed_amount": total_unclaimed,
        "message": f"Successfully claimed ${total_unclaimed:.2f} USDT"
    }

# ================= RANK ROUTES =================

@api_router.get("/rank/info")
async def get_rank_info(user: dict = Depends(get_current_user)):
    """Get user's current rank and progress"""
    user_id = user["user_id"]
    
    # Calculate total trading volume from transactions
    pipeline = [
        {"$match": {"user_id": user_id, "type": {"$in": ["buy", "sell"]}}},
        {"$group": {"_id": None, "total_volume": {"$sum": "$total_usd"}}}
    ]
    
    result = await db.transactions.aggregate(pipeline).to_list(length=1)
    total_volume = result[0]["total_volume"] if result else 0
    
    # Get rank info
    rank_info = get_user_rank(total_volume)
    
    # Get user stats
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    created_at = user_doc.get("created_at", datetime.now(timezone.utc).isoformat())
    
    # Calculate days as member
    try:
        join_date = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
        days_as_member = (datetime.now(timezone.utc) - join_date).days
    except:
        days_as_member = 0
    
    # Count total trades
    trade_count = await db.transactions.count_documents({
        "user_id": user_id, 
        "type": {"$in": ["buy", "sell"]}
    })
    
    return {
        "user_id": user_id,
        "rank": rank_info["current_rank"],
        "next_rank": rank_info["next_rank"],
        "progress": rank_info["progress"],
        "volume_needed": rank_info["volume_needed"],
        "total_volume": total_volume,
        "stats": {
            "total_trades": trade_count,
            "days_as_member": days_as_member
        }
    }

@api_router.get("/rank/all-levels")
async def get_all_rank_levels():
    """Get all rank levels and their benefits"""
    return {
        "ranks": RANK_LEVELS
    }

@api_router.get("/rank/leaderboard")
async def get_rank_leaderboard():
    """Get top traders leaderboard"""
    # Get top 20 traders by volume
    pipeline = [
        {"$match": {"type": {"$in": ["buy", "sell"]}}},
        {"$group": {
            "_id": "$user_id",
            "total_volume": {"$sum": "$total_usd"},
            "trade_count": {"$sum": 1}
        }},
        {"$sort": {"total_volume": -1}},
        {"$limit": 20}
    ]
    
    results = await db.transactions.aggregate(pipeline).to_list(length=20)
    
    leaderboard = []
    for i, item in enumerate(results):
        user_doc = await db.users.find_one({"user_id": item["_id"]}, {"_id": 0})
        if user_doc:
            # Mask email
            email = user_doc.get("email", "")
            masked_email = email[:2] + "****" + email[email.index("@"):] if "@" in email else email[:2] + "****"
            
            rank_info = get_user_rank(item["total_volume"])
            
            leaderboard.append({
                "position": i + 1,
                "name": user_doc.get("name", "User"),
                "email": masked_email,
                "total_volume": item["total_volume"],
                "trade_count": item["trade_count"],
                "rank": rank_info["current_rank"]
            })
    
    return {
        "leaderboard": leaderboard
    }

# ================= TEAM RANK ROUTES =================

@api_router.get("/team-rank/info")
async def get_team_rank_info(user: dict = Depends(get_current_user)):
    """Get user's team rank information with demotion support"""
    user_id = user["user_id"]
    
    # Get team stats (counts users with $50+ CURRENT balance)
    team_stats = await get_team_stats(user_id)
    
    # Get team rank based on current stats
    rank_info = get_team_rank(
        team_stats["direct_referrals"], 
        team_stats["bronze_members"],
        team_stats["total_team"]
    )
    
    # Get user's saved data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    saved_rank_level = user_doc.get("team_rank_level", 0)
    claimed_rewards = user_doc.get("claimed_rank_rewards", [])  # Track which rewards already claimed
    
    # Current rank level
    current_level = rank_info["current_rank"]["level"] if rank_info["current_rank"] else 0
    
    levelup_reward = 0
    demotion_message = None
    
    # Check for demotion (current qualifications less than saved rank)
    if current_level < saved_rank_level:
        # User got demoted!
        demotion_message = f"Rank demoted from level {saved_rank_level} to {current_level} due to team members below $50 balance"
        
        # Update saved rank level to current (demoted)
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"team_rank_level": current_level}}
        )
    
    # Check for level up (only give rewards for NEW levels not claimed before)
    elif current_level > saved_rank_level:
        # User leveled up! Calculate reward only for unclaimed levels
        for rank in TEAM_RANKS:
            if rank["level"] > saved_rank_level and rank["level"] <= current_level:
                # Check if this reward was already claimed
                if rank["level"] not in claimed_rewards:
                    levelup_reward += rank["levelup_reward"]
                    claimed_rewards.append(rank["level"])
        
        # Update user's rank level and claimed rewards
        await db.users.update_one(
            {"user_id": user_id},
            {
                "$set": {"team_rank_level": current_level},
                "$addToSet": {"claimed_rank_rewards": {"$each": claimed_rewards}}
            }
        )
        
        # Add levelup reward to wallet (only for first-time claims)
        if levelup_reward > 0:
            await db.wallets.update_one(
                {"user_id": user_id},
                {"$inc": {"balances.usdt": levelup_reward}}
            )
            
            # Record transaction
            await db.transactions.insert_one({
                "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
                "user_id": user_id,
                "type": "levelup_reward",
                "coin": "usdt",
                "amount": levelup_reward,
                "note": f"Team rank level up reward (first time only)",
                "status": "completed",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    
    # Calculate team level income (total from all team members' trades)
    team_income = await calculate_team_level_income(user_id)
    
    # Calculate monthly salary based on rank
    monthly_salary = rank_info["current_rank"]["monthly_salary"] if rank_info["current_rank"] else 0
    bonus_percent = rank_info["current_rank"]["bonus_percent"] if rank_info["current_rank"] else 0
    bonus_income = team_income * (bonus_percent / 100)
    
    # Get salary accumulation info
    accumulated_salary = user_doc.get("accumulated_salary", 0)
    last_claim_date = user_doc.get("last_salary_claim_date")
    salary_cycle_start = user_doc.get("salary_cycle_start")
    
    # Calculate days remaining for claim
    days_in_cycle = 0
    days_remaining = 10
    can_claim_salary = False
    
    if salary_cycle_start:
        cycle_start = datetime.fromisoformat(salary_cycle_start.replace('Z', '+00:00'))
        if cycle_start.tzinfo is None:
            cycle_start = cycle_start.replace(tzinfo=timezone.utc)
        days_in_cycle = (now - cycle_start).days
        days_remaining = max(0, 10 - days_in_cycle)
        can_claim_salary = days_in_cycle >= 10
    elif last_claim_date:
        last_claim = datetime.fromisoformat(last_claim_date.replace('Z', '+00:00'))
        if last_claim.tzinfo is None:
            last_claim = last_claim.replace(tzinfo=timezone.utc)
        days_in_cycle = (now - last_claim).days
        days_remaining = max(0, 10 - days_in_cycle)
        can_claim_salary = days_in_cycle >= 10
    else:
        can_claim_salary = accumulated_salary > 0
    
    return {
        "user_id": user_id,
        "direct_referrals": team_stats["direct_referrals"],
        "bronze_members": team_stats["bronze_members"],
        "total_team": team_stats["total_team"],
        "current_rank": rank_info["current_rank"],
        "next_rank": rank_info["next_rank"],
        "progress": rank_info["progress"],
        "team_level_income": team_income,
        "bonus_percent": bonus_percent,
        "bonus_income": bonus_income,
        "monthly_salary": monthly_salary,
        "levelup_reward_received": levelup_reward if levelup_reward > 0 else None,
        "demotion_message": demotion_message,
        # Salary info
        "accumulated_salary": accumulated_salary,
        "days_in_cycle": days_in_cycle,
        "days_remaining": days_remaining,
        "can_claim_salary": can_claim_salary
    }

async def calculate_team_level_income(user_id: str) -> float:
    """Calculate total trading income from team (all levels)"""
    # Get all team members
    referrals = await db.referrals.find({"referrer_id": user_id}, {"_id": 0}).to_list(length=10000)
    
    total_income = 0.0
    for ref in referrals:
        referred_id = ref["referred_id"]
        # Get trades from this team member
        pipeline = [
            {"$match": {"user_id": referred_id, "type": {"$in": ["buy", "sell"]}}},
            {"$group": {"_id": None, "total": {"$sum": "$total_usd"}}}
        ]
        result = await db.transactions.aggregate(pipeline).to_list(length=1)
        if result:
            total_income += result[0]["total"]
    
    return total_income

@api_router.get("/team-rank/all-levels")
async def get_all_team_rank_levels():
    """Get all team rank levels and their requirements"""
    return {
        "ranks": TEAM_RANKS
    }

@api_router.get("/team-rank/salary-history")
async def get_salary_history(user: dict = Depends(get_current_user)):
    """Get user's salary history"""
    user_id = user["user_id"]
    
    # Get salary transactions
    salaries = await db.transactions.find(
        {"user_id": user_id, "type": {"$in": ["monthly_salary", "levelup_reward", "team_bonus"]}},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(length=50)
    
    return {
        "salaries": salaries
    }

@api_router.post("/team-rank/claim-salary")
async def claim_salary(user: dict = Depends(get_current_user)):
    """Claim accumulated level income every 10 days"""
    user_id = user["user_id"]
    now = datetime.now(timezone.utc)
    
    # Get user's salary data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    last_claim_date = user_doc.get("last_salary_claim_date")
    accumulated_salary = user_doc.get("accumulated_salary", 0)
    
    # Check if 10 days have passed since last claim
    if last_claim_date:
        last_claim = datetime.fromisoformat(last_claim_date.replace('Z', '+00:00'))
        if last_claim.tzinfo is None:
            last_claim = last_claim.replace(tzinfo=timezone.utc)
        
        days_passed = (now - last_claim).days
        if days_passed < 10:
            remaining_days = 10 - days_passed
            raise HTTPException(
                status_code=400, 
                detail=f"Salary can be claimed after {remaining_days} days"
            )
    
    if accumulated_salary <= 0:
        raise HTTPException(status_code=400, detail="No salary to claim")
    
    # Add to wallet
    await db.wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"balances.usdt": accumulated_salary}}
    )
    
    # Reset accumulated salary and update claim date
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {
                "last_salary_claim_date": now.isoformat(),
                "accumulated_salary": 0,
                "salary_cycle_start": now.isoformat()
            }
        }
    )
    
    # Record transaction
    await db.transactions.insert_one({
        "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
        "user_id": user_id,
        "type": "salary_claim",
        "coin": "usdt",
        "amount": accumulated_salary,
        "note": f"10-Day Salary Claim",
        "status": "completed",
        "created_at": now.isoformat()
    })
    
    return {
        "success": True,
        "amount": accumulated_salary,
        "message": f"Successfully claimed ${accumulated_salary:.2f}"
    }

@api_router.get("/team-rank/salary-info")
async def get_salary_info(user: dict = Depends(get_current_user)):
    """Get user's salary accumulation info"""
    user_id = user["user_id"]
    now = datetime.now(timezone.utc)
    
    # Get user's salary data
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    
    accumulated_salary = user_doc.get("accumulated_salary", 0)
    last_claim_date = user_doc.get("last_salary_claim_date")
    salary_cycle_start = user_doc.get("salary_cycle_start")
    
    # Calculate days in current cycle
    days_in_cycle = 0
    days_remaining = 10
    can_claim = False
    
    if salary_cycle_start:
        cycle_start = datetime.fromisoformat(salary_cycle_start.replace('Z', '+00:00'))
        if cycle_start.tzinfo is None:
            cycle_start = cycle_start.replace(tzinfo=timezone.utc)
        days_in_cycle = (now - cycle_start).days
        days_remaining = max(0, 10 - days_in_cycle)
        can_claim = days_in_cycle >= 10
    elif last_claim_date:
        last_claim = datetime.fromisoformat(last_claim_date.replace('Z', '+00:00'))
        if last_claim.tzinfo is None:
            last_claim = last_claim.replace(tzinfo=timezone.utc)
        days_in_cycle = (now - last_claim).days
        days_remaining = max(0, 10 - days_in_cycle)
        can_claim = days_in_cycle >= 10
    else:
        # First time - can claim if has accumulated salary
        can_claim = accumulated_salary > 0
    
    return {
        "accumulated_salary": accumulated_salary,
        "days_in_cycle": days_in_cycle,
        "days_remaining": days_remaining,
        "can_claim": can_claim,
        "last_claim_date": last_claim_date
    }

async def add_level_income(user_id: str, amount: float, source_user_id: str, level: int):
    """Add level income to user's accumulated salary"""
    if amount <= 0:
        return
    
    # Add to accumulated salary
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$inc": {"accumulated_salary": amount},
            "$setOnInsert": {"salary_cycle_start": datetime.now(timezone.utc).isoformat()}
        },
        upsert=True
    )
    
    # Record the level income
    await db.level_income.insert_one({
        "user_id": user_id,
        "source_user_id": source_user_id,
        "level": level,
        "amount": amount,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

# ==================== WebSocket Price Updates ====================

class ConnectionManager:
    """Manages WebSocket connections for real-time price updates"""
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Send message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()

# Background task for fetching and broadcasting prices
async def price_broadcast_task():
    """Continuously fetch and broadcast prices to all connected clients"""
    while True:
        try:
            if manager.active_connections:
                # Fetch latest prices from OKX
                prices = await fetch_okx_prices()
                if prices:
                    await manager.broadcast({
                        "type": "price_update",
                        "data": prices,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
            await asyncio.sleep(3)  # Update every 3 seconds
        except Exception as e:
            logger.error(f"Price broadcast error: {e}")
            await asyncio.sleep(5)

async def fetch_okx_prices():
    """Fetch real-time prices from OKX API"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get("https://www.okx.com/api/v5/market/tickers?instType=SPOT")
            if response.status_code == 200:
                data = response.json()
                tickers = data.get("data", [])
                
                # Filter relevant pairs
                relevant_pairs = ["BTC-USDT", "ETH-USDT", "BNB-USDT", "XRP-USDT", "SOL-USDT", "ADA-USDT", "DOGE-USDT", "DOT-USDT"]
                prices = {}
                
                for ticker in tickers:
                    inst_id = ticker.get("instId", "")
                    if inst_id in relevant_pairs:
                        symbol = inst_id.replace("-USDT", "").lower()
                        last_price = float(ticker.get("last", 0))
                        open_24h = float(ticker.get("open24h", 0))
                        
                        # Calculate 24h change percentage
                        change_24h = 0
                        if open_24h > 0:
                            change_24h = ((last_price - open_24h) / open_24h) * 100
                        
                        prices[symbol] = {
                            "price": last_price,
                            "change24h": round(change_24h, 2),
                            "high24h": float(ticker.get("high24h", 0)),
                            "low24h": float(ticker.get("low24h", 0)),
                            "volume24h": float(ticker.get("vol24h", 0))
                        }
                
                return prices
    except Exception as e:
        logger.error(f"Error fetching OKX prices: {e}")
    return None

@app.websocket("/api/ws/prices")
async def websocket_prices(websocket: WebSocket):
    """WebSocket endpoint for real-time price updates"""
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for any client messages
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
                # Client can send ping, we respond with pong
                if data == "ping":
                    await websocket.send_text("pong")
            except asyncio.TimeoutError:
                # Send ping to keep connection alive
                await websocket.send_text("ping")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

# Start background price broadcast task
@app.on_event("startup")
async def start_price_broadcast():
    asyncio.create_task(price_broadcast_task())

# ==================== 2FA Authentication (Google Authenticator) ====================

class Setup2FAResponse(BaseModel):
    secret: str
    qr_code: str  # Base64 encoded QR code image
    manual_key: str

class Verify2FARequest(BaseModel):
    code: str

class Login2FARequest(BaseModel):
    email: str
    password: str
    totp_code: Optional[str] = None

@api_router.post("/2fa/setup")
async def setup_2fa(user: dict = Depends(get_current_user)):
    """Generate 2FA secret and QR code for setup"""
    user_id = user["user_id"]
    
    # Check if 2FA already enabled
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if user_data and user_data.get("two_fa_enabled"):
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    
    # Generate secret
    secret = pyotp.random_base32()
    
    # Create TOTP object
    totp = pyotp.TOTP(secret)
    
    # Generate provisioning URI for QR code
    email = user_data.get("email", "user@cryptovault.com")
    provisioning_uri = totp.provisioning_uri(name=email, issuer_name="TG Exchange")
    
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(provisioning_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    # Store secret temporarily (not enabled yet)
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"two_fa_secret": secret, "two_fa_pending": True}}
    )
    
    return {
        "secret": secret,
        "qr_code": f"data:image/png;base64,{qr_base64}",
        "manual_key": secret
    }

@api_router.post("/2fa/verify")
async def verify_and_enable_2fa(request: Verify2FARequest, user: dict = Depends(get_current_user)):
    """Verify TOTP code and enable 2FA"""
    user_id = user["user_id"]
    
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    secret = user_data.get("two_fa_secret")
    if not secret:
        raise HTTPException(status_code=400, detail="2FA setup not initiated")
    
    # Verify the code
    totp = pyotp.TOTP(secret)
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Enable 2FA
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {"two_fa_enabled": True},
            "$unset": {"two_fa_pending": ""}
        }
    )
    
    return {"success": True, "message": "2FA enabled successfully"}

@api_router.post("/2fa/disable")
async def disable_2fa(request: Verify2FARequest, user: dict = Depends(get_current_user)):
    """Disable 2FA after verifying current code"""
    user_id = user["user_id"]
    
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user_data.get("two_fa_enabled"):
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    
    secret = user_data.get("two_fa_secret")
    totp = pyotp.TOTP(secret)
    
    if not totp.verify(request.code, valid_window=1):
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Disable 2FA
    await db.users.update_one(
        {"user_id": user_id},
        {
            "$set": {"two_fa_enabled": False},
            "$unset": {"two_fa_secret": "", "two_fa_pending": ""}
        }
    )
    
    return {"success": True, "message": "2FA disabled successfully"}

@api_router.get("/2fa/status")
async def get_2fa_status(user: dict = Depends(get_current_user)):
    """Get current 2FA status"""
    user_id = user["user_id"]
    
    user_data = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "enabled": user_data.get("two_fa_enabled", False),
        "pending": user_data.get("two_fa_pending", False)
    }

# ================= ADMIN SYSTEM =================

# Admin credentials (in production, use environment variables)
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@tgxchange.com')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Admin@TG2024')

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class DepositRequestModel(BaseModel):
    network: str
    coin: str
    amount: float
    tx_hash: str
    sender_address: Optional[str] = None

class DepositApproval(BaseModel):
    request_id: str
    action: str  # "approve" or "reject"
    admin_note: Optional[str] = None

class WithdrawalRequestModel(BaseModel):
    network: str
    coin: str
    amount: float
    wallet_address: str  # User's external wallet address

class WithdrawalApproval(BaseModel):
    request_id: str
    action: str  # "approve" or "reject"
    tx_hash: Optional[str] = None  # Admin enters TX hash after sending
    admin_note: Optional[str] = None

# Trade Code Models
class TradeCodeCreate(BaseModel):
    user_email: str
    coin: str = "BTC"
    amount: float
    trade_type: str  # "buy" or "sell"
    price: float
    scheduled_slot: str = "morning"  # "morning" (10:45 AM) or "evening" (8:30 PM)
    will_fail: bool = False  # Admin can mark trade as intentional fail
    instant_live: bool = False  # Make code LIVE immediately

class TradeCodeApply(BaseModel):
    code: str

# Create admin user on startup
async def ensure_admin_exists():
    """Create admin user if not exists"""
    admin = await db.admins.find_one({"email": ADMIN_EMAIL})
    if not admin:
        hashed_password = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt())
        await db.admins.insert_one({
            "admin_id": f"admin_{uuid.uuid4().hex[:8]}",
            "email": ADMIN_EMAIL,
            "password": hashed_password.decode('utf-8'),
            "name": "TG Exchange Admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info(f"Admin user created: {ADMIN_EMAIL}")

@app.on_event("startup")
async def startup_event():
    await ensure_admin_exists()

async def get_current_admin(request: Request):
    """Get current admin from JWT token"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin authentication required")
    
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        admin_id = payload.get("admin_id")
        admin = await db.admins.find_one({"admin_id": admin_id}, {"_id": 0, "password": 0})
        if not admin:
            raise HTTPException(status_code=404, detail="Admin not found")
        return admin
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid admin token")

@api_router.post("/create-admin")
async def create_admin_endpoint():
    """Create admin user - direct endpoint"""
    admin = await db.admins.find_one({"email": ADMIN_EMAIL})
    if admin:
        return {"message": "Admin already exists", "email": ADMIN_EMAIL}
    
    hashed_password = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt())
    await db.admins.insert_one({
        "admin_id": f"admin_{uuid.uuid4().hex[:8]}",
        "email": ADMIN_EMAIL,
        "password": hashed_password.decode('utf-8'),
        "name": "TG Exchange Admin",
        "referral_code": "TGADMIN2024",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Also create admin as a regular user for referral system
    existing_user = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing_user:
        admin_user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": admin_user_id,
            "email": ADMIN_EMAIL,
            "password_hash": hashed_password.decode('utf-8'),
            "name": "TG Exchange Admin",
            "referral_code": "TGADMIN2024",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        # Create wallet for admin
        await db.wallets.insert_one({
            "user_id": admin_user_id,
            "balances": {"btc": 0.0, "eth": 0.0, "usdt": 10000.0, "bnb": 0.0, "xrp": 0.0, "sol": 0.0},
            "futures_balance": 10000.0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {"message": "Admin created successfully", "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}

@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    """Admin login - checks both admins collection and users collection"""
    
    # First check admins collection
    admin = await db.admins.find_one({"email": credentials.email})
    
    if admin:
        if not bcrypt.checkpw(credentials.password.encode('utf-8'), admin["password"].encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Generate admin JWT
        token_data = {
            "admin_id": admin["admin_id"],
            "email": admin["email"],
            "type": "admin",
            "exp": datetime.now(timezone.utc) + timedelta(hours=24)
        }
        token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "admin": {
                "admin_id": admin["admin_id"],
                "email": admin["email"],
                "name": admin.get("name", "Admin"),
                "referral_code": admin.get("referral_code", "ADMIN")
            }
        }
    
    # Also check users collection for admin role
    user_admin = await db.users.find_one({"email": credentials.email, "role": "admin"})
    
    if user_admin:
        password_hash = user_admin.get("password_hash") or user_admin.get("password", "")
        if not bcrypt.checkpw(credentials.password.encode('utf-8'), password_hash.encode('utf-8')):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Generate admin JWT
        token_data = {
            "admin_id": user_admin["user_id"],
            "email": user_admin["email"],
            "type": "admin",
            "exp": datetime.now(timezone.utc) + timedelta(hours=24)
        }
        token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "admin": {
                "admin_id": user_admin["user_id"],
                "email": user_admin["email"],
                "name": user_admin.get("name", "Admin"),
                "referral_code": user_admin.get("referral_code", "ADMIN")
            }
        }
    
    raise HTTPException(status_code=401, detail="Invalid credentials")

@api_router.get("/admin/me")
async def get_admin_profile(admin: dict = Depends(get_current_admin)):
    """Get current admin profile"""
    return admin

# ================= BLOCKCHAIN VERIFICATION =================

# Admin wallet addresses for each network
ADMIN_WALLETS = {
    "bep20": "0x189aEFFDf472b34450A7623e8F032D5A4AC256A2",
    "erc20": "0x189aEFFDf472b34450A7623e8F032D5A4AC256A2",
    "polygon": "0x189aEFFDf472b34450A7623e8F032D5A4AC256A2",
    "trc20": "TDqncKUgq4PpCpfZwsXeupQ5SnRKEsG9qV",
    "solana": "6FQY4KqjyBUELJynQZXfgcC2zseURQQASBY5rJsSUHmR"
}

# Chain IDs for Etherscan API V2
CHAIN_IDS = {
    "bep20": "56",      # BSC Mainnet
    "erc20": "1",       # Ethereum Mainnet
    "polygon": "137"    # Polygon Mainnet
}

# USDT Contract Addresses
USDT_CONTRACTS = {
    "bep20": "0x55d398326f99059fF775485246999027B3197955",  # BSC USDT
    "erc20": "0xdAC17F958D2ee523a2206206994597C13D831ec7",  # ETH USDT
    "polygon": "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"  # Polygon USDT
}

async def verify_transaction_on_blockchain(tx_hash: str, network: str, expected_amount: float, admin_wallet: str) -> dict:
    """Verify transaction on blockchain using Etherscan API V2"""
    
    if not ETHERSCAN_API_KEY:
        return {"verified": False, "error": "API key not configured"}
    
    # Only EVM chains supported with Etherscan API V2
    if network not in CHAIN_IDS:
        return {"verified": False, "error": f"Network {network} not supported for auto-verification"}
    
    chain_id = CHAIN_IDS[network]
    usdt_contract = USDT_CONTRACTS.get(network, "")
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Get transaction receipt
            url = f"https://api.etherscan.io/v2/api?chainid={chain_id}&module=proxy&action=eth_getTransactionReceipt&txhash={tx_hash}&apikey={ETHERSCAN_API_KEY}"
            
            response = await client.get(url)
            data = response.json()
            
            if data.get("status") == "0" or not data.get("result"):
                return {"verified": False, "error": "Transaction not found or pending"}
            
            result = data["result"]
            
            # Check if transaction was successful
            if result.get("status") != "0x1":
                return {"verified": False, "error": "Transaction failed on blockchain"}
            
            # Check if it's a transfer to admin wallet
            to_address = result.get("to", "").lower()
            logs = result.get("logs", [])
            
            # Check for USDT token transfer in logs
            for log in logs:
                # ERC20 Transfer event topic
                if len(log.get("topics", [])) >= 3:
                    # topics[0] is event signature, topics[2] is recipient (for Transfer event)
                    recipient = "0x" + log["topics"][2][-40:] if len(log["topics"]) > 2 else ""
                    
                    if recipient.lower() == admin_wallet.lower():
                        # Found transfer to admin wallet
                        # Decode amount from data (USDT has 6 decimals on most chains, 18 on BSC)
                        data_hex = log.get("data", "0x0")
                        try:
                            amount_wei = int(data_hex, 16)
                            # BSC USDT has 18 decimals, others have 6
                            decimals = 18 if network == "bep20" else 6
                            amount = amount_wei / (10 ** decimals)
                            
                            if amount >= expected_amount * 0.99:  # Allow 1% tolerance
                                return {
                                    "verified": True,
                                    "amount": amount,
                                    "to": admin_wallet,
                                    "tx_hash": tx_hash
                                }
                        except:
                            pass
            
            # Check direct ETH/BNB/MATIC transfer (not token)
            if to_address == admin_wallet.lower():
                return {
                    "verified": True,
                    "amount": expected_amount,  # Trust user amount for native transfers
                    "to": admin_wallet,
                    "tx_hash": tx_hash,
                    "note": "Native token transfer verified"
                }
            
            return {"verified": False, "error": "Transfer to admin wallet not found in transaction"}
            
    except Exception as e:
        logger.error(f"Blockchain verification error: {str(e)}")
        return {"verified": False, "error": str(e)}

async def verify_tron_transaction(tx_hash: str, expected_amount: float, admin_wallet: str) -> dict:
    """Verify TRC20 transaction on Tron network using Tronscan API"""
    
    if not TRONSCAN_API_KEY:
        return {"verified": False, "error": "Tronscan API key not configured"}
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Get transaction info from Tronscan
            url = f"https://apilist.tronscanapi.com/api/transaction-info?hash={tx_hash}"
            headers = {"TRON-PRO-API-KEY": TRONSCAN_API_KEY}
            
            response = await client.get(url, headers=headers)
            data = response.json()
            
            if not data or data.get("contractRet") != "SUCCESS":
                return {"verified": False, "error": "Transaction not found or failed"}
            
            # Check if it's a TRC20 transfer
            token_transfer_info = data.get("tokenTransferInfo", {})
            if token_transfer_info:
                to_address = token_transfer_info.get("to_address", "")
                amount_str = token_transfer_info.get("amount_str", "0")
                decimals = int(token_transfer_info.get("decimals", 6))
                
                try:
                    amount = float(amount_str) / (10 ** decimals)
                except:
                    amount = 0
                
                if to_address.lower() == admin_wallet.lower() and amount >= expected_amount * 0.99:
                    return {
                        "verified": True,
                        "amount": amount,
                        "to": admin_wallet,
                        "tx_hash": tx_hash
                    }
            
            # Check contract data for transfers
            contract_data = data.get("contractData", {})
            if contract_data:
                to_address = contract_data.get("to_address", "")
                amount = contract_data.get("amount", 0)
                
                # Convert from SUN to TRX if needed (1 TRX = 1,000,000 SUN)
                if isinstance(amount, int) and amount > 1000000:
                    amount = amount / 1000000
                
                if to_address.lower() == admin_wallet.lower():
                    return {
                        "verified": True,
                        "amount": expected_amount,
                        "to": admin_wallet,
                        "tx_hash": tx_hash
                    }
            
            return {"verified": False, "error": "Transfer to admin wallet not found"}
            
    except Exception as e:
        logger.error(f"Tron verification error: {str(e)}")
        return {"verified": False, "error": str(e)}

async def verify_solana_transaction(tx_hash: str, expected_amount: float, admin_wallet: str) -> dict:
    """Verify Solana transaction using Solscan API"""
    
    if not SOLSCAN_API_KEY:
        return {"verified": False, "error": "Solscan API key not configured"}
    
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            # Get transaction info from Solscan API V2
            url = f"https://pro-api.solscan.io/v2.0/transaction/detail?tx={tx_hash}"
            headers = {"token": SOLSCAN_API_KEY}
            
            response = await client.get(url, headers=headers)
            data = response.json()
            
            if not data.get("success") or not data.get("data"):
                return {"verified": False, "error": "Transaction not found"}
            
            tx_data = data["data"]
            
            # Check transaction status
            if tx_data.get("status") != "Success":
                return {"verified": False, "error": "Transaction failed"}
            
            # Check token transfers
            token_transfers = tx_data.get("tokenTransfers", [])
            for transfer in token_transfers:
                destination = transfer.get("destination", "")
                amount = transfer.get("amount", 0)
                decimals = transfer.get("decimals", 6)
                
                try:
                    actual_amount = float(amount) / (10 ** decimals)
                except:
                    actual_amount = 0
                
                if destination.lower() == admin_wallet.lower() and actual_amount >= expected_amount * 0.99:
                    return {
                        "verified": True,
                        "amount": actual_amount,
                        "to": admin_wallet,
                        "tx_hash": tx_hash
                    }
            
            # Check SOL transfers
            sol_transfers = tx_data.get("solTransfers", [])
            for transfer in sol_transfers:
                destination = transfer.get("destination", "")
                amount = transfer.get("amount", 0)
                
                # SOL has 9 decimals
                actual_amount = float(amount) / (10 ** 9)
                
                if destination.lower() == admin_wallet.lower():
                    return {
                        "verified": True,
                        "amount": expected_amount,
                        "to": admin_wallet,
                        "tx_hash": tx_hash
                    }
            
            return {"verified": False, "error": "Transfer to admin wallet not found"}
            
    except Exception as e:
        logger.error(f"Solana verification error: {str(e)}")
        return {"verified": False, "error": str(e)}

@api_router.post("/user/deposit-request")
async def create_deposit_request(deposit: DepositRequestModel, user: dict = Depends(get_current_user)):
    """User submits a deposit request - Blockchain verified and then credited"""
    now = datetime.now(timezone.utc)
    request_id = f"dep_{uuid.uuid4().hex[:12]}"
    tx_id = f"tx_{uuid.uuid4().hex[:16]}"
    
    # Validate minimum deposit
    if deposit.amount < 50:
        raise HTTPException(status_code=400, detail="Minimum deposit is $50")
    
    # Validate tx_hash
    if not deposit.tx_hash or len(deposit.tx_hash) < 10:
        raise HTTPException(status_code=400, detail="Valid transaction hash required")
    
    # Check if tx_hash already used
    existing = await db.deposit_requests.find_one({"tx_hash": deposit.tx_hash})
    if existing:
        raise HTTPException(status_code=400, detail="This transaction has already been submitted")
    
    # Get user details
    user_data = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    coin = deposit.coin.lower()
    admin_wallet = ADMIN_WALLETS.get(deposit.network, "")
    
    # Try to verify on blockchain based on network
    verification = {"verified": False, "error": "Unknown network"}
    
    if deposit.network in ["bep20", "erc20", "polygon"]:
        # EVM chains - use Etherscan API V2
        verification = await verify_transaction_on_blockchain(
            tx_hash=deposit.tx_hash,
            network=deposit.network,
            expected_amount=deposit.amount,
            admin_wallet=admin_wallet
        )
    elif deposit.network == "trc20":
        # Tron network - use Tronscan API
        verification = await verify_tron_transaction(
            tx_hash=deposit.tx_hash,
            expected_amount=deposit.amount,
            admin_wallet=admin_wallet
        )
    elif deposit.network == "solana":
        # Solana network - use Solscan API
        verification = await verify_solana_transaction(
            tx_hash=deposit.tx_hash,
            expected_amount=deposit.amount,
            admin_wallet=admin_wallet
        )
    
    if verification.get("verified"):
        # Blockchain verified - AUTO APPROVE
        verified_amount = verification.get("amount", deposit.amount)
        
        # Get wallet to check if first deposit
        wallet = await db.wallets.find_one({"user_id": user["user_id"]})
        is_first_deposit = not wallet.get("first_deposit_done", False) if wallet else True
        
        # Credit user's wallet
        update_ops = {
            "$inc": {f"balances.{coin}": verified_amount},
            "$set": {"updated_at": now.isoformat()}
        }
        
        # Mark first deposit as done
        if is_first_deposit:
            update_ops["$set"]["first_deposit_done"] = True
        
        await db.wallets.update_one(
            {"user_id": user["user_id"]},
            update_ops,
            upsert=True
        )
        
        # FIRST DEPOSIT BONUS - 5% to direct referrer (one time only)
        if is_first_deposit and coin == "usdt":
            # Get user's direct referrer
            user_full = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
            referrer_id = user_full.get("referred_by") if user_full else None
            
            if referrer_id:
                referral_bonus = verified_amount * DIRECT_REFERRAL_BONUS_PERCENT  # 5%
                
                # Add bonus to referrer's wallet (Spot)
                await db.wallets.update_one(
                    {"user_id": referrer_id},
                    {"$inc": {"balances.usdt": referral_bonus}}
                )
                
                # Record bonus transaction
                await db.transactions.insert_one({
                    "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
                    "user_id": referrer_id,
                    "type": "first_deposit_referral_bonus",
                    "coin": "usdt",
                    "amount": referral_bonus,
                    "note": f"5% bonus from {user_data.get('name', 'User')}'s first deposit of ${verified_amount}",
                    "status": "completed",
                    "created_at": now.isoformat()
                })
        
        # Create transaction record
        tx_doc = {
            "tx_id": tx_id,
            "user_id": user["user_id"],
            "type": "deposit",
            "coin": coin,
            "amount": verified_amount,
            "tx_hash": deposit.tx_hash,
            "network": deposit.network,
            "status": "completed",
            "blockchain_verified": True,
            "created_at": now.isoformat()
        }
        await db.transactions.insert_one(tx_doc)
        
        # Store deposit request as approved
        deposit_doc = {
            "request_id": request_id,
            "user_id": user["user_id"],
            "user_email": user_data.get("email", ""),
            "user_name": user_data.get("name", ""),
            "network": deposit.network,
            "coin": deposit.coin.upper(),
            "amount": verified_amount,
            "tx_hash": deposit.tx_hash,
            "sender_address": deposit.sender_address,
            "status": "approved",
            "blockchain_verified": True,
            "tx_id": tx_id,
            "processed_at": now.isoformat(),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        await db.deposit_requests.insert_one(deposit_doc)
        
        return {
            "success": True,
            "request_id": request_id,
            "tx_id": tx_id,
            "message": f"Deposit verified! {verified_amount} {deposit.coin.upper()} credited to your wallet.",
            "status": "approved",
            "blockchain_verified": True,
            "amount_credited": verified_amount
        }
    else:
        # Blockchain API verification failed BUT user provided valid tx_hash
        # AUTO-APPROVE based on user's submitted amount (trust-based system)
        # Admin can review later if needed
        
        submitted_amount = deposit.amount
        coin = deposit.coin.lower()  # Use lowercase for consistency
        
        # Get wallet to check if first deposit
        wallet = await db.wallets.find_one({"user_id": user["user_id"]})
        is_first_deposit = not wallet.get("first_deposit_done", False) if wallet else True
        
        # Credit user's wallet immediately
        update_ops = {
            "$inc": {f"balances.{coin}": submitted_amount},
            "$set": {"updated_at": now.isoformat()}
        }
        
        # Mark first deposit as done
        if is_first_deposit:
            update_ops["$set"]["first_deposit_done"] = True
        
        await db.wallets.update_one(
            {"user_id": user["user_id"]},
            update_ops,
            upsert=True
        )
        
        # FIRST DEPOSIT BONUS - 5% to direct referrer (one time only)
        if is_first_deposit and coin == "usdt":
            referrer_id = user_data.get("referred_by")
            
            if referrer_id:
                referral_bonus = submitted_amount * DIRECT_REFERRAL_BONUS_PERCENT  # 5%
                
                # Add bonus to referrer's wallet (Spot)
                await db.wallets.update_one(
                    {"user_id": referrer_id},
                    {"$inc": {"balances.usdt": referral_bonus}}
                )
                
                # Record bonus transaction
                await db.transactions.insert_one({
                    "tx_id": f"tx_{uuid.uuid4().hex[:12]}",
                    "user_id": referrer_id,
                    "type": "first_deposit_referral_bonus",
                    "coin": "usdt",
                    "amount": referral_bonus,
                    "note": f"5% bonus from {user_data.get('name', 'User')}'s first deposit of ${submitted_amount}",
                    "status": "completed",
                    "created_at": now.isoformat()
                })
        
        # Create transaction record
        tx_id = f"tx_{uuid.uuid4().hex[:16]}"
        tx_doc = {
            "tx_id": tx_id,
            "user_id": user["user_id"],
            "type": "deposit",
            "coin": coin,
            "amount": submitted_amount,
            "tx_hash": deposit.tx_hash,
            "network": deposit.network,
            "status": "completed",
            "blockchain_verified": False,
            "auto_approved": True,
            "created_at": now.isoformat()
        }
        await db.transactions.insert_one(tx_doc)
        
        # Store deposit request as approved
        deposit_doc = {
            "request_id": request_id,
            "user_id": user["user_id"],
            "user_email": user_data.get("email", ""),
            "user_name": user_data.get("name", ""),
            "network": deposit.network,
            "coin": coin,
            "amount": submitted_amount,
            "tx_hash": deposit.tx_hash,
            "sender_address": deposit.sender_address,
            "status": "approved",
            "blockchain_verified": False,
            "auto_approved": True,
            "tx_id": tx_id,
            "processed_at": now.isoformat(),
            "created_at": now.isoformat(),
            "updated_at": now.isoformat()
        }
        await db.deposit_requests.insert_one(deposit_doc)
        
        return {
            "success": True,
            "request_id": request_id,
            "tx_id": tx_id,
            "message": f"Deposit successful! {submitted_amount} {coin} credited to your wallet.",
            "status": "approved",
            "amount_credited": submitted_amount
        }

@api_router.get("/user/deposit-requests")
async def get_user_deposit_requests(user: dict = Depends(get_current_user)):
    """Get user's deposit requests"""
    requests = await db.deposit_requests.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"requests": requests}

@api_router.get("/user/deposit-address")
async def get_user_deposit_address(user: dict = Depends(get_current_user)):
    """Get user's unique deposit addresses with their deposit ID"""
    user_data = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    # Generate deposit_id if not exists (for old users)
    deposit_id = user_data.get("deposit_id")
    if not deposit_id:
        deposit_id = f"TGX{uuid.uuid4().hex[:6].upper()}"
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"deposit_id": deposit_id}}
        )
    
    # Admin wallet addresses (same for all, but user has unique deposit_id)
    networks = [
        {
            "id": "bep20",
            "name": "BNB Smart Chain (BEP20)",
            "address": "0x189aEFFDf472b34450A7623e8F032D5A4AC256A2",
            "memo_required": True
        },
        {
            "id": "trc20", 
            "name": "TRON (TRC20)",
            "address": "TDqncKUgq4PpCpfZwsXeupQ5SnRKEsG9qV",
            "memo_required": True
        },
        {
            "id": "erc20",
            "name": "Ethereum (ERC20)", 
            "address": "0x189aEFFDf472b34450A7623e8F032D5A4AC256A2",
            "memo_required": True
        },
        {
            "id": "solana",
            "name": "Solana",
            "address": "6FQY4KqjyBUELJynQZXfgcC2zseURQQASBY5rJsSUHmR",
            "memo_required": True
        },
        {
            "id": "polygon",
            "name": "Polygon",
            "address": "0x189aEFFDf472b34450A7623e8F032D5A4AC256A2",
            "memo_required": True
        }
    ]
    
    return {
        "deposit_id": deposit_id,
        "user_name": user_data.get("name", ""),
        "networks": networks,
        "instructions": f"IMPORTANT: Include your Deposit ID '{deposit_id}' in the transaction memo/note when sending funds."
    }

@api_router.get("/admin/deposit-requests")
async def get_all_deposit_requests(
    status: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Get all deposit requests"""
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.deposit_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Get stats
    total = await db.deposit_requests.count_documents({})
    pending = await db.deposit_requests.count_documents({"status": "pending"})
    approved = await db.deposit_requests.count_documents({"status": "approved"})
    rejected = await db.deposit_requests.count_documents({"status": "rejected"})
    
    return {
        "requests": requests,
        "stats": {
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected
        }
    }

@api_router.post("/admin/deposit-requests/action")
async def process_deposit_request(approval: DepositApproval, admin: dict = Depends(get_current_admin)):
    """Admin: Approve or reject a deposit request"""
    request = await db.deposit_requests.find_one({"request_id": approval.request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Deposit request not found")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Request already {request['status']}")
    
    now = datetime.now(timezone.utc)
    
    if approval.action == "approve":
        # Credit user's wallet
        coin = request["coin"].lower()
        amount = request["amount"]
        user_id = request["user_id"]
        
        # Update wallet
        await db.wallets.update_one(
            {"user_id": user_id},
            {
                "$inc": {f"balances.{coin}": amount},
                "$set": {"updated_at": now.isoformat()}
            },
            upsert=True
        )
        
        # Create transaction record
        tx_id = f"tx_{uuid.uuid4().hex[:16]}"
        tx_doc = {
            "tx_id": tx_id,
            "user_id": user_id,
            "type": "deposit",
            "coin": coin,
            "amount": amount,
            "tx_hash": request["tx_hash"],
            "network": request["network"],
            "status": "completed",
            "approved_by": admin["admin_id"],
            "created_at": now.isoformat()
        }
        await db.transactions.insert_one(tx_doc)
        
        # Update deposit request
        await db.deposit_requests.update_one(
            {"request_id": approval.request_id},
            {
                "$set": {
                    "status": "approved",
                    "processed_by": admin["admin_id"],
                    "processed_at": now.isoformat(),
                    "admin_note": approval.admin_note,
                    "tx_id": tx_id,
                    "updated_at": now.isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": f"Deposit approved. {amount} {coin.upper()} credited to user.",
            "tx_id": tx_id
        }
    
    elif approval.action == "reject":
        await db.deposit_requests.update_one(
            {"request_id": approval.request_id},
            {
                "$set": {
                    "status": "rejected",
                    "processed_by": admin["admin_id"],
                    "processed_at": now.isoformat(),
                    "admin_note": approval.admin_note,
                    "updated_at": now.isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Deposit request rejected."
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'")

@api_router.get("/admin/users")
async def get_all_users(admin: dict = Depends(get_current_admin)):
    """Admin: Get all users with their wallet balances and credentials"""
    users = await db.users.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Get wallet info for each user
    for user in users:
        wallet = await db.wallets.find_one({"user_id": user["user_id"]}, {"_id": 0})
        user["wallet"] = wallet if wallet else {"balances": {}}
        # Include password hash for admin view (masked display in frontend)
        user["has_password"] = bool(user.get("password_hash") or user.get("password"))
    
    total_users = len(users)
    
    return {
        "users": users,
        "total": total_users
    }

@api_router.post("/admin/login-as-user")
async def admin_login_as_user(data: dict, response: Response, admin: dict = Depends(get_current_admin)):
    """Admin: Login as any user (impersonation) - Sets cookie for seamless login"""
    user_id = data.get("user_id")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="User ID required")
    
    # Find the user
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate JWT token for this user (same format as regular login)
    token_data = {
        "sub": user["user_id"],  # IMPORTANT: Must use "sub" for get_current_user to work
        "user_id": user["user_id"],
        "email": user["email"],
        "type": "user",
        "impersonated_by": admin.get("admin_id") or admin.get("email"),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    # Set cookie for seamless authentication (same as normal login)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=JWT_EXPIRATION_HOURS * 3600,
        path="/"
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "name": user.get("name", "User"),
            "picture": user.get("picture"),
            "created_at": user.get("created_at")
        },
        "message": f"Logged in as {user['email']}"
    }

@api_router.post("/admin/change-user-password")
async def admin_change_user_password(data: dict, admin: dict = Depends(get_current_admin)):
    """Admin: Change any user's password"""
    user_id = data.get("user_id")
    new_password = data.get("new_password")
    
    if not user_id or not new_password:
        raise HTTPException(status_code=400, detail="User ID and new password required")
    
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Find the user
    user = await db.users.find_one({"user_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Hash new password
    hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Update user's password
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"password_hash": hashed_password, "password": None}}
    )
    
    logging.info(f"Admin {admin.get('email')} changed password for user {user.get('email')}")
    
    return {
        "success": True,
        "message": f"Password changed for {user.get('email')}"
    }

@api_router.get("/admin/stats")
async def get_admin_stats(admin: dict = Depends(get_current_admin)):
    """Admin: Get platform statistics"""
    total_users = await db.users.count_documents({})
    total_deposits = await db.deposit_requests.count_documents({"status": "approved"})
    pending_deposits = await db.deposit_requests.count_documents({"status": "pending"})
    
    # Calculate total deposit value
    approved_deposits = await db.deposit_requests.find({"status": "approved"}, {"_id": 0}).to_list(10000)
    total_deposit_value = sum(d.get("amount", 0) for d in approved_deposits)
    
    # Today's stats
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_deposits = await db.deposit_requests.count_documents({
        "status": "approved",
        "processed_at": {"$gte": today.isoformat()}
    })
    today_signups = await db.users.count_documents({
        "created_at": {"$gte": today.isoformat()}
    })
    
    return {
        "total_users": total_users,
        "total_deposits": total_deposits,
        "pending_deposits": pending_deposits,
        "total_deposit_value": total_deposit_value,
        "today_deposits": today_deposits,
        "today_signups": today_signups
    }

# ================= WITHDRAWAL SYSTEM =================

@api_router.post("/user/withdraw-request")
async def create_withdrawal_request(withdrawal: WithdrawalRequestModel, user: dict = Depends(get_current_user)):
    """User submits a withdrawal request"""
    now = datetime.now(timezone.utc)
    request_id = f"wd_{uuid.uuid4().hex[:12]}"
    
    # Validate minimum withdrawal
    if withdrawal.amount < 10:
        raise HTTPException(status_code=400, detail="Minimum withdrawal is $10")
    
    # Validate wallet address
    if not withdrawal.wallet_address or len(withdrawal.wallet_address) < 20:
        raise HTTPException(status_code=400, detail="Valid wallet address required")
    
    # Get user's wallet
    wallet = await db.wallets.find_one({"user_id": user["user_id"]})
    if not wallet:
        raise HTTPException(status_code=400, detail="Wallet not found")
    
    # First check and expire welcome bonus if 5 days passed
    await check_and_expire_welcome_bonus(user["user_id"])
    
    # Refresh wallet after potential bonus expiry
    wallet = await db.wallets.find_one({"user_id": user["user_id"]})
    
    coin = withdrawal.coin.lower()
    current_balance = wallet.get("balances", {}).get(coin, 0)
    welcome_bonus = wallet.get("welcome_bonus", 0) if coin == "usdt" else 0
    
    # Check pending withdrawal requests for this user and coin
    pending_withdrawals = await db.withdrawal_requests.find({
        "user_id": user["user_id"],
        "coin": coin.upper(),
        "status": "pending"
    }).to_list(1000)
    pending_amount = sum(w.get("amount", 0) for w in pending_withdrawals)
    
    # Withdrawable = Total - Welcome Bonus (locked) - Pending Withdrawals
    withdrawable_balance = current_balance - welcome_bonus - pending_amount
    
    # Check if user has enough WITHDRAWABLE balance
    if withdrawable_balance < withdrawal.amount:
        if pending_amount > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient balance. Available: ${withdrawable_balance:.2f} (Pending withdrawals: ${pending_amount:.2f})"
            )
        elif welcome_bonus > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Insufficient balance. Withdrawable: ${withdrawable_balance:.2f} (Welcome bonus ${welcome_bonus:.2f} is locked)"
            )
        else:
            raise HTTPException(status_code=400, detail=f"Insufficient balance. Available: {current_balance} {coin.upper()}")
    
    # Calculate 10% fee
    fee_percent = 10
    fee_amount = withdrawal.amount * (fee_percent / 100)
    net_amount = withdrawal.amount - fee_amount
    
    # Get user details
    user_data = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    
    # Create withdrawal request (pending)
    withdrawal_doc = {
        "request_id": request_id,
        "user_id": user["user_id"],
        "user_email": user_data.get("email", ""),
        "user_name": user_data.get("name", ""),
        "network": withdrawal.network,
        "coin": withdrawal.coin.upper(),
        "amount": withdrawal.amount,
        "fee_percent": fee_percent,
        "fee_amount": fee_amount,
        "net_amount": net_amount,
        "wallet_address": withdrawal.wallet_address,
        "status": "pending",
        "created_at": now.isoformat(),
        "updated_at": now.isoformat()
    }
    
    await db.withdrawal_requests.insert_one(withdrawal_doc)
    
    return {
        "success": True,
        "request_id": request_id,
        "message": f"Withdrawal request submitted. Fee: {fee_percent}% (${fee_amount:.2f}). You will receive ${net_amount:.2f}",
        "status": "pending",
        "amount": withdrawal.amount,
        "fee_percent": fee_percent,
        "fee_amount": fee_amount,
        "net_amount": net_amount
    }

@api_router.get("/user/withdraw-requests")
async def get_user_withdrawal_requests(user: dict = Depends(get_current_user)):
    """Get user's withdrawal requests"""
    requests = await db.withdrawal_requests.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return {"requests": requests}

@api_router.get("/admin/withdrawal-requests")
async def get_all_withdrawal_requests(
    status: Optional[str] = None,
    admin: dict = Depends(get_current_admin)
):
    """Admin: Get all withdrawal requests"""
    query = {}
    if status:
        query["status"] = status
    
    requests = await db.withdrawal_requests.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    
    # Get stats
    total = await db.withdrawal_requests.count_documents({})
    pending = await db.withdrawal_requests.count_documents({"status": "pending"})
    approved = await db.withdrawal_requests.count_documents({"status": "approved"})
    rejected = await db.withdrawal_requests.count_documents({"status": "rejected"})
    
    return {
        "requests": requests,
        "stats": {
            "total": total,
            "pending": pending,
            "approved": approved,
            "rejected": rejected
        }
    }

@api_router.post("/admin/withdrawal-requests/action")
async def process_withdrawal_request(approval: WithdrawalApproval, admin: dict = Depends(get_current_admin)):
    """Admin: Approve or reject a withdrawal request"""
    request = await db.withdrawal_requests.find_one({"request_id": approval.request_id})
    if not request:
        raise HTTPException(status_code=404, detail="Withdrawal request not found")
    
    if request["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Request already {request['status']}")
    
    now = datetime.now(timezone.utc)
    
    if approval.action == "approve":
        # TX hash is required for approval
        if not approval.tx_hash or len(approval.tx_hash) < 10:
            raise HTTPException(status_code=400, detail="Transaction hash required for approval")
        
        # Deduct from user's wallet
        coin = request["coin"].lower()
        amount = request["amount"]
        user_id = request["user_id"]
        
        # Check balance again
        wallet = await db.wallets.find_one({"user_id": user_id})
        current_balance = wallet.get("balances", {}).get(coin, 0) if wallet else 0
        
        if current_balance < amount:
            raise HTTPException(status_code=400, detail=f"User has insufficient balance: {current_balance}")
        
        # Deduct from wallet
        await db.wallets.update_one(
            {"user_id": user_id},
            {
                "$inc": {f"balances.{coin}": -amount},
                "$set": {"updated_at": now.isoformat()}
            }
        )
        
        # Create transaction record
        tx_id = f"tx_{uuid.uuid4().hex[:16]}"
        tx_doc = {
            "tx_id": tx_id,
            "user_id": user_id,
            "type": "withdrawal",
            "coin": coin,
            "amount": -amount,
            "tx_hash": approval.tx_hash,
            "network": request["network"],
            "wallet_address": request["wallet_address"],
            "status": "completed",
            "processed_by": admin["admin_id"],
            "created_at": now.isoformat()
        }
        await db.transactions.insert_one(tx_doc)
        
        # Update withdrawal request
        await db.withdrawal_requests.update_one(
            {"request_id": approval.request_id},
            {
                "$set": {
                    "status": "approved",
                    "tx_hash": approval.tx_hash,
                    "processed_by": admin["admin_id"],
                    "processed_at": now.isoformat(),
                    "admin_note": approval.admin_note,
                    "tx_id": tx_id,
                    "updated_at": now.isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": f"Withdrawal approved. {amount} {coin.upper()} deducted from user.",
            "tx_id": tx_id
        }
    
    elif approval.action == "reject":
        await db.withdrawal_requests.update_one(
            {"request_id": approval.request_id},
            {
                "$set": {
                    "status": "rejected",
                    "processed_by": admin["admin_id"],
                    "processed_at": now.isoformat(),
                    "admin_note": approval.admin_note,
                    "updated_at": now.isoformat()
                }
            }
        )
        
        return {
            "success": True,
            "message": "Withdrawal request rejected."
        }
    
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'")

# ============== TRADE CODE SYSTEM ==============

@api_router.post("/admin/trade-codes/generate")
async def generate_trade_code(data: TradeCodeCreate, admin: dict = Depends(get_current_admin)):
    """Admin generates a trade code for a user with scheduled time slots"""
    import random
    import string
    from datetime import timedelta
    
    # Find user
    user = await db.users.find_one({"email": data.user_email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate unique code
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=12))
    
    # Calculate scheduled start time based on slot
    now = datetime.now(timezone.utc)
    today = now.date()
    
    # IST is UTC+5:30, so we need to convert
    # 10:45 AM IST = 05:15 UTC
    # 8:30 PM IST = 15:00 UTC
    if data.scheduled_slot == "morning":
        # 10:45 AM IST = 05:15 UTC
        scheduled_hour = 5
        scheduled_minute = 15
        slot_name = "10:45 AM"
    else:  # evening
        # 8:30 PM IST = 15:00 UTC
        scheduled_hour = 15
        scheduled_minute = 0
        slot_name = "8:30 PM"
    
    # Create scheduled start time for today
    scheduled_start = datetime.combine(today, datetime.min.time().replace(
        hour=scheduled_hour, 
        minute=scheduled_minute
    )).replace(tzinfo=timezone.utc)
    
    # If scheduled time has passed today, schedule for tomorrow
    if now > scheduled_start + timedelta(hours=1):
        scheduled_start = scheduled_start + timedelta(days=1)
    
    # Code expires 1 hour after scheduled start
    expires_at = scheduled_start + timedelta(hours=1)
    
    # Generate random profit percentage between 60-65%
    profit_percent = round(60 + random.random() * 5, 2)
    
    # Check user's last trade to determine multiplier (Martingale system)
    # If last trade failed, use 2x multiplier
    last_trade = await db.trade_codes.find_one(
        {"user_id": user["user_id"], "status": "used"},
        sort=[("used_at", -1)]
    )
    
    multiplier = 1  # Default 1x
    if last_trade and last_trade.get("result") == "fail":
        multiplier = 2  # If last trade failed, use 2x to recover
    
    fund_percent = 1.0 * multiplier  # 1% * multiplier
    
    # Check if instant live code (for testing)
    is_instant_live = getattr(data, 'instant_live', False)
    
    if is_instant_live:
        # Make code LIVE immediately for 60 minutes
        scheduled_start = now - timedelta(seconds=10)  # Already started
        expires_at = now + timedelta(minutes=60)  # Expires in 60 minutes (1 hour)
        slot_name = "LIVE Now"
        status = "live"
    else:
        status = "scheduled"
    
    # Store trade code
    trade_code_doc = {
        "code": code,
        "user_id": user["user_id"],
        "user_email": data.user_email,
        "coin": data.coin.lower(),
        "amount": data.amount,
        "trade_type": data.trade_type.lower(),
        "price": data.price,
        "status": status,
        "scheduled_slot": data.scheduled_slot if not is_instant_live else "instant",
        "slot_name": slot_name,
        "scheduled_start": scheduled_start.isoformat(),
        "expires_at": expires_at.isoformat(),
        "profit_percent": profit_percent,
        "fund_percent": fund_percent,
        "multiplier": multiplier,
        "will_fail": data.will_fail,  # Admin intentional fail
        "created_by": admin["email"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "used_at": None,
        "result": None
    }
    
    await db.trade_codes.insert_one(trade_code_doc)
    
    return {
        "success": True,
        "code": code,
        "scheduled_slot": slot_name,
        "scheduled_start": scheduled_start.isoformat(),
        "expires_at": expires_at.isoformat(),
        "message": f"Trade code generated for {data.user_email} - Slot: {slot_name} - {multiplier}x"
    }

# ================= AUTO GENERATE CODES FOR ALL USERS =================
@api_router.post("/admin/trade-codes/generate-all")
async def admin_generate_codes_for_all(admin: dict = Depends(get_current_admin)):
    """Generate trade codes for ALL users immediately (Admin only)"""
    try:
        now = datetime.now(timezone.utc)
        
        # Get ALL users (not just those with futures balance)
        all_users = await db.users.find(
            {},
            {"user_id": 1, "email": 1, "name": 1, "_id": 0}
        ).to_list(length=1000)
        
        if not all_users:
            return {"success": False, "message": "No users found"}
        
        # Get random coin data
        coins = ["BTC", "ETH", "BNB", "SOL", "XRP"]
        coin = random.choice(coins)
        coin_map = {"BTC": "bitcoin", "ETH": "ethereum", "BNB": "binancecoin", "SOL": "solana", "XRP": "ripple"}
        
        # Get price
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://api.coingecko.com/api/v3/simple/price?ids={coin_map.get(coin, 'bitcoin')}&vs_currencies=usd",
                    timeout=10.0
                )
                if response.status_code == 200:
                    data = response.json()
                    price = data.get(coin_map.get(coin, 'bitcoin'), {}).get('usd', 50000)
                else:
                    price = 50000
        except:
            price = 50000
        
        trade_type = random.choice(["call", "put"])
        profit_percent = round(60 + random.random() * 5, 2)
        
        codes_created = 0
        
        for user in all_users:
            user_id = user["user_id"]
            
            # Check multiplier (Martingale)
            last_trade = await db.trade_codes.find_one(
                {"user_id": user_id, "status": "used"},
                sort=[("used_at", -1)]
            )
            
            multiplier = 2 if (last_trade and last_trade.get("result") == "fail") else 1
            fund_percent = 1.0 * multiplier
            
            # Generate code
            code = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=12))
            
            trade_code_doc = {
                "code": code,
                "user_id": user_id,
                "user_email": user.get("email", ""),
                "coin": coin.lower(),
                "amount": 100,
                "trade_type": trade_type,
                "price": price,
                "status": "live",
                "scheduled_slot": "instant",
                "slot_name": "LIVE Now",
                "scheduled_start": now.isoformat(),
                "expires_at": (now + timedelta(minutes=60)).isoformat(),
                "profit_percent": profit_percent,
                "fund_percent": fund_percent,
                "multiplier": multiplier,
                "will_fail": False,
                "created_by": admin["email"],
                "created_at": now.isoformat(),
                "used_at": None,
                "result": None,
                "auto_generated": False
            }
            
            await db.trade_codes.insert_one(trade_code_doc)
            codes_created += 1
        
        return {
            "success": True,
            "message": f"Generated {codes_created} trade codes for all eligible users",
            "codes_created": codes_created,
            "coin": coin,
            "trade_type": trade_type,
            "profit_percent": profit_percent
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/admin/trade-codes")
async def get_trade_codes(admin: dict = Depends(get_current_admin)):
    """Get all trade codes"""
    codes = await db.trade_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return codes

@api_router.get("/user/trade-codes")
async def get_user_trade_codes(user: dict = Depends(get_current_user)):
    """Get all trade codes for current user with live/scheduled status"""
    from datetime import timedelta
    
    codes = await db.trade_codes.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("scheduled_start", -1).to_list(50)
    
    now = datetime.now(timezone.utc)
    
    # Get user's wallet for fund calculation
    wallet = await db.wallets.find_one({"user_id": user["user_id"]})
    total_balance = 0
    if wallet and wallet.get("balances"):
        total_balance = wallet["balances"].get("usdt", 0)
    
    # Process codes to add live/scheduled status
    processed_codes = []
    for code in codes:
        code_data = dict(code)
        
        # Check scheduled start time
        if code_data.get("scheduled_start"):
            scheduled_start = datetime.fromisoformat(code_data["scheduled_start"].replace('Z', '+00:00'))
            if scheduled_start.tzinfo is None:
                scheduled_start = scheduled_start.replace(tzinfo=timezone.utc)
            
            # Check expiry
            expires_at = datetime.fromisoformat(code_data["expires_at"].replace('Z', '+00:00'))
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
            
            # Determine status
            if code_data["status"] == "used":
                code_data["is_live"] = False
                code_data["is_expired"] = True
                code_data["time_remaining"] = 0
                code_data["countdown_to_live"] = 0
            elif now < scheduled_start:
                # Not yet live - show countdown to live
                code_data["is_live"] = False
                code_data["is_expired"] = False
                code_data["countdown_to_live"] = int((scheduled_start - now).total_seconds())
                code_data["time_remaining"] = 3600  # 1 hour validity once live
            elif now >= scheduled_start and now < expires_at:
                # Currently LIVE
                code_data["is_live"] = True
                code_data["is_expired"] = False
                code_data["countdown_to_live"] = 0
                code_data["time_remaining"] = int((expires_at - now).total_seconds())
                # Update status to active if not already
                if code_data["status"] == "scheduled":
                    await db.trade_codes.update_one(
                        {"code": code_data["code"]},
                        {"$set": {"status": "active"}}
                    )
                    code_data["status"] = "active"
            else:
                # Expired
                code_data["is_live"] = False
                code_data["is_expired"] = True
                code_data["time_remaining"] = 0
                code_data["countdown_to_live"] = 0
        else:
            # Legacy codes - treat as already active
            if code_data.get("expires_at"):
                expires_at = datetime.fromisoformat(code_data["expires_at"].replace('Z', '+00:00'))
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
                code_data["is_expired"] = now > expires_at
                code_data["is_live"] = not code_data["is_expired"] and code_data["status"] == "active"
                code_data["time_remaining"] = max(0, int((expires_at - now).total_seconds()))
                code_data["countdown_to_live"] = 0
        
        # Calculate 1% of user's fund for this trade
        code_data["trade_fund"] = round(total_balance * 0.01, 2)
        
        processed_codes.append(code_data)
    
    # Determine current multiplier based on last trade result
    current_multiplier = 1
    last_trade = await db.trade_codes.find_one(
        {"user_id": user["user_id"], "status": "used"},
        sort=[("used_at", -1)]
    )
    if last_trade and last_trade.get("result") == "fail":
        current_multiplier = 2
    
    return {
        "codes": processed_codes,
        "total_balance": total_balance,
        "active_count": len([c for c in processed_codes if c.get("is_live", False)]),
        "current_multiplier": current_multiplier
    }

@api_router.post("/trade/apply-code")
async def apply_trade_code(data: TradeCodeApply, user: dict = Depends(get_current_user)):
    """User applies a trade code to execute trade with profit calculation"""
    from datetime import timedelta
    import random
    
    # Find the trade code (can be live, active, or scheduled)
    trade_code = await db.trade_codes.find_one({
        "code": data.code.upper(),
        "status": {"$in": ["active", "scheduled", "live"]}  # Added "live" status
    })
    
    if not trade_code:
        raise HTTPException(status_code=400, detail="Invalid or expired trade code")
    
    # Check if code is for this user
    if trade_code["user_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="This code is not for your account")
    
    now = datetime.now(timezone.utc)
    
    # Check if code is live (scheduled_start has passed)
    if trade_code.get("scheduled_start"):
        scheduled_start = datetime.fromisoformat(trade_code["scheduled_start"].replace('Z', '+00:00'))
        if scheduled_start.tzinfo is None:
            scheduled_start = scheduled_start.replace(tzinfo=timezone.utc)
        
        if now < scheduled_start:
            time_to_live = int((scheduled_start - now).total_seconds())
            mins = time_to_live // 60
            secs = time_to_live % 60
            raise HTTPException(
                status_code=400, 
                detail=f"Code not yet live. Starts in {mins}m {secs}s"
            )
    
    # Check if code has expired
    if trade_code.get("expires_at"):
        expires_at = datetime.fromisoformat(trade_code["expires_at"].replace('Z', '+00:00'))
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
    else:
        created_at = datetime.fromisoformat(trade_code["created_at"].replace('Z', '+00:00'))
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        expires_at = created_at + timedelta(hours=1)
    
    if now > expires_at:
        await db.trade_codes.update_one(
            {"code": data.code.upper()},
            {"$set": {"status": "expired"}}
        )
        raise HTTPException(status_code=400, detail="Trade code has expired")
    
    # Get user's wallet
    wallet = await db.wallets.find_one({"user_id": user["user_id"]})
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    
    # Trade is ALWAYS successful - no fail condition
    # Calculate trade amount based on fund_percent (1% * multiplier) from FUTURES balance
    futures_balance = wallet.get("futures_balance", 0)
    fund_percent = trade_code.get("fund_percent", 1.0)
    multiplier = trade_code.get("multiplier", 1)
    trade_amount_usdt = futures_balance * (fund_percent / 100)
    
    # Check if user has enough futures balance
    if futures_balance <= 0:
        raise HTTPException(status_code=400, detail="Insufficient Futures balance. Please transfer funds from Spot to Futures first.")
    
    coin = trade_code["coin"]
    price = trade_code["price"]
    
    # Calculate coin amount from USDT
    amount = trade_amount_usdt / price if price > 0 else 0
    
    # Get profit percentage (60-65%)
    profit_percent = trade_code.get("profit_percent", round(60 + random.random() * 5, 2))
    
    # Calculate profit
    profit_usdt = trade_amount_usdt * (profit_percent / 100)
    
    trade_type = trade_code["trade_type"]
    
    # Execute trade - add the profit to FUTURES balance (not Spot)
    await db.wallets.update_one(
        {"user_id": user["user_id"]},
        {
            "$inc": {
                "futures_balance": profit_usdt
            }
        }
    )
    
    # Mark code as used with success result
    await db.trade_codes.update_one(
        {"code": data.code.upper()},
        {
            "$set": {
                "status": "used",
                "used_at": now.isoformat(),
                "result": "success",
                "actual_profit": profit_usdt,
                "actual_trade_amount": trade_amount_usdt
            }
        }
    )
    
    # Record transaction
    transaction = {
        "transaction_id": f"tc_{uuid.uuid4().hex[:12]}",
        "user_id": user["user_id"],
        "type": "trade_code",
        "coin": coin,
        "amount": amount,
        "trade_amount_usdt": trade_amount_usdt,
        "multiplier": multiplier,
        "profit_percent": profit_percent,
        "profit_usdt": profit_usdt,
        "price_at_trade": price,
        "trade_code": data.code.upper(),
        "result": "success",
        "timestamp": now.isoformat()
    }
    await db.transactions.insert_one(transaction)
    
    # Get updated futures balance
    updated_wallet = await db.wallets.find_one({"user_id": user["user_id"]})
    new_futures_balance = updated_wallet.get("futures_balance", 0) if updated_wallet else futures_balance + profit_usdt
    
    return {
        "success": True,
        "trade_type": trade_type,
        "coin": coin.upper(),
        "trade_amount": round(trade_amount_usdt, 2),
        "multiplier": multiplier,
        "profit_percent": profit_percent,
        "profit_usdt": round(profit_usdt, 2),
        "new_balance": round(new_futures_balance, 2),
        "message": f"Trade completed! +${round(profit_usdt, 2)} ({profit_percent}% profit)",
        "trade_details": {
            "trade_type": trade_type,
            "coin": coin,
            "amount": round(amount, 8),
            "trade_amount_usdt": round(trade_amount_usdt, 2),
            "multiplier": multiplier,
            "profit_percent": profit_percent,
            "profit_usdt": round(profit_usdt, 2),
            "price": price
        }
    }

# ==================== KYC VERIFICATION SYSTEM ====================

@api_router.post("/user/kyc/submit")
async def submit_kyc(data: KYCSubmit, request: Request):
    """Submit KYC verification request"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user["user_id"]
    
    # Check if KYC already submitted
    existing_kyc = await db.kyc_requests.find_one({"user_id": user_id}, {"_id": 0})
    if existing_kyc:
        if existing_kyc["status"] == "verified":
            raise HTTPException(status_code=400, detail="KYC already verified")
        elif existing_kyc["status"] == "pending":
            raise HTTPException(status_code=400, detail="KYC already under verification")
    
    # Validate Aadhar (should be 12 digits)
    if not data.aadhar_number.isdigit() or len(data.aadhar_number) != 12:
        raise HTTPException(status_code=400, detail="Invalid Aadhar number. Must be 12 digits.")
    
    # Validate phone number
    phone_clean = data.phone_number.replace("+", "").replace(" ", "").replace("-", "")
    if not phone_clean.isdigit() or len(phone_clean) < 10:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # Validate date of birth format
    try:
        dob = datetime.strptime(data.date_of_birth, "%Y-%m-%d")
        age = (datetime.now() - dob).days // 365
        if age < 18:
            raise HTTPException(status_code=400, detail="User must be 18 years or older")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    kyc_id = f"kyc_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    kyc_record = {
        "kyc_id": kyc_id,
        "user_id": user_id,
        "user_email": user.get("email", ""),
        "user_name": user.get("name", "User"),
        "aadhar_number": data.aadhar_number,
        "phone_number": data.phone_number,
        "date_of_birth": data.date_of_birth,
        "country": data.country,
        "status": "pending",
        "submitted_at": now.isoformat(),
        "reviewed_at": None,
        "rejection_reason": None
    }
    
    await db.kyc_requests.insert_one(kyc_record)
    
    # Update user's KYC status
    await db.users.update_one(
        {"user_id": user_id},
        {"$set": {"kyc_status": "pending"}}
    )
    
    return {
        "success": True,
        "message": "KYC submitted successfully. Please wait for verification.",
        "kyc_id": kyc_id
    }

@api_router.get("/user/kyc/status")
async def get_kyc_status(request: Request):
    """Get user's KYC status"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    kyc = await db.kyc_requests.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not kyc:
        return {"status": "unverified", "kyc": None}
    
    return {
        "status": kyc["status"],
        "kyc": {
            "kyc_id": kyc["kyc_id"],
            "submitted_at": kyc["submitted_at"],
            "reviewed_at": kyc.get("reviewed_at"),
            "rejection_reason": kyc.get("rejection_reason")
        }
    }

@api_router.get("/admin/kyc/pending")
async def get_pending_kyc(admin: dict = Depends(get_current_admin)):
    """Admin: Get all pending KYC requests"""
    pending = await db.kyc_requests.find(
        {"status": "pending"},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(length=100)
    
    return {"requests": pending, "count": len(pending)}

@api_router.get("/admin/kyc/all")
async def get_all_kyc(admin: dict = Depends(get_current_admin)):
    """Admin: Get all KYC requests"""
    all_kyc = await db.kyc_requests.find(
        {},
        {"_id": 0}
    ).sort("submitted_at", -1).to_list(length=500)
    
    return {"requests": all_kyc, "count": len(all_kyc)}

@api_router.post("/admin/kyc/action")
async def kyc_action(data: KYCAction, admin: dict = Depends(get_current_admin)):
    """Admin: Approve or reject KYC request"""
    kyc_id = data.kyc_id
    action = data.action
    rejection_reason = data.rejection_reason
    
    if not kyc_id or action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Invalid request")
    
    kyc = await db.kyc_requests.find_one({"kyc_id": kyc_id}, {"_id": 0})
    if not kyc:
        raise HTTPException(status_code=404, detail="KYC request not found")
    
    new_status = "verified" if action == "approve" else "rejected"
    now = datetime.now(timezone.utc)
    
    update_data = {
        "status": new_status,
        "reviewed_at": now.isoformat()
    }
    if action == "reject":
        update_data["rejection_reason"] = rejection_reason
    
    await db.kyc_requests.update_one(
        {"kyc_id": kyc_id},
        {"$set": update_data}
    )
    
    await db.users.update_one(
        {"user_id": kyc["user_id"]},
        {"$set": {"kyc_status": new_status, "kyc_verified": new_status == "verified"}}
    )
    
    return {
        "success": True,
        "message": f"KYC {new_status}",
        "kyc_id": kyc_id
    }

# ==================== MARGIN/FUTURES TRADING ====================
# ==================== MARGIN/FUTURES TRADING ====================

@api_router.get("/futures/positions")
async def get_futures_positions(request: Request):
    """Get user's open futures positions"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    positions = await db.futures_positions.find(
        {"user_id": user["user_id"], "status": "open"},
        {"_id": 0}
    ).to_list(length=100)
    
    return {"positions": positions, "count": len(positions)}

@api_router.get("/futures/history")
async def get_futures_history(
    request: Request,
    start_date: str = None,
    end_date: str = None
):
    """Get user's complete trading history (futures positions + trade codes)"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user["user_id"]
    
    # Build date filter
    date_filter = {"user_id": user_id}
    
    if start_date:
        date_filter["timestamp"] = {"$gte": start_date}
    if end_date:
        if "timestamp" not in date_filter:
            date_filter["timestamp"] = {}
        date_filter["timestamp"]["$lte"] = end_date + "T23:59:59"
    
    # Get trade code transactions (successful trades)
    trade_codes_used = await db.trade_codes.find(
        {"user_id": user_id, "status": "used"},
        {"_id": 0}
    ).sort("used_at", -1).to_list(length=100)
    
    # Get futures positions history
    futures_history = await db.futures_positions.find(
        {"user_id": user_id, "status": {"$ne": "open"}},
        {"_id": 0}
    ).sort("closed_at", -1).to_list(length=100)
    
    # Get transactions for more details
    transactions = await db.transactions.find(
        {"user_id": user_id, "type": "trade_code"},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(length=100)
    
    # Format history items
    history = []
    
    # Add trade code based trades
    for tc in trade_codes_used:
        # Find matching transaction for more details
        tx = next((t for t in transactions if t.get("trade_code") == tc.get("code")), None)
        
        # Parse timestamp
        used_at = tc.get("used_at", tc.get("created_at", ""))
        try:
            if used_at:
                dt = datetime.fromisoformat(used_at.replace('Z', '+00:00'))
                # Convert to IST
                ist_dt = dt + timedelta(hours=5, minutes=30)
                formatted_date = ist_dt.strftime("%Y-%m-%d")
                formatted_time = ist_dt.strftime("%H:%M:%S")
                time_period_start = ist_dt.strftime("%H:%M")
                time_period_end = (ist_dt + timedelta(seconds=60)).strftime("%H:%M")
            else:
                formatted_date = "N/A"
                formatted_time = "N/A"
                time_period_start = "00:00"
                time_period_end = "00:01"
        except:
            formatted_date = "N/A"
            formatted_time = "N/A"
            time_period_start = "00:00"
            time_period_end = "00:01"
        
        coin = tc.get("coin", "BTC").upper()
        trade_type = tc.get("trade_type", "call").upper()
        
        # Calculate settlement price (slightly different from open)
        open_price = tc.get("price", 0)
        profit = tc.get("actual_profit", tx.get("profit_usdt", 0) if tx else 0)
        amount = tc.get("actual_trade_amount", tx.get("trade_amount_usdt", 0) if tx else 0)
        
        # Settlement price calculation
        if trade_type == "CALL":
            settlement_price = open_price * 1.001 if profit > 0 else open_price * 0.999
        else:
            settlement_price = open_price * 0.999 if profit > 0 else open_price * 1.001
        
        profit_percent = tc.get("profit_percent", tx.get("profit_percent", 60) if tx else 60)
        
        history.append({
            "id": tc.get("code"),
            "type": "trade_code",
            "status": "Opened",
            "product": f"{coin}USDT",
            "direction": trade_type,
            "time_period": f"60s({time_period_start}~{time_period_end})",
            "amount": round(amount, 2),
            "open_position_time": f"{formatted_date} {formatted_time}",
            "open_price": round(open_price, 2),
            "settlement_price": round(settlement_price, 2),
            "turnover": round(amount, 2),
            "profit_loss": round(profit, 2),
            "rate_of_return": round(profit_percent, 2),
            "is_profit": profit > 0,
            "timestamp": used_at,
            "date": formatted_date
        })
    
    # Add futures positions
    for pos in futures_history:
        closed_at = pos.get("closed_at", "")
        try:
            if closed_at:
                dt = datetime.fromisoformat(closed_at.replace('Z', '+00:00'))
                ist_dt = dt + timedelta(hours=5, minutes=30)
                formatted_date = ist_dt.strftime("%Y-%m-%d")
                formatted_time = ist_dt.strftime("%H:%M:%S")
            else:
                formatted_date = "N/A"
                formatted_time = "N/A"
        except:
            formatted_date = "N/A"
            formatted_time = "N/A"
        
        pnl = pos.get("pnl", 0)
        entry_price = pos.get("entry_price", 0)
        exit_price = pos.get("exit_price", entry_price)
        amount = pos.get("margin", 0) * pos.get("leverage", 1)
        
        history.append({
            "id": pos.get("position_id"),
            "type": "futures",
            "status": "Closed",
            "product": f"{pos.get('coin', 'BTC')}USDT",
            "direction": pos.get("side", "long").upper(),
            "time_period": f"{pos.get('leverage', 1)}x Leverage",
            "amount": round(amount, 2),
            "open_position_time": f"{formatted_date} {formatted_time}",
            "open_price": round(entry_price, 2),
            "settlement_price": round(exit_price, 2),
            "turnover": round(amount, 2),
            "profit_loss": round(pnl, 2),
            "rate_of_return": round((pnl / amount * 100) if amount > 0 else 0, 2),
            "is_profit": pnl > 0,
            "timestamp": closed_at,
            "date": formatted_date
        })
    
    # Sort by timestamp descending
    history.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    return {
        "history": history,
        "count": len(history),
        "start_date": start_date,
        "end_date": end_date
    }

@api_router.post("/futures/open")
async def open_futures_position(data: MarginPosition, request: Request):
    """Open a new futures position"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user["user_id"]
    
    # Get wallet
    wallet = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
    if not wallet:
        raise HTTPException(status_code=400, detail="Wallet not found")
    
    usdt_balance = wallet.get("balances", {}).get("USDT", 0)
    
    # Calculate required margin
    margin_required = data.amount / data.leverage
    
    if usdt_balance < margin_required:
        raise HTTPException(
            status_code=400, 
            detail=f"Insufficient balance. Required margin: ${margin_required:.2f}, Available: ${usdt_balance:.2f}"
        )
    
    # Get current price (from our price cache or default)
    coin_prices = {
        "BTC": 69500, "ETH": 3500, "BNB": 600, "SOL": 180, "XRP": 0.55
    }
    entry_price = data.entry_price or coin_prices.get(data.coin.upper(), 1000)
    
    # Calculate position size
    position_size = data.amount / entry_price
    
    # Calculate liquidation price
    if data.side == "long":
        liquidation_price = entry_price * (1 - (1 / data.leverage) + MAINTENANCE_MARGIN_RATE)
    else:
        liquidation_price = entry_price * (1 + (1 / data.leverage) - MAINTENANCE_MARGIN_RATE)
    
    # Deduct margin from wallet
    await db.wallets.update_one(
        {"user_id": user_id},
        {"$inc": {"balances.usdt": -margin_required}}
    )
    
    # Create position
    position_id = f"pos_{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)
    
    position_doc = {
        "position_id": position_id,
        "user_id": user_id,
        "coin": data.coin.upper(),
        "side": data.side,
        "leverage": data.leverage,
        "margin": margin_required,
        "position_size": position_size,
        "entry_price": entry_price,
        "liquidation_price": liquidation_price,
        "unrealized_pnl": 0,
        "status": "open",
        "opened_at": now.isoformat()
    }
    
    await db.futures_positions.insert_one(position_doc)
    
    return {
        "success": True,
        "position_id": position_id,
        "message": f"Opened {data.side.upper()} position: {position_size:.6f} {data.coin.upper()} @ ${entry_price}",
        "position": {
            "position_id": position_id,
            "coin": data.coin.upper(),
            "side": data.side,
            "leverage": data.leverage,
            "margin": margin_required,
            "position_size": position_size,
            "entry_price": entry_price,
            "liquidation_price": liquidation_price
        }
    }

@api_router.post("/futures/close")
async def close_futures_position(data: ClosePosition, request: Request):
    """Close an open futures position"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user["user_id"]
    
    # Get position
    position = await db.futures_positions.find_one(
        {"position_id": data.position_id, "user_id": user_id, "status": "open"},
        {"_id": 0}
    )
    
    if not position:
        raise HTTPException(status_code=404, detail="Position not found or already closed")
    
    # Get current price (simulated with slight change from entry)
    price_change = (random.random() - 0.45) * 0.02  # -1% to +1.1% change bias slightly positive
    exit_price = position["entry_price"] * (1 + price_change)
    
    # Calculate PnL
    if position["side"] == "long":
        pnl_percent = (exit_price - position["entry_price"]) / position["entry_price"]
    else:
        pnl_percent = (position["entry_price"] - exit_price) / position["entry_price"]
    
    pnl = position["margin"] * position["leverage"] * pnl_percent
    
    # Return margin + PnL to wallet
    return_amount = position["margin"] + pnl
    if return_amount > 0:
        await db.wallets.update_one(
            {"user_id": user_id},
            {"$inc": {"balances.usdt": return_amount}}
        )
    
    # Update position
    now = datetime.now(timezone.utc)
    await db.futures_positions.update_one(
        {"position_id": data.position_id},
        {"$set": {
            "status": "closed",
            "exit_price": exit_price,
            "realized_pnl": pnl,
            "return_amount": return_amount,
            "closed_at": now.isoformat()
        }}
    )
    
    return {
        "success": True,
        "message": f"Position closed. PnL: ${pnl:+.2f}",
        "exit_price": exit_price,
        "pnl": pnl,
        "return_amount": return_amount
    }

@api_router.get("/futures/account")
async def get_futures_account(request: Request):
    """Get user's futures account summary"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = user["user_id"]
    
    # Get wallet
    wallet = await db.wallets.find_one({"user_id": user_id}, {"_id": 0})
    available_balance = wallet.get("balances", {}).get("USDT", 0) if wallet else 0
    
    # Get open positions
    positions = await db.futures_positions.find(
        {"user_id": user_id, "status": "open"},
        {"_id": 0}
    ).to_list(length=100)
    
    total_margin = sum(p.get("margin", 0) for p in positions)
    total_unrealized_pnl = sum(p.get("unrealized_pnl", 0) for p in positions)
    
    # Get trading history stats
    history = await db.futures_positions.find(
        {"user_id": user_id, "status": "closed"},
        {"_id": 0}
    ).to_list(length=1000)
    
    total_trades = len(history)
    total_pnl = sum(h.get("realized_pnl", 0) for h in history)
    winning_trades = len([h for h in history if h.get("realized_pnl", 0) > 0])
    win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
    
    return {
        "available_balance": available_balance,
        "total_margin_used": total_margin,
        "unrealized_pnl": total_unrealized_pnl,
        "total_equity": available_balance + total_margin + total_unrealized_pnl,
        "open_positions": len(positions),
        "total_trades": total_trades,
        "total_pnl": total_pnl,
        "win_rate": win_rate
    }



# ================= SETUP ADMIN (ONE-TIME) =================
@api_router.post("/setup/admin")
async def setup_admin(secret_key: str = "TG_SETUP_2024"):
    """One-time admin setup endpoint - use secret key to create admin"""
    
    # Security check - only allow with correct secret key
    if secret_key != "TG_SETUP_SECRET_KEY_2024":
        raise HTTPException(status_code=403, detail="Invalid setup key")
    
    # FIXED Admin credentials and referral code
    admin_email = "admin@tgxchange.com"
    admin_password = "Admin@TG2024"
    FIXED_REFERRAL_CODE = "TGADMIN2024"  # Fixed code that will always work
    
    # Hash password
    password_hash = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    # Check if admin already exists
    existing = await db.users.find_one({"email": admin_email})
    
    if existing:
        # Update admin with FIXED referral code
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {
                "password_hash": password_hash,
                "role": "admin",
                "is_active": True,
                "referral_code": FIXED_REFERRAL_CODE  # Always set fixed code
            }}
        )
        
        return {
            "message": "Admin user updated with fixed referral code", 
            "email": admin_email,
            "referral_code": FIXED_REFERRAL_CODE,
            "referral_link": f"/?ref={FIXED_REFERRAL_CODE}"
        }
    else:
        # Create admin with FIXED referral code
        admin_id = f"admin_{uuid.uuid4().hex[:8]}"
        admin_doc = {
            "user_id": admin_id,
            "email": admin_email,
            "password_hash": password_hash,
            "name": "Admin",
            "role": "admin",
            "referral_code": FIXED_REFERRAL_CODE,  # Fixed code
            "referred_by": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True,
            "kyc_status": "approved"
        }
        
        await db.users.insert_one(admin_doc)
        
        # Create wallet for admin
        wallet_doc = {
            "user_id": admin_id,
            "balances": {"btc": 0.0, "eth": 0.0, "usdt": 10000.0, "bnb": 0.0, "xrp": 0.0, "sol": 0.0},
            "futures_balance": 0.0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet_doc)
        
        return {
            "message": "Admin user created", 
            "email": admin_email, 
            "password": admin_password,
            "referral_code": FIXED_REFERRAL_CODE,
            "referral_link": f"/?ref={FIXED_REFERRAL_CODE}"
        }

# File download endpoint for deployment
from fastapi.responses import FileResponse

@api_router.get("/download/code")
async def download_code():
    file_path = "/app/tgexchange_code.tar.gz"
    if os.path.exists(file_path):
        return FileResponse(
            path=file_path,
            filename="tgexchange_code.tar.gz",
            media_type="application/gzip"
        )
    raise HTTPException(status_code=404, detail="File not found")

# Include router
app.include_router(api_router)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["http://72.61.117.69", "http://tradegenius.exchange", "http://www.tradegenius.exchange", "https://tradegenius.exchange", "https://www.tradegenius.exchange"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================= AUTO TRADE CODE GENERATOR =================

# IST timezone offset (UTC+5:30)
IST_OFFSET = timedelta(hours=5, minutes=30)

# Trade slots configuration - IST Times
TRADE_SLOTS = [
    {"slot": "morning", "hour": 10, "minute": 45, "name": "10:45 AM"},
    {"slot": "evening", "hour": 20, "minute": 30, "name": "8:30 PM"}
]

async def get_random_coin_data():
    """Get random coin for trade code"""
    coins = ["BTC", "ETH", "BNB", "SOL", "XRP", "DOGE", "ADA", "AVAX"]
    coin = random.choice(coins)
    
    # Get current price from CoinGecko
    coin_map = {
        "BTC": "bitcoin", "ETH": "ethereum", "BNB": "binancecoin",
        "SOL": "solana", "XRP": "ripple", "DOGE": "dogecoin",
        "ADA": "cardano", "AVAX": "avalanche-2"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.coingecko.com/api/v3/simple/price?ids={coin_map.get(coin, 'bitcoin')}&vs_currencies=usd",
                timeout=10.0
            )
            if response.status_code == 200:
                data = response.json()
                price = data.get(coin_map.get(coin, 'bitcoin'), {}).get('usd', 50000)
            else:
                price = 50000
    except:
        price = 50000
    
    return {
        "coin": coin,
        "price": price,
        "trade_type": random.choice(["call", "put"])
    }

async def auto_generate_trade_codes_for_slot(slot_config: dict):
    """Generate trade codes for all eligible users for a specific slot"""
    try:
        now = datetime.now(timezone.utc)
        ist_now = now + IST_OFFSET
        
        # Get ALL active users (not just those with futures balance)
        # This ensures every user gets trade codes
        all_users = await db.users.find(
            {},
            {"user_id": 1, "email": 1, "name": 1, "_id": 0}
        ).to_list(length=1000)
        
        if not all_users:
            logging.info(f"No users found for auto trade code generation")
            return
        
        # Get random coin data
        coin_data = await get_random_coin_data()
        
        # Profit percent between 60-65%
        profit_percent = round(60 + random.random() * 5, 2)
        
        codes_created = 0
        
        for user in all_users:
            user_id = user["user_id"]
            
            # Check last trade to determine multiplier (Martingale)
            last_trade = await db.trade_codes.find_one(
                {"user_id": user_id, "status": "used"},
                sort=[("used_at", -1)]
            )
            
            multiplier = 1
            if last_trade and last_trade.get("result") == "fail":
                multiplier = 2
            
            fund_percent = 1.0 * multiplier
            
            # Generate unique code
            code = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=12))
            
            # Calculate scheduled times
            scheduled_start = now
            expires_at = now + timedelta(minutes=60)  # 60 minutes (1 hour) to use
            
            # Create trade code
            trade_code_doc = {
                "code": code,
                "user_id": user_id,
                "user_email": user.get("email", ""),
                "coin": coin_data["coin"].lower(),
                "amount": 100,  # Base amount
                "trade_type": coin_data["trade_type"],
                "price": coin_data["price"],
                "status": "live",  # Immediately live
                "scheduled_slot": slot_config["slot"],
                "slot_name": slot_config["name"],
                "scheduled_start": scheduled_start.isoformat(),
                "expires_at": expires_at.isoformat(),
                "profit_percent": profit_percent,
                "fund_percent": fund_percent,
                "multiplier": multiplier,
                "will_fail": False,
                "created_by": "AUTO_SYSTEM",
                "created_at": now.isoformat(),
                "used_at": None,
                "result": None,
                "auto_generated": True
            }
            
            await db.trade_codes.insert_one(trade_code_doc)
            codes_created += 1
        
        logging.info(f"Auto-generated {codes_created} trade codes for slot {slot_config['name']}")
        
    except Exception as e:
        logging.error(f"Error in auto trade code generation: {e}")

async def check_and_generate_scheduled_codes():
    """Background task to check and generate trade codes at scheduled times"""
    while True:
        try:
            now = datetime.now(timezone.utc)
            ist_now = now + IST_OFFSET
            
            current_hour = ist_now.hour
            current_minute = ist_now.minute
            
            for slot in TRADE_SLOTS:
                # Check if we're within 1 minute of scheduled time
                if current_hour == slot["hour"] and current_minute == slot["minute"]:
                    # Check if codes already generated for this slot today
                    today_start_ist = ist_now.replace(hour=0, minute=0, second=0, microsecond=0)
                    today_start_utc = today_start_ist - IST_OFFSET
                    
                    existing = await db.trade_codes.find_one({
                        "scheduled_slot": slot["slot"],
                        "auto_generated": True,
                        "created_at": {"$gte": today_start_utc.isoformat()}
                    })
                    
                    if not existing:
                        logging.info(f"Triggering auto trade code generation for {slot['name']} IST")
                        await auto_generate_trade_codes_for_slot(slot)
            
            # Check every 30 seconds
            await asyncio.sleep(30)
            
        except Exception as e:
            logging.error(f"Error in scheduled code checker: {e}")
            await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    """Start background tasks on startup"""
    # Start the auto trade code generator
    asyncio.create_task(check_and_generate_scheduled_codes())
    logging.info("Auto trade code generator started")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Temporary file download endpoint for VPS deployment
from fastapi.responses import PlainTextResponse

@app.get("/api/download-server-file", response_class=PlainTextResponse)
async def download_server_file():
    """Download the server.py file as plain text"""
    file_path = Path(__file__)
    return file_path.read_text()

@app.get("/api/download-admin-users-page", response_class=PlainTextResponse)
async def download_admin_users_page():
    """Download the AdminUsersPage.js file"""
    file_path = Path("/app/frontend/src/pages/AdminUsersPage.js")
    return file_path.read_text()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
