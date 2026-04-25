#!/usr/bin/env python3
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from datetime import datetime, timezone
import os

load_dotenv('/var/www/tgexchange/backend/.env')

async def reject_all():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL'))
    db = client['tgexchange']
    now = datetime.now(timezone.utc)
    
    print("="*60)
    print("REJECTING ALL PENDING WITHDRAWALS")
    print("="*60)
    
    pending = await db.withdrawals.find({
        "status": {"$in": ["pending", "processing", "requested"]}
    }).to_list(length=100000)
    
    print(f"Pending withdrawals: {len(pending)}")
    
    if len(pending) == 0:
        print("No pending withdrawals!")
        client.close()
        return
    
    result = await db.withdrawals.update_many(
        {"status": {"$in": ["pending", "processing", "requested"]}},
        {"$set": {
            "status": "rejected",
            "rejected_at": now.isoformat(),
            "reject_reason": "System maintenance"
        }}
    )
    
    print(f"\nRejected: {result.modified_count}")
    
    for w in pending[:20]:
        print(f"  [X] {w.get('user_id','?')}: ${w.get('amount',0):.2f}")
    
    print("="*60)
    print(f"DONE! {result.modified_count} withdrawals rejected")
    print("="*60)
    
    client.close()

asyncio.run(reject_all())
