#!/bin/bash
# Fix script for TG Exchange

cd /var/www/tgexchange/frontend

# Update ReferralPage.js with fixed version
curl -o /tmp/ReferralPage.js https://centralized-exchange.preview.emergentagent.com/ReferralPage.js

# Copy to correct location
cp /tmp/ReferralPage.js src/pages/ReferralPage.js

# Build
npm run build

echo "Frontend updated and built!"
