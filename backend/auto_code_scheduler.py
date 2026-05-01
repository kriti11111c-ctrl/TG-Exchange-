"""
Auto Trade Code Generator - Runs at 05:15 UTC and 15:00 UTC
Generates trade codes for users who have auto_trade_enabled = True
"""

import asyncio
import random
import string
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = "mongodb://127.0.0.1:27017/"
DB_NAME = "tgexchange"

# Schedule times in UTC (hours, minutes)
SCHEDULE_TIMES = [
    (5, 15),   # 05:15 UTC
    (15, 0),   # 15:00 UTC
]

async def generate_code_for_user(db, user, coin="btc", profit_percent=None):
    """Generate a trade code for a specific user"""
    try:
        if profit_percent is None:
            profit_percent = round(60 + random.random() * 5, 2)  # 60-65%
        
        # Generate 12-char code (lowercase + numbers)
        code = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=12))
        
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=1)
        
        # Random coin selection
        coins = ['btc', 'eth', 'sol', 'bnb', 'xrp']
        selected_coin = random.choice(coins)
        
        trade_code_doc = {
            'code': code,
            'user_id': user['user_id'],
            'user_email': user['email'],
            'coin': selected_coin,
            'profit_percent': profit_percent,
            'trade_type': 'call',
            'fund_percent': 1.0,
            'status': 'live',
            'is_global': False,
            'auto_generated': True,
            'created_at': now.isoformat(),
            'scheduled_start': now.isoformat(),
            'expires_at': expires_at.isoformat()
        }
        
        await db.trade_codes.insert_one(trade_code_doc)
        logger.info(f"✅ Generated code {code} for {user['email']} | Coin: {selected_coin} | Profit: {profit_percent}%")
        return code
        
    except Exception as e:
        logger.error(f"❌ Error generating code for {user.get('email')}: {e}")
        return None

async def generate_scheduled_codes():
    """Generate codes for all users with auto_trade_enabled"""
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Find users with auto_trade_enabled = True
        users = await db.users.find({
            'auto_trade_enabled': True,
            'is_active': True
        }).to_list(1000)
        
        if not users:
            logger.info("No users with auto_trade_enabled found")
            return
        
        logger.info(f"📢 Generating codes for {len(users)} users...")
        
        for user in users:
            await generate_code_for_user(db, user)
            await asyncio.sleep(0.1)  # Small delay between users
        
        logger.info(f"✅ Completed generating codes for {len(users)} users")
        
    except Exception as e:
        logger.error(f"❌ Error in generate_scheduled_codes: {e}")

async def check_and_generate():
    """Check if current time matches schedule and generate codes"""
    now = datetime.now(timezone.utc)
    current_hour = now.hour
    current_minute = now.minute
    
    for schedule_hour, schedule_minute in SCHEDULE_TIMES:
        if current_hour == schedule_hour and current_minute == schedule_minute:
            logger.info(f"⏰ Schedule triggered at {now.strftime('%H:%M UTC')}")
            await generate_scheduled_codes()
            return True
    
    return False

async def main():
    """Main loop - checks every minute"""
    logger.info("🚀 Auto Trade Code Scheduler Started")
    logger.info(f"📅 Scheduled times: 05:15 UTC, 15:00 UTC")
    
    last_run_minute = -1
    
    while True:
        now = datetime.now(timezone.utc)
        current_minute = now.hour * 60 + now.minute
        
        # Only run once per minute
        if current_minute != last_run_minute:
            last_run_minute = current_minute
            await check_and_generate()
        
        # Sleep for 30 seconds then check again
        await asyncio.sleep(30)

if __name__ == "__main__":
    asyncio.run(main())
