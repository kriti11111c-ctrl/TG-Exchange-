"""
Admin User Seed Script
Run this script to create admin user in the database

Usage: python seed_admin.py
"""

import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import bcrypt
import uuid
from datetime import datetime, timezone

# Load environment variables
load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'tg_exchange')

# Admin credentials - CHANGE THESE IN PRODUCTION!
ADMIN_EMAIL = "admin@tgxchange.com"
ADMIN_PASSWORD = "Admin@TG2024"
ADMIN_NAME = "Admin"

async def create_admin():
    if not MONGO_URL:
        print("ERROR: MONGO_URL not found in environment variables")
        sys.exit(1)
    
    print(f"Connecting to database: {DB_NAME}")
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    # Check if admin already exists
    existing = await db.users.find_one({'email': ADMIN_EMAIL})
    
    # Hash password
    password_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    if existing:
        # Update existing user to admin
        await db.users.update_one(
            {'email': ADMIN_EMAIL},
            {'$set': {
                'password_hash': password_hash,
                'role': 'admin',
                'is_active': True
            }}
        )
        print(f"✅ Admin user updated!")
    else:
        # Create new admin user
        admin_id = f'admin_{uuid.uuid4().hex[:8]}'
        admin_doc = {
            'user_id': admin_id,
            'email': ADMIN_EMAIL,
            'password_hash': password_hash,
            'name': ADMIN_NAME,
            'role': 'admin',
            'referral_code': f'ADMIN{uuid.uuid4().hex[:6].upper()}',
            'referred_by': None,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'is_active': True,
            'kyc_status': 'approved'
        }
        
        await db.users.insert_one(admin_doc)
        
        # Create wallet for admin
        wallet_doc = {
            'user_id': admin_id,
            'balances': {
                'btc': 0.0,
                'eth': 0.0,
                'usdt': 10000.0,  # Give admin some balance for testing
                'bnb': 0.0,
                'xrp': 0.0,
                'sol': 0.0
            },
            'futures_balance': 0.0,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }
        await db.wallets.insert_one(wallet_doc)
        
        print(f"✅ Admin user created!")
    
    print(f"\n{'='*50}")
    print(f"📧 Admin Email: {ADMIN_EMAIL}")
    print(f"🔑 Admin Password: {ADMIN_PASSWORD}")
    print(f"🔗 Admin Panel: /admin")
    print(f"{'='*50}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_admin())
