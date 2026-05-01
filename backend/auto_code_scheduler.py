"""
Auto Trade Code Generator - Runs at 05:15 UTC and 15:00 UTC
Generates trade codes for ALL active users automatically
"""

import asyncio
import random
import string
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/www/tgexchange/backend/auto_code.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URL = "mongodb://127.0.0.1:27017/"
DB_NAME = "tgexchange"

# Schedule times in UTC (hours, minutes)
SCHEDULE_TIMES = [
    (5, 15),   # 05:15 UTC = 10:45 AM IST
    (15, 0),   # 15:00 UTC = 8:30 PM IST
]

# Coins for random selection
COINS = ['btc', 'eth', 'sol', 'bnb', 'xrp', 'doge', 'ada']

async def generate_code_for_user(db, user):
    """Generate a trade code for a specific user"""
    try:
        # Random profit between 60-65%
        profit_percent = round(60 + random.random() * 5, 2)
        
        # Generate 12-char code (lowercase + numbers)
        code = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=12))
        
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(hours=1)  # Valid for 1 hour
        
        # Random coin selection
        selected_coin = random.choice(COINS)
        
        trade_code_doc = {
            'code': code,
            'user_id': user['user_id'],
            'user_email': user.get('email', ''),
            'coin': selected_coin,
            'profit_percent': profit_percent,
            'trade_type': 'call',
            'fund_percent': 1.0,  # 1% of futures balance
            'status': 'live',
            'is_global': False,
            'auto_generated': True,
            'created_at': now.isoformat(),
            'scheduled_start': now.isoformat(),
            'expires_at': expires_at.isoformat()
        }
        
        await db.trade_codes.insert_one(trade_code_doc)
        return code
        
    except Exception as e:
        logger.error(f"Error generating code for {user.get('email', 'unknown')}: {e}")
        return None

async def generate_codes_for_all_users():
    """Generate codes for ALL active users"""
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Find ALL active users
        users = await db.users.find({
            'is_active': {'$ne': False},
            'role': {'$ne': 'admin'}  # Exclude admins
        }).to_list(10000)
        
        if not users:
            logger.info("No active users found")
            return 0
        
        now = datetime.now(timezone.utc)
        logger.info(f"")
        logger.info(f"{'='*50}")
        logger.info(f"🚀 AUTO CODE GENERATION STARTED")
        logger.info(f"⏰ Time: {now.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        logger.info(f"👥 Total Users: {len(users)}")
        logger.info(f"{'='*50}")
        
        success_count = 0
        for user in users:
            code = await generate_code_for_user(db, user)
            if code:
                success_count += 1
            await asyncio.sleep(0.05)  # Small delay to avoid DB overload
        
        logger.info(f"")
        logger.info(f"✅ COMPLETED: {success_count}/{len(users)} codes generated")
        logger.info(f"{'='*50}")
        
        return success_count
        
    except Exception as e:
        logger.error(f"Error in generate_codes_for_all_users: {e}")
        return 0

async def check_schedule():
    """Check if current time matches schedule"""
    now = datetime.now(timezone.utc)
    current_hour = now.hour
    current_minute = now.minute
    
    for schedule_hour, schedule_minute in SCHEDULE_TIMES:
        if current_hour == schedule_hour and current_minute == schedule_minute:
            return True
    
    return False

async def main():
    """Main loop - checks every 30 seconds"""
    logger.info("")
    logger.info("🔔 AUTO TRADE CODE SCHEDULER STARTED")
    logger.info(f"📅 Schedule: 05:15 UTC (10:45 AM IST) & 15:00 UTC (8:30 PM IST)")
    logger.info(f"⏰ Current UTC: {datetime.now(timezone.utc).strftime('%H:%M:%S')}")
    logger.info("")
    
    last_run_minute = -1
    
    while True:
        try:
            now = datetime.now(timezone.utc)
            current_minute = now.hour * 60 + now.minute
            
            # Only check once per minute (avoid duplicate runs)
            if current_minute != last_run_minute:
                if await check_schedule():
                    logger.info(f"⏰ SCHEDULE TRIGGERED at {now.strftime('%H:%M UTC')}")
                    await generate_codes_for_all_users()
                    last_run_minute = current_minute
                else:
                    # Log status every 10 minutes
                    if now.minute % 10 == 0 and now.second < 30:
                        logger.info(f"⏳ Waiting... Current: {now.strftime('%H:%M UTC')} | Next: 05:15 or 15:00 UTC")
                    last_run_minute = current_minute
            
            # Sleep for 30 seconds
            await asyncio.sleep(30)
            
        except Exception as e:
            logger.error(f"Error in main loop: {e}")
            await asyncio.sleep(60)

if __name__ == "__main__":
    asyncio.run(main())
