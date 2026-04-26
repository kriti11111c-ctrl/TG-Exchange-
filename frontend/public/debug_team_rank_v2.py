#!/usr/bin/env python3
"""
TG Exchange - Team Rank API Debug Script v2
Run this on VPS to verify backend is working correctly
"""

import requests
import json
import sys

# VPS Backend URL
BASE_URL = "https://tgexchange.in/api"  # Change if different

def test_login_and_team_rank(email, password):
    print(f"\n{'='*60}")
    print(f"Testing Team Rank API for: {email}")
    print(f"{'='*60}\n")
    
    # Step 1: Login
    print("[1] Logging in...")
    login_res = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": email, "password": password},
        headers={"Content-Type": "application/json"}
    )
    
    if login_res.status_code != 200:
        print(f"❌ Login failed: {login_res.text}")
        return
    
    login_data = login_res.json()
    token = login_data.get("access_token")
    
    if not token:
        print(f"❌ No token in response: {json.dumps(login_data, indent=2)}")
        return
    
    print(f"✅ Login successful! Token: {token[:30]}...")
    
    # Step 2: Test team-rank/info
    print("\n[2] Fetching /api/team-rank/info...")
    headers = {"Authorization": f"Bearer {token}"}
    
    rank_res = requests.get(f"{BASE_URL}/team-rank/info", headers=headers)
    
    if rank_res.status_code != 200:
        print(f"❌ API failed with status {rank_res.status_code}")
        print(f"Response: {rank_res.text}")
        return
    
    rank_data = rank_res.json()
    
    print("\n📊 TEAM RANK DATA:")
    print(f"   Direct Referrals: {rank_data.get('direct_referrals', 'N/A')}")
    print(f"   Valid Direct ($50+): {rank_data.get('valid_direct', 'N/A')}")
    print(f"   Total Team: {rank_data.get('total_team', 'N/A')}")
    print(f"   Valid Team ($50+): {rank_data.get('valid_team', 'N/A')}")
    print(f"   Futures Balance: ${rank_data.get('futures_balance', 0):.2f}")
    print(f"   Current Rank: {rank_data.get('current_rank', {}).get('name', 'No Rank')}")
    
    if rank_data.get('direct_referrals', 0) > 0:
        print("\n✅ SUCCESS! Backend is returning correct data!")
        print("   If UI shows 0, the issue is in the FRONTEND code.")
    else:
        print("\n⚠️ No referrals found for this user.")
    
    # Save full response
    print("\n[3] Full API Response saved to: /tmp/team_rank_debug.json")
    with open("/tmp/team_rank_debug.json", "w") as f:
        json.dump(rank_data, f, indent=2, default=str)
    
    print("\n" + "="*60)
    print("DEBUG COMPLETE")
    print("="*60)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 debug_team_rank_v2.py <email> <password>")
        print("Example: python3 debug_team_rank_v2.py kriti11111a@gmail.com 79896556")
        sys.exit(1)
    
    test_login_and_team_rank(sys.argv[1], sys.argv[2])
