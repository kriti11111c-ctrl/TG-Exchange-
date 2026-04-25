#!/usr/bin/env python3
"""
Debug script to check exactly what API returns for kriti
"""
import requests
import json

BASE_URL = "https://tradegenius.exchange"

# Login as kriti
login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
    "email": "kriti11111a@gmail.com",
    "password": "79896556"
})

login_data = login_resp.json()
token = login_data.get('access_token')
user_id = login_data.get('user', {}).get('user_id')

print(f"User ID: {user_id}")
print(f"Token: {token[:30]}...")

# Call team-rank API exactly like frontend does
headers = {"Authorization": f"Bearer {token}"}
rank_resp = requests.get(f"{BASE_URL}/api/team-rank/info", headers=headers)

print(f"\nStatus Code: {rank_resp.status_code}")
print(f"Response Headers: {dict(rank_resp.headers)}")

data = rank_resp.json()

# Print FULL response as JSON (this is what frontend receives)
print("\n=== FULL API RESPONSE (what frontend receives) ===")
print(json.dumps(data, indent=2, default=str)[:3000])
