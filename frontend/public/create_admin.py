#!/usr/bin/env python3
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt
import uuid
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

async def create_admin():
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    ADMIN_EMAIL = "admin@tgxchange.com"
    ADMIN_PASSWORD = "Admin@TG2024"
    
    # Check if admin exists
    admin = await db.admins.find_one({"email": ADMIN_EMAIL})
    if admin:
        print(f"Admin already exists: {ADMIN_EMAIL}")
        return
    
    hashed_password = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt())
    
    # Create in admins collection
    await db.admins.insert_one({
        "admin_id": f"admin_{uuid.uuid4().hex[:8]}",
        "email": ADMIN_EMAIL,
        "password": hashed_password.decode('utf-8'),
        "name": "TG Exchange Admin",
        "referral_code": "TGADMIN2024",
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    print(f"Admin created in admins collection: {ADMIN_EMAIL}")
    
    # Create in users collection
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
        # Create wallet
        await db.wallets.insert_one({
            "user_id": admin_user_id,
            "balances": {"btc": 0.0, "eth": 0.0, "usdt": 10000.0, "bnb": 0.0, "xrp": 0.0, "sol": 0.0},
            "futures_balance": 10000.0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        print(f"Admin user and wallet created: {admin_user_id}")
    
    print(f"\n=== ADMIN CREATED ===")
    print(f"Email: {ADMIN_EMAIL}")
    print(f"Password: {ADMIN_PASSWORD}")
    print(f"=====================")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
