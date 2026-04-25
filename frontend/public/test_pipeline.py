#!/usr/bin/env python3
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv('/var/www/tgexchange/backend/.env')

MIN_DEPOSIT_FOR_RANK = 50

async def test_pipeline():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client['tgexchange']
    
    user_id = 'user_d19ac25b8e96'
    
    print(f"Testing pipeline for: {user_id}")
    print("="*60)
    
    # Exact pipeline from server.py
    match_condition = {"referrer_id": user_id}
    match_condition["level"] = 1  # Direct only
    
    pipeline = [
        {"$match": match_condition},
        {"$lookup": {
            "from": "wallets",
            "localField": "referred_id",
            "foreignField": "user_id",
            "as": "wallet"
        }},
        {"$lookup": {
            "from": "users",
            "localField": "referred_id",
            "foreignField": "user_id",
            "as": "user"
        }},
        {"$unwind": {"path": "$wallet", "preserveNullAndEmptyArrays": True}},
        {"$unwind": {"path": "$user", "preserveNullAndEmptyArrays": True}},
        {"$addFields": {
            "real_balance": {
                "$cond": {
                    "if": {"$ne": [{"$ifNull": ["$wallet.real_futures_balance", None]}, None]},
                    "then": {"$ifNull": ["$wallet.real_futures_balance", 0]},
                    "else": {
                        "$max": [0, {"$subtract": [
                            {"$ifNull": ["$wallet.futures_balance", 0]},
                            {"$ifNull": ["$wallet.welcome_bonus", 0]}
                        ]}]
                    }
                }
            }
        }},
        {"$project": {
            "_id": 0,
            "user_id": "$referred_id",
            "name": {"$ifNull": ["$user.name", "Unknown"]},
            "futures_balance": "$real_balance",
            "is_valid": {"$gte": ["$real_balance", MIN_DEPOSIT_FOR_RANK]},
            "level": "$level"
        }},
        {"$sort": {"futures_balance": -1}},
        {"$limit": 500}
    ]
    
    try:
        members = await db.referrals.aggregate(pipeline).to_list(length=500)
        print(f"Pipeline returned: {len(members)} members")
        
        active = sum(1 for m in members if m.get('is_valid'))
        inactive = len(members) - active
        
        print(f"Active: {active}, Inactive: {inactive}")
        print("\nSample members:")
        for m in members[:10]:
            status = "ACTIVE" if m.get('is_valid') else "inactive"
            print(f"  {m.get('user_id')}: ${m.get('futures_balance',0):.2f} [{status}]")
            
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    client.close()

asyncio.run(test_pipeline())
