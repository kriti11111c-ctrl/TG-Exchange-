#!/usr/bin/env python3
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import uuid
from datetime import datetime, timezone
import os

async def add_admin_user():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    ADMIN_EMAIL = "admin@tgxchange.com"
    ADMIN_PASSWORD = "Admin@TG2024"
    
    # Check if user exists
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if existing:
        print(f"User already exists: {ADMIN_EMAIL}")
        # Update password just in case
        hashed = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt())
        await db.users.update_one(
            {"email": ADMIN_EMAIL},
            {"$set": {"password_hash": hashed.decode('utf-8')}}
        )
        print("Password updated!")
    else:
        # Create new user
        hashed = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt())
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": ADMIN_EMAIL,
            "password_hash": hashed.decode('utf-8'),
            "name": "TG Exchange Admin",
            "referral_code": "TGADMIN2024",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        # Create wallet
        await db.wallets.insert_one({
            "user_id": user_id,
            "balances": {"btc": 0.0, "eth": 0.0, "usdt": 10000.0, "bnb": 0.0, "xrp": 0.0, "sol": 0.0},
            "futures_balance": 10000.0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        print(f"Admin user created: {user_id}")
    
    print(f"\n=== LOGIN CREDENTIALS ===")
    print(f"Email: {ADMIN_EMAIL}")
    print(f"Password: {ADMIN_PASSWORD}")
    print(f"=========================")
    client.close()

if __name__ == "__main__":
    asyncio.run(add_admin_user())
