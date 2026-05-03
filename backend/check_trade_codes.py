#!/usr/bin/env python3
"""
Trade Code Distribution Check
=============================
Check कितने members को trade code मिला और कितने को नहीं
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone, timedelta

async def check_trade_codes():
    client = AsyncIOMotorClient('mongodb://127.0.0.1:27017/')
    db = client['tgexchange']
    
    print("=" * 70)
    print("  TRADE CODE DISTRIBUTION CHECK")
    print("=" * 70)
    print()
    
    # Get IST time
    ist_offset = timedelta(hours=5, minutes=30)
    now_utc = datetime.now(timezone.utc)
    now_ist = now_utc + ist_offset
    today_str = now_ist.strftime("%Y-%m-%d")
    
    print(f"Date (IST): {today_str}")
    print(f"Time (IST): {now_ist.strftime('%H:%M:%S')}")
    print()
    
    # Total Users
    total_users = await db.users.count_documents({})
    print(f"Total Registered Users: {total_users}")
    print()
    
    # Today's trade codes
    today_codes = await db.trade_codes.find({
        "date": today_str
    }).to_list(length=None)
    
    print(f"Today's Trade Codes Generated: {len(today_codes)}")
    print()
    
    # Get unique users who got code today
    users_with_code = set()
    morning_codes = []
    evening_codes = []
    
    for code in today_codes:
        user_id = code.get("user_id")
        if user_id:
            users_with_code.add(user_id)
        
        time_slot = code.get("time_slot", "unknown")
        if time_slot == "11:30":
            morning_codes.append(code)
        elif time_slot == "20:30":
            evening_codes.append(code)
    
    print(f"Morning (11:30 AM) Codes: {len(morning_codes)}")
    print(f"Evening (8:30 PM) Codes: {len(evening_codes)}")
    print(f"Unique Users with Code Today: {len(users_with_code)}")
    print()
    
    # Find users WITHOUT code today
    all_users = await db.users.find({}, {"_id": 0, "user_id": 1, "email": 1, "name": 1, "created_at": 1}).to_list(length=None)
    
    users_without_code = []
    for user in all_users:
        if user.get("user_id") not in users_with_code:
            users_without_code.append(user)
    
    print("-" * 70)
    print(f"USERS WITHOUT TODAY'S CODE: {len(users_without_code)}")
    print("-" * 70)
    
    if users_without_code:
        for i, u in enumerate(users_without_code[:20], 1):
            email = u.get("email", "N/A")
            name = u.get("name", "N/A")
            created = u.get("created_at", "N/A")
            print(f"{i}. {email}")
            print(f"   Name: {name}")
            print(f"   Joined: {created}")
            print()
        
        if len(users_without_code) > 20:
            print(f"... and {len(users_without_code) - 20} more users without code")
    else:
        print("ALL USERS HAVE TODAY'S TRADE CODE!")
    
    print()
    print("=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    print(f"Total Users:           {total_users}")
    print(f"Got Code Today:        {len(users_with_code)}")
    print(f"Missing Code:          {len(users_without_code)}")
    print(f"Coverage:              {len(users_with_code)*100/total_users:.1f}%" if total_users > 0 else "N/A")
    print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_trade_codes())
