# TG Exchange - Product Requirements Document

## Project Overview
A full-stack centralized cryptocurrency exchange similar to Binance/WazirX called "TG Exchange".

## Core Features Implemented

### Authentication System ✅
- JWT-based custom authentication
- Admin and User roles
- Session management with cookies

### Wallet System ✅
- Multi-currency support (BTC, ETH, USDT, etc.)
- **Auto-Approve Deposit**: Transaction hash submit करते ही balance credit
- Withdrawal system with admin approval
- Welcome bonus system

### Trading Features ✅
- Live crypto prices via CoinGecko API (50+ coins)
- Trade Page with buy/sell functionality
- **Advanced Futures Page** with:
  - Binance-style candlestick chart
  - MA(7), MA(25) lines
  - Bollinger Bands (BOLL)
  - RSI indicator
  - MACD indicator
  - Volume bars
- Trade History with filters
- Admin Trade Code system

### Margin Trading ✅
- Leverage: 1x to 125x
- Open/Close positions via API
- Real-time PnL calculation
- Liquidation price calculation
- Account summary (Balance, PnL, Win Rate)

### Markets ✅
- Markets Page with 50+ cryptocurrencies
- Real-time price updates
- CoinGecko API integration

### KYC Verification ✅
- Aadhar, Phone, DOB, Country form
- "Under Verification" status
- Admin approval from dashboard

### PWA Setup ✅
- manifest.json configured
- Standalone display mode
- "Add to Home Screen" ready

### UI/UX ✅
- Dark/Light mode on Auth pages
- Global Bottom Navigation (Home, Markets, Trade, Futures, Assets)
- Custom "Golden Bull" logo branding
- Animated Candlestick Loading Page

## Technical Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI, Python
- **Database:** MongoDB
- **APIs:** CoinGecko (prices/logos)

## Key Credentials
- Admin: `admin@tgxchange.com` / `Admin@TG2024`
- Demo User: `demo@cryptovault.com` / `Demo@123`

## API Endpoints
- `POST /api/futures/open` - Open futures position
- `POST /api/futures/close` - Close futures position
- `GET /api/futures/positions` - Get open positions
- `GET /api/futures/account` - Get account summary
- `POST /api/user/kyc/submit` - Submit KYC
- `POST /api/admin/kyc/action` - Approve/Reject KYC

## Changelog

### March 28, 2025
- Added PWA setup (manifest.json, meta tags)
- Implemented Advanced Chart Indicators (RSI, MACD, Bollinger Bands)
- Built Margin Trading Logic with real API
- Fixed Futures chart to match Trade page style
- Auto-approve deposit system

### March 27, 2025
- KYC Verification system
- Fixed Loading Page speed
- Removed Google Auth (user request)
- Fixed network images in Deposit/Withdraw

## Architecture Notes
- `server.py` is monolithic (~3900 lines) - needs modularization
- All backend routes prefixed with `/api`
- Chart uses Canvas API for performance
