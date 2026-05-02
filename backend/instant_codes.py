#!/usr/bin/env python3
"""
Instant Code Generator - Called by Cron as BACKUP
Gives 1 code to ALL users for current time slot
"""

import asyncio
import random
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

MONGO_URL = "mongodb://127.0.0.1:27017/"
DB_NAME = "tgexchange"

async def generate_codes():
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        now = datetime.now(timezone.utc)
        
        # Determine time slot
        if now.hour < 12:
            time_slot = f"morning_{now.strftime('%Y-%m-%d')}"
        else:
            time_slot = f"evening_{now.strftime('%Y-%m-%d')}"
        
        logger.info(f"")
        logger.info(f"{'='*50}")
        logger.info(f"🚀 CRON BACKUP - CODE GENERATION")
        logger.info(f"⏰ Time: {now.strftime('%Y-%m-%d %H:%M:%S UTC')}")
        logger.info(f"📍 Time Slot: {time_slot}")
        logger.info(f"{'='*50}")
        
        # Get ALL users (exclude admins)
        users = await db.users.find({'role': {'$ne': 'admin'}}).to_list(None)
        logger.info(f"👥 Total Users: {len(users)}")
        
        success_count = 0
        skip_count = 0
        
        for user in users:
            user_id = user['user_id']
            email = user.get('email', user_id[:8])
            
            # Check if already has code for this slot
            existing = await db.trade_codes.find_one({
                'user_id': user_id,
                'auto_generated': True,
                'time_slot': time_slot
            })
            
            if existing:
                skip_count += 1
                continue
            
            # Generate new code
            code = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=12))
            expires = now + timedelta(hours=2)
            
            await db.trade_codes.insert_one({
                'code': code,
                'user_id': user_id,
                'user_email': email,
                'coin': random.choice(['btc', 'eth', 'sol', 'bnb']),
                'profit_percent': round(60 + random.random() * 5, 2),
                'trade_type': 'call',
                'fund_percent': 1.0,
                'status': 'live',
                'auto_generated': True,
                'time_slot': time_slot,
                'created_at': now.isoformat(),
                'expires_at': expires.isoformat()
            })
            
            success_count += 1
            if success_count % 1000 == 0:
                logger.info(f"✅ {success_count} codes done...")
        
        logger.info(f"")
        logger.info(f"{'='*50}")
        logger.info(f"✅ NEW CODES: {success_count}")
        logger.info(f"⏭️ SKIPPED (already had): {skip_count}")
        logger.info(f"{'='*50}")
        
        client.close()
        return success_count
        
    except Exception as e:
        logger.error(f"❌ ERROR: {e}")
        return 0

if __name__ == "__main__":
    result = asyncio.run(generate_codes())
    print(f"Total new codes: {result}")
