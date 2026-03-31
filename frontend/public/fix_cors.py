#!/usr/bin/env python3
# Fix CORS settings

file_path = '/var/www/tgexchange/backend/server.py'

with open(file_path, 'r') as f:
    content = f.read()

# Replace CORS settings
old_cors = '''app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)'''

new_cors = '''app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["http://72.61.117.69", "http://tradegenius.exchange", "http://www.tradegenius.exchange", "https://tradegenius.exchange", "https://www.tradegenius.exchange"],
    allow_methods=["*"],
    allow_headers=["*"],
)'''

content = content.replace(old_cors, new_cors)

with open(file_path, 'w') as f:
    f.write(content)

print("CORS settings fixed!")
