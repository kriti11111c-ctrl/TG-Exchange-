#!/usr/bin/env python3
"""
DEBUG: Test Team Rank API directly for kriti11111a@gmail.com
Run: python3 test_team_rank_api.py
"""

import asyncio
import httpx
import os
from pathlib import Path

# Load .env file
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

# Get API URL from environment or use default
API_URL = os.environ.get('API_URL', 'https://tradegenius.exchange')

async def test_api():
    print(f"\n🔍 Testing Team Rank API")
    print(f"📍 API URL: {API_URL}")
    print("="*60)
    
    async with httpx.AsyncClient(timeout=30.0, verify=False) as client:
        # Step 1: Login as kriti
        print("\n1️⃣ Logging in as kriti11111a@gmail.com...")
        login_response = await client.post(
            f"{API_URL}/api/auth/login",
            json={"email": "kriti11111a@gmail.com", "password": "79896556"}
        )
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"   Response: {login_response.text[:200]}")
            return
        
        login_data = login_response.json()
        token = login_data.get("access_token")
        user_info = login_data.get("user", {})
        
        print(f"✅ Login successful!")
        print(f"   User ID from login: {user_info.get('user_id')}")
        print(f"   Email: {user_info.get('email')}")
        print(f"   Token: {token[:50]}...")
        
        # Step 2: Get Team Rank Info
        print("\n2️⃣ Getting Team Rank Info...")
        headers = {"Authorization": f"Bearer {token}"}
        
        team_response = await client.get(
            f"{API_URL}/api/team-rank/info",
            headers=headers
        )
        
        if team_response.status_code != 200:
            print(f"❌ Team Rank API failed: {team_response.status_code}")
            print(f"   Response: {team_response.text[:500]}")
            return
        
        team_data = team_response.json()
        
        print(f"✅ Team Rank Info received!")
        print(f"   User ID: {team_data.get('user_id')}")
        print(f"   Direct Referrals: {team_data.get('direct_referrals')}")
        print(f"   Total Team: {team_data.get('total_team')}")
        print(f"   Valid Direct: {team_data.get('valid_direct')}")
        print(f"   Valid Team: {team_data.get('valid_team')}")
        print(f"   Team Members Count: {len(team_data.get('team_members', []))}")
        print(f"   All Team Members Count: {len(team_data.get('all_team_members', []))}")
        
        # Step 3: Compare user IDs
        print("\n3️⃣ Comparing User IDs...")
        login_user_id = user_info.get('user_id')
        api_user_id = team_data.get('user_id')
        
        if login_user_id == api_user_id:
            print(f"✅ User IDs MATCH: {login_user_id}")
        else:
            print(f"❌ User IDs MISMATCH!")
            print(f"   Login User ID: {login_user_id}")
            print(f"   API User ID: {api_user_id}")
        
        # Step 4: Check if data is correct
        print("\n4️⃣ Data Validation...")
        if team_data.get('direct_referrals', 0) > 0:
            print(f"✅ Data looks correct - {team_data.get('direct_referrals')} referrals found!")
        else:
            print(f"⚠️ No referrals showing - might be a bug!")
    
    print("\n" + "="*60)
    print("✅ Test complete!")

if __name__ == "__main__":
    asyncio.run(test_api())
