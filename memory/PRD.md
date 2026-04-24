# TG Exchange - Product Requirements Document

## Project Overview
A full-stack centralized cryptocurrency exchange called "TG Exchange" (Trade Genius).

## Core Features Implemented

### Authentication System
- JWT-based custom authentication
- Admin and User roles
- Session management with cookies
- Mandatory Referral Code for registration

### Wallet System
- **Spot/Futures Split Wallet** 
  - Deposits → Spot balance
  - Welcome Bonus ($200) → Futures balance
  - Trading → Uses Futures balance
  - Withdrawal → From Spot balance only
- **Transfer Feature**: Spot ↔ Futures with Max button, swap accounts
- Multi-currency support (BTC, ETH, USDT, etc.)
- Auto-Approve Deposit via Transaction Hash
- Withdrawal limits (Welcome bonus not withdrawable)

### Trading Features
- Live crypto prices via CoinGecko API (50+ coins)
- Trade Page with buy/sell functionality
- **Advanced Futures Page** with:
  - Binance-style candlestick chart
  - MA(7), MA(25) lines, Bollinger Bands, RSI, MACD, Volume bars
- **Trade Code System**: Admin creates codes, users paste to execute trades
- **Scheduled Trade Codes**: Coming Soon countdown with hidden profit %
- **Martingale Leverage**: 1x default, 2x after forced loss

### VIP/Team Rank System ✅ UPDATED
- 10 Team Ranks (Bronze to Immortal)
- Bronze: 6 Team members with $50+ futures balance (welcome bonus excluded)
- One-time rank rewards ($20 Bronze, $100 Silver, etc.)
- **10-Day Salary Income**: Locked salary pool, unlocks after 10 days
- **Progress Bar**: Shows X/Y format (e.g., 3/6 = 50% for Bronze)
- Progress type: "direct" for Bronze, "bronze" for Silver onwards

### Referral System
- 10-Level referral structure
- Flat 0.6% commission per level
- 5% bonus to direct referrer on new signup

### KYC Verification
- Aadhar, Phone, DOB, Country form
- Admin approval/rejection

### UI/UX
- Dark/Light mode toggle
- Global Bottom Navigation
- Bell Icon notifications for Trade Codes
- PWA ready (Add to Home Screen)
- **KuCoin-Style Homepage**

## Technical Stack
- **Frontend:** React, Tailwind CSS, Shadcn/UI
- **Backend:** FastAPI, Python
- **Database:** MongoDB
- **APIs:** CoinGecko (prices/logos), Binance (charts)

## Key Credentials
- Admin: `admin@tgxchange.com` / `Admin@TG2024`
- Demo User: `demo@tgexchange.com` / `Demo123!`

## API Endpoints
- `POST /api/wallet/transfer` - Transfer Spot ↔ Futures
- `POST /api/trade/apply-code` - Execute trade code
- `GET /api/team-rank/info` - Get rank + salary + progress info
- `POST /api/admin/trade-codes` - Create scheduled trade codes

## Changelog

### April 24, 2026
- **VIP Rank Progress Bar Fixed** - Now shows X/Y format (3/6 = 50%)
- Added `progress_current`, `progress_target`, `progress_type` to API
- Frontend updated to show proper progress indicator
- Welcome bonus excluded from $50 qualification check

### April 23, 2026
- VIP Rank Testing Completed - Mock data seeded
- E2E Demo Testing - All pages verified

### March 29, 2025
- Spot/Futures Wallet Split
- Transfer Modal with Max button

### March 28, 2025
- Bell Icon notifications
- Scheduled Trade Codes
- 10-Day Salary system

## Architecture Notes
- `server.py` is monolithic (~7500 lines) - needs modularization
- All backend routes prefixed with `/api`

## Backlog / Future Tasks
- P0: Deploy approved frontend to user's Hostinger VPS
- P1: Binance Chart fallback (rate limit handling)
- P2: server.py refactoring into modules
- P2: Staking feature implementation
