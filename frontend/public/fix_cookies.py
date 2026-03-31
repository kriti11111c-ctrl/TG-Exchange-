#!/usr/bin/env python3
# Fix cookie settings for HTTP

import re

file_path = '/var/www/tgexchange/backend/server.py'

with open(file_path, 'r') as f:
    content = f.read()

# Replace secure=True with secure=False
content = content.replace('secure=True', 'secure=False')

# Replace samesite="none" with samesite="lax"
content = content.replace('samesite="none"', 'samesite="lax"')

with open(file_path, 'w') as f:
    f.write(content)

print("Cookie settings fixed!")
print("- secure=True -> secure=False")
print("- samesite='none' -> samesite='lax'")
