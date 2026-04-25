#!/usr/bin/env python3
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os

load_dotenv('/var/www/tgexchange/backend/.env')

MIN_DEPOSIT = 50

async def test():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client['tgexchange']
    
    user_id = 'user_d19ac25b8e96'
    
    refs = await db.referrals.find({'referrer_id': user_id}).to_list(100000)
    print(f"Total referrals: {len(refs)}")
    
    direct = [r for r in refs if r.get('level') == 1]
    print(f"Direct (level 1): {len(direct)}")
    
    referred_ids = [r.get('referred_id') for r in direct]
    wallets = await db.wallets.find({'user_id': {'$in': referred_ids}}).to_list(100000)
    
    print(f"\nDirect referrals wallets:")
    active = 0
    for w in wallets[:10]:
        real = w.get('real_futures_balance', 0) or 0
        status = "ACTIVE" if real >= MIN_DEPOSIT else "inactive"
        if real >= MIN_DEPOSIT:
            active += 1
        print(f"  {w.get('user_id')}: ${real:.2f} [{status}]")
    
    print(f"\nActive ($50+ real): {active}/{len(wallets)}")
    client.close()

asyncio.run(test())
