# CryptoVault Exchange - Product Requirements Document

## Original Problem Statement
"Mujhe ek real centralized exchange chahie l bank jaisa banao" - Build a centralized cryptocurrency exchange like a bank.

## User Choices
1. **Exchange Type**: Crypto Exchange (Bitcoin, Ethereum trading)
2. **Main Features**: Wallet system (deposit/withdraw)
3. **Payment Method**: Crypto deposits only
4. **Authentication**: Both Email/Password + Google OAuth
5. **Price Data**: CoinGecko API (real crypto prices)

## Architecture

### Backend (FastAPI)
- **Auth**: JWT tokens + Emergent Google OAuth
- **Database**: MongoDB with collections (users, user_sessions, wallets, transactions)
- **Market Data**: CoinGecko API with async httpx + caching + fallback

### Frontend (React)
- **Styling**: Tailwind CSS + Shadcn UI components
- **Design**: Dark theme, Unbounded/Manrope/JetBrains Mono fonts
- **Pages**: Landing, Login, Register, Dashboard, Wallet, Trade, Transactions

## Core Requirements (Static)
- User registration and login (email/password + Google)
- Crypto wallet with multi-coin support (BTC, ETH, USDT, BNB, XRP, SOL)
- Live market prices from CoinGecko
- Buy/Sell trading with USDT as base currency
- Transaction history
- Deposit/Withdrawal functionality

## What's Been Implemented (Jan 24, 2026)
- ✅ Landing page with hero, features, stats
- ✅ User authentication (Email/Password + Google OAuth)
- ✅ Dashboard with portfolio value, holdings, market overview
- ✅ Wallet page with deposit/withdraw modals
- ✅ Trade page with buy/sell functionality
- ✅ Transaction history page
- ✅ CoinGecko API integration with caching
- ✅ New users get 1000 USDT for testing

## User Personas
1. **Retail Trader**: Buys/sells crypto, needs simple UI
2. **HODLer**: Deposits crypto, wants secure storage
3. **New User**: Needs onboarding, demo USDT balance

## P0/P1/P2 Features

### P0 (Done)
- Auth system
- Wallet management
- Trading functionality
- Market prices

### P1 (Backlog)
- KYC/Identity verification
- 2FA authentication
- Order book/limit orders
- Advanced charts with indicators
- Real-time WebSocket prices

### P2 (Future)
- Mobile responsive optimization
- Multiple fiat currencies
- Staking/Earning features
- Admin dashboard
- API keys for programmatic trading

## Next Tasks
1. Add 2FA authentication
2. Implement limit orders
3. Add more advanced trading charts
4. Mobile responsive improvements
5. Real-time price updates via WebSocket
