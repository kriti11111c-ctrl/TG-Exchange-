#!/usr/bin/env python3
"""
Migration Script: Add real_futures_balance to all existing wallets
real_futures_balance = futures_balance - welcome_bonus (for existing users)

This is a one-time migration to backfill the new field.
"""

import asyncio
import os
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load .env file from same directory
load_dotenv('/var/www/tgexchange/backend/.env')

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "tgexchange")

if not MONGO_URL:
    print("[ERROR] MONGO_URL not found in .env file!")
    exit(1)

print(f"[INFO] Connecting to MongoDB...")
print(f"[INFO] Database: {DB_NAME}")

async def migrate_wallets():
    """Add real_futures_balance field to all existing wallets"""
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    now = datetime.now(timezone.utc)
    
    # Get all wallets
    wallets = await db.wallets.find({}).to_list(length=None)
    
    print(f"\n{'='*60}")
    print(f"[{now.isoformat()}] MIGRATION: Adding real_futures_balance")
    print(f"Found {len(wallets)} wallets to migrate")
    print(f"{'='*60}")
    
    updated_count = 0
    skipped_count = 0
    
    for wallet in wallets:
        user_id = wallet.get("user_id", "unknown")
        
        # Skip if already has real_futures_balance
        if "real_futures_balance" in wallet:
            print(f"  [SKIP] {user_id}: Already has real_futures_balance")
            skipped_count += 1
            continue
        
        futures_balance = wallet.get("futures_balance", 0) or 0
        welcome_bonus = wallet.get("welcome_bonus", 0) or 0
        
        # Calculate real_futures_balance = futures_balance - welcome_bonus
        # This represents actual deposits + profits (excluding bonus)
        real_futures = max(0, futures_balance - welcome_bonus)
        
        # Update wallet
        await db.wallets.update_one(
            {"user_id": user_id},
            {"$set": {"real_futures_balance": real_futures}}
        )
        
        updated_count += 1
        print(f"  [+] {user_id}")
        print(f"      futures_balance: ${futures_balance:.2f}")
        print(f"      welcome_bonus: ${welcome_bonus:.2f}")
        print(f"      real_futures_balance: ${real_futures:.2f}")
        print()
    
    print(f"{'='*60}")
    print(f"MIGRATION COMPLETE!")
    print(f"  Updated: {updated_count} wallets")
    print(f"  Skipped: {skipped_count} wallets")
    print(f"{'='*60}")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_wallets())
