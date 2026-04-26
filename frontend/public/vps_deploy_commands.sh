#!/bin/bash
# TG Exchange - VPS Deployment Commands
# Run these commands one by one on your VPS via Termius

echo "=============================================="
echo "TG Exchange - VPS Deployment Script"
echo "=============================================="

# Step 1: Download updated frontend
echo "[1/3] Downloading updated frontend..."
cd /var/www/tgexchange
wget -O frontend_update.tar.gz "https://centralized-exchange.preview.emergentagent.com/frontend_update.tar.gz" 2>/dev/null
# OR manually copy from your local build

# Step 2: Deploy APScheduler trade code fix
echo "[2/3] Deploying Auto Trade Code scheduler fix..."
cd /var/www/tgexchange/backend
pip3 install apscheduler pytz --break-system-packages
wget -O auto_trade_codes.py "https://centralized-exchange.preview.emergentagent.com/auto_trade_codes_fixed.py"
pm2 restart tgx-tradecodes

# Step 3: Verify
echo "[3/3] Verifying deployment..."
pm2 logs tgx-tradecodes --lines 10

echo "=============================================="
echo "DEPLOYMENT COMPLETE!"
echo "=============================================="
