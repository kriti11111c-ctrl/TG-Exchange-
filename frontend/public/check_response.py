#!/usr/bin/env python3
import requests
import json

BASE_URL = "https://tradegenius.exchange"

# Login
login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "kriti11111a@gmail.com",
    "password": "79896556"
})

login_data = login_resp.json()
token = login_data.get('access_token')
user_id = login_data.get('user', {}).get('user_id')

print(f"User ID: {user_id}")

# Call team-rank API
headers = {"Authorization": f"Bearer {token}"}
rank_resp = requests.get(f"{BASE_URL}/api/team-rank/info", headers=headers)

data = rank_resp.json()

print("\n=== FULL API RESPONSE KEYS ===")
print(list(data.keys()))

print("\n=== KEY VALUES ===")
print(f"direct_referrals: {data.get('direct_referrals')}")
print(f"total_team: {data.get('total_team')}")
print(f"valid_direct: {data.get('valid_direct')}")
print(f"valid_team: {data.get('valid_team')}")
print(f"user_futures_balance: {data.get('user_futures_balance')}")
print(f"team_members type: {type(data.get('team_members'))}")
print(f"team_members length: {len(data.get('team_members', []))}")
print(f"all_team_members type: {type(data.get('all_team_members'))}")
print(f"all_team_members length: {len(data.get('all_team_members', []))}")

print("\n=== FIRST 3 TEAM MEMBERS ===")
for m in data.get('team_members', [])[:3]:
    print(f"  {m.get('user_id')}: balance=${m.get('futures_balance', 0)}, valid={m.get('is_valid')}")
