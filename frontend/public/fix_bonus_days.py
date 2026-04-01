#!/usr/bin/env python3
# Fix Welcome Bonus Days from 5 to 3

file_path = '/var/www/tgexchange/backend/server.py'

with open(file_path, 'r') as f:
    content = f.read()

# Replace 5 days with 3 days
content = content.replace('WELCOME_BONUS_DAYS = 5', 'WELCOME_BONUS_DAYS = 3')
content = content.replace('valid for 5 days', 'valid for 3 days')

with open(file_path, 'w') as f:
    f.write(content)

print("Welcome Bonus changed from 5 days to 3 days!")
