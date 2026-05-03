#!/usr/bin/env python3
"""
5% Direct Referral Bonus - Complete Diagnostic & Auto-Fix Script
================================================================
यह script check करेगा कि किन users को 5% bonus नहीं मिला और automatically fix करेगा
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timezone

async def find_and_fix_missing_bonuses():
    client = AsyncIOMotorClient('mongodb://127.0.0.1:27017/')
    db = client['tgexchange']
    
    print("=" * 70)
    print("  5% DIRECT REFERRAL BONUS - DIAGNOSTIC & AUTO-FIX")
    print("=" * 70)
    print()
    
    # Step 1: Find all deposits >= $50
    print("Step 1: Finding all deposits >= $50...")
    print("-" * 50)
    
    deposits = await db.transactions.find({
        'type': 'deposit',
        'status': 'completed'
    }).to_list(length=None)
    
    print(f"Total completed deposits found: {len(deposits)}")
    print()
    
    # Step 2: Group deposits by user and find first deposit >= $50
    user_first_deposits = {}
    for dep in deposits:
        user_id = dep.get('user_id')
        amount = float(dep.get('amount', 0))
        created_at = dep.get('created_at', datetime.now(timezone.utc))
        
        if user_id not in user_first_deposits:
            user_first_deposits[user_id] = {'amount': amount, 'created_at': created_at, 'deposit': dep}
        else:
            # Keep the earliest deposit
            if created_at < user_first_deposits[user_id]['created_at']:
                user_first_deposits[user_id] = {'amount': amount, 'created_at': created_at, 'deposit': dep}
    
    # Filter: First deposit must be >= $50
    eligible_users = {
        uid: data for uid, data in user_first_deposits.items() 
        if data['amount'] >= 50
    }
    
    print(f"Users with first deposit >= $50: {len(eligible_users)}")
    print()
    
    # Step 3: Check who has referrer and if bonus was given
    print("Step 2: Checking referrers and missing bonuses...")
    print("-" * 50)
    
    missing_bonuses = []
    already_given = []
    no_referrer = []
    
    for user_id, data in eligible_users.items():
        # Get user details
        user = await db.users.find_one({'user_id': user_id})
        if not user:
            continue
        
        email = user.get('email', 'N/A')
        referred_by = user.get('referred_by')  # This is referrer's user_id
        deposit_amount = data['amount']
        
        # Check if user has a referrer
        if not referred_by:
            no_referrer.append({
                'email': email,
                'user_id': user_id,
                'deposit': deposit_amount
            })
            continue
        
        # Find the referrer
        referrer = await db.users.find_one({'user_id': referred_by})
        if not referrer:
            # Try finding by referral_code
            referrer = await db.users.find_one({'referral_code': referred_by})
        
        if not referrer:
            no_referrer.append({
                'email': email,
                'user_id': user_id,
                'deposit': deposit_amount,
                'note': f'Referrer {referred_by} not found'
            })
            continue
        
        referrer_email = referrer.get('email', 'N/A')
        referrer_id = referrer.get('user_id')
        
        # Check if bonus transaction exists
        bonus_exists = await db.transactions.find_one({
            'user_id': referrer_id,
            'type': 'first_deposit_referral_bonus',
            'from_user_id': user_id
        })
        
        # Also check with description
        if not bonus_exists:
            bonus_exists = await db.transactions.find_one({
                'user_id': referrer_id,
                'type': 'first_deposit_referral_bonus',
                'description': {'$regex': email, '$options': 'i'}
            })
        
        bonus_amount = round(deposit_amount * 0.05, 2)
        
        if bonus_exists:
            already_given.append({
                'depositor_email': email,
                'depositor_id': user_id,
                'deposit': deposit_amount,
                'referrer_email': referrer_email,
                'referrer_id': referrer_id,
                'bonus': bonus_amount
            })
        else:
            missing_bonuses.append({
                'depositor_email': email,
                'depositor_id': user_id,
                'deposit': deposit_amount,
                'referrer_email': referrer_email,
                'referrer_id': referrer_id,
                'bonus': bonus_amount
            })
    
    # Print Summary
    print()
    print("=" * 70)
    print("  SUMMARY")
    print("=" * 70)
    print()
    
    print(f"Total users with $50+ first deposit: {len(eligible_users)}")
    print(f"Users without referrer (no bonus needed): {len(no_referrer)}")
    print(f"Bonuses already given: {len(already_given)}")
    print(f"MISSING BONUSES (need fix): {len(missing_bonuses)}")
    print()
    
    if no_referrer:
        print("-" * 50)
        print("Users WITHOUT Referrer (No bonus applicable):")
        print("-" * 50)
        for i, u in enumerate(no_referrer[:10], 1):  # Show first 10
            print(f"  {i}. {u['email']} - Deposit: ${u['deposit']:.2f}")
        if len(no_referrer) > 10:
            print(f"  ... and {len(no_referrer) - 10} more")
        print()
    
    if already_given:
        print("-" * 50)
        print("Bonuses ALREADY GIVEN (OK):")
        print("-" * 50)
        for i, u in enumerate(already_given[:10], 1):  # Show first 10
            print(f"  {i}. {u['depositor_email']} -> {u['referrer_email']} = ${u['bonus']:.2f}")
        if len(already_given) > 10:
            print(f"  ... and {len(already_given) - 10} more")
        print()
    
    # MISSING BONUSES - THE MAIN LIST
    if missing_bonuses:
        print("-" * 50)
        print("MISSING BONUSES (Will be FIXED):")
        print("-" * 50)
        total_missing = 0
        for i, m in enumerate(missing_bonuses, 1):
            print(f"  {i}. Depositor: {m['depositor_email']}")
            print(f"     Deposit: ${m['deposit']:.2f}")
            print(f"     Referrer: {m['referrer_email']}")
            print(f"     Missing Bonus: ${m['bonus']:.2f}")
            print()
            total_missing += m['bonus']
        
        print(f"  TOTAL MISSING: ${total_missing:.2f}")
        print()
        
        # AUTO-FIX
        print("=" * 70)
        print("  AUTO-FIXING MISSING BONUSES...")
        print("=" * 70)
        print()
        
        fixed_count = 0
        for m in missing_bonuses:
            try:
                # Get current referrer balance
                referrer = await db.users.find_one({'user_id': m['referrer_id']})
                current_futures = float(referrer.get('futures_wallet', 0))
                new_futures = current_futures + m['bonus']
                
                # Update futures wallet
                await db.users.update_one(
                    {'user_id': m['referrer_id']},
                    {'$set': {'futures_wallet': new_futures}}
                )
                
                # Create transaction record
                tx_id = f"tx_{uuid.uuid4().hex[:12]}"
                await db.transactions.insert_one({
                    'transaction_id': tx_id,
                    'user_id': m['referrer_id'],
                    'type': 'first_deposit_referral_bonus',
                    'amount': m['bonus'],
                    'status': 'completed',
                    'description': f"5% bonus for {m['depositor_email']} first deposit of ${m['deposit']:.2f} (Auto-fixed)",
                    'from_user_id': m['depositor_id'],
                    'created_at': datetime.now(timezone.utc)
                })
                
                # Mark depositor's first_deposit_done
                await db.users.update_one(
                    {'user_id': m['depositor_id']},
                    {'$set': {'first_deposit_done': True}}
                )
                
                print(f"  FIXED: {m['referrer_email']} +${m['bonus']:.2f}")
                print(f"         (From: {m['depositor_email']})")
                print(f"         New Futures Balance: ${new_futures:.2f}")
                print()
                fixed_count += 1
                
            except Exception as e:
                print(f"  ERROR fixing {m['referrer_email']}: {str(e)}")
        
        print("=" * 70)
        print(f"  COMPLETED! Fixed {fixed_count}/{len(missing_bonuses)} bonuses")
        print(f"  Total amount credited: ${total_missing:.2f}")
        print("=" * 70)
    else:
        print("=" * 70)
        print("  ALL BONUSES ARE CORRECT! Nothing to fix.")
        print("=" * 70)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(find_and_fix_missing_bonuses())
