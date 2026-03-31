#!/usr/bin/env python3
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def fix_admin_referral():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    ADMIN_EMAIL = "admin@tgxchange.com"
    
    # Update admin user with referral code
    result = await db.users.update_one(
        {"email": ADMIN_EMAIL},
        {"$set": {"referral_code": "TGADMIN2024"}}
    )
    
    if result.modified_count > 0:
        print(f"Admin referral code set: TGADMIN2024")
    else:
        # Check if already set
        user = await db.users.find_one({"email": ADMIN_EMAIL})
        if user:
            print(f"Current referral code: {user.get('referral_code', 'None')}")
        else:
            print("Admin user not found!")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_admin_referral())
