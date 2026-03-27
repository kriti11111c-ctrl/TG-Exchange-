# TG Exchange - Product Requirements Document

## Project Overview
A full-stack centralized cryptocurrency exchange similar to Binance/WazirX called "TG Exchange".

## Core Features Implemented

### Authentication System
- JWT-based custom authentication
- Google OAuth via Emergent Managed Auth
- Admin and User roles
- Session management with cookies

### Wallet System
- Multi-currency support (BTC, ETH, USDT, etc.)
- Deposit functionality with blockchain verification
- Withdrawal system with admin approval
- Welcome bonus system

### Trading Features
- Live crypto prices via CoinGecko API (50+ coins)
- Trade Page with buy/sell functionality
- Futures Page with candlestick charts
- Trade History with filters (All/Buy/Sell)
- Admin Trade Code system (Admin generates, User executes)

### Markets
- Markets Page with 50+ cryptocurrencies
- Real-time price updates
- Sorting and categorization
- CoinGecko API integration for reliable logos

### User Features
- Profile management
- Team building/Referral system
- Rank system (Bronze to Diamond)
- Security settings

### Admin Panel
- User management
- Deposit approval
- Withdrawal approval
- Trade Code generator

### UI/UX
- Dark/Light mode on Auth pages
- Global Bottom Navigation (Home, Markets, Trade, Futures, Assets)
- Custom "Golden Bull" logo branding
- Animated Candlestick Loading Page
- Binance-style design

## Technical Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI, Python
- **Database:** MongoDB
- **APIs:** CoinGecko (prices/logos), OKX (market data)

## Key Credentials
- Admin: `admin@tgxchange.com` / `Admin@TG2024`
- Demo User: `demo@cryptovault.com` / `Demo@123`

## Changelog

### December 27, 2025
- Fixed Loading Page speed (2.5s → 1.2s)
- Added candlestick animation to all loading states
- Mini candle loader for auth checks

### Previous Updates
- Implemented candlestick loading page animation
- Added Golden Bull logo branding
- Created Trade Code system
- Fixed CoinGecko logo integration
- Added Markets Page with 50+ coins
- Implemented Trade History page
- Fixed Rank Page format issues

## Pending/Future Tasks

### P0 (High Priority)
- PWA Configuration (for mobile app-like experience)

### P2 (Future)
- Margin trading / Real Futures engine logic
- KYC/Identity verification module
- Advanced technical indicators (Bollinger Bands, MACD)

## Architecture Notes
- `server.py` is monolithic (~3300 lines) - needs modularization
- All backend routes prefixed with `/api`
- Theme context for dark/light mode
- WebSocket support for real-time updates
