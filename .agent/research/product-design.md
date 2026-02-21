# Product Design: Crypto Exchange (CEX) — UX Blueprint

> **Version:** 1.0  
> **Date:** 2026-02-21  
> **Status:** Research & Design Phase  
> **Scope:** Full user experience blueprint for a centralized cryptocurrency exchange with professional-grade trading system

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [User Personas](#2-user-personas)
3. [Information Architecture](#3-information-architecture)
4. [User Journeys](#4-user-journeys)
5. [Trading Interface Design](#5-trading-interface-design)
6. [Order Book Design](#6-order-book-design)
7. [Chart Integration (TradingView)](#7-chart-integration-tradingview)
8. [Order Form Design](#8-order-form-design)
9. [Wallet & Asset Management](#9-wallet--asset-management)
10. [Account & Security System](#10-account--security-system)
11. [Admin Dashboard](#11-admin-dashboard)
12. [State Catalog](#12-state-catalog)
13. [Responsive Strategy](#13-responsive-strategy)
14. [Accessibility](#14-accessibility)
15. [Design Tokens & Visual Language](#15-design-tokens--visual-language)
16. [Competitive Analysis](#16-competitive-analysis)

---

## 1. Executive Summary

This document defines the complete UX blueprint for a centralized cryptocurrency exchange (CEX) targeting educational/demonstration purposes while maintaining professional-grade UI/UX standards comparable to Binance, OKX, and Coinbase Pro.

### Design Principles

| Principle | Description |
|-----------|-------------|
| **Information Density** | Maximize data visibility without overwhelming — traders need *all* the data, *all* the time |
| **Speed-First** | Every interaction must feel instant; trading UIs are latency-sensitive |
| **Progressive Disclosure** | Simple by default, powerful on demand — beginners see less, pros see everything |
| **Trust & Safety** | Visual confidence through consistent states, confirmations, and clear feedback |
| **Dark-First** | Professional traders overwhelmingly prefer dark themes; design dark-first, light as option |

### Key Design Decisions

- **TradingView Charting Library** as the chart engine (industry standard)
- **Binance-style layout** as primary reference (most familiar to crypto traders)
- **WebSocket-driven** real-time updates with optimistic UI patterns
- **Single-page trading experience** — no full-page navigations during active trading
- **Customizable workspace** — draggable/resizable panels (advanced mode)

---

## 2. User Personas

### 2.1 Persona: Alex — Retail Trader (Casual)

| Attribute | Detail |
|-----------|--------|
| **Age** | 25–35 |
| **Experience** | 6 months – 2 years in crypto |
| **Frequency** | 2–5 trades per week |
| **Devices** | Primarily mobile (70%), desktop (30%) |
| **Goals** | Buy/sell popular coins, track portfolio value, simple limit/market orders |
| **Pain Points** | Overwhelmed by complex trading interfaces, confused by order types, afraid of making costly mistakes |
| **Key Needs** | Simple mode toggle, clear confirmations, portfolio dashboard, price alerts |

**Behavioral Traits:**
- Checks portfolio 3–5× daily
- Primarily uses market orders
- Follows social media for trade ideas
- Values "easy deposit" flow above all
- Needs clear fiat-equivalent values (USD/CNY)

### 2.2 Persona: Sarah — Day Trader (Professional)

| Attribute | Detail |
|-----------|--------|
| **Age** | 28–45 |
| **Experience** | 3+ years, came from traditional finance or self-taught |
| **Frequency** | 10–50+ trades per day |
| **Devices** | Desktop primary (90%), multi-monitor setup |
| **Goals** | Execute complex order strategies quickly, analyze charts with indicators, manage risk with stop-losses |
| **Pain Points** | Latency, missing hotkeys, lack of chart indicators, poor order book depth visualization |
| **Key Needs** | Keyboard shortcuts, advanced order types, customizable layout, depth chart, trade history export |

**Behavioral Traits:**
- Has TradingView open simultaneously
- Uses limit orders predominantly
- Switches between 3–8 trading pairs per session
- Needs sub-second order placement
- Values information density over aesthetics
- Uses OCO (One-Cancels-Other) orders regularly

### 2.3 Persona: Manager Wei — Exchange Admin

| Attribute | Detail |
|-----------|--------|
| **Age** | 30–50 |
| **Experience** | Operations/compliance background |
| **Frequency** | Daily admin tasks |
| **Devices** | Desktop only |
| **Goals** | Monitor platform health, manage users/KYC, configure trading pairs and fees, handle risk events |
| **Pain Points** | Alert fatigue, slow KYC review, difficulty correlating user reports with system data |
| **Key Needs** | Real-time dashboards, bulk actions, audit logs, role-based access, risk alerts |

**Behavioral Traits:**
- Starts day reviewing overnight alerts
- Processes KYC queue in batches
- Monitors trading volume anomalies
- Needs exportable reports for compliance
- Values audit trail completeness

---

## 3. Information Architecture

### 3.1 Site Map

```
Root (/)
├── Landing Page (/)
│   ├── Market Overview (ticker tape, top movers)
│   ├── CTA: Sign Up / Start Trading
│   └── Feature highlights
│
├── Markets (/markets)
│   ├── All Trading Pairs (table view)
│   ├── Filter: Favorites / BTC / ETH / USDT / New Listings
│   ├── Search
│   └── Sort by: Price / 24h Change / Volume
│
├── Trade (/trade/:pair)                    ← PRIMARY EXPERIENCE
│   ├── Chart Panel (TradingView)
│   ├── Order Book Panel
│   ├── Order Form Panel
│   ├── Trade History (Recent Trades)
│   ├── Open Orders
│   ├── Order History
│   ├── Trading Pair Selector
│   └── Market Stats Bar (24h high/low/vol)
│
├── Wallet (/wallet)
│   ├── Overview (total balance, allocation pie)
│   ├── Spot Account
│   │   ├── Deposit (/wallet/deposit/:coin)
│   │   ├── Withdraw (/wallet/withdraw/:coin)
│   │   └── Transfer
│   ├── Transaction History (/wallet/history)
│   └── Address Management
│
├── Account (/account)
│   ├── Dashboard (overview)
│   ├── Security Settings
│   │   ├── Change Password
│   │   ├── 2FA Setup (Google Authenticator / SMS)
│   │   ├── Anti-phishing Code
│   │   └── API Management
│   ├── KYC Verification (/account/kyc)
│   │   ├── Level 1: Email + Phone
│   │   ├── Level 2: ID Document + Selfie
│   │   └── Level 3: Address Proof
│   ├── Preferences
│   │   ├── Theme (Dark/Light)
│   │   ├── Language
│   │   ├── Default Trading Pair
│   │   └── Notification Settings
│   └── Referral Program
│
├── Orders (/orders)
│   ├── Open Orders
│   ├── Order History
│   └── Trade History (fills)
│
├── Auth
│   ├── Login (/login)
│   ├── Register (/register)
│   ├── Forgot Password (/forgot-password)
│   └── Email Verification (/verify)
│
└── Admin (/admin)                          ← SEPARATE APP/ROUTE
    ├── Dashboard (KPIs, system health)
    ├── User Management
    │   ├── User List (search, filter, bulk actions)
    │   ├── User Detail (profile, KYC, orders, balances)
    │   └── KYC Review Queue
    ├── Trading Pair Management
    │   ├── Pair List
    │   ├── Add/Edit Pair
    │   └── Enable/Disable Pair
    ├── Fee Management
    │   ├── Global Fee Schedule
    │   ├── VIP Tier Configuration
    │   └── User-specific overrides
    ├── Risk Control
    │   ├── Withdrawal Limits
    │   ├── Suspicious Activity Alerts
    │   ├── Circuit Breakers
    │   └── Blacklist Management
    ├── System
    │   ├── Audit Logs
    │   ├── API Rate Limits
    │   └── Announcements
    └── Reports
        ├── Volume Reports
        ├── Fee Revenue
        └── User Growth
```

### 3.2 Navigation Structure

**Primary Nav (Top Bar — persistent):**
```
[Logo] [Markets] [Trade ▼] [Wallet] [Orders]     [🔔] [👤 Account ▼] [Theme Toggle]
```

**Trade Sub-nav (within trading page):**
```
[Spot] [Margin*] [Futures*]     (* greyed out / "Coming Soon")
```

**Mobile Bottom Nav:**
```
[Home] [Markets] [Trade] [Wallet] [Account]
```

---

## 4. User Journeys

### 4.1 Journey: New User — First Trade

```
┌─────────────────────────────────────────────────────────────────┐
│  HAPPY PATH                                                      │
│                                                                   │
│  1. Land on homepage → See market data, CTA "Start Trading"      │
│  2. Click Register → Email + Password form                       │
│  3. Verify email → Click link in email                           │
│  4. Login → Redirect to dashboard                                │
│  5. Prompt: "Complete KYC to enable trading"                     │
│  6. KYC Level 1 → Phone verification (SMS OTP)                  │
│  7. Dashboard → Prompt: "Deposit to start trading"               │
│  8. Wallet → Deposit → Select USDT → Copy address / QR          │
│  9. Wait for deposit confirmation (show pending state)           │
│  10. Navigate to Trade → BTC/USDT                                │
│  11. Place market buy order → Confirm dialog                     │
│  12. Order fills → Success toast + balance update                │
│  13. View position in Wallet overview                            │
└─────────────────────────────────────────────────────────────────┘
```

**Error Paths:**

| Step | Error | Handling |
|------|-------|----------|
| 2 | Email already registered | Show inline error, link to login/reset password |
| 2 | Weak password | Real-time password strength meter, specific requirements |
| 3 | Verification link expired | "Resend verification" button with 60s cooldown |
| 5 | KYC document rejected | Specific rejection reason + re-upload prompt |
| 6 | SMS OTP not received | "Resend" (60s cooldown) + "Try voice call" fallback |
| 8 | Wrong network deposit (e.g., ERC20 vs TRC20) | Pre-deposit warning, network selector with clear labels |
| 8 | Deposit not arriving | Status page with block confirmations, support link |
| 11 | Insufficient balance | Inline error with "Deposit" quick-link |
| 11 | Order rejected (price protection) | Explain price moved >X%, suggest new price |
| 11 | Network error during submission | Retry button, optimistic state with reconciliation |

### 4.2 Journey: Day Trader — Multi-Pair Session

```
┌─────────────────────────────────────────────────────────────────┐
│  HAPPY PATH                                                      │
│                                                                   │
│  1. Open /trade/BTC_USDT → Full trading interface loads          │
│  2. Check chart → Add RSI + MACD indicators                     │
│  3. Review order book → Identify support/resistance              │
│  4. Place limit buy at support → 0.5 BTC @ $42,000              │
│  5. Set stop-loss → Sell 0.5 BTC if price drops to $41,000      │
│  6. Switch pair → ETH/USDT (via pair selector or keyboard)      │
│  7. Repeat analysis + order placement                            │
│  8. Monitor open orders panel → See fills in real-time           │
│  9. Partial fill notification → Toast + order row update         │
│  10. Cancel remaining unfilled portion                           │
│  11. Review trade history → Export CSV                           │
└─────────────────────────────────────────────────────────────────┘
```

**Error Paths:**

| Step | Error | Handling |
|------|-------|----------|
| 1 | WebSocket disconnected | Yellow banner "Reconnecting...", auto-retry with backoff, disable order submit |
| 4 | Price moved past limit before submission | Order sits in book (expected); tooltip explains limit order behavior |
| 4 | Rate limit exceeded | "Too many requests, please wait" with countdown |
| 5 | Stop-loss price invalid (above market) | Inline validation: "Stop price must be below current market price for sell" |
| 8 | Stale data (WS lag) | Subtle "Last update: Xs ago" indicator; auto-reconnect |
| 10 | Cancel fails (already filled) | Toast: "Order already fully filled" + refresh order list |
| 10 | Cancel fails (network) | Retry with exponential backoff, show pending-cancel state |

### 4.3 Journey: Admin — KYC Review

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Login to admin panel → Dashboard overview                    │
│  2. See KYC queue badge: "23 pending reviews"                   │
│  3. Navigate to KYC queue → Sorted by submission time           │
│  4. Click first application → Side panel with documents          │
│  5. Review ID front/back + selfie match                         │
│  6. Approve/Reject with reason dropdown + optional note          │
│  7. System sends user notification (email + in-app)             │
│  8. Move to next application (keyboard shortcut: N)             │
│  9. Batch approve obvious matches (checkbox + "Approve All")    │
│  10. Flag suspicious for senior review                          │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Journey: Wallet — Withdrawal

```
┌─────────────────────────────────────────────────────────────────┐
│  1. Wallet → Select asset (e.g., USDT)                          │
│  2. Click "Withdraw"                                             │
│  3. Select network (ERC20 / TRC20 / BEP20) ← CRITICAL STEP     │
│  4. Enter/paste withdrawal address                               │
│  5. Enter amount (show available balance, fee, receive amount)  │
│  6. Review summary (address, network, amount, fee)              │
│  7. 2FA verification (Google Auth code)                         │
│  8. Email confirmation (click link within 30 min)               │
│  9. Withdrawal enters "Processing" state                        │
│  10. Status updates: Processing → Completed (with TX hash)      │
└─────────────────────────────────────────────────────────────────┘
```

**Error Paths:**

| Step | Error | Handling |
|------|-------|----------|
| 3 | Wrong network selected | **Bold warning**: "Sending to wrong network = permanent loss". Show address format hints |
| 4 | Invalid address format | Real-time validation per selected network |
| 4 | Address on blacklist | "This address has been flagged. Contact support." |
| 5 | Amount exceeds daily limit | Show limit, link to KYC upgrade |
| 5 | Amount exceeds available balance | Disable submit, show max available |
| 7 | 2FA code incorrect | "Invalid code. Please try again." (max 5 attempts, then lock) |
| 8 | Email link expired | "Resend confirmation" option |
| 9 | Withdrawal stuck | Show "Under review" status, estimated time, support contact |

---

## 5. Trading Interface Design

### 5.1 Layout Architecture

The trading page follows the **Binance Standard Layout** — the most widely recognized pattern in crypto:

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Logo] [Markets] [Trade] [Wallet] [Orders]  ...  [🔔] [👤] [🌙]   │
├────────────────────────────────┬─────────────┬───────────────────────┤
│                                │             │                       │
│                                │  ORDER      │   ORDER FORM          │
│    CHART (TradingView)         │  BOOK       │                       │
│                                │             │   [Limit] [Market]    │
│    - Candlestick / Line        │  Asks       │   [Stop-Limit] [OCO]  │
│    - Time intervals            │  ─────────  │                       │
│    - Drawing tools             │  Spread     │   Price: [____]       │
│    - Indicators                │  ─────────  │   Amount: [____]      │
│                                │  Bids       │   Total: [____]       │
│                                │             │                       │
│                                │             │   [25%][50%][75%][100%]│
│                                │             │                       │
│                                │             │  [BUY BTC] [SELL BTC] │
├────────────────────────────────┤             ├───────────────────────┤
│  RECENT TRADES                 │             │  MARKET STATS          │
│  (Time | Price | Amount)       │             │  24h High/Low/Vol     │
├────────────────────────────────┴─────────────┴───────────────────────┤
│  [Open Orders] [Order History] [Trade History] [Funds]               │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │ Pair    │ Type  │ Side │ Price   │ Amount │ Filled │ Status   │  │
│  │ BTC/USDT│ Limit │ Buy  │ 42000.0 │ 0.5    │ 0.2    │ Partial  │  │
│  │ ETH/USDT│ Limit │ Sell │ 2800.0  │ 5.0    │ 5.0    │ Filled   │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

### 5.2 Panel Proportions (Desktop 1920px)

| Panel | Width | Height | Priority |
|-------|-------|--------|----------|
| Chart | ~55% (1056px) | ~60% upper | P0 — largest panel |
| Order Book | ~20% (384px) | ~60% upper | P0 — always visible |
| Order Form | ~25% (480px) | ~60% upper | P0 — always visible |
| Recent Trades | ~55% lower-left | ~40% lower | P1 — collapsible |
| Open Orders | Full width | Bottom panel | P0 — tabbed |

### 5.3 Trading Pair Header Bar

```
┌──────────────────────────────────────────────────────────────────────┐
│ ★ BTC/USDT ▼  $42,156.78  +2.34%  │ 24h High: $43,200  │ 24h Low: │
│                  ↑ green            │ $41,050 │ 24h Vol: 12,345 BTC  │
└──────────────────────────────────────────────────────────────────────┘
```

**Elements:**
- **Star icon**: Favorite toggle
- **Pair name + dropdown**: Click to open pair selector modal
- **Last price**: Large, color-coded (green up, red down), with flash animation on change
- **24h change**: Percentage + absolute
- **24h stats**: High, Low, Volume (in base currency + quote currency)

### 5.4 Pair Selector Modal

```
┌─────────────────────────────────┐
│  🔍 Search pair...              │
│  [★ Fav] [USDT] [BTC] [ETH]   │
├─────────────────────────────────┤
│  Pair        Price     24h%     │
│  BTC/USDT    42,156    +2.34%  │
│  ETH/USDT    2,815     -0.82%  │
│  SOL/USDT    98.45     +5.12%  │
│  ...                            │
└─────────────────────────────────┘
```

- Sortable columns (click header)
- Keyboard navigable (↑↓ to select, Enter to confirm)
- Recent pairs section at top
- Real-time price updates in selector

---

## 6. Order Book Design

### 6.1 Layout Pattern

Following Binance/OKX pattern — **vertical split** with asks on top (inverted), spread in middle, bids on bottom:

```
┌──────────────────────────┐
│  Price(USDT)  Amt(BTC)  Total │
│  ──────── ASKS (sells) ─────── │
│  42,180.00   0.523    ████░░░ │  ← depth bar (red, right-aligned)
│  42,175.50   1.200    ██████░ │
│  42,170.00   0.150    █░░░░░░ │
│  42,165.00   2.800    ████████ │
│  ─────────── SPREAD ────────── │
│  42,160.00   ← Last Price      │
│  Spread: $5.00 (0.01%)         │
│  ─────────── BIDS (buys) ───── │
│  42,155.00   1.850    ██████░ │  ← depth bar (green, right-aligned)
│  42,150.00   0.720    ███░░░░ │
│  42,145.00   3.100    █████████│
│  42,140.00   0.450    ██░░░░░ │
└──────────────────────────┘
│  [📊] [📊📊] [📊/📊]          │
│  Asks Only / Both / Bids Only  │
│  Precision: [0.01▼]            │
└──────────────────────────┘
```

### 6.2 Interaction Design

| Interaction | Behavior |
|-------------|----------|
| **Click ask price** | Auto-fill order form with that price (sell side) |
| **Click bid price** | Auto-fill order form with that price (buy side) |
| **Click amount** | Auto-fill order form amount |
| **Hover row** | Highlight row, show cumulative total tooltip |
| **Scroll** | Scroll within order book, center button to snap back to spread |
| **Precision dropdown** | Aggregate price levels (0.01, 0.1, 1, 10, 50, 100) |

### 6.3 Visual Design Rules

- **Asks (sells)**: Red text for price, depth bars in semi-transparent red (`rgba(234, 57, 67, 0.15)`)
- **Bids (buys)**: Green text for price, depth bars in semi-transparent green (`rgba(14, 203, 129, 0.15)`)
- **Depth bars**: Background fill from right, proportional to cumulative volume at that level
- **Flash animation**: Brief highlight when a price level updates (flash then fade)
- **Spread row**: Neutral color, show absolute spread + percentage
- **Font**: Monospace for all numbers (critical for alignment)
- **Row height**: 20–22px for maximum density
- **Update throttle**: Batch updates at 100ms intervals to prevent visual chaos

### 6.4 Display Modes

1. **Default (Both)**: Asks above, spread in middle, bids below
2. **Asks Only**: Full height asks, useful for watching sell pressure
3. **Bids Only**: Full height bids, useful for watching buy pressure

### 6.5 Depth Chart (Visual)

A separate tab/toggle showing the cumulative depth as an area chart:

```
           Bids (green)          │          Asks (red)
                                 │
    ┌─────────────────┐          │          ┌─────────────────┐
    │                 └──────────│──────────┘                 │
    │                            │                            │
────┘                            │                            └────
                            Mid Price
```

---

## 7. Chart Integration (TradingView)

### 7.1 Integration Approach

Use **TradingView Charting Library** (licensed) or **Lightweight Charts** (open source) for the chart component.

### 7.2 Feature Set

| Feature | Priority | Notes |
|---------|----------|-------|
| Candlestick chart | P0 | Default view |
| Line chart | P0 | Alternative view |
| Time intervals | P0 | 1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W, 1M |
| Crosshair | P0 | Show OHLCV on hover |
| Volume bars | P0 | Below candles |
| Drawing tools | P1 | Trend lines, horizontal lines, Fibonacci |
| Technical indicators | P1 | MA, EMA, MACD, RSI, Bollinger Bands, Volume |
| Chart types | P1 | Candle, Line, Bar, Heikin Ashi, Area |
| Fullscreen mode | P0 | Expand chart to fill viewport |
| Indicator overlay | P1 | Overlay on chart or separate pane below |

### 7.3 Chart Header

```
┌──────────────────────────────────────────────────────────────────┐
│ [1m] [5m] [15m] [30m] [1H] [4H] [1D] [1W] [1M] │ [📊Indicators] │
│ [🖊 Drawing] │ [Candle▼] │ [⛶ Fullscreen]                      │
├──────────────────────────────────────────────────────────────────┤
│ O: 42,150  H: 42,200  L: 42,100  C: 42,180  Vol: 234.5 BTC    │
└──────────────────────────────────────────────────────────────────┘
```

### 7.4 Data Feed Integration

```
Chart Component ←→ DataFeed Adapter ←→ WebSocket Manager
                                    ←→ REST API (historical)
```

- **Historical data**: REST API call on initial load and interval change
- **Real-time updates**: WebSocket stream for live candle updates
- **Format**: Standard OHLCV (Open, High, Low, Close, Volume)
- **Resolution**: Server should support all time intervals natively

### 7.5 Chart Interaction with Trading

- **Click price on chart** → Option to place order at that price (right-click context menu)
- **Open orders** displayed as horizontal lines on chart (draggable to modify)
- **Filled orders** shown as markers (▲ buy, ▼ sell) on the chart timeline

---

## 8. Order Form Design

### 8.1 Order Type Tabs

```
[Limit] [Market] [Stop-Limit] [OCO]
```

Each tab reveals a different form configuration.

### 8.2 Limit Order Form

```
┌────────────────────────────────┐
│         BUY    |    SELL       │  ← Toggle (green/red background)
├────────────────────────────────┤
│                                │
│  Price (USDT)                  │
│  ┌──────────────────────────┐  │
│  │ [-] 42,150.00        [+] │  │  ← Stepper buttons
│  └──────────────────────────┘  │
│                                │
│  Amount (BTC)                  │
│  ┌──────────────────────────┐  │
│  │      0.5000              │  │
│  └──────────────────────────┘  │
│                                │
│  [25%] [50%] [75%] [100%]     │  ← Quick percentage of available balance
│                                │
│  Total (USDT)                  │
│  ┌──────────────────────────┐  │
│  │      21,075.00           │  │  ← Auto-calculated
│  └──────────────────────────┘  │
│                                │
│  Available: 50,000.00 USDT    │
│                                │
│  ┌──────────────────────────┐  │
│  │      BUY BTC             │  │  ← Green button
│  └──────────────────────────┘  │
│                                │
│  Fee: ~0.1% = 10.54 USDT     │
└────────────────────────────────┘
```

### 8.3 Market Order Form

```
┌────────────────────────────────┐
│         BUY    |    SELL       │
├────────────────────────────────┤
│                                │
│  Amount (BTC)  |  Total (USDT) │  ← Toggle: buy by amount or by total
│  ┌──────────────────────────┐  │
│  │      0.5000              │  │
│  └──────────────────────────┘  │
│                                │
│  [25%] [50%] [75%] [100%]     │
│                                │
│  ≈ Total: ~21,078.00 USDT    │  ← Estimated, shows "≈"
│  ⚠️ Market orders execute      │
│     at best available price    │  ← Info tooltip
│                                │
│  Available: 50,000.00 USDT    │
│                                │
│  ┌──────────────────────────┐  │
│  │      BUY BTC             │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

### 8.4 Stop-Limit Order Form

```
┌────────────────────────────────┐
│         BUY    |    SELL       │
├────────────────────────────────┤
│                                │
│  Stop Price (USDT)  ⓘ         │  ← Trigger price
│  ┌──────────────────────────┐  │
│  │ [-] 41,000.00        [+] │  │
│  └──────────────────────────┘  │
│                                │
│  Limit Price (USDT)            │  ← Order price after trigger
│  ┌──────────────────────────┐  │
│  │ [-] 40,950.00        [+] │  │
│  └──────────────────────────┘  │
│                                │
│  Amount (BTC)                  │
│  ┌──────────────────────────┐  │
│  │      0.5000              │  │
│  └──────────────────────────┘  │
│                                │
│  [25%] [50%] [75%] [100%]     │
│                                │
│  Total: 20,475.00 USDT       │
│                                │
│  ┌──────────────────────────┐  │
│  │      SELL BTC            │  │  ← Red button for sell stop
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

### 8.5 OCO (One-Cancels-Other) Order Form

```
┌────────────────────────────────┐
│  OCO = Take Profit + Stop Loss │
├────────────────────────────────┤
│                                │
│  ── Take Profit ──             │
│  Price: [____] (above market)  │
│                                │
│  ── Stop Loss ──               │
│  Stop: [____] (below market)   │
│  Limit: [____]                 │
│                                │
│  Amount (BTC): [____]          │
│  [25%] [50%] [75%] [100%]     │
│                                │
│  ┌──────────────────────────┐  │
│  │    PLACE OCO ORDER       │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

### 8.6 Order Confirmation Dialog

For market orders and large orders, show a confirmation:

```
┌────────────────────────────────────┐
│  ⚠️  Confirm Order                  │
│                                    │
│  Side:    BUY                      │
│  Type:    Market                   │
│  Amount:  0.5 BTC                  │
│  Est:     ~$21,078.00 USDT        │
│  Fee:     ~$10.54 USDT            │
│                                    │
│  □ Don't show again for           │
│    market orders                   │
│                                    │
│  [Cancel]          [Confirm Buy]   │
└────────────────────────────────────┘
```

### 8.7 Validation Rules

| Field | Validation | Error Message |
|-------|-----------|---------------|
| Price | > 0, within ±50% of market | "Price is X% away from market price. Continue?" |
| Amount | > min order size, ≤ max | "Minimum order: 0.0001 BTC" |
| Amount | ≤ available balance | "Insufficient balance. Available: X" |
| Stop Price | Logical direction (sell stop < market) | "Stop price must be below current price for sell orders" |
| Total | ≥ min notional value | "Order total must be at least 10 USDT" |
| Decimal places | Per trading pair config | Auto-round to valid precision |

### 8.8 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `B` | Focus buy order form |
| `S` | Focus sell order form |
| `1-4` | Switch order type tab (Limit/Market/Stop/OCO) |
| `Enter` | Submit order (when form focused) |
| `Esc` | Cancel/close modal |
| `↑/↓` | Increment/decrement price (when price input focused) |
| `/` | Focus pair search |
| `F` | Toggle fullscreen chart |

---

## 9. Wallet & Asset Management

### 9.1 Wallet Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Total Balance: $125,432.18 USDT                                 │
│  ┌─────────────────────┐  ┌────────────────────────────────────┐ │
│  │                     │  │  Asset     Balance   Value    %    │ │
│  │   Allocation Pie    │  │  USDT      50,000    $50,000  40% │ │
│  │   or Donut Chart    │  │  BTC       1.235     $52,000  41% │ │
│  │                     │  │  ETH       8.500     $23,432  19% │ │
│  │                     │  │  SOL       0         $0       0%  │ │
│  └─────────────────────┘  └────────────────────────────────────┘ │
│                                                                   │
│  □ Hide small balances (< $1)                                    │
│                                                                   │
│  [Deposit]  [Withdraw]  [Transfer]                               │
└──────────────────────────────────────────────────────────────────┘
```

### 9.2 Deposit Flow

```
Step 1: Select Coin          Step 2: Select Network       Step 3: Copy Address
┌────────────────────┐       ┌────────────────────┐       ┌─────────────────────┐
│ 🔍 Search coin...  │       │ Network:           │       │                     │
│ ┌────────────────┐ │       │ ○ ERC20 (Ethereum) │       │  [QR CODE]          │
│ │ ₿  BTC         │ │  →    │ ● TRC20 (Tron) ✓  │  →    │                     │
│ │ Ξ  ETH         │ │       │ ○ BEP20 (BSC)     │       │  Address:           │
│ │ ₮  USDT        │ │       │                    │       │  TXa8B...4f2K       │
│ └────────────────┘ │       │ ⚠️ Only send USDT  │       │  [📋 Copy] [📱 QR]  │
│                    │       │ on TRC20 network!  │       │                     │
└────────────────────┘       └────────────────────┘       │  Min deposit: 1 USDT│
                                                          │  Confirmations: 20  │
                                                          └─────────────────────┘
```

### 9.3 Transaction History

```
┌──────────────────────────────────────────────────────────────────┐
│ [All] [Deposit] [Withdrawal] [Transfer]   🔍 Filter   📅 Date   │
├──────────────────────────────────────────────────────────────────┤
│ Time          │ Type     │ Asset │ Amount    │ Status    │ TxID  │
│ 2026-02-21    │ Deposit  │ USDT  │ +5,000    │ ✅ Done   │ 0x... │
│ 2026-02-20    │ Withdraw │ BTC   │ -0.100    │ ⏳ Pending│ 0x... │
│ 2026-02-20    │ Deposit  │ ETH   │ +2.000    │ ✅ Done   │ 0x... │
└──────────────────────────────────────────────────────────────────┘
```

---

## 10. Account & Security System

### 10.1 Registration Flow

```
Step 1: Email + Password
┌─────────────────────────────┐
│  Create Account              │
│                              │
│  Email: [____________]       │
│  Password: [____________]    │
│  ████████░░ Strong           │  ← Real-time strength meter
│                              │
│  Requirements:               │
│  ✅ 8+ characters            │
│  ✅ Uppercase letter          │
│  ✅ Number                    │
│  ⬜ Special character         │
│                              │
│  Referral Code (optional):   │
│  [____________]              │
│                              │
│  □ I agree to Terms of       │
│    Service & Privacy Policy  │
│                              │
│  [Create Account]            │
│                              │
│  Already have an account?    │
│  → Login                     │
└─────────────────────────────┘

Step 2: Email Verification
┌─────────────────────────────┐
│  📧 Verify Your Email        │
│                              │
│  We sent a code to           │
│  a***@example.com            │
│                              │
│  [___] [___] [___]           │
│  [___] [___] [___]           │  ← 6-digit OTP input
│                              │
│  Didn't receive?             │
│  Resend (available in 58s)   │
└─────────────────────────────┘
```

### 10.2 Login Flow

```
┌─────────────────────────────┐
│  Login                       │
│                              │
│  Email: [____________]       │
│  Password: [____________]    │
│                              │
│  [Login]                     │
│                              │
│  Forgot password?            │
│  Don't have an account?      │
│  → Register                  │
└─────────────────────────────┘

      ↓ If 2FA enabled ↓

┌─────────────────────────────┐
│  Two-Factor Authentication   │
│                              │
│  Enter your 2FA code:        │
│  [______]                    │
│                              │
│  [Verify]                    │
│                              │
│  Lost your 2FA device?       │
│  → Account Recovery          │
└─────────────────────────────┘
```

### 10.3 KYC Verification Levels

| Level | Requirements | Unlocks |
|-------|-------------|---------|
| **Level 0** (Unverified) | Email only | View markets, no trading |
| **Level 1** (Basic) | Phone number + SMS verification | Trade up to $2,000/day |
| **Level 2** (Intermediate) | ID Document (front + back) + Selfie holding ID | Trade up to $50,000/day, withdraw $10,000/day |
| **Level 3** (Advanced) | Proof of address (utility bill / bank statement) | Unlimited trading, withdraw $100,000/day |

### 10.4 Security Settings Page

```
┌──────────────────────────────────────────────────────────────────┐
│  Security Center                                                  │
│  Security Level: ████████░░ Strong                               │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ 🔐 Password             Last changed: 30 days ago  [Change] ││
│  ├──────────────────────────────────────────────────────────────┤│
│  │ 📱 2FA (Google Auth)     ✅ Enabled                [Manage] ││
│  ├──────────────────────────────────────────────────────────────┤│
│  │ 📧 Email Verification    ✅ Verified               [Change] ││
│  ├──────────────────────────────────────────────────────────────┤│
│  │ 📞 Phone Verification    ✅ +86***1234             [Change] ││
│  ├──────────────────────────────────────────────────────────────┤│
│  │ 🛡️ Anti-Phishing Code    ⬜ Not Set                [Setup]  ││
│  ├──────────────────────────────────────────────────────────────┤│
│  │ 🔑 API Keys              2 active                  [Manage] ││
│  ├──────────────────────────────────────────────────────────────┤│
│  │ 📋 Login History          Last: 2026-02-21 10:30   [View]   ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  Trusted Devices                                                  │
│  • Chrome on macOS — Current Session                             │
│  • Safari on iPhone — Last active 2h ago            [Remove]    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 11. Admin Dashboard

### 11.1 Admin Layout

```
┌──────┬───────────────────────────────────────────────────────────┐
│      │  Admin Dashboard                              [👤 Wei]   │
│  📊  ├───────────────────────────────────────────────────────────┤
│  👥  │                                                           │
│  💱  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  💰  │  │ Users   │ │ Volume  │ │ Revenue │ │ Pending │       │
│  ⚠️  │  │ 12,456  │ │ $2.3M   │ │ $23,100 │ │ KYC: 23 │       │
│  📋  │  │ +123    │ │ +15%    │ │ +8%     │ │ ⚠️ Alert │       │
│  ⚙️  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│      │                                                           │
│ Side │  ┌──────────────────────┐ ┌──────────────────────┐      │
│ bar  │  │  24h Volume Chart    │ │  User Growth Chart   │      │
│      │  │  (Line/Bar)          │ │  (Line)              │      │
│      │  └──────────────────────┘ └──────────────────────┘      │
│      │                                                           │
│      │  Recent Alerts                                            │
│      │  🔴 Large withdrawal: User #4521 - 50 BTC                │
│      │  🟡 Failed login attempts: User #8832 - 15 in 5min       │
│      │  🟢 KYC auto-approved: 12 users                          │
│      │                                                           │
└──────┴───────────────────────────────────────────────────────────┘
```

### 11.2 Admin Sidebar Navigation

```
📊 Dashboard
👥 Users
   ├── User List
   ├── KYC Queue (23)
   └── Blacklist
💱 Trading
   ├── Trading Pairs
   ├── Order Management
   └── Market Making
💰 Finance
   ├── Fee Schedule
   ├── Revenue Reports
   └── Hot/Cold Wallet
⚠️ Risk Control
   ├── Alerts
   ├── Withdrawal Review
   └── Circuit Breakers
📋 Audit
   ├── System Logs
   ├── Admin Actions
   └── API Usage
⚙️ Settings
   ├── System Config
   ├── Announcements
   └── Admin Accounts
```

### 11.3 User Management Table

```
┌──────────────────────────────────────────────────────────────────┐
│ 🔍 Search users...    [KYC Status ▼] [Status ▼]  [Export CSV]   │
├──────────────────────────────────────────────────────────────────┤
│ □ │ ID    │ Email           │ KYC   │ Balance  │ Status │ Action│
│ □ │ 4521  │ a***@mail.com   │ Lv.2  │ $52,000  │ Active │ [👁]  │
│ □ │ 4522  │ b***@mail.com   │ Lv.1  │ $1,200   │ Active │ [👁]  │
│ □ │ 4523  │ c***@mail.com   │ Pend  │ $0       │ Active │ [👁]  │
├──────────────────────────────────────────────────────────────────┤
│ Selected: 0  │  [Freeze] [Unfreeze] [Email]                     │
│ Showing 1-20 of 12,456          [< 1 2 3 ... 623 >]            │
└──────────────────────────────────────────────────────────────────┘
```

### 11.4 Trading Pair Management

```
┌──────────────────────────────────────────────────────────────────┐
│  Trading Pairs                                    [+ Add Pair]   │
├──────────────────────────────────────────────────────────────────┤
│ Pair      │ Status  │ Price Precision │ Qty Precision │ Min Order│
│ BTC/USDT  │ 🟢 Live │ 2 decimals      │ 6 decimals    │ 0.0001  │
│ ETH/USDT  │ 🟢 Live │ 2 decimals      │ 4 decimals    │ 0.001   │
│ SOL/USDT  │ 🟡 Maint│ 2 decimals      │ 2 decimals    │ 0.01    │
│ DOGE/USDT │ 🔴 Off  │ 6 decimals      │ 0 decimals    │ 1       │
├──────────────────────────────────────────────────────────────────┤
│ Status: 🟢 Live (active trading) │ 🟡 Maintenance (orders paused)│
│         🔴 Offline (hidden)                                      │
└──────────────────────────────────────────────────────────────────┘
```

### 11.5 Fee Configuration

```
┌──────────────────────────────────────────────────────────────────┐
│  Fee Schedule                                                     │
├──────────────────────────────────────────────────────────────────┤
│  Default Fees:                                                    │
│  Maker: [0.10] %    Taker: [0.10] %                             │
│                                                                   │
│  VIP Tiers:                                                      │
│  ┌──────────────────────────────────────────────────────────────┐│
│  │ Tier    │ 30d Volume     │ Maker  │ Taker  │ Withdraw Fee   ││
│  │ Regular │ < $50K         │ 0.10%  │ 0.10%  │ Standard       ││
│  │ VIP 1   │ $50K - $500K   │ 0.09%  │ 0.10%  │ Standard       ││
│  │ VIP 2   │ $500K - $2M    │ 0.08%  │ 0.09%  │ -10%           ││
│  │ VIP 3   │ > $2M          │ 0.06%  │ 0.08%  │ -25%           ││
│  └──────────────────────────────────────────────────────────────┘│
│                                                                   │
│  [Save Changes]  [Reset to Default]                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 12. State Catalog

### 12.1 Order States

```
                    ┌─────────┐
                    │ CREATED │ (client-side, pre-submission)
                    └────┬────┘
                         │ submit
                         ▼
                    ┌─────────┐
              ┌─────│ PENDING │ (sent to matching engine)
              │     └────┬────┘
              │          │ accepted
              │          ▼
              │     ┌────────┐
              │     │  NEW   │ (in order book, no fills yet)
              │     └───┬────┘
              │         │
              │    ┌────┴────┐
              │    │         │
              │    ▼         ▼
              │ ┌────────┐ ┌──────────────┐
              │ │ FILLED │ │PARTIALLY_FILLED│
              │ └────────┘ └──────┬───────┘
              │                   │
              │              ┌────┴────┐
              │              │         │
              │              ▼         ▼
              │         ┌────────┐ ┌──────────────┐
              │         │ FILLED │ │  CANCELLED   │
              │         └────────┘ │ (partial)    │
              │                    └──────────────┘
              │
              │  rejected
              ▼
         ┌──────────┐
         │ REJECTED │ (validation failed, insufficient balance, etc.)
         └──────────┘

         ┌──────────┐
         │ EXPIRED  │ (time-in-force expired, e.g., IOC/FOK)
         └──────────┘
```

### 12.2 Complete Order State Definitions

| State | Code | Description | UI Display | Color |
|-------|------|-------------|------------|-------|
| **Created** | `CREATED` | Order constructed client-side, not yet sent | — (not shown) | — |
| **Pending** | `PENDING` | Submitted, awaiting matching engine | Spinner + "Submitting..." | Yellow |
| **New** | `NEW` | Accepted by matching engine, in order book | "Open" | Blue |
| **Partially Filled** | `PARTIALLY_FILLED` | Some quantity filled, remainder in book | "Partial (60%)" + progress bar | Blue/Green |
| **Filled** | `FILLED` | Completely filled | "Filled ✓" | Green |
| **Pending Cancel** | `PENDING_CANCEL` | Cancel request sent, awaiting confirmation | "Cancelling..." + spinner | Yellow |
| **Cancelled** | `CANCELLED` | Successfully cancelled (may have partial fills) | "Cancelled" | Grey |
| **Rejected** | `REJECTED` | Rejected by matching engine | "Rejected: {reason}" | Red |
| **Expired** | `EXPIRED` | Time-in-force expired | "Expired" | Grey |

### 12.3 Withdrawal States

| State | Description | UI Display |
|-------|-------------|------------|
| **Pending Approval** | Awaiting email confirmation | "Confirm via email" + resend link |
| **Processing** | In internal queue | "Processing..." + spinner |
| **Awaiting Blockchain** | Transaction broadcast, awaiting confirmations | "Confirming (2/20)" + progress |
| **Completed** | Transaction confirmed | "Completed ✓" + TX hash link |
| **Failed** | Transaction failed | "Failed" + retry option + support link |
| **Rejected** | Rejected by risk control | "Rejected: {reason}" + support link |
| **Cancelled** | User cancelled before processing | "Cancelled" |

### 12.4 KYC States

| State | Description | UI Display |
|-------|-------------|------------|
| **Not Started** | No documents submitted | "Verify Now →" CTA |
| **Documents Submitted** | Awaiting review | "Under Review (est. 24h)" |
| **Under Review** | Admin is actively reviewing | "Under Review" |
| **Approved** | Verification passed | "Verified ✓" + level badge |
| **Rejected** | Verification failed | "Rejected: {reason}" + "Resubmit" |
| **Resubmission Required** | Specific documents need re-upload | "Action Required" + specific guidance |
| **Expired** | Documents expired, re-verification needed | "Re-verify" CTA |

### 12.5 WebSocket Connection States

| State | UI Indicator | Behavior |
|-------|-------------|----------|
| **Connected** | Green dot (subtle, header) | Normal operation |
| **Connecting** | Yellow dot + "Connecting..." | Initial connection |
| **Reconnecting** | Yellow banner "Reconnecting..." | Auto-retry with backoff (1s, 2s, 4s, 8s, 16s, 30s max) |
| **Disconnected** | Red banner "Connection lost. Retry" | Manual retry button after max retries |
| **Stale Data** | "Data may be outdated (>5s)" | Show last-update timestamp |

### 12.6 Account States

| State | Description | Access Level |
|-------|-------------|-------------|
| **Active** | Normal account | Full access per KYC level |
| **Pending Verification** | Email not yet verified | No access |
| **Restricted** | Partial restriction (e.g., trading disabled) | View only, can withdraw |
| **Frozen** | Full freeze (admin action or security) | View only, no withdrawals |
| **Suspended** | Compliance/legal hold | No access, contact support |
| **Deactivated** | User requested deactivation | No access, can reactivate |

---

## 13. Responsive Strategy

### 13.1 Breakpoints

| Breakpoint | Width | Target |
|-----------|-------|--------|
| **Mobile S** | 320–374px | Small phones |
| **Mobile** | 375–767px | Standard phones |
| **Tablet** | 768–1023px | iPads, small laptops |
| **Desktop** | 1024–1439px | Standard laptops |
| **Desktop L** | 1440–1919px | Large monitors |
| **Desktop XL** | 1920px+ | Trading workstations |

### 13.2 Layout Adaptations

#### Desktop XL (1920px+) — Full Trading Workspace

All panels visible simultaneously. Optional: customizable drag-and-drop panel arrangement.

```
[Chart 55%] [Order Book 20%] [Order Form 25%]
[Recent Trades] [Open Orders / History (tabbed)]
```

#### Desktop (1024–1439px) — Compact Trading

Slightly compressed. Recent trades may collapse into a tab.

```
[Chart 50%] [Order Book 20%] [Order Form 30%]
[Open Orders / Order History / Recent Trades (tabbed)]
```

#### Tablet (768–1023px) — Stacked Layout

Chart moves to full width on top. Order book and form side by side below.

```
[Chart — full width]
[Order Book 50%] [Order Form 50%]
[Open Orders (tabbed)]
```

#### Mobile (375–767px) — Tab-Based Navigation

Complete layout restructure. Only one major panel visible at a time.

```
┌─────────────────────────┐
│ BTC/USDT  $42,156  +2%  │  ← Compact header
├─────────────────────────┤
│ [Chart] [Book] [Trades] │  ← Tab switcher
├─────────────────────────┤
│                         │
│   Active Tab Content    │
│   (full width)          │
│                         │
├─────────────────────────┤
│   Sticky Order Form     │  ← Simplified, always visible
│   [BUY]  [SELL]         │
│   Price: [...] Amt:[...]│
│   [Submit Order]        │
├─────────────────────────┤
│ [Home][Markets][Trade]  │  ← Bottom nav
│ [Wallet][Account]       │
└─────────────────────────┘
```

### 13.3 Mobile-Specific Patterns

| Pattern | Implementation |
|---------|---------------|
| **Swipe between tabs** | Horizontal swipe to switch Chart ↔ Book ↔ Trades |
| **Pull to refresh** | Reconnect WebSocket + refresh data |
| **Bottom sheet** | Order form slides up as bottom sheet |
| **Haptic feedback** | Vibrate on order fill (if supported) |
| **Compact order book** | Show top 5 asks/bids (vs. 15–20 on desktop) |
| **Simplified chart** | Default to line chart, fewer indicators |
| **Biometric login** | Face ID / Touch ID for re-authentication |
| **Quick trade** | Simplified buy/sell at market with one tap |

### 13.4 Performance Budget (Mobile)

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Time to Interactive | < 3.0s |
| Bundle Size (gzipped) | < 300KB initial |
| WebSocket latency | < 100ms |
| Order book render | < 16ms (60fps) |

---

## 14. Accessibility

### 14.1 WCAG 2.1 AA Compliance

| Requirement | Implementation |
|-------------|---------------|
| **Color contrast** | Minimum 4.5:1 for text, 3:1 for large text. Red/green not sole indicator (use ▲▼ arrows) |
| **Keyboard navigation** | All interactive elements reachable via Tab. Trading shortcuts (B, S, 1-4) |
| **Screen reader** | ARIA labels for all data tables, live regions for price updates |
| **Focus indicators** | Visible focus ring on all interactive elements (2px solid outline) |
| **Text scaling** | Support up to 200% zoom without horizontal scroll |
| **Motion** | Respect `prefers-reduced-motion`: disable flash animations, candle transitions |
| **Color blindness** | Use shape + color: ▲ green (buy), ▼ red (sell). Configurable color schemes |

### 14.2 ARIA Implementation

```html
<!-- Order Book -->
<table role="grid" aria-label="Order Book - Sell Orders">
  <thead>
    <tr>
      <th scope="col">Price (USDT)</th>
      <th scope="col">Amount (BTC)</th>
      <th scope="col">Total</th>
    </tr>
  </thead>
  <tbody aria-live="polite" aria-relevant="additions removals">
    <tr aria-label="Sell order at 42,180 USDT for 0.523 BTC">
      <td>42,180.00</td>
      <td>0.523</td>
      <td>22,060.14</td>
    </tr>
  </tbody>
</table>

<!-- Price Update (live region) -->
<div aria-live="assertive" aria-atomic="true" class="sr-only">
  BTC/USDT price: 42,156.78, up 2.34 percent
</div>

<!-- Order Form -->
<form aria-label="Place Buy Order">
  <fieldset>
    <legend>Buy BTC with USDT</legend>
    <label for="price">Price (USDT)</label>
    <input id="price" type="number" step="0.01" aria-describedby="price-help" />
    <span id="price-help">Current market price: 42,156.78</span>
  </fieldset>
</form>
```

### 14.3 Accessibility for Trading-Specific Needs

| Need | Solution |
|------|----------|
| **Colorblind-friendly** | Offer "Accessible" color theme: Blue (buy) / Orange (sell) |
| **High price update frequency** | Configurable update throttle (100ms, 250ms, 500ms, 1s) |
| **Screen reader order book** | Summary mode: "Top ask: 42,180, Top bid: 42,155, Spread: 0.06%" |
| **Order confirmation** | Always announce: "Order placed: Buy 0.5 BTC at 42,150" via `aria-live` |
| **Error announcements** | Immediate `aria-live="assertive"` for validation errors |

---

## 15. Design Tokens & Visual Language

### 15.1 Color System

```
/* Dark Theme (Primary) */
--bg-primary:       #0B0E11;     /* Main background (Binance-dark) */
--bg-secondary:     #1E2329;     /* Card/panel background */
--bg-tertiary:      #2B3139;     /* Elevated elements, hover states */
--bg-input:         #2B3139;     /* Input fields */

--text-primary:     #EAECEF;     /* Primary text */
--text-secondary:   #848E9C;     /* Secondary/muted text */
--text-tertiary:    #5E6673;     /* Disabled/placeholder text */

--green-primary:    #0ECB81;     /* Buy/positive/up — Binance green */
--green-bg:         rgba(14, 203, 129, 0.12);  /* Green background tint */
--red-primary:      #F6465D;     /* Sell/negative/down — Binance red */
--red-bg:           rgba(246, 70, 93, 0.12);   /* Red background tint */

--yellow-primary:   #F0B90B;     /* Warning, pending, accent (Binance yellow) */
--blue-primary:     #1E88E5;     /* Links, info, active states */

--border:           #2B3139;     /* Default border */
--border-hover:     #474D57;     /* Border on hover */

/* Light Theme */
--bg-primary-light:     #FAFAFA;
--bg-secondary-light:   #FFFFFF;
--text-primary-light:   #1E2329;
--text-secondary-light: #707A8A;
```

### 15.2 Typography

```
/* Font Stack */
--font-sans:    'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono:    'JetBrains Mono', 'SF Mono', 'Fira Code', monospace;

/* Scale */
--text-xs:    11px / 1.4;   /* Order book rows, fine print */
--text-sm:    12px / 1.5;   /* Secondary data, labels */
--text-base:  13px / 1.5;   /* Body text — slightly smaller than typical (trading density) */
--text-md:    14px / 1.5;   /* Input text, primary labels */
--text-lg:    16px / 1.4;   /* Section headers */
--text-xl:    20px / 1.3;   /* Page headers */
--text-2xl:   24px / 1.2;   /* Hero numbers (last price) */
--text-3xl:   32px / 1.1;   /* Dashboard KPIs */

/* CRITICAL: All numeric data uses monospace font for alignment */
.price, .amount, .total, .balance {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}
```

### 15.3 Spacing Scale

```
--space-1:   4px;
--space-2:   8px;
--space-3:   12px;
--space-4:   16px;
--space-5:   20px;
--space-6:   24px;
--space-8:   32px;
--space-10:  40px;
--space-12:  48px;

/* Panel gaps */
--panel-gap:   1px;    /* Thin separator between trading panels */
--panel-pad:   12px;   /* Internal panel padding */
```

### 15.4 Component Patterns

#### Buttons

```
/* Primary Action (Buy) */
.btn-buy {
  background: var(--green-primary);
  color: #FFFFFF;
  font-weight: 600;
  height: 40px;
  border-radius: 4px;
  width: 100%;
}

/* Primary Action (Sell) */
.btn-sell {
  background: var(--red-primary);
  color: #FFFFFF;
  font-weight: 600;
  height: 40px;
  border-radius: 4px;
  width: 100%;
}

/* Secondary */
.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border: 1px solid var(--border);
}

/* Text/Ghost */
.btn-ghost {
  background: transparent;
  color: var(--yellow-primary);
}
```

#### Inputs

```
/* Trading Input */
.input-trade {
  background: var(--bg-input);
  border: 1px solid var(--border);
  color: var(--text-primary);
  font-family: var(--font-mono);
  height: 36px;
  padding: 0 12px;
  border-radius: 4px;
}
.input-trade:focus {
  border-color: var(--yellow-primary);
  outline: none;
}
.input-trade:invalid {
  border-color: var(--red-primary);
}
```

#### Toast Notifications

```
/* Success: Order filled */
┌──────────────────────────────────┐
│ ✅ Order Filled                   │
│ Bought 0.5 BTC @ $42,150.00     │ ← Auto-dismiss after 5s
│ Total: $21,075.00                │
└──────────────────────────────────┘

/* Warning: Partial fill */
┌──────────────────────────────────┐
│ ⚠️ Partial Fill                   │
│ 0.2 of 0.5 BTC filled           │ ← Persistent until dismissed
│ @ $42,150.00                     │
└──────────────────────────────────┘

/* Error: Order rejected */
┌──────────────────────────────────┐
│ ❌ Order Rejected                 │
│ Insufficient USDT balance        │ ← Persistent, with action link
│ [Deposit USDT]                   │
└──────────────────────────────────┘
```

### 15.5 Animation & Transitions

```
/* General transitions */
--transition-fast:   150ms ease;    /* Hover states, toggles */
--transition-base:   250ms ease;    /* Panel transitions, modals */
--transition-slow:   350ms ease;    /* Page transitions */

/* Price flash animation */
@keyframes price-flash-up {
  0%   { background-color: rgba(14, 203, 129, 0.3); }
  100% { background-color: transparent; }
}

@keyframes price-flash-down {
  0%   { background-color: rgba(246, 70, 93, 0.3); }
  100% { background-color: transparent; }
}

/* Order book row update */
.order-book-row.updated {
  animation: price-flash-up 600ms ease-out;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 16. Competitive Analysis

### 16.1 Binance

| Aspect | Strengths | Weaknesses |
|--------|-----------|------------|
| **Layout** | Industry-standard layout, highly recognizable | Can feel overwhelming for beginners |
| **Order Book** | Fast updates, depth visualization, precision control | Dense information, small fonts |
| **Chart** | Full TradingView integration, drawing tools | Takes significant screen space |
| **Order Form** | All order types, percentage sliders, clear totals | Many options visible at once |
| **Mobile** | Excellent app, fast, biometric auth | Complex navigation hierarchy |
| **Innovation** | Convert (simple trade), Grid trading, Copy trading | Feature bloat |

**Lessons for our design:**
- Follow Binance's layout as the primary reference — it's the lingua franca
- Adopt their color system (green/red/yellow on dark)
- Include percentage sliders for order amounts
- Offer "Simple" and "Advanced" trading modes

### 16.2 Coinbase Pro (now Coinbase Advanced)

| Aspect | Strengths | Weaknesses |
|--------|-----------|------------|
| **Layout** | Clean, less cluttered than Binance | Less information density for pro traders |
| **Onboarding** | Excellent beginner flow, educational content | Over-simplified for experienced users |
| **Trust** | Regulated, compliance-first design | Slower feature adoption |
| **Mobile** | Unified app (simple + advanced toggle) | Advanced mode feels cramped |

**Lessons for our design:**
- Coinbase's onboarding flow is best-in-class — adopt step-by-step KYC
- "Learn" section embedded in trading (tooltips explaining order types)
- Clean error messages with actionable guidance

### 16.3 OKX

| Aspect | Strengths | Weaknesses |
|--------|-----------|------------|
| **Layout** | Customizable panels, multiple layout presets | Complexity for new users |
| **Order Types** | Comprehensive (TP/SL, TWAP, Iceberg, etc.) | Too many for a teaching project |
| **Dark Theme** | Excellent dark theme with blue accents | — |
| **Depth Chart** | Interactive depth visualization | Can lag with fast updates |

**Lessons for our design:**
- Consider layout presets (Default, Chart-focused, Order-focused)
- OKX's depth chart visualization is best-in-class
- Use their approach to conditional orders UI

### 16.4 TradingView

| Aspect | Strengths | Weaknesses |
|--------|-----------|------------|
| **Chart** | Gold standard for financial charts | Licensing cost |
| **Indicators** | 100+ built-in, custom script support | Can overwhelm |
| **Drawing Tools** | Comprehensive, intuitive | — |
| **Multi-chart** | Multiple charts in split view | Complex for beginners |

**Lessons for our design:**
- TradingView Charting Library for the chart component (or Lightweight Charts for open-source)
- Support at minimum: MA, EMA, RSI, MACD, Bollinger Bands, Volume
- Time intervals: 1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W, 1M

---

## Appendix A: Component Inventory

### Trading Page Components

| Component | Description | Priority |
|-----------|-------------|----------|
| `TradingPairHeader` | Pair name, price, 24h stats | P0 |
| `PairSelectorModal` | Search and select trading pairs | P0 |
| `ChartPanel` | TradingView chart wrapper | P0 |
| `OrderBook` | Real-time bid/ask depth display | P0 |
| `OrderForm` | Limit/Market/Stop order forms | P0 |
| `RecentTrades` | Time & sales feed | P1 |
| `OpenOrdersTable` | User's active orders | P0 |
| `OrderHistoryTable` | Past orders with fills | P0 |
| `TradeHistoryTable` | Individual fill records | P1 |
| `DepthChart` | Visual depth/liquidity chart | P2 |
| `MarketStatsBar` | 24h statistics bar | P1 |
| `ConnectionIndicator` | WebSocket status | P0 |

### Shared Components

| Component | Description | Priority |
|-----------|-------------|----------|
| `Toast` | Notification toasts (success, error, warning, info) | P0 |
| `ConfirmDialog` | Order confirmation modal | P0 |
| `NumberInput` | Formatted numeric input with stepper | P0 |
| `PercentageSlider` | 25/50/75/100% quick-select | P0 |
| `DataTable` | Sortable, filterable table | P0 |
| `Tabs` | Tab switcher for panels | P0 |
| `Badge` | Status badges (KYC level, order status) | P0 |
| `Skeleton` | Loading skeleton placeholders | P0 |
| `EmptyState` | Empty table/list illustrations | P1 |
| `ErrorBoundary` | Graceful error handling wrapper | P0 |

---

## Appendix B: Real-Time Data Architecture (UX Implications)

### WebSocket Channels

| Channel | Data | Update Frequency | UX Impact |
|---------|------|-------------------|-----------|
| `ticker@{pair}` | Last price, 24h stats | 1s | Header price display, market list |
| `depth@{pair}` | Order book snapshot/diff | 100ms | Order book panel |
| `trade@{pair}` | Recent trades | Real-time | Recent trades panel, chart |
| `kline@{pair}@{interval}` | OHLCV candle | Per interval | Chart updates |
| `order@{userId}` | User order updates | Real-time | Open orders, notifications |
| `balance@{userId}` | Balance changes | Real-time | Wallet display, order form available balance |

### Optimistic UI Pattern

```
User clicks "Buy" →
  1. Immediately show order in "Pending" state in Open Orders table
  2. Disable submit button, show spinner
  3. Send order to server via REST API
  4. On success: Update to "New" state (or "Filled" if instant)
  5. On failure: Remove optimistic entry, show error toast
  6. WebSocket confirms: Reconcile state (handle race conditions)
```

### Reconnection Strategy

```
Disconnect detected →
  1. Immediate: Show yellow "Reconnecting..." banner
  2. Retry 1: 1 second delay
  3. Retry 2: 2 seconds
  4. Retry 3: 4 seconds
  5. Retry 4: 8 seconds
  6. Retry 5: 16 seconds
  7. Retry 6+: 30 seconds (max)
  8. After 10 failed retries: Show red "Connection lost" with manual retry button
  9. On reconnect: Full snapshot request (order book, open orders) to reconcile state
  10. Fade banner, flash "Reconnected" green for 2s
```

---

## Appendix C: Micro-Copy Guide

### Order States

| State | Micro-copy | Tooltip |
|-------|-----------|---------|
| Pending | "Submitting..." | "Your order is being sent to the matching engine" |
| New | "Open" | "Your order is in the order book waiting to be filled" |
| Partially Filled | "Partial (0.2/0.5)" | "0.2 BTC of your 0.5 BTC order has been filled. Remaining 0.3 BTC is still in the order book." |
| Filled | "Filled ✓" | "Your entire order has been filled" |
| Cancelled | "Cancelled" | "Order was cancelled. 0.2 BTC was filled before cancellation." |
| Rejected | "Rejected" | "Order rejected: Insufficient USDT balance (need 21,075, have 15,000)" |

### Error Messages

| Error | Bad ❌ | Good ✅ |
|-------|--------|---------|
| Insufficient balance | "Error: insufficient funds" | "Not enough USDT. You need 21,075 but have 15,000. [Deposit USDT →]" |
| Invalid price | "Invalid price" | "Price must be between $100 and $100,000 for BTC/USDT" |
| Network error | "Request failed" | "Connection issue. Your order was NOT placed. [Try Again]" |
| Rate limit | "429 Too Many Requests" | "Too many requests. Please wait 5 seconds." |
| Session expired | "Unauthorized" | "Your session has expired. [Log in again →]" |

### Empty States

| Context | Message |
|---------|---------|
| No open orders | "No open orders. Place your first order →" |
| No trade history | "No trades yet. Your completed trades will appear here." |
| No assets | "Your wallet is empty. [Deposit →] to get started." |
| Search no results | "No trading pairs match '{query}'. Try a different search." |

---

## Appendix D: Key Metrics & Success Criteria

### UX Metrics to Track

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to first trade (new user) | < 5 minutes (after deposit) | Analytics funnel |
| Order placement time (limit order) | < 3 seconds from intent | Interaction timing |
| Error recovery rate | > 80% self-resolved | Error → success conversion |
| Mobile bounce rate on trading page | < 40% | Analytics |
| Order book rendering FPS | 60fps sustained | Performance monitoring |
| WebSocket reconnection success | > 99% within 30s | Infrastructure monitoring |

---

*This document serves as the UX foundation. Each section should be validated through usability testing with representative users before development begins.*
