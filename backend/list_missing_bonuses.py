#!/usr/bin/env python3
"""
5% Direct Referral Bonus - LIST ONLY (No Fix)
==============================================
सिर्फ list दिखाएगा, fix नहीं करेगा
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def list_missing_bonuses():
    client = AsyncIOMotorClient('mongodb://127.0.0.1:27017/')
    db = client['tgexchange']
    
    print("=" * 70)
    print("  5% DIRECT REFERRAL BONUS - LIST (NO FIX)")
    print("=" * 70)
    print()
    
    # Find all deposits >= $50
    deposits = await db.transactions.find({
        'type': 'deposit',
        'status': 'completed'
    }).to_list(length=None)
    
    # Group deposits by user - find first deposit
    user_first_deposits = {}
    for dep in deposits:
        user_id = dep.get('user_id')
        amount = float(dep.get('amount', 0))
        created_at = dep.get('created_at')
        
        if user_id not in user_first_deposits:
            user_first_deposits[user_id] = {'amount': amount, 'created_at': created_at}
        else:
            if created_at and user_first_deposits[user_id].get('created_at'):
                if created_at < user_first_deposits[user_id]['created_at']:
                    user_first_deposits[user_id] = {'amount': amount, 'created_at': created_at}
    
    # Filter: First deposit >= $50
    eligible = {uid: d for uid, d in user_first_deposits.items() if d['amount'] >= 50}
    
    missing_bonuses = []
    already_given = []
    
    for user_id, data in eligible.items():
        user = await db.users.find_one({'user_id': user_id})
        if not user:
            continue
        
        email = user.get('email', 'N/A')
        referred_by = user.get('referred_by')
        deposit_amount = data['amount']
        
        if not referred_by:
            continue
        
        # Find referrer
        referrer = await db.users.find_one({'user_id': referred_by})
        if not referrer:
            referrer = await db.users.find_one({'referral_code': referred_by})
        
        if not referrer:
            continue
        
        referrer_email = referrer.get('email', 'N/A')
        referrer_id = referrer.get('user_id')
        
        # Check if bonus exists
        bonus_exists = await db.transactions.find_one({
            'user_id': referrer_id,
            'type': 'first_deposit_referral_bonus',
            'from_user_id': user_id
        })
        
        if not bonus_exists:
            bonus_exists = await db.transactions.find_one({
                'user_id': referrer_id,
                'type': 'first_deposit_referral_bonus',
                'description': {'$regex': email, '$options': 'i'}
            })
        
        bonus_amount = round(deposit_amount * 0.05, 2)
        
        if bonus_exists:
            already_given.append({
                'depositor': email,
                'deposit': deposit_amount,
                'referrer': referrer_email,
                'bonus': bonus_amount
            })
        else:
            missing_bonuses.append({
                'depositor': email,
                'deposit': deposit_amount,
                'referrer': referrer_email,
                'bonus': bonus_amount
            })
    
    # Print Results
    print(f"Bonuses Already Given: {len(already_given)}")
    print(f"MISSING Bonuses: {len(missing_bonuses)}")
    print()
    
    if already_given:
        print("-" * 70)
        print("ALREADY GIVEN (OK):")
        print("-" * 70)
        for i, a in enumerate(already_given, 1):
            print(f"{i}. {a['depositor']} (${a['deposit']:.2f})")
            print(f"   -> Referrer: {a['referrer']} = ${a['bonus']:.2f}")
        print()
    
    if missing_bonuses:
        print("-" * 70)
        print("MISSING BONUSES (Need Fix):")
        print("-" * 70)
        total = 0
        for i, m in enumerate(missing_bonuses, 1):
            print(f"{i}. Depositor: {m['depositor']}")
            print(f"   Deposit: ${m['deposit']:.2f}")
            print(f"   Referrer: {m['referrer']}")
            print(f"   Missing Bonus: ${m['bonus']:.2f}")
            print()
            total += m['bonus']
        
        print("=" * 70)
        print(f"TOTAL MISSING: ${total:.2f}")
        print("=" * 70)
    else:
        print("=" * 70)
        print("ALL BONUSES ARE CORRECT! Nothing missing.")
        print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(list_missing_bonuses())
