#!/usr/bin/env python3
# Fix existing users - set welcome bonus expiry to 3 days from registration

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timedelta, timezone
import os

async def fix_existing_bonus():
    client = AsyncIOMotorClient(os.environ['MONGO_URL'])
    db = client['tgexchange']
    
    NEW_BONUS_DAYS = 3
    now = datetime.now(timezone.utc)
    
    # Find all wallets with welcome bonus
    wallets = await db.wallets.find({"welcome_bonus": {"$gt": 0}}).to_list(1000)
    
    updated = 0
    for wallet in wallets:
        user_id = wallet.get("user_id")
        
        # Get user registration time
        user = await db.users.find_one({"user_id": user_id})
        if not user:
            continue
        
        created_at_str = user.get("created_at")
        if not created_at_str:
            continue
        
        created_at = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        
        # New expiry = registration + 3 days
        new_expiry = created_at + timedelta(days=NEW_BONUS_DAYS)
        
        # If already expired, set welcome_bonus to 0
        if new_expiry < now:
            await db.wallets.update_one(
                {"user_id": user_id},
                {"$set": {
                    "welcome_bonus": 0,
                    "welcome_bonus_expired": True,
                    "welcome_bonus_expires_at": new_expiry.isoformat()
                }}
            )
            print(f"User {user_id}: Bonus EXPIRED (was past 3 days)")
        else:
            # Update expiry to 3 days from registration
            await db.wallets.update_one(
                {"user_id": user_id},
                {"$set": {"welcome_bonus_expires_at": new_expiry.isoformat()}}
            )
            remaining = new_expiry - now
            print(f"User {user_id}: Updated to {remaining.days}d {remaining.seconds//3600}h remaining")
        
        updated += 1
    
    print(f"\n=== DONE ===")
    print(f"Updated {updated} users to 3-day bonus validity")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_existing_bonus())
