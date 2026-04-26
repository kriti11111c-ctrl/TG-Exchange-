#!/bin/bash
# TG Exchange - Login Speed Fix
# Run this on VPS to apply the fix

cd /var/www/tgexchange/backend

# Backup current server.py
cp server.py server.py.backup

# Add session caching for faster repeated logins
# This adds a 5-minute cache for authenticated users

cat > /tmp/add_session_cache.py << 'PYEOF'
import re

# Read server.py
with open('server.py', 'r') as f:
    content = f.read()

# Check if cache already exists
if 'session_cache = TTLCache' in content:
    print("Session cache already exists!")
else:
    # Find the import section and add TTLCache
    if 'from cachetools import TTLCache' not in content:
        content = content.replace(
            'from functools import lru_cache',
            'from functools import lru_cache\nfrom cachetools import TTLCache'
        )
    
    # Add session cache after imports (around line 50)
    cache_code = '''
# Session cache for faster login (5 min TTL, 50000 users)
session_cache = TTLCache(maxsize=50000, ttl=300)

def get_cached_session(email):
    """Get cached user session"""
    return session_cache.get(email)

def set_cached_session(email, user_data, token):
    """Cache user session for faster subsequent logins"""
    session_cache[email] = {"user": user_data, "token": token, "cached_at": time.time()}
'''
    
    # Insert after JWT config
    content = content.replace(
        'JWT_EXPIRATION_HOURS = 24 * 7  # 7 days',
        'JWT_EXPIRATION_HOURS = 24 * 7  # 7 days\n' + cache_code
    )
    
    # Write back
    with open('server.py', 'w') as f:
        f.write(content)
    
    print("Session cache added successfully!")

PYEOF

python3 /tmp/add_session_cache.py

# Install cachetools if not present
pip3 install cachetools --break-system-packages 2>/dev/null

# Restart backend
pm2 restart tgx-backend

echo "Done! Login should be faster now for repeated logins."
