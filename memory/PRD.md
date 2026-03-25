# CryptoVault Exchange - Product Requirements Document

## Original Problem Statement
"Mujhe ek real centralized exchange chahie l bank jaisa banao" - Build a centralized cryptocurrency exchange like a bank.

## User Choices
1. **Exchange Type**: Crypto Exchange (Bitcoin, Ethereum trading)
2. **Main Features**: Wallet system (deposit/withdraw)
3. **Payment Method**: Crypto deposits only
4. **Authentication**: Both Email/Password + Google OAuth
5. **Price Data**: CoinGecko API (real crypto prices)
6. **Theme**: Day/Night Mode toggle (Light/Dark theme support)

## Architecture

### Backend (FastAPI)
- **Auth**: JWT tokens + Emergent Google OAuth
- **Database**: MongoDB with collections (users, user_sessions, wallets, transactions)
- **Market Data**: CoinGecko API with async httpx + caching + fallback

### Frontend (React)
- **Styling**: Tailwind CSS + Shadcn UI components
- **Design**: Light/Dark theme toggle, Unbounded/Manrope/JetBrains Mono fonts
- **Pages**: Landing, Login, Register, Dashboard, Wallet, Trade, Transactions
- **Theme**: ThemeContext with localStorage persistence

## Core Requirements (Static)
- User registration and login (email/password + Google)
- Crypto wallet with multi-coin support (BTC, ETH, USDT, BNB, XRP, SOL)
- Live market prices from CoinGecko
- Buy/Sell trading with USDT as base currency
- Transaction history
- Deposit/Withdrawal functionality
- Light/Dark Mode toggle

## What's Been Implemented

### March 25, 2026
- ✅ **Real Exchange Data (OKX API)** - Candles now EXACTLY match real exchanges
  - Replaced CoinGecko OHLC with OKX API for real-time candlestick data
  - Real-time price updates every 10 seconds from OKX
  - 24h High, Low, Volume from real exchange data
  - Supports all timeframes: 15m, 1H, 4H, 1D, 1W
  - Charts now match Binance/OKX exactly
  
- ✅ **Technical Indicators on Charts** - Professional trading analysis tools
  - **MA (Moving Average)**: 7-period (yellow) and 25-period (purple) lines on main chart
  - **RSI (Relative Strength Index)**: 14-period RSI in sub-chart with 30/70 levels
  - **MACD**: 12,26,9 configuration with histogram, MACD line, and Signal line
  - Indicator selector dropdown with easy toggle
  - Visual legend showing active indicators
  - Chart height auto-adjusts when sub-chart indicators active
  
- ✅ **Day/Night Mode Toggle** - Full light/dark theme support across all pages
  - Theme toggle button (☀️/🌙) in navbar on Dashboard, Trade, and Wallet pages
  - Theme state persists in localStorage
  - Candlestick chart background responds to theme changes
  - Order Book, Recent Trades, Buy/Sell panel all theme-aware
  - Bottom navigation theme support

### January 24, 2026
- ✅ Landing page with hero, features, stats
- ✅ User authentication (Email/Password + Google OAuth)
- ✅ Dashboard with portfolio value, holdings, market overview
- ✅ Wallet page with deposit/withdraw modals
- ✅ Trade page with buy/sell functionality
- ✅ Real Candlestick Charts with OHLC data (15m, 1H, 4H, 1D, 1W timeframes)
- ✅ Order Book and Recent Trades panel
- ✅ Transaction history page
- ✅ CoinGecko API integration with caching
- ✅ New users get 1000 USDT for testing
- ✅ Mobile responsive Trade page

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
- Real Candlestick Charts
- Light/Dark Mode toggle
- Technical Indicators (MA, RSI, MACD)

### P1 (Backlog)
- WebSocket connection for live price updates
- KYC/Identity verification
- 2FA authentication
- Order book with limit orders

### P2 (Future)
- Margin trading / Futures UI
- Bollinger Bands indicator
- Multiple fiat currencies
- Staking/Earning features
- Admin dashboard
- API keys for programmatic trading

## Next Tasks
1. WebSocket connection for real-time price updates
2. Implement limit orders functionality
3. Add 2FA authentication
4. Add more indicators (Bollinger Bands, Volume Profile)
5. KYC/Identity verification
