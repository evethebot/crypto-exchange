# CryptoExchange Demo — Product Specification

> **Version:** 1.0.0 (Final)
> **Date:** 2026-02-22
> **Status:** Ready for Implementation
> **Type:** Educational / Demo CEX (Centralized Crypto Exchange)

---

## Vision

Build a **modern, educational centralized cryptocurrency exchange** using Next.js that demonstrates real trading system concepts — matching engine, order book, real-time market data, wallet management, and admin operations — in a single-process, zero-external-dependency architecture that starts with `pnpm dev`.

**This is not a production exchange.** It is a teaching tool that feels real: professional UI, simulated deposits/withdrawals, a live market-making bot, and complete trading flows — all running locally with PostgreSQL as the only external dependency.

### Project Goals
1. **Educational Value** — Teach CEX architecture: matching engine, order book, settlement, WebSocket real-time data
2. **Professional UI** — TradingView-grade charting, Binance-style layout, dark theme, responsive design
3. **One-Click Startup** — `pnpm dev` starts everything (Next.js + WS server + matching engine)
4. **Modern Stack** — Next.js 14+, TypeScript, Drizzle ORM, TailwindCSS, shadcn/ui
5. **Real-Feeling Demo** — Live market-making bot, simulated blockchain confirmations, persistent demo banner

### Non-Goals
- Production deployment or real money handling
- Blockchain integration or real wallet addresses
- Margin/futures/derivatives trading
- Social login (OAuth, Google, etc.)
- Email delivery (SMTP)
- Native mobile apps
- Multi-process or distributed architecture

---

## Target Users (Personas)

### Persona 1: Alex — Casual Learner
| Attribute | Detail |
|-----------|--------|
| Background | Frontend/full-stack developer, 1-3 years experience |
| Goal | Understand how a crypto exchange works, learn Next.js full-stack patterns |
| Behavior | Clones repo, runs `pnpm dev`, explores the UI, reads the code |
| Needs | Clean code, clear architecture, Chinese README, working demo out of the box |

### Persona 2: Sarah — CS Student
| Attribute | Detail |
|-----------|--------|
| Background | Computer Science student, working on graduation project |
| Goal | Use as reference for a trading system implementation |
| Behavior | Studies matching engine, order book data structures, WebSocket patterns |
| Needs | Well-documented algorithms, comprehensive test suite, modular code |

### Persona 3: Wei — Admin / Operator
| Attribute | Detail |
|-----------|--------|
| Background | Operations role, exploring exchange admin workflows |
| Goal | Understand exchange operations: pair management, KYC review, fee configuration |
| Behavior | Logs into admin panel, manages trading pairs, reviews simulated KYC |
| Needs | Admin dashboard with stats, CRUD operations, audit trail |

---

## Core Features (Prioritized)

### P1 — Table Stakes (Must Have for MVP)

| Feature | Description |
|---------|-------------|
| **User Registration** | Email + password, auto-verified (no SMTP), bcrypt hashing |
| **User Login** | JWT access token (15min) + refresh token (7 days), secure cookie |
| **Matching Engine** | In-memory, price-time priority, limit + market orders |
| **Order Placement** | REST API with balance freeze, Zod validation |
| **Order Cancellation** | Cancel with balance unfreeze, cancel-all per pair |
| **Trade Settlement** | Atomic wallet updates in DB transaction |
| **Order Book** | In-memory red-black tree, depth API, 3 display modes |
| **WebSocket Server** | Real-time depth, trade, ticker, kline, user orders, user wallet |
| **Trading UI** | Binance-style layout: chart + order book + order form + trades |
| **TradingView Charts** | Lightweight Charts v4, candlestick, time intervals, indicators |
| **Wallet System** | Available/frozen balance, simulated deposit with confirmation animation |
| **Dark Theme** | Default dark theme with Binance-inspired color system |
| **Trading Pairs** | Pre-seeded: BTC/USDT, ETH/USDT, ETH/BTC, DOGE/USDT, XRP/USDT |
| **Demo Banner** | Persistent "🔬 Demo Exchange — No real funds" banner |

### P2 — Core Experience

| Feature | Description |
|---------|-------------|
| **Market Orders** | With optional maxSlippage protection |
| **Candle Aggregation** | OHLCV engine, 8 time intervals, carry-forward for gaps |
| **Market-Making Bot** | Automated bot for realistic order book and trade activity |
| **Pair Selector** | Modal with search, favorites, sort, real-time prices |
| **Open Orders / History** | Tabbed tables with pagination, real-time WS updates |
| **Recent Trades** | Live trade feed with color-coded buy/sell |
| **Pair Header Bar** | Last price, 24h change, high/low/volume |

### P3 — Advanced Trading

| Feature | Description |
|---------|-------------|
| **Stop-Loss Orders** | Trigger on price, convert to market order |
| **Stop-Limit Orders** | Trigger on price, convert to limit order |
| **OCO Orders** | One-cancels-other: take-profit + stop-loss linked |
| **IOC / FOK** | Immediate-or-cancel, fill-or-kill time-in-force |
| **Self-Trade Prevention** | Cancel resting order when same user on both sides |
| **Price Protection** | Circuit breaker: reject orders >10% from last trade |
| **Order Validation** | Precision, min/max amount, min notional, max open orders |
| **Rate Limiting** | Per-user sliding window: 5 orders/sec, 20 API req/sec |

### P4 — Account & Security

| Feature | Description |
|---------|-------------|
| **2FA (TOTP)** | Google Authenticator setup, QR code, verify on login |
| **KYC (Simulated)** | Level 0/1/2, phone/document upload, auto/manual approval |
| **Simulated Withdrawal** | Status tracking: pending → processing → completed |
| **Security Settings** | Password change, 2FA management, login history |
| **Wallet Overview** | Total balance, allocation donut chart, hide small balances |
| **Transaction History** | Deposits/withdrawals with status, filters, pagination |

### P5 — Admin Panel

| Feature | Description |
|---------|-------------|
| **Admin Dashboard** | KPIs: users, volume, revenue, pending KYC count |
| **Pair Management** | CRUD pairs, adjust precision/fees, enable/disable (with order cancellation) |
| **Fee Configuration** | Per-pair maker/taker fees in basis points |
| **User Management** | List, search, freeze/unfreeze, view details |
| **KYC Review Queue** | Approve/reject with reason, status transitions |
| **Audit Logs** | All admin actions logged with timestamp, IP, details |

### P6 — Polish

| Feature | Description |
|---------|-------------|
| **Light Theme** | Toggle dark/light, localStorage persistence |
| **Responsive Layout** | Mobile (375px), tablet (768px), desktop (1920px+) |
| **Accessibility** | ARIA labels, keyboard navigation, axe-core compliance |
| **Basic PWA** | Manifest + service worker for app-like mobile experience |
| **Landing Page** | Simple hero + CTA + live ticker marquee |
| **Markets Page** | All pairs table with 24h stats, search, sort |

---

## Technical Stack (Final Decisions)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | Next.js 14+ (App Router) | SSR for SEO pages, CSR for trading, API routes |
| **Language** | TypeScript (strict mode) | Type safety across full stack |
| **Runtime** | Node.js 20+ | Single-language full stack |
| **UI Components** | TailwindCSS + shadcn/ui | Rapid development, consistent dark theme |
| **Charts** | TradingView `lightweight-charts` v4 | Open source (Apache 2.0), performant, industry standard |
| **State Management** | Zustand | Lightweight, perfect for real-time trading state |
| **Forms** | React Hook Form + Zod | Type-safe validation shared with backend |
| **ORM** | Drizzle ORM | SQL-close, type-safe, great migration story |
| **Database** | PostgreSQL 16 | ACID, relational integrity, JSONB |
| **WebSocket** | `ws` library | Lightweight, production-grade, raw protocol |
| **Auth** | `jose` + `bcrypt` | Standards-based JWT, no bloated auth libraries |
| **2FA** | `otpauth` | TOTP secret generation and verification |
| **Decimal Math** | `big.js` | Fixed-point arithmetic for financial calculations |
| **Order Book** | `bintrees` (Red-Black Tree) | O(log n) insert/delete, O(1) best price |
| **Logging** | `pino` | Structured JSON logging |
| **Scheduling** | `node-cron` | Candle aggregation, cleanup tasks |
| **WS Client** | `reconnecting-websocket` | Auto-reconnect with exponential backoff |
| **Process Model** | Single process (`server.ts`) | Custom Next.js server: HTTP + WS on port 3000 |
| **Dev Database** | Docker Compose (PostgreSQL only) | One dependency, `docker compose up -d` |
| **Package Manager** | pnpm | Fast, disk-efficient |

### Key Architectural Decisions
1. **No Redis** — In-memory data structures are faster for single-process; eliminates external dependency
2. **No Socket.io** — Raw WebSocket is the industry standard for exchanges; educational value
3. **No NextAuth.js** — Understanding JWT from scratch is the point; jose is lightweight
4. **No Prisma** — Drizzle is SQL-close; students see real query patterns
5. **No email delivery** — Auto-verify on registration; no SMTP dependency
6. **Hybrid server** — `server.ts` boots Next.js HTTP + WS server + matching engine in one process

---

## Data Model (All Entities + Relationships)

### Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  users   │──1:N──│   wallets    │       │trading_pairs │
└──┬───────┘       └──────────────┘       └──────┬───────┘
   │                                             │
   │1:N    ┌──────────────────┐                  │
   ├───────│ kyc_verifications│                  │
   │       └──────────────────┘                  │
   │1:N    ┌──────────────────┐                  │
   ├───────│    deposits      │                  │
   │       └──────────────────┘                  │
   │1:N    ┌──────────────────┐                  │
   ├───────│   withdrawals    │                  │
   │       └──────────────────┘                  │
   │1:N    ┌──────────────────┐                  │
   ├───────│  login_history   │                  │
   │       └──────────────────┘                  │
   │1:N                                          │
   └──────────────┐                              │
            ┌─────▼──────┐                       │
            │   orders   │───N:1─────────────────┘
            └─────┬──────┘
                  │ (maker/taker)
            ┌─────▼──────┐
            │   trades   │
            └─────┬──────┘
                  │ (aggregated)
            ┌─────▼──────┐
            │  candles   │
            └────────────┘

┌──────────────────┐  ┌──────────────┐  ┌──────────────┐
│wallet_transactions│  │  audit_logs  │  │ system_config│
└──────────────────┘  └──────────────┘  └──────────────┘
```

### Complete Entity List

#### 1. users
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | Auto-generated |
| email | VARCHAR(255) UNIQUE | Login identifier |
| password_hash | VARCHAR(255) | bcrypt, cost factor 12 |
| nickname | VARCHAR(50) | Optional display name |
| role | ENUM('user','admin') | Default: 'user' |
| status | ENUM('active','suspended','pending_verification') | Default: 'active' |
| kyc_level | ENUM('level_0','level_1','level_2') | Default: 'level_0' |
| kyc_status | ENUM('not_started','pending','approved','rejected') | Default: 'not_started' |
| totp_secret | VARCHAR(64) | TOTP secret for 2FA |
| totp_enabled | BOOLEAN | Default: false |
| api_key | VARCHAR(64) UNIQUE | For programmatic access |
| api_secret | VARCHAR(128) | API secret |
| last_login_at | TIMESTAMPTZ | |
| last_login_ip | INET | |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | Auto-update trigger |

#### 2. trading_pairs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| symbol | VARCHAR(20) UNIQUE | e.g., 'BTC_USDT' |
| base_currency | VARCHAR(10) | e.g., 'BTC' |
| quote_currency | VARCHAR(10) | e.g., 'USDT' |
| status | ENUM('active','suspended','delisted') | |
| price_precision | SMALLINT | Decimal places for price |
| amount_precision | SMALLINT | Decimal places for amount |
| min_amount | NUMERIC(30,18) | Minimum order quantity |
| max_amount | NUMERIC(30,18) | NULL = no limit |
| min_total | NUMERIC(30,18) | Minimum order value in quote |
| maker_fee_bps | SMALLINT | Basis points (10 = 0.10%) |
| taker_fee_bps | SMALLINT | Basis points (15 = 0.15%) |
| max_price_deviation_pct | NUMERIC(5,2) | Circuit breaker threshold |
| sort_order | INTEGER | Display ordering |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

#### 3. wallets
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | |
| currency | VARCHAR(10) | e.g., 'BTC', 'USDT' |
| available | NUMERIC(30,18) | CHECK >= 0 |
| frozen | NUMERIC(30,18) | CHECK >= 0 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| | UNIQUE(user_id, currency) | |

#### 4. wallet_transactions
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| wallet_id | UUID (FK→wallets) | |
| user_id | UUID (FK→users) | |
| tx_type | ENUM('deposit','withdrawal','trade_freeze','trade_unfreeze','trade_debit','trade_credit','fee') | |
| amount | NUMERIC(30,18) | Always positive |
| balance_after | NUMERIC(30,18) | Snapshot |
| frozen_after | NUMERIC(30,18) | Snapshot |
| ref_type | VARCHAR(20) | 'order','trade','deposit','withdrawal' |
| ref_id | UUID | Reference to source entity |
| note | TEXT | |
| created_at | TIMESTAMPTZ | |

#### 5. orders
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | |
| pair_id | UUID (FK→trading_pairs) | |
| symbol | VARCHAR(20) | Denormalized |
| side | ENUM('buy','sell') | |
| type | ENUM('limit','market','stop_loss','stop_limit','oco') | |
| time_in_force | ENUM('GTC','IOC','FOK') | Default: 'GTC' |
| price | NUMERIC(30,18) | NULL for market orders |
| stop_price | NUMERIC(30,18) | For stop/OCO orders |
| amount | NUMERIC(30,18) | Original quantity |
| filled_amount | NUMERIC(30,18) | Default: 0 |
| remaining_amount | NUMERIC(30,18) | = amount - filled |
| total_cost | NUMERIC(30,18) | Cumulative quote spent/received |
| avg_price | NUMERIC(30,18) | Weighted average fill price |
| fee_total | NUMERIC(30,18) | |
| status | ENUM('new','partially_filled','filled','cancelled','expired','rejected') | |
| max_slippage | NUMERIC(5,4) | For market orders (optional) |
| oco_pair_id | UUID (FK→orders) | Links OCO pair |
| seq | BIGSERIAL | Deterministic ordering |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| filled_at | TIMESTAMPTZ | |
| cancelled_at | TIMESTAMPTZ | |

#### 6. trades
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| pair_id | UUID (FK→trading_pairs) | |
| symbol | VARCHAR(20) | |
| maker_order_id | UUID (FK→orders) | |
| taker_order_id | UUID (FK→orders) | |
| maker_user_id | UUID (FK→users) | |
| taker_user_id | UUID (FK→users) | |
| price | NUMERIC(30,18) | Execution price |
| amount | NUMERIC(30,18) | Base quantity |
| total | NUMERIC(30,18) | = price × amount |
| side | ENUM('buy','sell') | Taker's side |
| maker_fee | NUMERIC(30,18) | |
| taker_fee | NUMERIC(30,18) | |
| maker_fee_currency | VARCHAR(10) | |
| taker_fee_currency | VARCHAR(10) | |
| seq | BIGSERIAL | |
| executed_at | TIMESTAMPTZ | |

#### 7. candles
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| pair_id | UUID (FK→trading_pairs) | |
| symbol | VARCHAR(20) | |
| interval | ENUM('1m','5m','15m','30m','1h','4h','1d','1w') | |
| open_time | TIMESTAMPTZ | |
| close_time | TIMESTAMPTZ | |
| open / high / low / close | NUMERIC(30,18) | |
| volume | NUMERIC(30,18) | Base volume |
| quote_volume | NUMERIC(30,18) | |
| trade_count | INTEGER | 0 = carry-forward candle |
| updated_at | TIMESTAMPTZ | |
| | UNIQUE(symbol, interval, open_time) | |

#### 8. kyc_verifications
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | |
| level | ENUM('level_0','level_1','level_2') | |
| status | ENUM('not_started','pending','approved','rejected') | |
| phone_number | VARCHAR(20) | Level 1 |
| document_type | VARCHAR(20) | Level 2 |
| document_front / document_back / selfie | TEXT | File paths |
| reviewed_by | UUID (FK→users) | |
| reviewed_at | TIMESTAMPTZ | |
| rejection_reason | TEXT | |
| created_at / updated_at | TIMESTAMPTZ | |

#### 9. deposits
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | |
| currency | VARCHAR(10) | |
| amount | NUMERIC(30,18) | |
| status | ENUM('pending','confirming','completed','failed') | Default: simulated auto-complete |
| tx_hash | VARCHAR(128) | Simulated |
| network | VARCHAR(20) | |
| confirmations | INTEGER | Current/required for animation |
| required_confirmations | INTEGER | |
| created_at | TIMESTAMPTZ | |
| completed_at | TIMESTAMPTZ | |

#### 10. withdrawals
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | |
| currency | VARCHAR(10) | |
| amount | NUMERIC(30,18) | |
| fee | NUMERIC(30,18) | |
| address | VARCHAR(128) | |
| network | VARCHAR(20) | |
| status | ENUM('pending_approval','processing','confirming','completed','failed','rejected','cancelled') | |
| tx_hash | VARCHAR(128) | Simulated |
| reviewed_by | UUID (FK→users) | |
| created_at / completed_at | TIMESTAMPTZ | |

#### 11. login_history
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID (FK→users) | |
| ip_address | INET | |
| user_agent | TEXT | |
| success | BOOLEAN | |
| failure_reason | VARCHAR(50) | |
| created_at | TIMESTAMPTZ | |

#### 12. audit_logs
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| admin_id | UUID (FK→users) | |
| action | VARCHAR(100) | e.g., 'user.freeze', 'pair.create' |
| target_type | VARCHAR(50) | |
| target_id | UUID | |
| details | JSONB | |
| ip_address | INET | |
| created_at | TIMESTAMPTZ | |

#### 13. fee_tiers (deferred, schema only)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| name | VARCHAR(50) | |
| min_volume_30d | NUMERIC(30,18) | |
| maker_fee_bps | SMALLINT | |
| taker_fee_bps | SMALLINT | |
| created_at | TIMESTAMPTZ | |

#### 14. system_config
| Column | Type | Notes |
|--------|------|-------|
| key | VARCHAR(100) PK | |
| value | JSONB | |
| updated_at | TIMESTAMPTZ | |
| updated_by | UUID (FK→users) | |

---

## API Endpoints (Complete List)

### Base Convention
- Base URL: `/api/v1`
- Content-Type: `application/json`
- Auth: `Authorization: Bearer <JWT>`
- Success: `{ "success": true, "data": <T>, "timestamp": number }`
- Error: `{ "success": false, "error": { "code": string, "message": string }, "timestamp": number }`
- Paginated: adds `"pagination": { "page": number, "pageSize": number, "total": number, "hasMore": boolean }`

### Public Endpoints (No Auth)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/health` | Health check |
| GET | `/api/v1/market/pairs` | List all trading pairs |
| GET | `/api/v1/market/pairs/:symbol` | Single pair details |
| GET | `/api/v1/market/ticker` | All 24h tickers |
| GET | `/api/v1/market/ticker/:symbol` | Single pair ticker |
| GET | `/api/v1/market/depth/:symbol` | Order book depth (?limit=20) |
| GET | `/api/v1/market/trades/:symbol` | Recent trades (?limit=50) |
| GET | `/api/v1/market/candles/:symbol` | K-line data (?interval=1h&limit=500) |

### Auth Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register (email, password) |
| POST | `/api/v1/auth/login` | Login (email, password, totpCode?) |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Invalidate refresh token |
| POST | `/api/v1/auth/2fa/setup` | Generate TOTP secret + QR URL |
| POST | `/api/v1/auth/2fa/verify` | Verify code, enable 2FA |
| POST | `/api/v1/auth/2fa/disable` | Disable 2FA (requires code) |
| PUT | `/api/v1/auth/password` | Change password (old + new) |

### Trading Endpoints (Auth Required)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/orders` | Place order |
| DELETE | `/api/v1/orders/:orderId` | Cancel order |
| DELETE | `/api/v1/orders` | Cancel all (?symbol=BTC_USDT) |
| GET | `/api/v1/orders` | Open orders (?symbol, ?page, ?pageSize) |
| GET | `/api/v1/orders/history` | Order history (?symbol, ?page) |
| GET | `/api/v1/orders/:orderId` | Order detail |
| GET | `/api/v1/trades/my` | My trades (?symbol, ?page) |

### Wallet Endpoints (Auth Required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/wallet/balances` | All balances |
| GET | `/api/v1/wallet/balances/:currency` | Single balance |
| POST | `/api/v1/wallet/deposit` | Simulated deposit |
| POST | `/api/v1/wallet/withdraw` | Simulated withdrawal |
| GET | `/api/v1/wallet/deposits` | Deposit history |
| GET | `/api/v1/wallet/withdrawals` | Withdrawal history |
| GET | `/api/v1/wallet/transactions` | All transactions (?page) |

### Account Endpoints (Auth Required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/account/profile` | User profile |
| PUT | `/api/v1/account/profile` | Update profile (nickname) |
| GET | `/api/v1/account/kyc` | KYC status |
| POST | `/api/v1/account/kyc/level1` | Submit phone verification |
| POST | `/api/v1/account/kyc/level2` | Submit document upload |
| GET | `/api/v1/account/login-history` | Login history |

### Admin Endpoints (Admin Auth Required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/admin/stats` | Dashboard statistics |
| GET | `/api/v1/admin/pairs` | List all pairs (with config) |
| POST | `/api/v1/admin/pairs` | Create pair |
| PATCH | `/api/v1/admin/pairs/:id` | Update pair |
| DELETE | `/api/v1/admin/pairs/:id` | Delist pair |
| GET | `/api/v1/admin/users` | User list (?search, ?status, ?page) |
| PATCH | `/api/v1/admin/users/:id` | Update user (freeze/unfreeze) |
| GET | `/api/v1/admin/users/:id` | User detail (profile, KYC, orders, balances) |
| GET | `/api/v1/admin/kyc/queue` | Pending KYC reviews |
| PATCH | `/api/v1/admin/kyc/:id` | Approve/reject KYC |
| GET | `/api/v1/admin/fee-tiers` | Fee tier list |
| PATCH | `/api/v1/admin/config` | Update system config |
| GET | `/api/v1/admin/config` | Get system config |
| GET | `/api/v1/admin/audit-logs` | Audit logs (?page) |
| GET | `/api/v1/admin/withdrawals` | Withdrawal review queue |
| PATCH | `/api/v1/admin/withdrawals/:id` | Approve/reject withdrawal |
| GET | `/api/v1/admin/orders` | All orders (monitoring) |

---

## WebSocket Channels

### Connection
- Endpoint: `ws://localhost:3000/ws`
- Auth: Query param `?token=<JWT>` or `AUTH` message after connect
- Frame format: JSON
- Heartbeat: Server pings every 30s, disconnect if no pong in 10s
- Rate limit: 20 messages/sec per client
- Max subscriptions: 50 per client

### Client Messages
```typescript
{ "method": "SUBSCRIBE", "params": ["ticker@BTC_USDT"], "id": 1 }
{ "method": "UNSUBSCRIBE", "params": ["ticker@BTC_USDT"], "id": 2 }
{ "method": "AUTH", "params": ["<JWT>"], "id": 3 }
{ "method": "PING", "id": 4 }
```

### Public Channels

| Channel | Format | Push Rate | Description |
|---------|--------|-----------|-------------|
| `ticker@{symbol}` | Ticker object | 1/sec | 24h stats, last price |
| `ticker@ALL` | Array of tickers | 1/sec | All pairs |
| `depth@{symbol}@{levels}` | Snapshot | On subscribe | Full order book snapshot |
| `depth@{symbol}` | Incremental update | 10/sec max | Bid/ask level changes |
| `trade@{symbol}` | Trade object | Real-time | Each trade execution |
| `kline@{symbol}@{interval}` | Candle object | Per trade | Current candle updates |

### Private Channels (Auth Required)

| Channel | Format | Push Rate | Description |
|---------|--------|-----------|-------------|
| `orders` | Order update | Real-time | placed, updated, filled, cancelled |
| `wallet` | Balance update | Real-time | Available/frozen balance changes |

### Depth Update Protocol
1. Client subscribes to `depth@BTC_USDT@20` → receives full snapshot with `lastUpdateId`
2. Client subscribes to `depth@BTC_USDT` → receives incremental updates with `firstUpdateId` and `lastUpdateId`
3. Client applies updates where `firstUpdateId > snapshot.lastUpdateId`
4. If gap detected, client requests fresh snapshot

---

## User Flows (Key Journeys)

### Journey 1: New User → First Trade
1. Land on homepage → see live ticker, CTA "Start Trading"
2. Click Register → email + password form
3. Submit → account created (auto-verified), redirect to trading page
4. Prompt: "Deposit to start trading" (optional, can view markets)
5. Navigate to Wallet → Deposit → Select USDT → Enter amount
6. Confirmation animation (1/3... 2/3... 3/3... Complete)
7. Navigate to Trade → BTC/USDT
8. Place market buy order → confirm dialog → order fills
9. See trade in history, balance updated, toast notification
10. View portfolio in Wallet overview

### Journey 2: Day Trader Session
1. Open /trade/BTC_USDT → full trading interface loads
2. Review chart → add RSI + MACD indicators
3. Analyze order book → identify support/resistance
4. Place limit buy at support → 0.5 BTC @ $42,000
5. Set stop-loss → sell if price drops to $41,000
6. Switch pair via selector → ETH/USDT
7. Monitor open orders panel → see fills in real-time
8. Cancel partially filled order → remainder unfrozen
9. Review trade history

### Journey 3: Admin Operations
1. Login as admin → /admin dashboard
2. Review KPIs: users, 24h volume, pending KYC count
3. Navigate to KYC queue → review submissions
4. Approve/reject KYC applications
5. Navigate to trading pairs → adjust BTC/USDT fees
6. Create new pair SOL/USDT with parameters
7. Review audit logs for recent admin actions

### Journey 4: Wallet Withdrawal
1. Wallet → select USDT → click "Withdraw"
2. Enter address, select network, enter amount
3. Review summary (amount, fee, receive amount)
4. If 2FA enabled: enter TOTP code
5. Submit → withdrawal enters "Processing" state
6. Status updates via WebSocket: processing → confirming → completed
7. Transaction appears in history with simulated TX hash

---

## Non-Functional Requirements

### Performance
| Metric | Target |
|--------|--------|
| Matching throughput | ≥ 10,000 orders/sec |
| Match latency p50 | ≤ 500μs |
| Match latency p99 | ≤ 5ms |
| API place order p99 | ≤ 50ms |
| WS message delivery p50 | ≤ 10ms |
| WS fan-out 1k subscribers | ≤ 100ms |
| Max concurrent WS connections | 10,000 |
| Order book rebuild (10k orders) | ≤ 2s |
| Chart render FPS | 60fps sustained |
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Initial bundle (gzipped) | < 300KB |

### Security
| Measure | Implementation |
|---------|---------------|
| Password hashing | bcrypt, cost factor 12 |
| JWT tokens | Access: 15min, Refresh: 7 days, jose library |
| Input validation | Zod on all API inputs |
| SQL injection | Drizzle ORM (parameterized queries) |
| XSS | React default escaping + CSP headers |
| CORS | Strict origin whitelist |
| Rate limiting | Sliding window per user/IP |
| Decimal safety | big.js for all financial calculations |
| DB constraints | CHECK(available >= 0), CHECK(frozen >= 0) |
| Admin auth | Role check on all admin endpoints |
| Audit logging | All admin actions logged |

### Reliability
| Aspect | Approach |
|--------|---------|
| Order book recovery | Rebuild from DB on server restart |
| Data consistency | DB transactions for settlement |
| WS reconnection | Auto-reconnect with exponential backoff (1s-30s) |
| Error handling | Global error boundary, structured error responses |
| Graceful shutdown | Drain WS connections, flush candles to DB |

### Code Quality
| Aspect | Standard |
|--------|---------|
| Language | TypeScript strict mode |
| Linting | ESLint + Prettier |
| Testing | Playwright E2E, Vitest unit tests |
| Coverage target | ≥ 80% matching engine, ≥ 70% overall |
| Code comments | English |
| Documentation | Chinese README, English code docs |
| Git | Conventional commits |

---

## Phased Rollout

### Phase 1: Foundation (Week 1)
- Project scaffolding (Next.js, Drizzle, PostgreSQL, TypeScript)
- Full database schema + migrations (all 14 tables)
- User registration + login (JWT)
- Wallet system (balance, simulated deposit)
- Dark theme UI shell (navigation, layout)
- Landing page (hero + CTA + ticker placeholder)
- Demo mode banner
- **Deliverable:** User can register, login, deposit simulated funds

### Phase 2: Trading Core (Week 2)
- Matching engine (limit orders, price-time priority)
- Order placement + cancellation API
- Order book data structure (in-memory red-black tree)
- Trade execution + settlement (atomic DB transactions)
- Trading pair seed data
- Basic trading page layout
- **Deliverable:** User can place/cancel limit orders, see trades

### Phase 3: Real-Time (Week 3)
- Market orders (with maxSlippage)
- WebSocket server (depth, trade, ticker, orders, wallet channels)
- Live order book component
- Recent trades component
- Connected order form
- Open orders / order history tables
- WS reconnection with snapshot recovery
- **Deliverable:** Real-time trading experience with live updates

### Phase 4: Charts & Market Data (Week 4)
- Candle aggregation engine (OHLCV, carry-forward)
- TradingView Lightweight Charts integration
- Historical candle API
- Chart time intervals + indicators
- Trading pair selector modal
- Market-making bot + seed data
- **Deliverable:** Complete trading page with professional charts

### Phase 5: Advanced Orders & Risk (Week 5)
- Stop-loss, stop-limit, OCO orders
- IOC / FOK time-in-force
- Self-trade prevention
- Price protection (circuit breaker)
- Order validation suite
- Rate limiting
- **Deliverable:** Full order type support with risk controls

### Phase 6: Polish & Admin (Week 6)
- 2FA (TOTP)
- KYC flow (simulated L0/L1/L2)
- Simulated withdrawal
- Admin dashboard + pair/user/fee/KYC management
- Wallet overview + transaction history
- Light theme, responsive layout, accessibility
- Basic PWA
- **Deliverable:** Complete, polished application

---

## Appendix: Seed Trading Pairs

| Symbol | Base | Quote | Price Precision | Amount Precision | Min Amount | Min Total | Maker Fee | Taker Fee |
|--------|------|-------|----------------|-----------------|------------|-----------|-----------|-----------|
| BTC_USDT | BTC | USDT | 2 | 6 | 0.000001 | 10 | 10 bps | 15 bps |
| ETH_USDT | ETH | USDT | 2 | 5 | 0.00001 | 10 | 10 bps | 15 bps |
| ETH_BTC | ETH | BTC | 6 | 4 | 0.0001 | 0.0001 | 10 bps | 15 bps |
| DOGE_USDT | DOGE | USDT | 5 | 0 | 1 | 1 | 10 bps | 15 bps |
| XRP_USDT | XRP | USDT | 4 | 1 | 0.1 | 5 | 10 bps | 15 bps |

## Appendix: Symbol Format Convention
- **Internal/API:** `BTC_USDT` (underscore, URL-safe)
- **Display/UI:** `BTC/USDT` (slash, human-readable)
- **URL:** `/trade/BTC_USDT`

## Appendix: Fee Format
- **Storage:** Basis points (integer). 10 bps = 0.10%
- **Display:** Percentage. `makerFeeBps / 100` → `0.10%`
- **Calculation:** `amount * feeBps / 10000`
