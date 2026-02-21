# Synthesis Round 1 — Unified Requirements Specification

> **Date:** 2026-02-22  
> **Status:** Round 1 — Cross-reference, conflict resolution, gap analysis  
> **Sources:** Competitive Analysis (Market), Product Design (Designer), Architecture (Architect), Test Strategy (QA)

---

## Table of Contents

1. [Cross-Reference Summary](#1-cross-reference-summary)
2. [Resolved Conflicts](#2-resolved-conflicts)
3. [Gap Analysis](#3-gap-analysis)
4. [Unified Feature List](#4-unified-feature-list)
5. [Unified Tech Stack Decision](#5-unified-tech-stack-decision)
6. [Unified Data Model Additions](#6-unified-data-model-additions)
7. [Unified API Surface](#7-unified-api-surface)
8. [Unified Phase Plan](#8-unified-phase-plan)
9. [Open Questions](#9-open-questions)

---

## 1. Cross-Reference Summary

### 1.1 Alignment Across Deliverables

| Area | Market | Designer | Architect | QA | Status |
|------|--------|----------|-----------|-----|--------|
| Core Spot Trading | ✅ | ✅ | ✅ | ✅ | **Fully aligned** |
| Limit + Market Orders | ✅ P1 | ✅ P0 UI | ✅ P2+P5 | ✅ 20+ tests | **Aligned, phasing conflict resolved** |
| Stop-Loss / Stop-Limit | ✅ P2 | ✅ P0 UI tab | ✅ P5 | ✅ 10+ tests | **Aligned, phasing conflict resolved** |
| OCO Orders | ✅ P3 | ✅ P0 UI tab | ✅ P5 | ✅ tests | **Aligned, phasing conflict resolved** |
| Order Book | ✅ | ✅ detailed | ✅ in-memory | ✅ 8 tests | **Fully aligned** |
| TradingView Charts | ✅ LW | ✅ LW or licensed | ✅ LW v4 | — | **Fully aligned (Lightweight Charts)** |
| WebSocket Real-time | ✅ | ✅ channels | ✅ 7 channels | ✅ 10 tests | **Fully aligned** |
| User Auth (register/login) | ✅ | ✅ detailed flows | ✅ JWT+bcrypt | ✅ 14 tests | **Fully aligned** |
| 2FA (TOTP) | ✅ P2 | ✅ | ✅ otpauth lib | ✅ 3 tests | **Fully aligned** |
| Wallet (deposit/withdraw) | ✅ simulated | ✅ full flows | ✅ simulated | ✅ 12 tests | **Mostly aligned, schema gap** |
| KYC Verification | ✅ P2 simulated | ✅ 3 levels + states | ❌ **No schema** | Minimal tests | **GAP — needs schema** |
| Admin Dashboard | ✅ P2 | ✅ full layout | ✅ routes + stats | ✅ 2 tests only | **Test coverage gap** |
| Fee Tiers | ✅ | ✅ VIP tiers UI | ✅ fee_tiers table | ✅ 1 test | **Aligned** |
| Risk Control | ✅ P3 | ✅ in admin | ✅ circuit breaker | ✅ 7 tests | **Aligned** |
| Mobile Responsive | ✅ "响应式" | ✅ detailed breakpoints | — not mentioned | — not mentioned | **Design-only, arch/QA gap** |
| Accessibility | — | ✅ WCAG 2.1 AA | — | — | **Design-only** |
| i18n | ✅ P3 中/英 | ✅ language setting | — | — | **Deferred, no arch/QA** |
| Referral Program | — | ✅ in sitemap | — | — | **Designer-only, descope for MVP** |

### 1.2 Consistency Verdict

**Overall consistency: GOOD, with 10 actionable conflicts and 15 gaps identified below.**

All four agents agree on the core product: a modern, Next.js-based educational CEX with spot trading, real-time data, and professional UI. Conflicts are primarily around phasing, tech choices, and missing schema elements.

---

## 2. Resolved Conflicts

### Conflict 1: ORM Choice — Prisma vs Drizzle

| Agent | Position |
|-------|----------|
| Market Researcher | PostgreSQL + Prisma |
| Architect | PostgreSQL + Drizzle ORM |

**Decision: Drizzle ORM**

**Rationale:**
- Architect provides complete Drizzle schema code (ready to implement)
- Drizzle is SQL-close — better for complex trading queries (joins, aggregates, window functions)
- Better for educational purposes: students see SQL-like syntax, not Prisma's custom query language
- Type-safe with less abstraction overhead
- Migration story equivalent or better

---

### Conflict 2: Redis vs In-Memory

| Agent | Position |
|-------|----------|
| Market Researcher | Redis for order book cache, pub/sub, session store |
| Architect | In-memory (no Redis) — "Redis adds operational complexity with no benefit at this scale" |

**Decision: In-Memory for MVP; Redis as optional Phase 7+ upgrade**

**Rationale:**
- Single-process architecture eliminates need for cross-process communication
- In-memory is faster (no serialization, no network hop)
- Fewer dependencies = simpler `npm run dev` experience (core project goal)
- `docker-compose.yml` stays minimal (PostgreSQL only)
- If the project later needs multi-process scaling, Redis is the natural upgrade path

---

### Conflict 3: Auth Library — NextAuth.js vs jose/bcrypt

| Agent | Position |
|-------|----------|
| Market Researcher | NextAuth.js + JWT |
| Architect | jose + bcrypt (no NextAuth.js) |

**Decision: jose + bcrypt**

**Rationale:**
- Educational project: understanding JWT from scratch is the point
- NextAuth.js adds 30+ KB bundle and heavy abstraction for features we don't need (OAuth, social login)
- jose is lightweight, standards-based (JWS/JWE/JWT)
- Full control over token structure, refresh flow, and revocation
- Architect's auth design is complete and well-documented

---

### Conflict 4: WebSocket Library — ws vs Socket.io

| Agent | Position |
|-------|----------|
| Market Researcher | "ws/Socket.io" |
| Architect | ws explicitly |

**Decision: ws library**

**Rationale:**
- Socket.io adds its own protocol layer (polling fallback, rooms, namespaces) — unnecessary complexity
- Raw WebSocket is the industry standard for exchange real-time data (Binance, OKX all use native WS)
- Educational value: students learn WebSocket protocol directly
- Less overhead, better performance for high-frequency data
- Architect's WS implementation is complete with channel management

---

### Conflict 5: Order Type Phasing

| Agent | Phase 1 (MVP) | Phase 2 | Phase 3+ |
|-------|---------------|---------|----------|
| Market Researcher | Limit + Market | Stop-loss | OCO |
| Architect | Limit only | — | Market + Stop + OCO (all in Phase 5) |
| Product Designer | All 4 types in P0 UI | — | — |
| QA | All tested | — | — |

**Decision: Progressive implementation with UI scaffolding**

| Phase | Order Types |
|-------|-------------|
| Phase 1 (Foundation) | — (no trading yet) |
| Phase 2 (Trading Core) | Limit orders |
| Phase 3 (Real-time) | Market orders |
| Phase 5 (Advanced) | Stop-Loss, Stop-Limit, OCO, IOC/FOK |

**UI approach:** Show all 4 tabs in the order form from Phase 2, with unimplemented tabs showing "Coming Soon" tooltip. This follows the designer's layout while being honest about implementation state.

**Rationale:**
- Limit orders are the foundation — must come first
- Market orders require a working order book to test against — Phase 3
- Stop/OCO are advanced and require the stop order monitoring system — Phase 5
- The architect's grouping of all advanced orders together is efficient for implementation

---

### Conflict 6: KYC Scope & Schema

| Agent | Position |
|-------|----------|
| Market Researcher | "模拟 KYC" in Phase 2 |
| Product Designer | 3 KYC levels with full document upload/review flow |
| Architect | **No KYC schema at all** |

**Decision: Simulated KYC with Level 0/1/2, schema addition required**

| Level | Requirement | Unlocks |
|-------|-------------|---------|
| Level 0 | Email verified only | View markets, no trading |
| Level 1 | Simulated phone verification (enter any 6-digit code) | Trade up to $2,000/day equivalent |
| Level 2 | Simulated ID upload (upload any image) | Full access |

**Action required:** Architect must add `kyc_verifications` table to schema. See §6 below.

**Rationale:**
- KYC is an important part of real CEX UX — worth demonstrating the flow
- But real document verification is out of scope for a demo
- Simulated = the UX flow is real, the verification is always auto-approved (with configurable delay)
- Skip Level 3 (address proof) — diminishing educational value

---

### Conflict 7: Trading Pair Symbol Format

| Agent | Format |
|-------|--------|
| Market Researcher | `BTCUSDT` (no separator) |
| Architect | `BTC_USDT` (underscore) |
| Product Designer | `BTC/USDT` (slash, display) |
| QA | Mixed |

**Decision: Internal = `BTC_USDT`, Display = `BTC/USDT`**

**Rationale:**
- Underscore is programmatically clean (no URL encoding needed, clear separator)
- Slash is the universal human-readable format
- URL format: `/trade/BTC_USDT` (clean URL)
- API format: `symbol=BTC_USDT` (query param safe)
- Display: `BTC/USDT` (user-facing)
- This matches the architect's schema (`VARCHAR(20)` for symbol field)

---

### Conflict 8: Performance Benchmarks

| Agent | Target |
|-------|--------|
| QA | Matching: 100,000 orders/sec, p99 ≤ 200μs |
| Architect | Single Node.js process |

**Decision: Revise benchmarks to realistic Node.js single-process targets**

| Metric | QA Original | Revised Target |
|--------|-------------|----------------|
| Matching throughput | 100,000 orders/sec | **10,000 orders/sec** |
| Match latency p99 | 200μs | **5ms** |
| API place order p99 | 20ms | **50ms** |
| WS connections | 100,000 | **10,000** |
| WS fan-out 10k subs | 50ms | **200ms** |

**Rationale:**
- Node.js is single-threaded; 100k orders/sec requires C++/Rust
- For an educational project, 10k orders/sec is impressive and achievable
- These revised targets still demonstrate solid engineering

---

### Conflict 9: Fee Storage Format

| Agent | Format |
|-------|--------|
| Market Researcher | Percentage (0.10%) |
| Architect | Basis points (10 bps) |
| Product Designer | Display as percentage |

**Decision: Store as basis points (BPS), display as percentage**

**Rationale:**
- BPS is integer arithmetic (no floating point errors: 10 bps, not 0.001)
- Standard in financial systems
- Conversion is trivial: `bps / 100 = percentage`
- Display: `0.10%` (from 10 bps)

---

### Conflict 10: Market Researcher's Recommended Architecture vs Architect's Design

| Aspect | Market Researcher | Architect |
|--------|-------------------|-----------|
| Architecture style | Simplified monolith | Hybrid monolith (Next.js + co-located WS engine) |
| Process model | Not specified | Single process with custom server.ts |
| Event system | Not specified | TypedEventEmitter (in-process) |

**Decision: Adopt Architect's hybrid design entirely**

**Rationale:**
- Architect's design is fully specified with code examples
- The custom `server.ts` approach (HTTP + WS on same port via `upgrade`) is elegant
- In-process EventEmitter eliminates message queue complexity while preserving event-driven architecture
- Market researcher's recommendations are high-level and compatible with architect's detail

---

## 3. Gap Analysis

### 3.1 Missing Data Model Elements

| Gap | Required By | Impact | Resolution |
|-----|-------------|--------|------------|
| **KYC table** | Designer (3-level KYC flow), Market (Phase 2) | Cannot implement KYC flow | Add `kyc_verifications` table — see §6 |
| **Deposits/Withdrawals table** | Designer (withdrawal states), Market (deposit/withdrawal records) | Cannot track deposit/withdrawal status independently | Add `deposits` and `withdrawals` tables — see §6 |
| **Login history table** | Designer (trusted devices, login history) | Cannot show login history or device management | Add `login_history` table — see §6 |
| **Audit log table** | Designer (admin audit), QA (admin action logging) | Cannot log admin actions | Add `audit_logs` table — see §6 |
| **Password reset tokens** | Designer (forgot password flow) | Cannot implement password reset | Add `password_reset_tokens` table or use JWT-based reset |
| **Email verification tokens** | Designer (registration flow) | Cannot verify email | Add `email_verifications` table or use JWT-based verification |

### 3.2 Missing API Endpoints

| Endpoint | Required By | Gap |
|----------|-------------|-----|
| `POST /api/v1/auth/forgot-password` | Designer flow | Not in Architect's API |
| `POST /api/v1/auth/reset-password` | Designer flow | Not in Architect's API |
| `POST /api/v1/auth/verify-email` | Designer flow | Not in Architect's API |
| `GET /api/v1/auth/sessions` | Designer (device management) | Not in Architect's API |
| `DELETE /api/v1/auth/sessions/:id` | Designer (revoke session) | Not in Architect's API |
| `POST /api/v1/account/kyc/submit` | Designer KYC flow | Not in Architect's API |
| `GET /api/v1/account/kyc/status` | Designer KYC flow | Not in Architect's API |
| `GET /api/v1/admin/kyc/queue` | Designer admin flow | Not in Architect's API |
| `PATCH /api/v1/admin/kyc/:id` | Designer admin flow | Not in Architect's API |
| `GET /api/v1/admin/audit-logs` | Designer + QA | Not in Architect's API |

### 3.3 Missing Test Coverage

| Area | Existing Tests | Missing |
|------|---------------|---------|
| **Admin dashboard** | 2 tests (pair disable, fee config) | Stats API, user management, audit logs, system config |
| **KYC flow** | 0 explicit tests | Submit, review, approve/reject, level transitions |
| **Password reset** | 0 tests | Token generation, expiry, reset success, reuse prevention |
| **Email verification** | 0 tests | Verification link, expiry, resend |
| **Mobile responsive** | 0 tests | Viewport-specific layout, touch interactions |
| **Accessibility** | 0 tests | WCAG compliance, keyboard navigation, screen reader |
| **Deposit/Withdrawal UI** | 0 E2E tests | Full deposit flow, withdrawal with 2FA, status tracking |
| **Pair selector** | 0 tests | Search, favorites, sort, keyboard navigation |

### 3.4 Feature → Journey → API → Test Traceability

| Feature | User Journey | API Endpoint | Test Case | Status |
|---------|-------------|-------------|-----------|--------|
| Registration | ✅ Designer 4.1 | ✅ Architect POST /auth/register | ✅ TC-US-001/002/003 | Complete |
| Email verify | ✅ Designer 4.1 Step 3 | ❌ Missing | ❌ Missing | **GAP** |
| Login | ✅ Designer 10.2 | ✅ Architect POST /auth/login | ✅ TC-US-004/005/006 | Complete |
| Login w/ 2FA | ✅ Designer 10.2 | ✅ Architect POST /auth/login + totp | ✅ TC-US-008/009/010 | Complete |
| Password reset | ✅ Designer 10.2 forgot | ❌ Missing | ❌ Missing | **GAP** |
| KYC submit | ✅ Designer 4.1 Step 5-6 | ❌ Missing | ❌ Missing | **GAP** |
| KYC admin review | ✅ Designer 4.3 | ❌ Missing | ❌ Missing | **GAP** |
| Deposit | ✅ Designer 9.2 | ✅ Architect POST /wallet/deposit | ✅ TC-WL-002/003 | Complete |
| Withdrawal | ✅ Designer 4.4 | ✅ Architect POST /wallet/withdraw | ✅ TC-WL-004-009 | Complete |
| Place limit order | ✅ Designer 4.1 Step 11 | ✅ Architect POST /orders | ✅ TC-ME/OM many | Complete |
| Place market order | ✅ Designer 4.2 | ✅ Architect POST /orders | ✅ TC-ME-003/004 | Complete |
| Cancel order | ✅ Designer 4.2 Step 10 | ✅ Architect DELETE /orders/:id | ✅ TC-OM-003/004/005 | Complete |
| Order book display | ✅ Designer §6 | ✅ Architect GET /market/depth | ✅ TC-OB-001-008 | Complete |
| Chart + Klines | ✅ Designer §7 | ✅ Architect GET /market/candles | ✅ TC-KL-001-008 | Complete |
| Admin pair mgmt | ✅ Designer §11.4 | ✅ Architect CRUD /admin/pairs | ✅ TC-AB-001 | Partial |
| Admin fee config | ✅ Designer §11.5 | ✅ Architect /admin/fee-tiers | ✅ TC-AB-002 | Complete |
| Admin user mgmt | ✅ Designer §11.3 | ✅ Architect /admin/users | ❌ Missing tests | **GAP** |
| Admin dashboard | ✅ Designer §11.1 | ✅ Architect /admin/stats | ❌ Missing tests | **GAP** |
| Landing page | ✅ Designer 3.1 | — (SSR page) | ❌ Missing tests | **GAP** |

### 3.5 UI State Coverage

The Designer's State Catalog (§12) is comprehensive for:
- ✅ Order states (9 states with colors, copy)
- ✅ Withdrawal states (7 states)
- ✅ KYC states (7 states)
- ✅ WebSocket connection states (5 states)
- ✅ Account states (6 states)

**Missing UI states:**
- ❌ Trading pair states from admin perspective (loading pair config, pair creation pending)
- ❌ 2FA setup states (scanning QR, verifying first code, success/failure)
- ❌ Deposit states (only withdrawal states defined)
- ❌ API key states (created, active, revoked)

---

## 4. Unified Feature List

### MVP (Phase 1-3, Weeks 1-3)

| ID | Feature | Priority | Source Agents |
|----|---------|----------|---------------|
| F-001 | User registration (email + password) | P0 | All 4 |
| F-002 | Email verification (simulated — auto-verify or 6-digit code) | P0 | Designer |
| F-003 | User login (JWT access + refresh tokens) | P0 | All 4 |
| F-004 | Wallet balance management (available/frozen) | P0 | All 4 |
| F-005 | Simulated deposit (one-click credit) | P0 | All 4 |
| F-006 | Trading pair configuration (admin seed) | P0 | All 4 |
| F-007 | Matching engine — limit orders (price-time priority) | P0 | All 4 |
| F-008 | Matching engine — market orders | P0 | Market, Designer, QA |
| F-009 | Order placement API + balance freeze | P0 | Architect, QA |
| F-010 | Order cancellation API + balance unfreeze | P0 | Architect, QA |
| F-011 | Trade settlement (wallet updates) | P0 | Architect, QA |
| F-012 | Order book depth API | P0 | All 4 |
| F-013 | WebSocket: depth channel (order book updates) | P0 | All 4 |
| F-014 | WebSocket: trade channel (real-time trades) | P0 | All 4 |
| F-015 | WebSocket: ticker channel | P0 | All 4 |
| F-016 | WebSocket: user order updates (private) | P0 | Architect, Designer |
| F-017 | WebSocket: user balance updates (private) | P0 | Architect, Designer |
| F-018 | Trading UI: order book component | P0 | Designer |
| F-019 | Trading UI: order form (limit/market) | P0 | Designer |
| F-020 | Trading UI: recent trades panel | P1 | Designer |
| F-021 | Trading UI: trading pair selector | P0 | Designer |
| F-022 | Trading UI: pair header bar (price, 24h stats) | P0 | Designer |
| F-023 | Trading UI: open orders table | P0 | Designer |
| F-024 | Trading UI: order history table | P0 | Designer |
| F-025 | Dark theme (default) | P0 | All |

### Core (Phase 4, Week 4)

| ID | Feature | Priority | Source Agents |
|----|---------|----------|---------------|
| F-026 | Candle aggregation engine (OHLCV) | P0 | Architect, QA |
| F-027 | WebSocket: kline channel | P0 | All 4 |
| F-028 | TradingView Lightweight Charts integration | P0 | All 4 |
| F-029 | Historical candle REST API | P0 | Architect |
| F-030 | Chart time intervals (1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W) | P0 | Designer |
| F-031 | Chart indicators (MA, EMA, RSI, MACD, Bollinger, Volume) | P1 | Designer |

### Advanced (Phase 5, Week 5)

| ID | Feature | Priority | Source Agents |
|----|---------|----------|---------------|
| F-032 | Stop-loss orders | P1 | All 4 |
| F-033 | Stop-limit orders | P1 | All 4 |
| F-034 | OCO orders | P2 | All 4 |
| F-035 | IOC / FOK time-in-force | P1 | Architect, QA |
| F-036 | Price protection (circuit breaker) | P1 | Market, Architect, QA |
| F-037 | Self-trade prevention | P1 | Architect, QA |
| F-038 | Order validation (precision, min/max, notional) | P0 | Architect, QA |

### Polish (Phase 6, Week 6)

| ID | Feature | Priority | Source Agents |
|----|---------|----------|---------------|
| F-039 | 2FA (TOTP) setup and login | P1 | All 4 |
| F-040 | KYC verification (simulated, Level 0/1/2) | P1 | Market, Designer |
| F-041 | Simulated withdrawal (with status tracking) | P1 | All 4 |
| F-042 | Admin dashboard (stats, volume, user count) | P1 | Market, Designer, Architect |
| F-043 | Admin: trading pair CRUD | P1 | All 4 |
| F-044 | Admin: fee tier configuration | P1 | All 4 |
| F-045 | Admin: user management (list, freeze/unfreeze) | P1 | Designer, Architect |
| F-046 | Admin: KYC review queue | P2 | Designer |
| F-047 | Wallet overview (total balance, allocation) | P1 | Designer |
| F-048 | Transaction history (deposits/withdrawals) | P1 | Designer |
| F-049 | Password reset flow | P2 | Designer |
| F-050 | Seed data with realistic market simulation | P1 | Architect |
| F-051 | Rate limiting | P1 | Architect, QA |
| F-052 | Light theme option | P2 | Designer |

### Deferred (Post-MVP)

| ID | Feature | Priority | Notes |
|----|---------|----------|-------|
| F-D01 | Referral program | P3 | Designer only, not educational priority |
| F-D02 | Anti-phishing code | P3 | Nice-to-have security feature |
| F-D03 | API key management | P3 | For quantitative trading users |
| F-D04 | Depth chart visualization | P3 | Visual enhancement |
| F-D05 | Trade export (CSV) | P3 | Utility feature |
| F-D06 | i18n (Chinese + English) | P3 | Market + Designer recommend |
| F-D07 | Notification system (email) | P3 | Designer mentions in several flows |
| F-D08 | Announcements | P3 | Admin feature |
| F-D09 | Customizable panel layout | P3 | Designer advanced mode |
| F-D10 | Keyboard shortcuts | P2 | Designer defines, good DX |

---

## 5. Unified Tech Stack Decision

| Layer | Technology | Decision By |
|-------|-----------|-------------|
| **Framework** | Next.js 14+ (App Router) | All 4 agents |
| **Language** | TypeScript (strict) | All 4 agents |
| **UI Components** | TailwindCSS + shadcn/ui | Market + Architect |
| **Charts** | TradingView `lightweight-charts` v4 | All 4 agents |
| **State Mgmt** | Zustand | Market + Architect |
| **Forms** | React Hook Form + Zod | Architect |
| **ORM** | **Drizzle ORM** (not Prisma) | Resolved: Architect |
| **Database** | PostgreSQL 16 | All 4 agents |
| **Cache** | **In-memory** (not Redis) | Resolved: Architect |
| **WebSocket** | **ws** library (not Socket.io) | Resolved: Architect |
| **Auth** | **jose + bcrypt** (not NextAuth.js) | Resolved: Architect |
| **2FA** | otpauth | Architect |
| **Decimal Math** | big.js | Architect |
| **Logging** | pino | Architect |
| **Order Book** | bintrees (Red-Black Tree) + LinkedList + HashMap | Architect |
| **Scheduling** | node-cron | Architect |
| **Process Model** | **Single process** (custom server.ts: HTTP + WS + Matching Engine) | Architect |
| **Dev DB** | Docker Compose (PostgreSQL only) | Architect |

---

## 6. Unified Data Model Additions

The Architect's schema is the foundation. The following tables must be **added** to support features from other agents:

### 6.1 KYC Verifications Table

```sql
CREATE TYPE kyc_level AS ENUM ('level_0', 'level_1', 'level_2');
CREATE TYPE kyc_status AS ENUM ('not_started', 'pending', 'approved', 'rejected');

-- Add kyc fields to users table
ALTER TABLE users ADD COLUMN kyc_level kyc_level NOT NULL DEFAULT 'level_0';
ALTER TABLE users ADD COLUMN kyc_status kyc_status NOT NULL DEFAULT 'not_started';

-- KYC submissions (audit trail)
CREATE TABLE kyc_verifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  level       kyc_level NOT NULL,
  status      kyc_status NOT NULL DEFAULT 'pending',

  -- Simulated data
  phone_number    VARCHAR(20),        -- Level 1
  document_type   VARCHAR(20),        -- Level 2: 'id_card', 'passport', 'driver_license'
  document_front  TEXT,               -- File path/URL (simulated)
  document_back   TEXT,               -- File path/URL (simulated)
  selfie          TEXT,               -- File path/URL (simulated)

  -- Review
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  rejection_reason TEXT,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 6.2 Deposits & Withdrawals Tables

```sql
CREATE TYPE deposit_status AS ENUM ('pending', 'confirming', 'completed', 'failed');
CREATE TYPE withdrawal_status AS ENUM (
  'pending_approval', 'processing', 'confirming', 'completed', 'failed', 'rejected', 'cancelled'
);

CREATE TABLE deposits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  currency    VARCHAR(10) NOT NULL,
  amount      NUMERIC(30,18) NOT NULL,
  status      deposit_status NOT NULL DEFAULT 'completed',  -- Simulated: auto-complete
  tx_hash     VARCHAR(128),      -- Simulated
  network     VARCHAR(20),       -- e.g., 'ERC20', 'TRC20'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE withdrawals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  currency    VARCHAR(10) NOT NULL,
  amount      NUMERIC(30,18) NOT NULL,
  fee         NUMERIC(30,18) NOT NULL DEFAULT 0,
  address     VARCHAR(128) NOT NULL,
  network     VARCHAR(20),
  status      withdrawal_status NOT NULL DEFAULT 'pending_approval',
  tx_hash     VARCHAR(128),       -- Simulated
  reviewed_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### 6.3 Audit Logs Table

```sql
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES users(id),
  action      VARCHAR(100) NOT NULL,     -- e.g., 'user.freeze', 'pair.create', 'kyc.approve'
  target_type VARCHAR(50),               -- 'user', 'trading_pair', 'order', etc.
  target_id   UUID,
  details     JSONB,                     -- Action-specific details
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_admin ON audit_logs(admin_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_type, target_id);
```

### 6.4 Login History Table

```sql
CREATE TABLE login_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  ip_address  INET NOT NULL,
  user_agent  TEXT,
  success     BOOLEAN NOT NULL,
  failure_reason VARCHAR(50),     -- 'wrong_password', 'locked', '2fa_failed'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_login_history_user ON login_history(user_id, created_at DESC);
```

---

## 7. Unified API Surface

The Architect's API is the base. Add these endpoints:

### Additional Auth Endpoints
```
POST /api/v1/auth/verify-email          # { token } or { code }
POST /api/v1/auth/forgot-password       # { email }
POST /api/v1/auth/reset-password        # { token, newPassword }
GET  /api/v1/auth/sessions              # List active sessions
DELETE /api/v1/auth/sessions/:id        # Revoke session
```

### KYC Endpoints
```
GET  /api/v1/account/kyc                # Current KYC status
POST /api/v1/account/kyc/level1         # Submit phone verification
POST /api/v1/account/kyc/level2         # Submit ID documents
GET  /api/v1/admin/kyc/queue            # Pending reviews
PATCH /api/v1/admin/kyc/:id             # Approve/reject
```

### Additional Admin Endpoints
```
GET  /api/v1/admin/audit-logs           # Audit log with filters
GET  /api/v1/admin/deposits             # All deposits
GET  /api/v1/admin/withdrawals          # All withdrawals + review queue
PATCH /api/v1/admin/withdrawals/:id     # Approve/reject withdrawal
```

### Additional Wallet Endpoints
```
GET  /api/v1/wallet/deposits            # User's deposit history
GET  /api/v1/wallet/withdrawals         # User's withdrawal history
```

---

## 8. Unified Phase Plan

Adopted from Architect (6 weeks) with adjustments from synthesis:

### Phase 1: Foundation (Week 1)
- Project setup (Next.js, Drizzle, PostgreSQL, TypeScript)
- **Full** database schema (including new tables from §6)
- User auth: register, login, JWT (access + refresh)
- Email verification (simulated)
- Wallet system: balance, simulated deposit
- Basic UI layout: dark theme, navigation, landing page
- **Tests:** Unit tests for auth, wallet math

### Phase 2: Trading Core (Week 2)
- Matching engine: limit orders (price-time priority)
- Order placement + cancellation API
- Order book data structure (in-memory)
- Trade execution + settlement
- Trading pair seed data
- Basic trading page layout (chart placeholder + order book + order form)
- **Tests:** Matching engine unit tests (TC-ME-001 through TC-ME-020)

### Phase 3: Real-Time (Week 3)
- Matching engine: market orders
- WebSocket server (ws library)
- Channels: depth, trade, ticker, orders, wallet
- Frontend: live order book component
- Frontend: recent trades component
- Frontend: order form connected to API
- Frontend: open orders / order history tables
- **Tests:** WebSocket integration tests, order management tests

### Phase 4: Charts & Market Data (Week 4)
- Candle aggregation engine (OHLCV)
- Kline WebSocket channel
- Historical candle REST API
- TradingView Lightweight Charts integration
- Chart header (time intervals, indicators)
- Trading pair selector modal
- **Tests:** K-line tests (TC-KL-001-008)

### Phase 5: Advanced Orders & Risk (Week 5)
- Stop-loss + stop-limit orders
- OCO orders
- IOC / FOK time-in-force
- Risk controls: price protection, circuit breaker
- Self-trade prevention
- Order validation (full validation suite)
- **Tests:** Advanced order tests, risk control tests

### Phase 6: Polish & Admin (Week 6)
- 2FA (TOTP)
- KYC flow (simulated L0/L1/L2)
- Simulated withdrawal (with status flow)
- Admin dashboard (stats)
- Admin: pair management, fee tiers, user management
- Admin: KYC review queue
- Rate limiting
- Seed data with realistic market simulation
- Light theme
- Password reset
- **Tests:** E2E flows, admin tests, security tests

---

## 9. Open Questions

These require stakeholder / product owner input:

### 9.1 Scope Decisions

1. **Should the landing page be a full marketing page or a minimal redirect-to-trade page?**
   - Designer includes market overview, CTA, feature highlights
   - This could be a significant effort for an educational project

2. **Should we implement the VIP fee tier system in MVP?**
   - Designer shows 4 VIP tiers, Architect has fee_tiers table
   - Simpler option: flat fees per pair only, VIP tiers deferred

3. **What is the minimum KYC level required for trading?**
   - Designer says Level 0 = no trading
   - This means new users MUST go through KYC before their first trade
   - Alternative: allow trading immediately, KYC only for withdrawal limits

4. **Should admin accounts be seeded or created via a setup wizard?**
   - Architect: seed via `.env` + `db/seed.ts`
   - Alternative: first registered user becomes admin (OpenTrade pattern)

### 9.2 Technical Decisions

5. **Empty K-line period behavior: gap or carry-forward?**
   - QA raises this explicitly (AC-KL-002)
   - Option A: No candle record (gap in data)
   - Option B: Carry-forward with O=H=L=C=prev.close, V=0
   - Need decision for both API and chart display

6. **WebSocket reconnection: snapshot-based or message replay?**
   - Architect uses snapshot on reconnect
   - QA tests message replay (seq-based recovery)
   - Snapshot is simpler; replay requires message buffer

7. **Post-only orders: in scope or not?**
   - QA tests for it (TC-OM-012)
   - Neither Market nor Architect explicitly includes it
   - Decision needed

8. **Market order slippage protection: should we implement it?**
   - QA tests for it (OT-E8)
   - Architect doesn't mention it
   - Important safety feature for users

---

*End of Synthesis Round 1*
