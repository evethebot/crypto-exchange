# Crypto Exchange (CEX) — Technical Architecture

> **Version:** 1.0.0  
> **Author:** Architecture Team  
> **Date:** 2026-02-21  
> **Status:** Design Phase

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Tech Stack Evaluation](#2-tech-stack-evaluation)
3. [System Architecture Overview](#3-system-architecture-overview)
4. [Data Model](#4-data-model)
5. [Matching Engine Design](#5-matching-engine-design)
6. [API Design (REST)](#6-api-design-rest)
7. [WebSocket Channel Design](#7-websocket-channel-design)
8. [Authentication & Security](#8-authentication--security)
9. [Wallet System](#9-wallet-system)
10. [Risk Control](#10-risk-control)
11. [Admin Backend](#11-admin-backend)
12. [Performance Considerations](#12-performance-considerations)
13. [Deployment Architecture](#13-deployment-architecture)
14. [Development Phases](#14-development-phases)

---

## 1. Executive Summary

This document defines the architecture for a **centralized cryptocurrency exchange (CEX)** focused on a high-performance trading system. The exchange supports spot trading with multiple order types, real-time market data via WebSocket, a simulated wallet system, and an admin dashboard.

**Key Design Principles:**
- **Correctness first** — The matching engine must be deterministic and auditable
- **In-memory hot path** — Order book lives in memory; PostgreSQL is the journal/source of truth
- **Event-driven** — Trades, order updates, and market data flow as events through a pub/sub bus
- **Monorepo, modular boundaries** — Single deployable for simplicity, but with clear module separation for future extraction

---

## 2. Tech Stack Evaluation

### 2.1 Frontend

| Choice | Technology | Rationale |
|--------|-----------|-----------|
| **Framework** | Next.js 14+ (App Router) | SSR for SEO pages, CSR for trading UI, API routes for lightweight endpoints |
| **UI Library** | React 18+ | De facto standard, massive ecosystem |
| **Charting** | TradingView `lightweight-charts` v4 | Free, performant, industry-standard candlestick rendering |
| **State Management** | Zustand | Lightweight, perfect for real-time order book / ticker state |
| **Styling** | Tailwind CSS + shadcn/ui | Rapid development, consistent dark-mode trading UI |
| **WebSocket Client** | Native WebSocket + reconnecting-websocket | Simple, no heavy abstraction needed |
| **Form Handling** | React Hook Form + Zod | Type-safe validation shared with backend |

### 2.2 Backend

**Decision: Hybrid Architecture (Next.js API Routes + Standalone WS Server)**

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Pure Next.js API Routes | Single deployment, shared types | No long-lived processes, no native WS, serverless cold starts | ❌ Not suitable for matching engine |
| Separate Node.js service | Full control, WS native, long-lived matching engine | Two deployments, type drift | ❌ Overkill for demo |
| **Hybrid** | Next.js for REST + SSR; co-located Node.js process for WS + matching engine | Slightly complex startup | ✅ **Selected** |

**Architecture:**
```
┌─────────────────────────────────────────────┐
│  Single Process (Node.js)                   │
│                                             │
│  ┌──────────────┐  ┌────────────────────┐   │
│  │  Next.js     │  │  Exchange Core     │   │
│  │  (HTTP/REST) │  │  (Matching Engine  │   │
│  │              │  │   + WS Server)     │   │
│  └──────┬───────┘  └────────┬───────────┘   │
│         │                   │               │
│         └───────┬───────────┘               │
│                 │                           │
│         ┌───────▼───────┐                   │
│         │  Event Bus    │                   │
│         │  (EventEmitter│                   │
│         │   / in-proc)  │                   │
│         └───────────────┘                   │
└─────────────────────────────────────────────┘
```

The Next.js custom server (`server.ts`) boots both the Next.js HTTP handler and the WebSocket server on the same port (via `upgrade` event). The matching engine runs in-process.

| Choice | Technology | Rationale |
|--------|-----------|-----------|
| **Runtime** | Node.js 20+ | TypeScript native, single language across stack |
| **HTTP Framework** | Next.js API Routes (App Router) | REST endpoints, SSR pages |
| **WebSocket** | `ws` library | Lightweight, production-grade, works with Node HTTP server |
| **ORM** | Drizzle ORM | Type-safe, SQL-close, great migration story |
| **Validation** | Zod | Shared schemas between frontend and backend |
| **Auth** | `jose` (JWT) + `bcrypt` | Standards-based, no bloated auth libraries |
| **Task Scheduling** | `node-cron` | Candle aggregation, cleanup tasks |

### 2.3 Database

**Decision: PostgreSQL (primary) + In-Memory (hot path)**

| Concern | Storage | Rationale |
|---------|---------|-----------|
| Users, wallets, trading pairs, fees | PostgreSQL | ACID, relational integrity |
| Order history (filled/cancelled) | PostgreSQL | Auditable, queryable |
| Trade history | PostgreSQL | Source of truth, paginated queries |
| Candle (OHLCV) data | PostgreSQL | Pre-aggregated, time-series queries |
| **Active order book** | **In-memory (sorted maps)** | Microsecond matching, no DB round-trip on hot path |
| **Active orders index** | **In-memory (HashMap)** | O(1) lookup by order ID |
| Session / rate limit counters | In-memory (Map) | Ephemeral, no persistence needed |

**Why not Redis?**
- For a single-process demo, in-memory data structures are faster (no serialization, no network hop)
- Redis would add operational complexity with no benefit at this scale
- If we scale to multi-process, Redis becomes the right choice for shared order book state

### 2.4 Monorepo Structure

```
crypto-exchange/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # Login, register pages
│   │   ├── (trading)/          # Trading UI pages
│   │   ├── (admin)/            # Admin dashboard pages
│   │   ├── api/                # REST API routes
│   │   │   ├── v1/
│   │   │   │   ├── auth/
│   │   │   │   ├── orders/
│   │   │   │   ├── trades/
│   │   │   │   ├── wallet/
│   │   │   │   ├── market/
│   │   │   │   └── admin/
│   │   │   └── health/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/             # React components
│   │   ├── trading/            # OrderBook, TradeHistory, OrderForm
│   │   ├── chart/              # TradingView chart wrapper
│   │   ├── wallet/             # Balance, Deposit, Withdraw
│   │   ├── admin/              # Admin components
│   │   └── ui/                 # shadcn/ui primitives
│   │
│   ├── core/                   # Exchange core (backend-only)
│   │   ├── matching/           # Matching engine
│   │   │   ├── engine.ts       # Main MatchingEngine class
│   │   │   ├── order-book.ts   # OrderBook (buy/sell sides)
│   │   │   ├── order-queue.ts  # Price-level queue (FIFO)
│   │   │   └── types.ts        # Order, Trade types
│   │   ├── ws/                 # WebSocket server
│   │   │   ├── server.ts       # WS server setup
│   │   │   ├── channels.ts     # Channel subscription manager
│   │   │   └── handlers.ts     # Message handlers
│   │   ├── risk/               # Risk control
│   │   │   ├── validator.ts    # Order validation
│   │   │   └── circuit-breaker.ts
│   │   ├── candle/             # OHLCV aggregation
│   │   │   └── aggregator.ts
│   │   ├── wallet/             # Wallet service
│   │   │   └── service.ts
│   │   └── events.ts           # Event bus (typed EventEmitter)
│   │
│   ├── db/                     # Database layer
│   │   ├── schema/             # Drizzle schema definitions
│   │   │   ├── users.ts
│   │   │   ├── wallets.ts
│   │   │   ├── trading-pairs.ts
│   │   │   ├── orders.ts
│   │   │   ├── trades.ts
│   │   │   └── candles.ts
│   │   ├── migrations/         # SQL migrations
│   │   ├── index.ts            # DB connection
│   │   └── seed.ts             # Seed data
│   │
│   ├── lib/                    # Shared utilities
│   │   ├── auth.ts             # JWT helpers
│   │   ├── decimal.ts          # Decimal arithmetic (big.js)
│   │   ├── validation.ts       # Zod schemas
│   │   ├── errors.ts           # Error types
│   │   └── constants.ts
│   │
│   └── types/                  # Shared TypeScript types
│       ├── api.ts
│       ├── ws.ts
│       └── domain.ts
│
├── server.ts                   # Custom Next.js server (HTTP + WS)
├── drizzle.config.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## 3. System Architecture Overview

### 3.1 Request Flow

```
                    ┌──────────────────────────────────────────────┐
                    │                   Client                     │
                    │  (Next.js Frontend / TradingView Charts)     │
                    └────────┬──────────────────┬──────────────────┘
                             │ HTTPS            │ WSS
                             ▼                  ▼
                    ┌────────────────┐ ┌─────────────────┐
                    │  REST API      │ │  WebSocket       │
                    │  (Next.js API  │ │  Server (ws)     │
                    │   Routes)      │ │                  │
                    └───────┬────────┘ └────────┬─────────┘
                            │                   │
                    ┌───────▼───────────────────▼──────────┐
                    │            Event Bus                  │
                    │   (TypedEventEmitter, in-process)     │
                    └──┬────────┬────────┬────────┬────────┘
                       │        │        │        │
              ┌────────▼──┐ ┌──▼─────┐ ┌▼──────┐ ┌▼────────┐
              │ Matching   │ │ Wallet │ │ Risk  │ │ Candle  │
              │ Engine     │ │Service │ │Control│ │Aggregat.│
              └────────┬───┘ └──┬─────┘ └───────┘ └────┬────┘
                       │        │                       │
                    ┌──▼────────▼───────────────────────▼──┐
                    │          PostgreSQL                    │
                    │  (Orders, Trades, Wallets, Candles)    │
                    └──────────────────────────────────────┘
```

### 3.2 Order Lifecycle

```
Client submits order (REST POST /api/v1/orders)
  │
  ▼
┌─────────────────┐
│ 1. Validate     │ ← Zod schema + auth check
│    (API Layer)  │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 2. Risk Check   │ ← Price protection, order limits, balance check
│    (Risk Module) │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 3. Freeze Funds │ ← Deduct available balance, add to frozen
│    (Wallet Svc)  │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 4. Insert Order │ ← Write to DB (status: NEW)
│    (DB Layer)    │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 5. Match        │ ← Price-time priority matching
│   (Engine)      │ → Produces 0..N trades
└────────┬────────┘
         ▼
┌─────────────────┐
│ 6. Settle       │ ← Update wallets, order statuses, write trades
│   (Settlement)   │
└────────┬────────┘
         ▼
┌─────────────────┐
│ 7. Publish      │ ← Events → WS channels (trade, depth, ticker)
│   (Event Bus)    │
└─────────────────┘
```

### 3.3 Event Types

```typescript
type ExchangeEvents = {
  // Matching engine outputs
  'trade.executed': { trade: Trade; makerOrder: Order; takerOrder: Order };
  'order.placed': { order: Order };
  'order.cancelled': { order: Order };
  'order.updated': { order: Order };  // partial fill

  // Market data (derived)
  'depth.updated': { symbol: string; side: 'buy' | 'sell' };
  'ticker.updated': { symbol: string; ticker: Ticker };
  'candle.updated': { symbol: string; interval: CandleInterval; candle: Candle };

  // System
  'circuit_breaker.triggered': { symbol: string; reason: string };
};
```

---

## 4. Data Model

### 4.1 Entity Relationship Diagram

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  users   │──1:N──│   wallets    │       │trading_pairs │
└──────────┘       └──────────────┘       └──────┬───────┘
     │                    │                      │
     │               (balance)                   │
     │                    │                      │
     │1:N           ┌─────▼──────┐               │
     └──────────────│   orders   │───N:1─────────┘
                    └─────┬──────┘
                          │
                     (maker/taker)
                          │
                    ┌─────▼──────┐
                    │   trades   │
                    └─────┬──────┘
                          │
                     (aggregated)
                          │
                    ┌─────▼──────┐
                    │  candles   │
                    └────────────┘
```

### 4.2 Complete SQL Schema

```sql
-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- ENUMS
-- =====================================================
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'pending_verification');

CREATE TYPE order_side AS ENUM ('buy', 'sell');
CREATE TYPE order_type AS ENUM ('limit', 'market', 'stop_loss', 'stop_limit', 'oco');
CREATE TYPE order_status AS ENUM (
  'new',              -- Accepted, in order book
  'partially_filled', -- Some quantity executed
  'filled',           -- Fully executed
  'cancelled',        -- User cancelled
  'expired',          -- TTL expired
  'rejected'          -- Failed risk check
);
CREATE TYPE order_time_in_force AS ENUM (
  'GTC',  -- Good Till Cancelled (default)
  'IOC',  -- Immediate Or Cancel
  'FOK'   -- Fill Or Kill
);

CREATE TYPE trade_role AS ENUM ('maker', 'taker');

CREATE TYPE wallet_tx_type AS ENUM (
  'deposit',
  'withdrawal',
  'trade_freeze',
  'trade_unfreeze',
  'trade_debit',
  'trade_credit',
  'fee'
);

CREATE TYPE candle_interval AS ENUM (
  '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'
);

CREATE TYPE pair_status AS ENUM ('active', 'suspended', 'delisted');

-- =====================================================
-- 1. USERS
-- =====================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nickname      VARCHAR(50),
  role          user_role NOT NULL DEFAULT 'user',
  status        user_status NOT NULL DEFAULT 'active',

  -- 2FA
  totp_secret   VARCHAR(64),
  totp_enabled  BOOLEAN NOT NULL DEFAULT FALSE,

  -- API keys (for programmatic access)
  api_key       VARCHAR(64) UNIQUE,
  api_secret    VARCHAR(128),

  -- Metadata
  last_login_at TIMESTAMPTZ,
  last_login_ip INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_api_key ON users(api_key) WHERE api_key IS NOT NULL;

-- =====================================================
-- 2. TRADING PAIRS
-- =====================================================
CREATE TABLE trading_pairs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol          VARCHAR(20) NOT NULL UNIQUE,    -- e.g., 'BTC_USDT'
  base_currency   VARCHAR(10) NOT NULL,            -- e.g., 'BTC'
  quote_currency  VARCHAR(10) NOT NULL,            -- e.g., 'USDT'
  status          pair_status NOT NULL DEFAULT 'active',

  -- Precision
  price_precision   SMALLINT NOT NULL DEFAULT 2,   -- Decimal places for price
  amount_precision  SMALLINT NOT NULL DEFAULT 6,   -- Decimal places for amount
  min_amount        NUMERIC(30,18) NOT NULL DEFAULT 0.000001,
  max_amount        NUMERIC(30,18),                -- NULL = no limit
  min_total         NUMERIC(30,18) NOT NULL DEFAULT 1.0,  -- Min order value in quote

  -- Fees (in basis points, 1 bp = 0.01%)
  maker_fee_bps     SMALLINT NOT NULL DEFAULT 10,  -- 0.10%
  taker_fee_bps     SMALLINT NOT NULL DEFAULT 15,  -- 0.15%

  -- Price protection (circuit breaker)
  max_price_deviation_pct  NUMERIC(5,2) DEFAULT 10.00,  -- Max 10% from last price

  -- Display
  sort_order        INTEGER NOT NULL DEFAULT 0,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(base_currency, quote_currency)
);

CREATE INDEX idx_trading_pairs_symbol ON trading_pairs(symbol);
CREATE INDEX idx_trading_pairs_status ON trading_pairs(status);

-- =====================================================
-- 3. WALLETS (per user per currency)
-- =====================================================
CREATE TABLE wallets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  currency    VARCHAR(10) NOT NULL,           -- e.g., 'BTC', 'USDT'

  available   NUMERIC(30,18) NOT NULL DEFAULT 0  CHECK (available >= 0),
  frozen      NUMERIC(30,18) NOT NULL DEFAULT 0  CHECK (frozen >= 0),

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, currency)
);

-- Total balance = available + frozen
-- When placing an order: available -= amount, frozen += amount
-- When order fills:      frozen -= amount (already debited)
-- When order cancels:    frozen -= amount, available += amount

CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_wallets_user_currency ON wallets(user_id, currency);

-- =====================================================
-- 4. WALLET TRANSACTIONS (audit log)
-- =====================================================
CREATE TABLE wallet_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id   UUID NOT NULL REFERENCES wallets(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  tx_type     wallet_tx_type NOT NULL,
  amount      NUMERIC(30,18) NOT NULL,       -- Always positive
  balance_after NUMERIC(30,18) NOT NULL,      -- Snapshot after tx
  frozen_after  NUMERIC(30,18) NOT NULL,      -- Snapshot after tx

  -- Reference
  ref_type    VARCHAR(20),                    -- 'order', 'trade', 'deposit', 'withdrawal'
  ref_id      UUID,                           -- order_id or trade_id

  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_user ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_tx_created ON wallet_transactions(created_at DESC);

-- =====================================================
-- 5. ORDERS
-- =====================================================
CREATE TABLE orders (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id),
  pair_id         UUID NOT NULL REFERENCES trading_pairs(id),
  symbol          VARCHAR(20) NOT NULL,           -- Denormalized for fast query

  -- Order params
  side            order_side NOT NULL,
  type            order_type NOT NULL,
  time_in_force   order_time_in_force NOT NULL DEFAULT 'GTC',
  price           NUMERIC(30,18),                 -- NULL for market orders
  stop_price      NUMERIC(30,18),                 -- For stop-loss / OCO
  amount          NUMERIC(30,18) NOT NULL,         -- Original quantity
  filled_amount   NUMERIC(30,18) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(30,18) NOT NULL,        -- = amount - filled_amount

  -- Cost tracking
  total_cost      NUMERIC(30,18) NOT NULL DEFAULT 0,  -- Cumulative quote spent/received
  avg_price       NUMERIC(30,18),                      -- Weighted average fill price
  fee_total       NUMERIC(30,18) NOT NULL DEFAULT 0,

  status          order_status NOT NULL DEFAULT 'new',

  -- OCO link
  oco_pair_id     UUID REFERENCES orders(id),     -- Links two OCO orders

  -- Timestamps
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  filled_at       TIMESTAMPTZ,
  cancelled_at    TIMESTAMPTZ,

  -- Sequence number for deterministic ordering (auto-increment)
  seq             BIGSERIAL NOT NULL
);

CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_pair_status ON orders(pair_id, status);
CREATE INDEX idx_orders_symbol_side_status ON orders(symbol, side, status);
CREATE INDEX idx_orders_user_symbol ON orders(user_id, symbol);
CREATE INDEX idx_orders_created ON orders(created_at DESC);
CREATE INDEX idx_orders_seq ON orders(seq);
CREATE INDEX idx_orders_oco ON orders(oco_pair_id) WHERE oco_pair_id IS NOT NULL;

-- =====================================================
-- 6. TRADES (executions)
-- =====================================================
CREATE TABLE trades (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id         UUID NOT NULL REFERENCES trading_pairs(id),
  symbol          VARCHAR(20) NOT NULL,

  -- Participants
  maker_order_id  UUID NOT NULL REFERENCES orders(id),
  taker_order_id  UUID NOT NULL REFERENCES orders(id),
  maker_user_id   UUID NOT NULL REFERENCES users(id),
  taker_user_id   UUID NOT NULL REFERENCES users(id),

  -- Execution
  price           NUMERIC(30,18) NOT NULL,        -- Execution price
  amount          NUMERIC(30,18) NOT NULL,         -- Executed quantity (base)
  total           NUMERIC(30,18) NOT NULL,         -- = price * amount (quote)
  side            order_side NOT NULL,             -- Taker's side

  -- Fees
  maker_fee       NUMERIC(30,18) NOT NULL DEFAULT 0,
  taker_fee       NUMERIC(30,18) NOT NULL DEFAULT 0,
  maker_fee_currency VARCHAR(10) NOT NULL,
  taker_fee_currency VARCHAR(10) NOT NULL,

  -- Sequence
  seq             BIGSERIAL NOT NULL,
  executed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trades_pair ON trades(pair_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_symbol_time ON trades(symbol, executed_at DESC);
CREATE INDEX idx_trades_maker ON trades(maker_user_id, executed_at DESC);
CREATE INDEX idx_trades_taker ON trades(taker_user_id, executed_at DESC);
CREATE INDEX idx_trades_seq ON trades(seq);

-- =====================================================
-- 7. CANDLES (OHLCV, pre-aggregated)
-- =====================================================
CREATE TABLE candles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pair_id         UUID NOT NULL REFERENCES trading_pairs(id),
  symbol          VARCHAR(20) NOT NULL,
  interval        candle_interval NOT NULL,

  open_time       TIMESTAMPTZ NOT NULL,           -- Candle start time
  close_time      TIMESTAMPTZ NOT NULL,           -- Candle end time
  open            NUMERIC(30,18) NOT NULL,
  high            NUMERIC(30,18) NOT NULL,
  low             NUMERIC(30,18) NOT NULL,
  close           NUMERIC(30,18) NOT NULL,
  volume          NUMERIC(30,18) NOT NULL DEFAULT 0,  -- Base volume
  quote_volume    NUMERIC(30,18) NOT NULL DEFAULT 0,  -- Quote volume
  trade_count     INTEGER NOT NULL DEFAULT 0,

  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(symbol, interval, open_time)
);

CREATE INDEX idx_candles_symbol_interval_time ON candles(symbol, interval, open_time DESC);
CREATE INDEX idx_candles_pair_interval ON candles(pair_id, interval);

-- =====================================================
-- 8. FEE TIERS (optional, for volume-based fees)
-- =====================================================
CREATE TABLE fee_tiers (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              VARCHAR(50) NOT NULL,
  min_volume_30d    NUMERIC(30,18) NOT NULL DEFAULT 0,  -- 30-day volume threshold
  maker_fee_bps     SMALLINT NOT NULL,
  taker_fee_bps     SMALLINT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 9. SYSTEM CONFIG (key-value for runtime settings)
-- =====================================================
CREATE TABLE system_config (
  key         VARCHAR(100) PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES users(id)
);

-- Default settings
INSERT INTO system_config (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('registration_enabled', 'true'),
  ('default_maker_fee_bps', '10'),
  ('default_taker_fee_bps', '15'),
  ('max_open_orders_per_user', '200');

-- =====================================================
-- TRIGGERS: auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_trading_pairs_updated_at
  BEFORE UPDATE ON trading_pairs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.3 Drizzle Schema (TypeScript)

The Drizzle schema mirrors the SQL above. Each table defined in `src/db/schema/*.ts` exports typed insert/select types. Example for orders:

```typescript
// src/db/schema/orders.ts
import { pgTable, uuid, varchar, numeric, timestamp, bigserial, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { tradingPairs } from './trading-pairs';

export const orderSideEnum = pgEnum('order_side', ['buy', 'sell']);
export const orderTypeEnum = pgEnum('order_type', ['limit', 'market', 'stop_loss', 'stop_limit', 'oco']);
export const orderStatusEnum = pgEnum('order_status', [
  'new', 'partially_filled', 'filled', 'cancelled', 'expired', 'rejected'
]);

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  pairId: uuid('pair_id').notNull().references(() => tradingPairs.id),
  symbol: varchar('symbol', { length: 20 }).notNull(),
  side: orderSideEnum('side').notNull(),
  type: orderTypeEnum('type').notNull(),
  price: numeric('price', { precision: 30, scale: 18 }),
  amount: numeric('amount', { precision: 30, scale: 18 }).notNull(),
  filledAmount: numeric('filled_amount', { precision: 30, scale: 18 }).notNull().default('0'),
  remainingAmount: numeric('remaining_amount', { precision: 30, scale: 18 }).notNull(),
  status: orderStatusEnum('status').notNull().default('new'),
  seq: bigserial('seq', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

---

## 5. Matching Engine Design

### 5.1 Core Data Structures

The matching engine operates entirely in-memory for the hot path. PostgreSQL is only written to after matching completes (journal).

```typescript
// Price-level queue: all orders at the same price, FIFO
class PriceLevelQueue {
  price: Decimal;           // The price level
  orders: LinkedList<Order>; // Doubly-linked list for O(1) cancel
  totalAmount: Decimal;      // Sum of remaining amounts at this level
}

// Order book side (buy or sell)
class OrderBookSide {
  levels: SortedMap<Decimal, PriceLevelQueue>;
  // Buy side:  sorted DESCENDING (best bid = highest price first)
  // Sell side: sorted ASCENDING  (best ask = lowest price first)
}

// Full order book for one trading pair
class OrderBook {
  symbol: string;
  bids: OrderBookSide;  // Buy orders
  asks: OrderBookSide;  // Sell orders
  orderIndex: Map<string, Order>;  // orderId → Order (O(1) lookup)
  lastPrice: Decimal;
  lastTradeTime: Date;
}

// The engine manages all order books
class MatchingEngine {
  books: Map<string, OrderBook>;  // symbol → OrderBook

  placeOrder(order: Order): MatchResult;
  cancelOrder(orderId: string): CancelResult;
  getOrderBook(symbol: string, depth?: number): OrderBookSnapshot;
}
```

### 5.2 Matching Algorithm

**Price-Time Priority (FIFO):**

1. **Price Priority:** Orders with better prices are matched first
   - Buy orders: higher price = better (willing to pay more)
   - Sell orders: lower price = better (willing to accept less)

2. **Time Priority:** At the same price level, earlier orders match first (FIFO)

```
Algorithm: MATCH(incoming_order)
───────────────────────────────────

Input:  incoming order (taker)
Output: list of trades, updated order book

1. Determine the opposite side:
   if incoming.side == BUY  → opposite = asks (sell side)
   if incoming.side == SELL → opposite = bids (buy side)

2. While incoming.remainingAmount > 0 AND opposite has levels:
   a. best_level = opposite.first()   // Best price level

   b. Check if price matches:
      - LIMIT BUY:  match if best_level.price <= incoming.price
      - LIMIT SELL: match if best_level.price >= incoming.price
      - MARKET:     always matches (any price)

   c. If no match → BREAK (no more matchable orders)

   d. While incoming.remainingAmount > 0 AND best_level has orders:
      i.   resting = best_level.orders.first()   // Oldest order (maker)
      ii.  exec_price = resting.price             // Execute at maker's price
      iii. exec_amount = MIN(incoming.remaining, resting.remaining)

      iv.  Create Trade {
             price: exec_price,
             amount: exec_amount,
             total: exec_price * exec_amount,
             maker: resting,
             taker: incoming,
             makerFee: exec_amount * pair.makerFeeBps / 10000,
             takerFee: exec_amount * pair.takerFeeBps / 10000,
           }

      v.   Update resting:
           resting.remainingAmount -= exec_amount
           resting.filledAmount += exec_amount
           if resting.remainingAmount == 0:
             resting.status = FILLED
             Remove from order book
           else:
             resting.status = PARTIALLY_FILLED

      vi.  Update incoming similarly

   e. If best_level is empty → remove level from opposite side

3. Post-match:
   if incoming.remainingAmount > 0:
     if incoming.type == LIMIT:
       Add to own side of order book (becomes maker)
       incoming.status = NEW (or PARTIALLY_FILLED if some filled)
     if incoming.type == MARKET:
       Cancel remaining (market orders don't rest)
       incoming.status = CANCELLED (partially)
     if incoming.timeInForce == IOC:
       Cancel remaining
     if incoming.timeInForce == FOK AND any remaining:
       Rollback ALL trades, cancel order

4. Return { trades: [...], order: incoming }
```

### 5.3 Time-In-Force Handling

| TIF | Behavior |
|-----|----------|
| **GTC** (Good Till Cancelled) | Rests in order book until filled or manually cancelled |
| **IOC** (Immediate Or Cancel) | Fill what's available immediately, cancel the rest |
| **FOK** (Fill Or Kill) | Must fill entirely in one match cycle, or cancel completely |

### 5.4 Stop Orders & OCO

**Stop-Loss Order:**
- Not placed into the order book immediately
- Stored in a separate `stopOrders: Map<string, StopOrder[]>` per symbol
- On each trade execution, check if any stop orders are triggered:
  ```
  For SELL stop-loss: trigger when lastPrice <= stopPrice
  For BUY stop-loss:  trigger when lastPrice >= stopPrice
  ```
- When triggered, convert to a market order and submit to matching engine

**Stop-Limit Order:**
- Same trigger mechanism as stop-loss
- When triggered, convert to a limit order at the specified limit price

**OCO (One-Cancels-Other):**
- Consists of two linked orders: a limit order + a stop-loss order
- When either fills or triggers, the other is automatically cancelled
- Implementation: `oco_pair_id` links the two orders in the database

```typescript
class StopOrderManager {
  // symbol → sorted list of stop orders
  private buyStops: Map<string, SortedArray<StopOrder>>;   // sorted by stopPrice ASC
  private sellStops: Map<string, SortedArray<StopOrder>>;  // sorted by stopPrice DESC

  addStopOrder(order: StopOrder): void;
  removeStopOrder(orderId: string): void;

  // Called after every trade
  checkTriggers(symbol: string, lastPrice: Decimal): StopOrder[] {
    const triggered: StopOrder[] = [];

    // Check sell stops (trigger when price drops to/below stopPrice)
    for (const stop of this.sellStops.get(symbol)) {
      if (lastPrice.lte(stop.stopPrice)) {
        triggered.push(stop);
      } else break; // Sorted DESC, so remaining won't trigger
    }

    // Check buy stops (trigger when price rises to/above stopPrice)
    for (const stop of this.buyStops.get(symbol)) {
      if (lastPrice.gte(stop.stopPrice)) {
        triggered.push(stop);
      } else break;
    }

    return triggered;
  }
}
```

### 5.5 Settlement (Post-Match)

After matching produces trades, settlement occurs:

```typescript
async function settle(trades: Trade[], makerOrder: Order, takerOrder: Order): Promise<void> {
  await db.transaction(async (tx) => {
    for (const trade of trades) {
      // 1. Write trade to DB
      await tx.insert(tradesTable).values(trade);

      // 2. Update maker order
      await tx.update(ordersTable)
        .set({
          filledAmount: makerOrder.filledAmount,
          remainingAmount: makerOrder.remainingAmount,
          status: makerOrder.status,
          avgPrice: calculateAvgPrice(makerOrder),
        })
        .where(eq(ordersTable.id, makerOrder.id));

      // 3. Update taker order
      // (similar to above)

      // 4. Wallet transfers
      if (trade.side === 'buy') {
        // Taker (buyer):  frozen quote -= trade.total, +base to available
        // Maker (seller): frozen base -= trade.amount, +quote to available
        await debitFrozen(tx, taker.userId, pair.quoteCurrency, trade.total);
        await creditAvailable(tx, taker.userId, pair.baseCurrency, trade.amount - trade.takerFee);
        await debitFrozen(tx, maker.userId, pair.baseCurrency, trade.amount);
        await creditAvailable(tx, maker.userId, pair.quoteCurrency, trade.total - trade.makerFee);
      }

      // 5. Write wallet transaction logs
      // ...
    }
  });
}
```

### 5.6 Decimal Arithmetic

**Critical: Never use floating-point for financial calculations.**

```typescript
// Use big.js for all price/amount calculations
import Big from 'big.js';

// Configure for financial math
Big.DP = 18;  // 18 decimal places
Big.RM = Big.roundDown;  // Round towards zero (conservative)

type Decimal = Big;

// All monetary values stored as NUMERIC(30,18) in PostgreSQL
// All calculations use Big.js
// Only convert to string for display/API responses
```

---

## 6. API Design (REST)

### 6.1 Base URL & Conventions

```
Base URL: /api/v1
Content-Type: application/json
Auth: Bearer <JWT> in Authorization header
Rate Limit: 10 req/s per user (public), 5 req/s (order placement)
```

**Response Envelope:**
```typescript
// Success
{ "success": true, "data": <T>, "timestamp": 1708531200000 }

// Error
{ "success": false, "error": { "code": "INSUFFICIENT_BALANCE", "message": "..." }, "timestamp": 1708531200000 }

// Paginated
{ "success": true, "data": [...], "pagination": { "page": 1, "pageSize": 50, "total": 1234, "hasMore": true }, "timestamp": 1708531200000 }
```

### 6.2 Public Endpoints (No Auth)

```
GET  /api/v1/market/pairs                       # List trading pairs
GET  /api/v1/market/pairs/:symbol                # Pair details
GET  /api/v1/market/ticker                       # All tickers (24h)
GET  /api/v1/market/ticker/:symbol               # Single ticker
GET  /api/v1/market/depth/:symbol?limit=20       # Order book depth
GET  /api/v1/market/trades/:symbol?limit=50      # Recent trades
GET  /api/v1/market/candles/:symbol?interval=1h&limit=500  # K-line data
GET  /api/v1/health                              # Health check
```

**Depth Response:**
```json
{
  "symbol": "BTC_USDT",
  "bids": [["50000.00", "1.5"], ["49999.00", "2.3"]],  // [price, amount]
  "asks": [["50001.00", "0.8"], ["50002.00", "1.1"]],
  "timestamp": 1708531200000
}
```

**Ticker Response:**
```json
{
  "symbol": "BTC_USDT",
  "lastPrice": "50000.00",
  "priceChange": "500.00",
  "priceChangePercent": "1.01",
  "highPrice": "50500.00",
  "lowPrice": "49000.00",
  "volume": "1234.56",
  "quoteVolume": "61728000.00",
  "openPrice": "49500.00",
  "bidPrice": "50000.00",
  "askPrice": "50001.00",
  "timestamp": 1708531200000
}
```

### 6.3 Auth Endpoints

```
POST /api/v1/auth/register     # { email, password }
POST /api/v1/auth/login        # { email, password, totpCode? } → { token, refreshToken }
POST /api/v1/auth/refresh      # { refreshToken } → { token }
POST /api/v1/auth/logout       # Invalidate refresh token
POST /api/v1/auth/2fa/setup    # Generate TOTP secret + QR
POST /api/v1/auth/2fa/verify   # Verify TOTP code, enable 2FA
POST /api/v1/auth/2fa/disable  # Disable 2FA (requires code)
```

### 6.4 Trading Endpoints (Auth Required)

```
POST   /api/v1/orders                  # Place order
DELETE /api/v1/orders/:orderId         # Cancel order
DELETE /api/v1/orders?symbol=BTC_USDT  # Cancel all orders for symbol
GET    /api/v1/orders?symbol=BTC_USDT&status=new&page=1&pageSize=50  # Open orders
GET    /api/v1/orders/history?symbol=BTC_USDT&page=1                  # Order history
GET    /api/v1/orders/:orderId         # Order detail
GET    /api/v1/trades/my?symbol=BTC_USDT&page=1                      # My trades
```

**Place Order Request:**
```typescript
// POST /api/v1/orders
interface PlaceOrderRequest {
  symbol: string;           // "BTC_USDT"
  side: 'buy' | 'sell';
  type: 'limit' | 'market' | 'stop_loss' | 'stop_limit' | 'oco';
  price?: string;           // Required for limit, stop_limit
  stopPrice?: string;       // Required for stop_loss, stop_limit, oco
  amount: string;           // Base currency amount
  timeInForce?: 'GTC' | 'IOC' | 'FOK';  // Default: GTC

  // OCO specific
  ocoStopPrice?: string;
  ocoStopLimitPrice?: string;
}

// Zod validation
const placeOrderSchema = z.object({
  symbol: z.string().regex(/^[A-Z]+_[A-Z]+$/),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['limit', 'market', 'stop_loss', 'stop_limit', 'oco']),
  price: z.string().optional(),
  stopPrice: z.string().optional(),
  amount: z.string().refine(v => new Big(v).gt(0), 'Amount must be positive'),
  timeInForce: z.enum(['GTC', 'IOC', 'FOK']).default('GTC'),
}).refine(data => {
  if (data.type === 'limit' && !data.price) return false;
  if (data.type === 'market' && data.price) return false;
  if (['stop_loss', 'stop_limit'].includes(data.type) && !data.stopPrice) return false;
  return true;
}, 'Invalid order parameters for given type');
```

### 6.5 Wallet Endpoints (Auth Required)

```
GET  /api/v1/wallet/balances                     # All balances
GET  /api/v1/wallet/balances/:currency            # Single currency balance
POST /api/v1/wallet/deposit                       # Simulate deposit
POST /api/v1/wallet/withdraw                      # Simulate withdrawal
GET  /api/v1/wallet/transactions?page=1&pageSize=50  # Transaction history
```

**Balance Response:**
```json
{
  "currency": "USDT",
  "available": "10000.00",
  "frozen": "500.00",
  "total": "10500.00"
}
```

### 6.6 Admin Endpoints (Admin Auth Required)

```
# Trading Pairs
GET    /api/v1/admin/pairs
POST   /api/v1/admin/pairs              # Create pair
PATCH  /api/v1/admin/pairs/:id          # Update pair (fees, precision, status)
DELETE /api/v1/admin/pairs/:id          # Delist pair

# Users
GET    /api/v1/admin/users?page=1
PATCH  /api/v1/admin/users/:id          # Suspend/activate user

# Fees
GET    /api/v1/admin/fee-tiers
POST   /api/v1/admin/fee-tiers
PATCH  /api/v1/admin/fee-tiers/:id

# System
GET    /api/v1/admin/config
PATCH  /api/v1/admin/config             # Update system config
GET    /api/v1/admin/stats              # Dashboard stats (volume, users, etc.)
```

---

## 7. WebSocket Channel Design

### 7.1 Connection & Protocol

```
Endpoint: ws://localhost:3000/ws
    or:   wss://exchange.example.com/ws

Auth (optional, for private channels):
  - Pass JWT as query param: ws://host/ws?token=<JWT>
  - Or send auth message after connect

Message format: JSON
```

**Frame Format:**
```typescript
// Client → Server
interface WsClientMessage {
  method: 'SUBSCRIBE' | 'UNSUBSCRIBE' | 'AUTH' | 'PING';
  params?: string[];  // Channel names
  id?: number;        // Client-assigned request ID for correlation
}

// Server → Client
interface WsServerMessage {
  // Subscription response
  id?: number;
  result?: 'ok';
  error?: { code: number; message: string };

  // Push data
  channel?: string;     // e.g., "ticker@BTC_USDT"
  data?: unknown;
  timestamp?: number;
}
```

### 7.2 Public Channels

#### 7.2.1 Ticker Channel

```
Channel: ticker@{symbol}        // Single pair: ticker@BTC_USDT
Channel: ticker@ALL             // All pairs

Push frequency: Every trade or every 1s (whichever is less frequent)
```

```json
// Subscribe
{ "method": "SUBSCRIBE", "params": ["ticker@BTC_USDT"], "id": 1 }

// Push
{
  "channel": "ticker@BTC_USDT",
  "data": {
    "symbol": "BTC_USDT",
    "lastPrice": "50000.00",
    "priceChange": "500.00",
    "priceChangePercent": "1.01",
    "highPrice": "50500.00",
    "lowPrice": "49000.00",
    "volume": "1234.56",
    "quoteVolume": "61728000.00",
    "bestBid": "50000.00",
    "bestAsk": "50001.00"
  },
  "timestamp": 1708531200000
}
```

#### 7.2.2 Depth Channel (Order Book)

```
Channel: depth@{symbol}            // Incremental updates
Channel: depth@{symbol}@{levels}   // Snapshot with N levels: depth@BTC_USDT@20

Push frequency: On every order book change (throttled to max 10/s)
```

```json
// Full snapshot (sent on subscribe)
{
  "channel": "depth@BTC_USDT@20",
  "data": {
    "type": "snapshot",
    "bids": [["50000.00", "1.5"], ["49999.00", "2.3"]],
    "asks": [["50001.00", "0.8"], ["50002.00", "1.1"]],
    "lastUpdateId": 12345
  },
  "timestamp": 1708531200000
}

// Incremental update
{
  "channel": "depth@BTC_USDT",
  "data": {
    "type": "update",
    "bids": [["50000.00", "1.2"]],    // Updated level (amount=0 means removed)
    "asks": [["50001.50", "0.5"]],
    "firstUpdateId": 12346,
    "lastUpdateId": 12348
  },
  "timestamp": 1708531200100
}
```

**Client-side depth management:**
1. Subscribe to `depth@SYMBOL@20` → receive full snapshot
2. Subscribe to `depth@SYMBOL` → receive incremental updates
3. Buffer updates where `firstUpdateId > snapshot.lastUpdateId`
4. Apply updates: for each `[price, amount]`, if amount = "0" remove level, else upsert

#### 7.2.3 Kline Channel

```
Channel: kline@{symbol}@{interval}   // e.g., kline@BTC_USDT@1m

Push frequency: On every trade (updates current candle) + on candle close
```

```json
{
  "channel": "kline@BTC_USDT@1m",
  "data": {
    "openTime": 1708531200000,
    "closeTime": 1708531259999,
    "open": "50000.00",
    "high": "50050.00",
    "low": "49980.00",
    "close": "50020.00",
    "volume": "12.5",
    "quoteVolume": "625250.00",
    "tradeCount": 45,
    "isClosed": false          // true when candle is finalized
  },
  "timestamp": 1708531245000
}
```

#### 7.2.4 Trade Channel

```
Channel: trade@{symbol}              // e.g., trade@BTC_USDT

Push frequency: On every trade execution (real-time)
```

```json
{
  "channel": "trade@BTC_USDT",
  "data": {
    "id": "trade-uuid",
    "price": "50000.00",
    "amount": "0.5",
    "total": "25000.00",
    "side": "buy",              // Taker's side
    "timestamp": 1708531200000
  },
  "timestamp": 1708531200000
}
```

### 7.3 Private Channels (Auth Required)

```
// Authenticate first
{ "method": "AUTH", "params": ["<JWT_TOKEN>"], "id": 1 }
// Response: { "id": 1, "result": "ok" }

// Then subscribe
{ "method": "SUBSCRIBE", "params": ["orders", "wallet"], "id": 2 }
```

#### 7.3.1 Order Updates

```
Channel: orders

Pushes: On order placed, partially filled, filled, cancelled
```

```json
{
  "channel": "orders",
  "data": {
    "event": "order.updated",      // order.placed | order.updated | order.filled | order.cancelled
    "order": {
      "id": "uuid",
      "symbol": "BTC_USDT",
      "side": "buy",
      "type": "limit",
      "price": "50000.00",
      "amount": "1.0",
      "filledAmount": "0.5",
      "remainingAmount": "0.5",
      "status": "partially_filled",
      "createdAt": 1708531200000
    }
  },
  "timestamp": 1708531200000
}
```

#### 7.3.2 Wallet Updates

```
Channel: wallet

Pushes: On balance change (trade fill, deposit, withdrawal)
```

```json
{
  "channel": "wallet",
  "data": {
    "event": "balance.updated",
    "currency": "USDT",
    "available": "9500.00",
    "frozen": "500.00",
    "total": "10000.00"
  },
  "timestamp": 1708531200000
}
```

### 7.4 WebSocket Server Implementation

```typescript
// src/core/ws/server.ts
class ExchangeWSServer {
  private wss: WebSocketServer;
  private channels: ChannelManager;

  // Client state
  private clients: Map<WebSocket, ClientState>;

  interface ClientState {
    userId?: string;           // Set after AUTH
    subscriptions: Set<string>; // Active channel subscriptions
    lastPing: number;
    rateLimit: SlidingWindow;
  }

  // Heartbeat: ping every 30s, disconnect if no pong in 10s
  // Rate limit: max 20 messages/second per client
  // Max subscriptions: 50 per client
}

// src/core/ws/channels.ts
class ChannelManager {
  // channel → Set<WebSocket>
  private subscriptions: Map<string, Set<WebSocket>>;

  subscribe(ws: WebSocket, channel: string): void;
  unsubscribe(ws: WebSocket, channel: string): void;
  unsubscribeAll(ws: WebSocket): void;

  // Broadcast to all subscribers of a channel
  broadcast(channel: string, data: unknown): void {
    const subs = this.subscriptions.get(channel);
    if (!subs) return;

    const message = JSON.stringify({ channel, data, timestamp: Date.now() });

    for (const ws of subs) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  // Broadcast to a specific user (private channels)
  unicast(userId: string, channel: string, data: unknown): void;
}
```

### 7.5 Throttling Strategy

To prevent flooding clients:

| Channel | Strategy | Max Rate |
|---------|----------|----------|
| `trade@` | No throttle (every trade) | Unbounded* |
| `depth@` | Batch updates, push at interval | 10 updates/s |
| `ticker@` | Computed on trade, debounced | 1 update/s |
| `kline@` | On trade (updates current candle) | 1 update/s per interval |
| `orders` | No throttle (user's own events) | Unbounded |
| `wallet` | No throttle (user's own events) | Unbounded |

*If trade volume is extremely high, aggregate into 100ms batches.

---

## 8. Authentication & Security

### 8.1 JWT Token Design

```typescript
// Access Token (short-lived)
interface AccessTokenPayload {
  sub: string;       // user ID
  email: string;
  role: 'user' | 'admin';
  iat: number;       // issued at
  exp: number;       // expires at (15 minutes)
}

// Refresh Token (long-lived, stored in DB or httpOnly cookie)
interface RefreshTokenPayload {
  sub: string;
  jti: string;       // unique token ID (for revocation)
  exp: number;       // 7 days
}
```

**Token Flow:**
1. Login → receive `{ accessToken, refreshToken }`
2. API calls use `Authorization: Bearer <accessToken>`
3. When access token expires, call `/auth/refresh` with refresh token
4. On logout, invalidate refresh token (delete from DB/blacklist)

### 8.2 Password Security

```typescript
// bcrypt with cost factor 12
const BCRYPT_ROUNDS = 12;
const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

// Password requirements
const passwordSchema = z.string()
  .min(8, 'At least 8 characters')
  .regex(/[A-Z]/, 'At least one uppercase letter')
  .regex(/[a-z]/, 'At least one lowercase letter')
  .regex(/[0-9]/, 'At least one number');
```

### 8.3 2FA (TOTP)

```
Setup flow:
1. POST /auth/2fa/setup → returns { secret, qrCodeUrl }
2. User scans QR in Google Authenticator / Authy
3. POST /auth/2fa/verify { code: "123456" } → enables 2FA

Login with 2FA:
1. POST /auth/login { email, password } → 401 { requires2FA: true }
2. POST /auth/login { email, password, totpCode: "123456" } → tokens

Library: otpauth (generates TOTP secrets, verifies codes)
```

### 8.4 API Rate Limiting

```typescript
// Sliding window rate limiter (in-memory)
class RateLimiter {
  private windows: Map<string, { count: number; resetAt: number }>;

  check(key: string, limit: number, windowMs: number): boolean;
}

// Rate limit tiers
const RATE_LIMITS = {
  public:      { limit: 20,  windowMs: 1000 },   // 20 req/s
  auth:        { limit: 10,  windowMs: 1000 },   // 10 req/s
  orderPlace:  { limit: 5,   windowMs: 1000 },   // 5 orders/s
  orderCancel: { limit: 10,  windowMs: 1000 },   // 10 cancels/s
  ws:          { limit: 20,  windowMs: 1000 },   // 20 msg/s per WS client
};

// Middleware
async function rateLimitMiddleware(req: NextRequest) {
  const key = req.headers.get('authorization')
    ? `user:${userId}`
    : `ip:${req.ip}`;

  if (!rateLimiter.check(key, limit, window)) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
      { status: 429, headers: { 'Retry-After': '1' } }
    );
  }
}
```

### 8.5 Additional Security Measures

| Measure | Implementation |
|---------|---------------|
| CORS | Strict origin whitelist |
| Helmet headers | `X-Content-Type-Options`, `X-Frame-Options`, CSP |
| Input sanitization | Zod validation on all inputs |
| SQL injection | Drizzle ORM (parameterized queries) |
| XSS | React default escaping + CSP |
| Request size limit | Max 1MB body |
| HTTPS | Required in production |
| Audit log | All admin actions logged |

---

## 9. Wallet System

### 9.1 Balance Model

```
Total Balance = Available + Frozen

Available: Can be used for new orders or withdrawals
Frozen:    Locked by open orders, pending withdrawals

Invariant: available >= 0 AND frozen >= 0 (enforced by DB CHECK constraints)
```

### 9.2 Fund Flow for Orders

**Placing a BUY limit order (BTC_USDT, price=50000, amount=1):**
```
1. Calculate required quote: 50000 * 1 = 50000 USDT
2. Check: user.USDT.available >= 50000?
3. Freeze: USDT.available -= 50000, USDT.frozen += 50000
4. Submit order to matching engine
```

**Placing a SELL limit order (BTC_USDT, amount=1):**
```
1. Check: user.BTC.available >= 1?
2. Freeze: BTC.available -= 1, BTC.frozen += 1
3. Submit order to matching engine
```

**On trade execution (BUY filled at 49500, amount=0.5):**
```
Buyer (taker):
  USDT.frozen -= 24750 (49500 * 0.5)       // Release frozen quote
  BTC.available += 0.4993 (0.5 - fee)       // Credit base minus taker fee

Seller (maker):
  BTC.frozen -= 0.5                          // Release frozen base
  USDT.available += 24725.25 (24750 - fee)   // Credit quote minus maker fee

If buyer had frozen 25000 (limit price 50000) but filled at 49500:
  Excess 250 USDT unfrozen back to available (price improvement)
```

**On order cancellation:**
```
Unfreeze remaining locked funds:
  BUY:  USDT.available += remaining * price, USDT.frozen -= remaining * price
  SELL: BTC.available += remaining, BTC.frozen -= remaining
```

### 9.3 Deposit/Withdrawal (Simulated)

For the demo project, deposits and withdrawals are simulated:

```typescript
// POST /api/v1/wallet/deposit
async function deposit(userId: string, currency: string, amount: Decimal) {
  await db.transaction(async (tx) => {
    // Upsert wallet
    const wallet = await getOrCreateWallet(tx, userId, currency);

    // Credit
    await tx.update(wallets)
      .set({ available: sql`available + ${amount}` })
      .where(and(eq(wallets.userId, userId), eq(wallets.currency, currency)));

    // Audit log
    await tx.insert(walletTransactions).values({
      walletId: wallet.id,
      userId,
      txType: 'deposit',
      amount: amount.toString(),
      balanceAfter: new Big(wallet.available).plus(amount).toString(),
      frozenAfter: wallet.frozen,
      note: `Simulated deposit of ${amount} ${currency}`,
    });
  });
}
```

---

## 10. Risk Control

### 10.1 Pre-Trade Validation

```typescript
class OrderValidator {
  async validate(order: PlaceOrderRequest, user: User, pair: TradingPair): Promise<ValidationResult> {
    const errors: string[] = [];

    // 1. Pair status check
    if (pair.status !== 'active') {
      errors.push(`Trading pair ${pair.symbol} is not active`);
    }

    // 2. Amount precision & range
    const amount = new Big(order.amount);
    if (amount.lt(pair.minAmount)) {
      errors.push(`Amount below minimum: ${pair.minAmount}`);
    }
    if (pair.maxAmount && amount.gt(pair.maxAmount)) {
      errors.push(`Amount above maximum: ${pair.maxAmount}`);
    }
    if (decimalPlaces(order.amount) > pair.amountPrecision) {
      errors.push(`Amount precision exceeds ${pair.amountPrecision} decimals`);
    }

    // 3. Price precision (for limit orders)
    if (order.price) {
      if (decimalPlaces(order.price) > pair.pricePrecision) {
        errors.push(`Price precision exceeds ${pair.pricePrecision} decimals`);
      }
      if (new Big(order.price).lte(0)) {
        errors.push('Price must be positive');
      }
    }

    // 4. Minimum order value (notional)
    if (order.type === 'limit') {
      const notional = new Big(order.price!).times(amount);
      if (notional.lt(pair.minTotal)) {
        errors.push(`Order value below minimum: ${pair.minTotal} ${pair.quoteCurrency}`);
      }
    }

    // 5. Price protection (circuit breaker)
    if (order.price && pair.maxPriceDeviationPct) {
      const lastPrice = this.getLastPrice(pair.symbol);
      if (lastPrice) {
        const deviation = new Big(order.price).minus(lastPrice).abs()
          .div(lastPrice).times(100);
        if (deviation.gt(pair.maxPriceDeviationPct)) {
          errors.push(`Price deviates more than ${pair.maxPriceDeviationPct}% from last trade`);
        }
      }
    }

    // 6. Open orders limit
    const openOrderCount = await this.getOpenOrderCount(user.id);
    const maxOrders = await this.getConfig('max_open_orders_per_user');
    if (openOrderCount >= maxOrders) {
      errors.push(`Maximum open orders (${maxOrders}) reached`);
    }

    // 7. Balance check
    const required = this.calculateRequired(order, pair);
    const wallet = await this.getWallet(user.id, required.currency);
    if (new Big(wallet.available).lt(required.amount)) {
      errors.push(`Insufficient ${required.currency} balance`);
    }

    return { valid: errors.length === 0, errors };
  }
}
```

### 10.2 Circuit Breaker

```typescript
class CircuitBreaker {
  // Tracks price movement within a time window
  private priceHistory: Map<string, { price: Decimal; time: number }[]>;

  // Triggers if price moves more than threshold in window
  check(symbol: string, newPrice: Decimal): boolean {
    const history = this.priceHistory.get(symbol) || [];
    const windowStart = Date.now() - 60000; // 1-minute window

    // Filter to window
    const recent = history.filter(h => h.time >= windowStart);

    if (recent.length === 0) return true;

    const oldestInWindow = recent[0].price;
    const deviation = newPrice.minus(oldestInWindow).abs()
      .div(oldestInWindow).times(100);

    if (deviation.gt(15)) { // 15% in 1 minute = halt
      this.emit('circuit_breaker.triggered', {
        symbol,
        reason: `Price moved ${deviation.toFixed(2)}% in 1 minute`,
      });
      return false; // Reject trade
    }

    return true;
  }
}
```

### 10.3 Self-Trade Prevention

```typescript
// In matching engine, before executing a trade:
if (makerOrder.userId === takerOrder.userId) {
  // Option 1: Cancel the resting (maker) order
  // Option 2: Cancel the incoming (taker) order
  // Option 3: Cancel both
  // We choose: Cancel the resting order (industry standard)
  cancelOrder(makerOrder.id);
  continue; // Skip to next order in the book
}
```

---

## 11. Admin Backend

### 11.1 Admin Dashboard Pages

```
/admin                    → Dashboard (stats overview)
/admin/pairs              → Trading pair management
/admin/pairs/new          → Create new pair
/admin/pairs/:id/edit     → Edit pair
/admin/users              → User management
/admin/fees               → Fee tier configuration
/admin/config             → System configuration
/admin/orders             → Order monitoring
/admin/trades             → Trade history
```

### 11.2 Dashboard Stats

```typescript
interface DashboardStats {
  // 24h metrics
  totalVolume24h: string;        // Total quote volume across all pairs
  totalTrades24h: number;
  totalOrders24h: number;
  activeUsers24h: number;

  // Totals
  totalUsers: number;
  totalPairs: number;
  activePairs: number;

  // Per-pair breakdown
  pairStats: {
    symbol: string;
    volume24h: string;
    trades24h: number;
    lastPrice: string;
    priceChange24h: string;
  }[];
}
```

### 11.3 Admin Auth

- Admin users have `role = 'admin'` in the users table
- Admin API routes check `req.user.role === 'admin'`
- First admin is created via database seed or a one-time setup endpoint
- Admin actions are logged to an audit table (optional extension)

---

## 12. Performance Considerations

### 12.1 Order Book (In-Memory)

**Data Structure Choice:**

| Structure | Insert | Delete | Find Best | Iterate | Choice |
|-----------|--------|--------|-----------|---------|--------|
| Array (sorted) | O(n) | O(n) | O(1) | O(n) | ❌ |
| Red-Black Tree | O(log n) | O(log n) | O(log n) | O(n) | ✅ Levels |
| HashMap | O(1) | O(1) | O(n) | O(n) | ✅ Order index |
| Linked List | O(1)* | O(1)* | O(n) | O(n) | ✅ Price-level queue |

**Implementation:**

```typescript
// Use a sorted map (e.g., bintrees or custom red-black tree) for price levels
import { RBTree } from 'bintrees';

// Buy side: descending (highest price = best bid)
const bids = new RBTree<PriceLevelQueue>((a, b) => b.price.cmp(a.price));

// Sell side: ascending (lowest price = best ask)
const asks = new RBTree<PriceLevelQueue>((a, b) => a.price.cmp(b.price));

// Order lookup by ID: O(1)
const orderIndex = new Map<string, { order: Order; level: PriceLevelQueue }>();
```

**Memory Estimate:**
- 100,000 active orders × ~500 bytes/order = ~50 MB
- Well within single-process capability

### 12.2 Recovery on Restart

Since the order book is in-memory, it must be rebuilt on server restart:

```typescript
async function rebuildOrderBook(): Promise<void> {
  const activeOrders = await db.select()
    .from(orders)
    .where(inArray(orders.status, ['new', 'partially_filled']))
    .orderBy(orders.seq); // Preserve original time ordering

  for (const order of activeOrders) {
    // Insert directly into book (no re-matching)
    engine.insertIntoBook(order);
  }

  console.log(`Rebuilt order books with ${activeOrders.length} active orders`);
}
```

### 12.3 Database Query Optimization

**Trade History Pagination (Cursor-based):**
```sql
-- Cursor-based (efficient for deep pagination)
SELECT * FROM trades
WHERE symbol = 'BTC_USDT'
  AND seq < :cursor
ORDER BY seq DESC
LIMIT 50;

-- Use seq (monotonically increasing) instead of timestamp for consistent ordering
```

**Candle Queries:**
```sql
-- Get candles for chart
SELECT * FROM candles
WHERE symbol = 'BTC_USDT'
  AND interval = '1h'
  AND open_time >= :from
  AND open_time <= :to
ORDER BY open_time ASC
LIMIT 500;

-- Index: idx_candles_symbol_interval_time handles this efficiently
```

**Order Book Depth (from DB, fallback):**
```sql
-- Aggregated order book depth from DB (used when in-memory not available)
SELECT
  price,
  SUM(remaining_amount) as total_amount,
  COUNT(*) as order_count
FROM orders
WHERE symbol = 'BTC_USDT'
  AND side = 'buy'
  AND status IN ('new', 'partially_filled')
GROUP BY price
ORDER BY price DESC
LIMIT 20;
```

### 12.4 Candle Aggregation

```typescript
class CandleAggregator {
  // In-memory current candles (one per symbol per interval)
  private currentCandles: Map<string, Map<CandleInterval, Candle>>;

  // Called on every trade
  onTrade(trade: Trade): void {
    for (const interval of INTERVALS) {
      const key = `${trade.symbol}:${interval}`;
      const openTime = truncateToInterval(trade.executedAt, interval);
      let candle = this.getCurrentCandle(trade.symbol, interval);

      if (!candle || candle.openTime !== openTime) {
        // Finalize previous candle (write to DB)
        if (candle) {
          this.finalizeCandle(candle);
        }

        // Start new candle
        candle = {
          symbol: trade.symbol,
          interval,
          openTime,
          closeTime: addInterval(openTime, interval),
          open: trade.price,
          high: trade.price,
          low: trade.price,
          close: trade.price,
          volume: trade.amount,
          quoteVolume: trade.total,
          tradeCount: 1,
        };
      } else {
        // Update existing candle
        candle.high = Big.max(candle.high, trade.price);
        candle.low = Big.min(candle.low, trade.price);
        candle.close = trade.price;
        candle.volume = candle.volume.plus(trade.amount);
        candle.quoteVolume = candle.quoteVolume.plus(trade.total);
        candle.tradeCount += 1;
      }

      this.setCurrentCandle(trade.symbol, interval, candle);

      // Emit update to WebSocket
      this.emit('candle.updated', { symbol: trade.symbol, interval, candle });
    }
  }

  // Periodically flush current candles to DB (every 5s)
  private async flushToDB(): void {
    for (const [symbol, intervals] of this.currentCandles) {
      for (const [interval, candle] of intervals) {
        await db.insert(candles)
          .values(candle)
          .onConflictDoUpdate({
            target: [candles.symbol, candles.interval, candles.openTime],
            set: {
              high: candle.high,
              low: candle.low,
              close: candle.close,
              volume: candle.volume,
              quoteVolume: candle.quoteVolume,
              tradeCount: candle.tradeCount,
              updatedAt: new Date(),
            },
          });
      }
    }
  }
}
```

### 12.5 Depth Snapshot Throttling

```typescript
class DepthPublisher {
  private dirtySymbols: Set<string> = new Set();
  private interval: NodeJS.Timeout;

  constructor() {
    // Publish depth updates at most every 100ms
    this.interval = setInterval(() => this.flush(), 100);
  }

  markDirty(symbol: string): void {
    this.dirtySymbols.add(symbol);
  }

  private flush(): void {
    for (const symbol of this.dirtySymbols) {
      const snapshot = engine.getOrderBook(symbol, 20);
      wsServer.broadcast(`depth@${symbol}@20`, {
        type: 'snapshot',
        bids: snapshot.bids,
        asks: snapshot.asks,
        lastUpdateId: snapshot.updateId,
      });
    }
    this.dirtySymbols.clear();
  }
}
```

---

## 13. Deployment Architecture

### 13.1 Development

```bash
# Single command to start everything
pnpm dev

# This runs:
# 1. PostgreSQL (Docker Compose)
# 2. Custom server.ts (Next.js + WS + Matching Engine)
# 3. DB migrations (auto)
# 4. Seed data (on first run)
```

```yaml
# docker-compose.yml (dev dependencies only)
services:
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: crypto_exchange
      POSTGRES_USER: exchange
      POSTGRES_PASSWORD: exchange_dev
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

### 13.2 Production (Future)

```
                    ┌────────────┐
                    │  Nginx /   │
                    │  Cloudflare│
                    └─────┬──────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
        ┌─────▼────┐ ┌───▼────┐ ┌───▼────┐
        │ Next.js  │ │ Next.js│ │ WS +   │
        │ (SSR +   │ │ (SSR + │ │ Engine │
        │  REST)   │ │  REST) │ │ (single│
        │  [N]     │ │  [N]   │ │ leader)│
        └─────┬────┘ └───┬────┘ └───┬────┘
              │           │          │
              └───────────┼──────────┘
                          │
                    ┌─────▼──────┐
                    │ PostgreSQL │
                    │  (Primary) │
                    └────────────┘
```

**Note:** The matching engine MUST be single-instance (single-leader) to maintain deterministic ordering. REST/SSR can scale horizontally.

### 13.3 Environment Variables

```bash
# .env.example
# Database
DATABASE_URL=postgresql://exchange:exchange_dev@localhost:5432/crypto_exchange

# Auth
JWT_SECRET=your-secret-key-min-32-chars
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server
PORT=3000
NODE_ENV=development
NEXT_PUBLIC_WS_URL=ws://localhost:3000/ws
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1

# Rate Limiting
RATE_LIMIT_ENABLED=true

# Admin
ADMIN_SEED_EMAIL=admin@exchange.com
ADMIN_SEED_PASSWORD=AdminPassword123!
```

---

## 14. Development Phases

### Phase 1: Foundation (Week 1)
- [ ] Project setup (Next.js, Drizzle, PostgreSQL, TypeScript config)
- [ ] Database schema & migrations
- [ ] User auth (register, login, JWT)
- [ ] Wallet system (balance, deposit, withdrawal)
- [ ] Basic UI layout (dark theme, navigation)

### Phase 2: Trading Core (Week 2)
- [ ] Matching engine (limit orders, price-time priority)
- [ ] Order placement & cancellation API
- [ ] Order book data structure
- [ ] Trade execution & settlement
- [ ] Trading pair CRUD (admin)

### Phase 3: Real-Time (Week 3)
- [ ] WebSocket server setup
- [ ] Depth channel (order book updates)
- [ ] Trade channel (real-time trades)
- [ ] Ticker channel
- [ ] Frontend: Order book component
- [ ] Frontend: Recent trades component

### Phase 4: Charts & Market Data (Week 4)
- [ ] Candle aggregation engine
- [ ] Kline WebSocket channel
- [ ] TradingView lightweight-charts integration
- [ ] Historical candle API
- [ ] Frontend: Trading chart page

### Phase 5: Advanced Orders & Risk (Week 5)
- [ ] Market orders
- [ ] Stop-loss & stop-limit orders
- [ ] OCO orders
- [ ] IOC / FOK time-in-force
- [ ] Risk controls (price protection, circuit breaker)
- [ ] Self-trade prevention

### Phase 6: Polish & Admin (Week 6)
- [ ] Admin dashboard
- [ ] Fee configuration
- [ ] User management
- [ ] 2FA (TOTP)
- [ ] Rate limiting
- [ ] Error handling & logging
- [ ] Seed data with realistic market simulation

---

## Appendix A: Key Libraries

| Library | Version | Purpose |
|---------|---------|---------|
| `next` | 14.x | Framework (SSR + API) |
| `react` | 18.x | UI library |
| `lightweight-charts` | 4.x | TradingView candlestick charts |
| `drizzle-orm` | 0.29+ | Type-safe ORM |
| `drizzle-kit` | Latest | Migration tooling |
| `ws` | 8.x | WebSocket server |
| `big.js` | 6.x | Decimal arithmetic |
| `zod` | 3.x | Schema validation |
| `jose` | 5.x | JWT (signing, verifying) |
| `bcrypt` | 5.x | Password hashing |
| `otpauth` | 9.x | TOTP 2FA |
| `zustand` | 4.x | Frontend state management |
| `tailwindcss` | 3.x | Utility CSS |
| `bintrees` | 1.x | Red-black tree (order book levels) |
| `node-cron` | 3.x | Scheduled tasks |
| `pino` | 8.x | Structured logging |

## Appendix B: TypeScript Type Definitions

```typescript
// src/types/domain.ts

type Decimal = string;  // Serialized form (API / DB)
// Use Big.js instances internally for calculations

interface User {
  id: string;
  email: string;
  nickname: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'suspended' | 'pending_verification';
  totpEnabled: boolean;
  createdAt: Date;
}

interface TradingPair {
  id: string;
  symbol: string;          // "BTC_USDT"
  baseCurrency: string;    // "BTC"
  quoteCurrency: string;   // "USDT"
  status: 'active' | 'suspended' | 'delisted';
  pricePrecision: number;
  amountPrecision: number;
  minAmount: Decimal;
  maxAmount: Decimal | null;
  minTotal: Decimal;
  makerFeeBps: number;
  takerFeeBps: number;
  maxPriceDeviationPct: number | null;
}

interface Order {
  id: string;
  userId: string;
  pairId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'limit' | 'market' | 'stop_loss' | 'stop_limit' | 'oco';
  timeInForce: 'GTC' | 'IOC' | 'FOK';
  price: Decimal | null;
  stopPrice: Decimal | null;
  amount: Decimal;
  filledAmount: Decimal;
  remainingAmount: Decimal;
  totalCost: Decimal;
  avgPrice: Decimal | null;
  feeTotal: Decimal;
  status: 'new' | 'partially_filled' | 'filled' | 'cancelled' | 'expired' | 'rejected';
  seq: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Trade {
  id: string;
  pairId: string;
  symbol: string;
  makerOrderId: string;
  takerOrderId: string;
  makerUserId: string;
  takerUserId: string;
  price: Decimal;
  amount: Decimal;
  total: Decimal;
  side: 'buy' | 'sell';
  makerFee: Decimal;
  takerFee: Decimal;
  seq: number;
  executedAt: Date;
}

interface Candle {
  symbol: string;
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w';
  openTime: Date;
  closeTime: Date;
  open: Decimal;
  high: Decimal;
  low: Decimal;
  close: Decimal;
  volume: Decimal;
  quoteVolume: Decimal;
  tradeCount: number;
}

interface Wallet {
  id: string;
  userId: string;
  currency: string;
  available: Decimal;
  frozen: Decimal;
}

interface Ticker {
  symbol: string;
  lastPrice: Decimal;
  priceChange: Decimal;
  priceChangePercent: Decimal;
  highPrice: Decimal;
  lowPrice: Decimal;
  volume: Decimal;
  quoteVolume: Decimal;
  openPrice: Decimal;
  bestBid: Decimal;
  bestAsk: Decimal;
  timestamp: number;
}

interface OrderBookLevel {
  price: Decimal;
  amount: Decimal;
}

interface OrderBookSnapshot {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  updateId: number;
  timestamp: number;
}
```

---

> **End of Architecture Document**
>
> This design prioritizes correctness, auditability, and clean separation of concerns.
> The in-memory matching engine with PostgreSQL journaling provides both performance
> and durability. The hybrid Next.js + custom server approach keeps the project as a
> single deployable while supporting WebSocket real-time data.
