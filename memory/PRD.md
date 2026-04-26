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

### April 24, 2026 (Session 2 - Continued)
- **Trading System Enhanced with Top 20 Coins** ✅
  - Har user ko DIFFERENT coin milta hai (BTC, ETH, BNB, SOL, XRP, DOGE, ADA, AVAX, SHIB, DOT, LINK, TRX, MATIC, UNI, LTC, ATOM, XLM, NEAR, APT, FIL)
  - Round-robin assignment - unique coin per user
  - Live price fetch via CoinGecko API at execution time
  - Open price aur Settlement price properly recorded
  - Execution timestamp stored for unique results
  - Different users = Different trade data (time-based)
- **VIP Rank E2E Testing COMPLETED** (ALL 10 Ranks verified: Bronze → Immortal)
  - Bronze: $1/day, 6 team members, $50 self deposit ✅
  - Silver: $3.33/day, 30 team members, $200 self deposit ✅
  - Gold: $8.33/day, 75 team members, $500 self deposit ✅
  - Platinum: $16.67/day, 150 team members, $800 self deposit ✅
  - Diamond: $33.33/day, 300 team members, $1600 self deposit ✅
  - Master: $66.67/day, 600 team members, $4000 self deposit ✅
  - Grandmaster: $133.33/day, 1000 team members, $8000 self deposit ✅
  - Champion: $233.33/day, 2000 team members, $12000 self deposit ✅
  - Legend: $400/day, 4000 team members, $24000 self deposit ✅
  - Immortal: $666.67/day, 8000 team members, $40000 self deposit ✅
- **Demotion Logic FULLY VERIFIED**
  - Rank drops when team members' futures_balance < $50 ✅
  - **NEW: Rank drops when USER's OWN futures_balance < self_deposit_required** ✅
  - "Salary Paused" banner displays correctly ✅
  - Demotion message shows reason (team balance OR user balance) ✅
  - "45 Low" badge warns about team members with low balance ✅
- Backend updated: `get_team_rank()` now checks `user_futures_balance` against `self_deposit_required`
- Test accounts created for all ranks (testbronze@, testsilver@, ..., testimmortal@)

### April 24, 2026 (Session 1)
- **"All Team Members" Collapsible Section Added** - Shows full team hierarchy (not just direct referrals)
  - Click to expand/collapse
  - Sorted by Futures Balance (highest first)
  - Level badge (L1, L2, etc.) for each member
  - Valid/Invalid status indicators
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
- `server.py` is monolithic (~8300+ lines) - needs modularization
- All backend routes prefixed with `/api`
- **Database:** MongoDB (Local 127.0.0.1:27017 on VPS)

## Changelog

### April 26, 2026 - Withdrawal Card UI Update ✅
- **Withdrawal Card Enhanced with S/F Balance Display:**
  - Blue "S" circle showing Spot Balance
  - Orange "F" circle showing Futures Balance
  - Total Deposited amount in cyan color
- **Verified/Unverified Badge Added:**
  - Green "Verified" badge with checkmark → User has real deposit (total_deposited > 0)
  - Red "Unverified" badge → User has no real deposit
- Backend API updated: `/api/admin/withdrawal-requests` now returns wallet info
- Welcome Bonus remains locked in Futures (cannot transfer to Spot) ✅

## Backlog / Future Tasks
- P1: Code cleanup and `server.py` modularization (8300+ lines → modular routers)
- P2: Staking Page E2E verification (Flexible/Locked flow)
- P2: Profile/KYC Page verification
