# TG Exchange - Product Requirements Document

## Project Overview
A full-stack centralized cryptocurrency exchange similar to Binance/WazirX called "TG Exchange".

## Core Features Implemented

### Authentication System ✅
- JWT-based custom authentication
- Admin and User roles
- Session management with cookies
- Mandatory Referral Code for registration

### Wallet System ✅
- **Spot/Futures Split Wallet** 
  - Deposits → Spot balance
  - Welcome Bonus ($200) → Futures balance
  - Trading → Uses Futures balance
  - Withdrawal → From Spot balance only
- **Transfer Feature**: Spot ↔ Futures with Max button, swap accounts
- Multi-currency support (BTC, ETH, USDT, etc.)
- Auto-Approve Deposit via Transaction Hash
- Withdrawal limits (Welcome bonus not withdrawable)

### Trading Features ✅
- Live crypto prices via CoinGecko API (50+ coins)
- Trade Page with buy/sell functionality
- **Advanced Futures Page** with:
  - Binance-style candlestick chart
  - MA(7), MA(25) lines, Bollinger Bands, RSI, MACD, Volume bars
- **Trade Code System**: Admin creates codes, users paste to execute trades
- **Scheduled Trade Codes**: Coming Soon countdown with hidden profit %
- **Martingale Leverage**: 1x default, 2x after forced loss

### VIP Rank System ✅
- 10 Team Ranks (Bronze to Immortal)
- Bronze: 6 Team members with $50+ balance
- One-time rank rewards ($20 Bronze, $100 Silver, etc.)
- **10-Day Salary Income**: Locked salary pool, unlocks after 10 days

### Referral System ✅
- 10-Level referral structure
- Flat 0.6% commission per level
- 5% bonus to direct referrer on new signup

### KYC Verification ✅
- Aadhar, Phone, DOB, Country form
- Admin approval/rejection

### UI/UX ✅
- Dark/Light mode toggle
- Global Bottom Navigation
- Bell Icon notifications for Trade Codes
- PWA ready (Add to Home Screen)

## Technical Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI, Python
- **Database:** MongoDB
- **APIs:** CoinGecko (prices/logos), Binance (charts)

## Key Credentials
- Admin: `admin@tgxchange.com` / `Admin@TG2024`
- Demo User: `demo@cryptovault.com` / `Demo@123`

## API Endpoints
- `POST /api/wallet/transfer` - Transfer Spot ↔ Futures
- `POST /api/trade/apply-code` - Execute trade code
- `GET /api/team-rank/info` - Get rank + salary info
- `POST /api/admin/trade-codes` - Create scheduled trade codes

## Changelog

### March 29, 2025
- **Spot/Futures Wallet Split** - Deposits to Spot, Bonus to Futures
- **Transfer Modal** - From/To dropdowns, Max button, Swap accounts
- Welcome Bonus now goes to Futures balance
- Trade Code execution uses Futures balance
- Futures page shows Futures Balance

### March 28, 2025
- Bell Icon notification system for Trade Codes
- Scheduled Trade Codes with Coming Soon countdown
- Martingale Leverage system (1x → 2x on loss)
- 10-Day Salary Income system
- Flat 0.6% referral commission
- Bronze rank now requires 6 Team members
- One-time rank rewards

### March 27, 2025
- KYC Verification system
- PWA setup
- Auto-approve deposit

## Architecture Notes
- `server.py` is monolithic (~4300 lines) - needs modularization
- All backend routes prefixed with `/api`
- Chart uses Canvas API for performance

## Backlog / Future Tasks
- P1: Binance Chart "Failed to Load" fallback (rate limit handling)
- P1: Withdrawal strictly from Spot balance enforcement
- P2: server.py refactoring into modules
- P2: KYC document image upload
