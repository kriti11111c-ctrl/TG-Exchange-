#!/usr/bin/env python3
# Fix Welcome Bonus to show actual remaining balance (after losses)

file_path = '/var/www/tgexchange/backend/server.py'

with open(file_path, 'r') as f:
    content = f.read()

# Find and replace the welcome_bonus_info section
old_code = '''            welcome_bonus_info = {
                "amount": welcome_bonus,
                "expires_at": expires_at_str,'''

new_code = '''            # Show actual futures balance (which decreases with losses), not original welcome_bonus
            actual_bonus_remaining = min(wallet.get("futures_balance", 0), welcome_bonus)
            welcome_bonus_info = {
                "amount": round(actual_bonus_remaining, 2),
                "original_amount": welcome_bonus,
                "expires_at": expires_at_str,'''

content = content.replace(old_code, new_code)

with open(file_path, 'w') as f:
    f.write(content)

print("Welcome Bonus now shows actual remaining balance!")
print("If user loses money trading, the bonus amount will decrease.")
