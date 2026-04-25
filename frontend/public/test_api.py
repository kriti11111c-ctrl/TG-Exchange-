#!/usr/bin/env python3
import requests
import json

BASE_URL = "https://tradegenius.exchange"

# Login
login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "kriti11111a@gmail.com",
    "password": "79896556"
})

print("Login Response:", login_resp.status_code)
login_data = login_resp.json()
print("User:", login_data.get('user', {}).get('user_id'))

token = login_data.get('access_token')
if not token:
    print("NO TOKEN!")
    exit(1)

print("Token:", token[:50] + "...")

# Call team-rank API
headers = {"Authorization": f"Bearer {token}"}
rank_resp = requests.get(f"{BASE_URL}/api/team-rank/info", headers=headers)

print("\nTeam Rank Response:", rank_resp.status_code)
try:
    data = rank_resp.json()
    print("direct_referrals:", data.get('direct_referrals'))
    print("total_team:", data.get('total_team'))
    print("team_members count:", len(data.get('team_members', [])))
    print("all_team_members count:", len(data.get('all_team_members', [])))
except Exception as e:
    print("Error:", e)
    print("Raw:", rank_resp.text[:500])
