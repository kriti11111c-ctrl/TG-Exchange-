"""
SIMPLE TRADE CODE SYSTEM - TG Exchange
========================================
Clean, tested implementation that JUST WORKS!

Features:
- Unique code per user
- 1% fund from futures balance  
- 60-65% random profit
- Top 20 coins with real prices
- CALL/PUT positions
- Success popup + History save
- Auto + Manual code generation
"""

import random
import string
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, List
import httpx

# Top 20 Coins with realistic prices
TOP_20_COINS = {
    "BTC": {"name": "Bitcoin", "price": 77500},
    "ETH": {"name": "Ethereum", "price": 3200},
    "BNB": {"name": "BNB", "price": 590},
    "SOL": {"name": "Solana", "price": 145},
    "XRP": {"name": "Ripple", "price": 0.52},
    "DOGE": {"name": "Dogecoin", "price": 0.15},
    "ADA": {"name": "Cardano", "price": 0.45},
    "AVAX": {"name": "Avalanche", "price": 35},
    "SHIB": {"name": "Shiba Inu", "price": 0.000025},
    "DOT": {"name": "Polkadot", "price": 7.2},
    "LINK": {"name": "Chainlink", "price": 14},
    "TRX": {"name": "Tron", "price": 0.12},
    "MATIC": {"name": "Polygon", "price": 0.55},
    "UNI": {"name": "Uniswap", "price": 7.5},
    "LTC": {"name": "Litecoin", "price": 82},
    "ATOM": {"name": "Cosmos", "price": 8.2},
    "NEAR": {"name": "NEAR", "price": 5.5},
    "APT": {"name": "Aptos", "price": 8.8},
    "ARB": {"name": "Arbitrum", "price": 1.1},
    "OP": {"name": "Optimism", "price": 2.3}
}


def generate_unique_code(length: int = 8) -> str:
    """Generate unique trade code"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))


def get_random_coin() -> dict:
    """Pick random coin from top 20"""
    coin_symbol = random.choice(list(TOP_20_COINS.keys()))
    coin_data = TOP_20_COINS[coin_symbol]
    return {
        "symbol": coin_symbol,
        "name": coin_data["name"],
        "price": coin_data["price"]
    }


async def fetch_live_price(coin_symbol: str) -> float:
    """Fetch live price from Binance API"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.binance.com/api/v3/ticker/price?symbol={coin_symbol}USDT",
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                return float(data.get("price", 0))
    except Exception:
        pass
    
    # Return fallback price
    return TOP_20_COINS.get(coin_symbol, {}).get("price", 100)


def calculate_trade(futures_balance: float, entry_price: float, position_type: str) -> dict:
    """
    Calculate trade result
    - Fund: 1% of futures balance
    - Profit: 60-65% random
    - Settlement price based on position type
    """
    # 1% fund
    fund_amount = futures_balance * 0.01
    
    # 60-65% random profit
    profit_percent = round(random.uniform(60, 65), 2)
    profit_amount = fund_amount * (profit_percent / 100)
    
    # Calculate settlement price (0.5-1.5% price movement)
    price_change_percent = random.uniform(0.5, 1.5)
    
    if position_type == "CALL":
        # Price goes UP for CALL
        settlement_price = entry_price * (1 + price_change_percent / 100)
    else:
        # Price goes DOWN for PUT
        settlement_price = entry_price * (1 - price_change_percent / 100)
    
    # Round appropriately
    if entry_price > 1000:
        settlement_price = round(settlement_price, 2)
    elif entry_price > 1:
        settlement_price = round(settlement_price, 4)
    else:
        settlement_price = round(settlement_price, 8)
    
    return {
        "fund_amount": round(fund_amount, 2),
        "profit_percent": profit_percent,
        "profit_amount": round(profit_amount, 2),
        "entry_price": entry_price,
        "settlement_price": settlement_price,
        "price_change_percent": round(price_change_percent, 2)
    }


# ===================== DATABASE OPERATIONS =====================

async def create_trade_code_for_user(db, user_id: str, user_email: str, is_manual: bool = False) -> dict:
    """
    Create a new trade code for specific user
    """
    code = generate_unique_code()
    coin = get_random_coin()
    position_type = random.choice(["CALL", "PUT"])
    
    now = datetime.now(timezone.utc)
    
    trade_code = {
        "code": code,
        "user_id": user_id,
        "email": user_email,
        "coin": coin["symbol"],
        "coin_name": coin["name"],
        "position_type": position_type,
        "status": "active",
        "is_manual": is_manual,
        "created_at": now.isoformat(),
        "expires_at": (now + timedelta(hours=12)).isoformat()
    }
    
    await db.trade_codes.insert_one(trade_code)
    
    return {
        "code": code,
        "coin": coin["symbol"],
        "coin_name": coin["name"],
        "position_type": position_type,
        "expires_at": trade_code["expires_at"]
    }


async def apply_trade_code_simple(db, user_id: str, code: str) -> dict:
    """
    SIMPLE trade code application
    
    1. Verify code
    2. Get futures balance
    3. Take 1% fund
    4. Calculate 60-65% profit
    5. Update balance
    6. Save history
    7. Return success
    """
    code = code.upper().strip()
    
    # 1. Find and validate code
    trade_code = await db.trade_codes.find_one({
        "code": code,
        "status": "active"
    })
    
    if not trade_code:
        # Check if code exists but is used/expired
        existing = await db.trade_codes.find_one({"code": code})
        if existing:
            if existing.get("status") == "used":
                return {"success": False, "error": "Code already used!"}
            elif existing.get("status") == "expired":
                return {"success": False, "error": "Code has expired!"}
        return {"success": False, "error": "Invalid code!"}
    
    # Check if code belongs to this user (if user-specific)
    if trade_code.get("user_id") and trade_code.get("user_id") != user_id:
        return {"success": False, "error": "This code is not for your account!"}
    
    # Check expiry
    if trade_code.get("expires_at"):
        expires_at = datetime.fromisoformat(trade_code["expires_at"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires_at:
            await db.trade_codes.update_one({"code": code}, {"$set": {"status": "expired"}})
            return {"success": False, "error": "Code has expired!"}
    
    # 2. Get wallet
    wallet = await db.wallets.find_one({"user_id": user_id})
    if not wallet:
        return {"success": False, "error": "Wallet not found!"}
    
    futures_balance = wallet.get("futures_balance", 0)
    if futures_balance <= 0:
        return {"success": False, "error": "Insufficient futures balance!"}
    
    # 3. Get live price
    coin_symbol = trade_code.get("coin", "BTC")
    entry_price = await fetch_live_price(coin_symbol)
    
    # 4. Calculate trade
    position_type = trade_code.get("position_type", random.choice(["CALL", "PUT"]))
    trade_result = calculate_trade(futures_balance, entry_price, position_type)
    
    # 5. Update wallet - add profit
    new_balance = futures_balance + trade_result["profit_amount"]
    await db.wallets.update_one(
        {"user_id": user_id},
        {
            "$set": {"futures_balance": round(new_balance, 2)},
            "$inc": {
                "trading_profit": trade_result["profit_amount"],
                "real_futures_balance": trade_result["profit_amount"]
            }
        }
    )
    
    # 6. Mark code as used
    now = datetime.now(timezone.utc)
    await db.trade_codes.update_one(
        {"code": code},
        {
            "$set": {
                "status": "used",
                "used_by": user_id,
                "used_at": now.isoformat(),
                "result": trade_result
            }
        }
    )
    
    # 7. Save to futures_history
    trade_id = f"ft_{uuid.uuid4().hex[:12]}"
    history_entry = {
        "trade_id": trade_id,
        "user_id": user_id,
        "trade_code": code,
        "coin": coin_symbol,
        "coin_name": trade_code.get("coin_name", coin_symbol),
        "position_type": position_type,
        "fund_amount": trade_result["fund_amount"],
        "entry_price": trade_result["entry_price"],
        "settlement_price": trade_result["settlement_price"],
        "profit_percent": trade_result["profit_percent"],
        "profit_amount": trade_result["profit_amount"],
        "previous_balance": round(futures_balance, 2),
        "new_balance": round(new_balance, 2),
        "status": "completed",
        "result": "win",
        "created_at": now.isoformat(),
        "execution_timestamp": now.timestamp()
    }
    await db.futures_history.insert_one(history_entry)
    
    # Return success response
    return {
        "success": True,
        "message": f"Trade successful! +${trade_result['profit_amount']:.2f}",
        "trade_id": trade_id,
        "coin": coin_symbol,
        "coin_name": trade_code.get("coin_name", coin_symbol),
        "position_type": position_type,
        "entry_price": trade_result["entry_price"],
        "settlement_price": trade_result["settlement_price"],
        "fund_amount": trade_result["fund_amount"],
        "profit_percent": trade_result["profit_percent"],
        "profit_amount": trade_result["profit_amount"],
        "previous_balance": round(futures_balance, 2),
        "new_balance": round(new_balance, 2)
    }


async def generate_daily_codes_for_all_users(db, session: str = "morning") -> dict:
    """
    Auto-generate codes for ALL active users
    Called at scheduled times (10:45 AM / 8:30 PM IST)
    """
    # Get all users with wallets
    users = await db.users.find({}, {"user_id": 1, "email": 1}).to_list(length=None)
    
    codes_created = 0
    for user in users:
        try:
            await create_trade_code_for_user(
                db,
                user["user_id"],
                user.get("email", ""),
                is_manual=False
            )
            codes_created += 1
        except Exception as e:
            print(f"Error creating code for {user['user_id']}: {e}")
    
    return {
        "success": True,
        "session": session,
        "codes_created": codes_created,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# ===================== TEST FUNCTION =====================

async def test_trade_system(db):
    """Test the trade system end-to-end"""
    test_user_id = "test_user_123"
    test_email = "test@example.com"
    
    # 1. Create test wallet
    await db.wallets.update_one(
        {"user_id": test_user_id},
        {"$set": {"user_id": test_user_id, "futures_balance": 100}},
        upsert=True
    )
    
    # 2. Create code
    code_result = await create_trade_code_for_user(db, test_user_id, test_email)
    print(f"Created code: {code_result}")
    
    # 3. Apply code
    apply_result = await apply_trade_code_simple(db, test_user_id, code_result["code"])
    print(f"Apply result: {apply_result}")
    
    # 4. Check wallet
    wallet = await db.wallets.find_one({"user_id": test_user_id})
    print(f"New balance: {wallet.get('futures_balance')}")
    
    return apply_result


if __name__ == "__main__":
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient
    
    async def main():
        client = AsyncIOMotorClient("mongodb://localhost:27017")
        db = client["tgexchange"]
        result = await test_trade_system(db)
        print(f"\n✅ Test Result: {result}")
    
    asyncio.run(main())
