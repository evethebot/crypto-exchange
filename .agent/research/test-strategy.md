# CEX Trading System — Complete Test Strategy

> **Version**: 1.0.0  
> **Date**: 2026-02-21  
> **Author**: QA Engineering (automated)  
> **Status**: Pre-Development — All scenarios defined before code

---

## Table of Contents

1. [Test Pyramid & Architecture](#1-test-pyramid--architecture)
2. [Feature Area Decomposition](#2-feature-area-decomposition)
3. [Critical Edge Cases](#3-critical-edge-cases)
4. [Acceptance Criteria (Given/When/Then)](#4-acceptance-criteria-givenwhenthenwhen)
5. [Concrete Test Cases (50+)](#5-concrete-test-cases-80)
6. [Performance Benchmarks](#6-performance-benchmarks)
7. [Test Data Strategy](#7-test-data-strategy)
8. [Non-Functional Testing](#8-non-functional-testing)
9. [Risk Matrix](#9-risk-matrix)

---

## 1. Test Pyramid & Architecture

```
                    ┌─────────┐
                    │  E2E    │   ~10%   Browser/API flows, real DB
                    │ (UI+API)│          Trading journeys, deposit→trade→withdraw
                   ─┼─────────┼─
                  │ Integration │  ~25%   API contracts, DB integrity,
                  │  Tests     │          service-to-service, WS protocol
                 ─┼────────────┼─
               │    Unit Tests    │ ~65%   Matching engine, order validation,
               │                  │        fee calc, price logic, serialization
               └──────────────────┘
```

### Layer Breakdown

| Layer | Scope | Tools (Recommended) | Execution | Target Latency |
|-------|-------|---------------------|-----------|----------------|
| **Unit** | Pure functions, matching algo, fee calc, order validation, price math | Jest / Vitest / Go test / Rust #[test] | Every commit, <30s | <5ms per test |
| **Integration** | REST API contracts, DB read/write, Redis pub/sub, WS handshake, inter-service calls | Supertest / httptest / testcontainers | Every PR, <3min | <500ms per test |
| **E2E** | Full user journeys: register→KYC→deposit→place order→trade→withdraw | Playwright + custom WS client | Nightly + pre-release, <15min | <10s per scenario |
| **Performance** | Matching throughput, WS fan-out, API p99 latency | k6 / Gatling / custom harness | Weekly + pre-release | See §6 |
| **Chaos** | Node failure, network partition, DB failover | Chaos Monkey / Litmus | Monthly | Recovery <30s |

### Test Isolation Rules

- Unit tests: **zero** external dependencies (mock all I/O)
- Integration tests: use **testcontainers** (Postgres, Redis, Kafka) — no shared environments
- E2E tests: dedicated **staging environment** with seeded data
- Performance tests: **production-mirror** environment with synthetic data

---

## 2. Feature Area Decomposition

### 2.1 Matching Engine (撮合引擎)

| Sub-Feature | Happy Path | Edge Cases |
|-------------|------------|------------|
| Limit order matching | Buy/sell at overlapping prices → trade | Empty book, single-side book |
| Market order matching | Immediate fill at best price | No liquidity, partial liquidity |
| Price-time priority | Earlier order at same price fills first | Exact same timestamp (tiebreaker) |
| Partial fills | Large order filled by multiple small orders | Remaining qty = dust amount |
| Self-trade prevention (STP) | User's buy meets own sell → prevented | STP with different sub-accounts |
| Order book reconstruction | Engine restart → book rebuilt from open orders | Crash during mid-match |
| Maker/Taker assignment | Resting order = maker, incoming = taker | Limit order that crosses spread = taker |
| Tick size / lot size | Orders conform to pair precision rules | Non-conforming amounts rejected |
| Decimal precision | 8-decimal crypto amounts computed correctly | Floating-point edge: 0.1+0.2 |
| Max price / max qty | Orders within system limits accepted | Overflow: qty × price > uint64 max |

### 2.2 Order Management (订单管理)

| Sub-Feature | Happy Path | Edge Cases |
|-------------|------------|------------|
| Place order | Valid order accepted, balance frozen | Duplicate client order ID |
| Cancel order | Open order cancelled, balance unfrozen | Cancel already-filled order |
| Query orders | List open/history with pagination | 100k+ orders, filter by status |
| Order status flow | new→open→partial→filled | new→cancelled, open→expired |
| Batch cancel | Cancel all open orders for a pair | Cancel during active matching |
| Time-in-force: GTC | Good-till-cancel persists | Survives engine restart |
| Time-in-force: IOC | Immediate-or-cancel, unfilled part cancelled | Zero fill IOC |
| Time-in-force: FOK | Fill-or-kill, all or nothing | Book has partial liquidity |
| Post-only | Rejected if would take liquidity | Limit at exact best ask |
| Rate limiting | Orders within rate limit accepted | Burst of 1000 orders/sec |

### 2.3 Order Book (订单簿)

| Sub-Feature | Happy Path | Edge Cases |
|-------------|------------|------------|
| Real-time depth | Bid/ask levels aggregated correctly | 10,000+ price levels |
| Depth snapshot | API returns full book at request time | Snapshot during heavy matching |
| Incremental updates | WS delta stream reconstructs book | Missed update → resync needed |
| Aggregated views | Group by price precision (0.01, 0.1, 1) | All orders at same price |
| Best bid/ask (BBO) | Correct top-of-book | Empty one side |
| Book checksum | Client verifies book integrity via checksum | Checksum mismatch recovery |

### 2.4 K-Line / Candlestick (K线)

| Sub-Feature | Happy Path | Edge Cases |
|-------------|------------|------------|
| OHLCV computation | Open/High/Low/Close/Volume correct per period | Single trade in period |
| Time periods | 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M | Period boundary (23:59:59.999) |
| Historical query | Paginated candle retrieval | Gap periods (no trades) |
| Real-time update | Current candle updates on each trade | Multiple trades same millisecond |
| Volume accuracy | Base + quote volume correct | Partial fill contributes to volume |
| Timezone handling | UTC-based candle boundaries | DST transitions (for daily+) |
| Data consistency | K-line matches sum of individual trades | After trade cancellation/reversal |

### 2.5 Wallet (钱包)

| Sub-Feature | Happy Path | Edge Cases |
|-------------|------------|------------|
| Balance query | Available + frozen = total | New account (zero balance) |
| Deposit (on-chain) | Detect tx, credit after confirmations | Reorg/uncle block, duplicate tx |
| Withdraw (on-chain) | Debit balance, broadcast tx | Insufficient balance, gas spike |
| Internal transfer | Instant between sub-accounts | Transfer to self |
| Freeze/unfreeze | Order placement freezes balance | Cancel unfreeze matches exactly |
| Concurrent operations | Simultaneous deposit + trade | Race: withdraw while order fills |
| Double-spend prevention | Same UTXO/nonce rejected | Rapid resubmit of same withdrawal |
| Multi-chain deposit | Detect correct chain per asset | Wrong chain deposit (e.g., ERC20 on BSC address) |
| Minimum withdrawal | Below minimum rejected | Exactly at minimum |
| Fee deduction | Withdrawal fee deducted from amount or added | Fee > remaining balance |

### 2.6 User System (用户系统)

| Sub-Feature | Happy Path | Edge Cases |
|-------------|------------|------------|
| Registration | Email + password → account created | Duplicate email, SQL injection in name |
| Login | Correct credentials → JWT issued | Brute force (5+ failures → lockout) |
| 2FA (TOTP) | Valid code → authenticated | Clock skew (±30s), replay of used code |
| KYC levels | Upload docs → verified → higher limits | Expired document, blurry photo |
| Password reset | Email link → new password set | Expired token, token reuse |
| API key management | Create/revoke keys with permissions | Key with withdraw permission |
| Session management | List active sessions, revoke | Concurrent sessions across devices |
| IP whitelist | Restrict withdraw to whitelisted IPs | VPN/proxy detection |

### 2.7 WebSocket (实时推送)

| Sub-Feature | Happy Path | Edge Cases |
|-------------|------------|------------|
| Subscribe to topics | Receive real-time updates | Subscribe to 100+ channels |
| Order book stream | Consistent incremental updates | Out-of-order message |
| Trade stream | Each trade pushed in order | Burst: 10k trades/sec |
| User order updates | Private channel with auth | Token expiry mid-session |
| Kline stream | Real-time candle updates | Period rollover |
| Reconnection | Auto-reconnect with state recovery | Server rolling restart |
| Heartbeat/ping-pong | Connection kept alive | Missing pong → disconnect |
| Message ordering | Sequence numbers monotonic | Gap detection and recovery |
| Backpressure | Slow client doesn't crash server | Client 10s behind |
| Rate limit | Message frequency within bounds | Subscribe spam |

### 2.8 Admin Backend (管理后台)

| Sub-Feature | Happy Path | Edge Cases |
|-------------|------------|------------|
| Trading pair CRUD | Create BTC/USDT with params | Disable pair with open orders |
| Fee configuration | Set maker/taker fees per pair | Negative maker fee (rebate) |
| User management | Search, view, freeze account | Freeze during active withdrawal |
| Manual intervention | Cancel order, credit balance | Audit trail of all admin actions |
| System parameters | Update rate limits, maintenance mode | Enable maintenance during trading |
| Announcement | Post system notice | Scheduled announcement |
| Role-based access | Admin vs. support vs. read-only | Privilege escalation attempt |
| Audit log | All admin actions logged | Log tampering detection |

### 2.9 Risk Control (风控)

| Sub-Feature | Happy Path | Edge Cases |
|-------------|------------|------------|
| Withdrawal daily limit | Within limit → processed | Exactly at limit, then one more |
| Price protection | Order within ±X% of mark price | Flash crash, no recent trades |
| Position limit | Within max notional value | Cross-pair position aggregation |
| Abnormal trading | Wash trading detected → flagged | Coordinated accounts |
| Circuit breaker | Price drop >10% in 1min → halt | Resume after cooldown |
| IP/device risk | New device → additional verification | Tor/VPN usage |
| AML screening | Withdrawal address checked | Flagged address on OFAC list |
| Rate anomaly | Unusual order rate → throttle | Legitimate market maker vs. attacker |

---

## 3. Critical Edge Cases

### 3.1 Matching Engine Edge Cases

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| ME-E1 | **Self-trade prevention**: User A places buy@100, then sell@100 | Newer order rejected or cancelled (configurable STP mode) | Critical |
| ME-E2 | **Dust order**: Remaining qty after partial fill = 0.00000001 | Order marked as filled if remaining < min lot size | High |
| ME-E3 | **Price overflow**: qty=999999999 × price=999999999 | System rejects order or uses big-decimal safely | Critical |
| ME-E4 | **Empty order book + market order** | Market order rejected (no liquidity) with clear error | Critical |
| ME-E5 | **Exact price collision**: 1000 orders at same price | All filled in time priority order, no skips | High |
| ME-E6 | **Concurrent matching**: Two market orders hit same resting order | Only one fills; other gets next best or rejected | Critical |
| ME-E7 | **Engine crash mid-match**: Trade half-written | Recovery: either both sides see trade or neither (atomic) | Critical |
| ME-E8 | **Negative spread**: Best bid > best ask after batch insert | Immediate cross and matching | High |
| ME-E9 | **Cancel during matching**: Cancel arrives while order is being matched | Deterministic outcome: either cancel or fill, not both | Critical |
| ME-E10 | **Precision loss**: 0.1 + 0.2 ≠ 0.3 in floating point | All calculations use fixed-point/decimal | Critical |

### 3.2 Wallet Edge Cases

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| WL-E1 | **Insufficient balance for order** | Order rejected, no partial freeze | Critical |
| WL-E2 | **Concurrent withdrawals drain account** | Only first succeeds; second gets insufficient balance | Critical |
| WL-E3 | **Double-spend: same tx_hash credited twice** | Idempotent: only first credit applied | Critical |
| WL-E4 | **Withdraw during order fill** | Balance check atomic: withdraw fails if balance committed to trade | Critical |
| WL-E5 | **Chain reorg after deposit credited** | Deposit reversed, balance debited, user notified | Critical |
| WL-E6 | **Withdrawal fee > withdrawal amount** | Rejected with clear error | High |
| WL-E7 | **Integer overflow in balance** | Use big-integer/decimal, reject if exceeds max | Critical |
| WL-E8 | **Deposit to disabled asset** | Funds safe, manual recovery possible, user notified | High |
| WL-E9 | **Concurrent freeze+unfreeze** | Serialized: final balance = total - net frozen | Critical |
| WL-E10 | **Hot wallet drainage** | Alert when hot wallet below threshold; block further withdrawals | Critical |

### 3.3 WebSocket Edge Cases

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| WS-E1 | **Message ordering**: Server sends seq 5, client receives 3,5,4 | Client detects gap, requests re-sync | High |
| WS-E2 | **Reconnection with state recovery** | Client reconnects, receives missed messages or snapshot | High |
| WS-E3 | **Stale data after reconnect** | Snapshot timestamp checked; stale data discarded | High |
| WS-E4 | **Auth token expires mid-stream** | Server sends auth-required message; client re-authenticates | Medium |
| WS-E5 | **Slow consumer (backpressure)** | Server drops oldest messages or disconnects slow client gracefully | Medium |
| WS-E6 | **10,000 concurrent connections** | Server handles without OOM; degrades gracefully | High |
| WS-E7 | **Subscribe to non-existent pair** | Error message returned, connection stays open | Low |
| WS-E8 | **Rapid subscribe/unsubscribe** | No resource leak; clean state | Medium |
| WS-E9 | **Binary vs text frame mismatch** | Rejected with protocol error | Low |
| WS-E10 | **Server-side broadcast storm (1M msg/sec)** | Fan-out stays within latency SLA; messages batched if needed | High |

### 3.4 Order Type Edge Cases

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| OT-E1 | **Limit order at market price** | Treated as taker; fills immediately against book | High |
| OT-E2 | **Stop-loss trigger accuracy** | Triggers at exact stop price, not before | Critical |
| OT-E3 | **Partial fill then cancel** | Filled portion settled; remaining cancelled and balance unfrozen | Critical |
| OT-E4 | **FOK with insufficient liquidity** | Entire order rejected; no partial fill | High |
| OT-E5 | **IOC sweeps multiple price levels** | Fills at each level up to available qty; remainder cancelled | High |
| OT-E6 | **Post-only order that would match** | Rejected (not placed in book) | High |
| OT-E7 | **Stop-limit: trigger price reached but limit can't fill** | Order enters book as limit order at limit price | High |
| OT-E8 | **Market order with slippage protection** | Fills only up to max slippage; remainder cancelled | High |
| OT-E9 | **Multiple stop orders trigger on same trade** | All triggered in order-ID sequence | High |
| OT-E10 | **Expired GTC order (if TTL configured)** | Auto-cancelled, balance unfrozen, user notified | Medium |

---

## 4. Acceptance Criteria (Given/When/Then)

### 4.1 Matching Engine

**AC-ME-001: Basic Limit Order Matching**
```gherkin
Given the order book for BTC/USDT has a sell order: qty=1.0, price=50000
When a user places a buy limit order: qty=1.0, price=50000
Then a trade is executed at price=50000, qty=1.0
And the buy order status is "filled"
And the sell order status is "filled"
And buyer receives 1.0 BTC (minus fee)
And seller receives 50000 USDT (minus fee)
```

**AC-ME-002: Price-Time Priority**
```gherkin
Given sell orders in book:
  | id | price | qty | time     |
  | S1 | 50000 | 1.0 | 10:00:01 |
  | S2 | 50000 | 1.0 | 10:00:02 |
  | S3 | 49999 | 0.5 | 10:00:03 |
When a buy market order for qty=1.5 is placed
Then fills are:
  | against | price | qty |
  | S3      | 49999 | 0.5 |
  | S1      | 50000 | 1.0 |
And S2 remains open with qty=1.0
```

**AC-ME-003: Self-Trade Prevention**
```gherkin
Given user A has an open sell order at price=50000, qty=1.0
When user A places a buy order at price=50000, qty=1.0
Then the incoming buy order is rejected with error "self_trade_prevented"
And the existing sell order remains unchanged
And no trade is recorded
```

**AC-ME-004: Market Order on Empty Book**
```gherkin
Given the order book for ETH/USDT is empty (no sell orders)
When a user places a buy market order for qty=10.0
Then the order is rejected with error "insufficient_liquidity"
And user balance remains unchanged (nothing frozen)
```

**AC-ME-005: Partial Fill**
```gherkin
Given the order book has sell orders:
  | price | qty |
  | 50000 | 0.3 |
  | 50001 | 0.2 |
When a buy limit order is placed: qty=1.0, price=50001
Then two trades execute: (0.3@50000) and (0.2@50001)
And the buy order status is "partially_filled" with filled_qty=0.5
And remaining 0.5 stays in book at price=50001
```

### 4.2 Order Management

**AC-OM-001: Place Order with Balance Freeze**
```gherkin
Given user has 100,000 USDT available balance
When user places buy limit order: BTC/USDT, qty=1.0, price=50000
Then order is accepted with status "open"
And user's USDT available balance = 50,000
And user's USDT frozen balance = 50,000
```

**AC-OM-002: Cancel Order with Balance Unfreeze**
```gherkin
Given user has an open buy order: BTC/USDT, qty=1.0, price=50000 (frozen=50000 USDT)
When user cancels the order
Then order status changes to "cancelled"
And user's USDT frozen balance decreases by 50,000
And user's USDT available balance increases by 50,000
```

**AC-OM-003: Cancel Already-Filled Order**
```gherkin
Given user's order was fully filled 1 second ago
When user sends cancel request for that order
Then response is error "order_not_cancellable" with status 400
And no balance changes occur
```

**AC-OM-004: IOC Order with Partial Liquidity**
```gherkin
Given order book has sell: qty=0.5, price=50000 (only liquidity)
When user places IOC buy order: qty=1.0, price=50000
Then trade executes: 0.5@50000
And remaining 0.5 is immediately cancelled
And order final status is "cancelled" with filled_qty=0.5
```

**AC-OM-005: FOK Order with Insufficient Liquidity**
```gherkin
Given order book has sell: qty=0.5, price=50000 (only liquidity)
When user places FOK buy order: qty=1.0, price=50000
Then no trade executes
And order status is "cancelled" with filled_qty=0
And user balance is unchanged
```

### 4.3 Order Book

**AC-OB-001: Real-Time Depth Accuracy**
```gherkin
Given 3 sell orders at price=50000 with qty=1.0, 2.0, 3.0
When client requests order book depth for BTC/USDT
Then sell side shows: price=50000, total_qty=6.0
And depth is sorted asks ascending, bids descending
```

**AC-OB-002: Incremental Update Consistency**
```gherkin
Given client has received order book snapshot with seq=100
When server pushes incremental update seq=101 (new sell 0.5@50000)
Then client's local book shows updated qty at price=50000
And client verifies seq=101 = prev_seq+1 (no gap)
```

### 4.4 K-Line

**AC-KL-001: OHLCV Correctness**
```gherkin
Given trades in the 10:00-10:01 window:
  | time     | price | qty |
  | 10:00:05 | 50000 | 1.0 |
  | 10:00:30 | 50100 | 0.5 |
  | 10:00:45 | 49900 | 2.0 |
When requesting 1-minute candle at 10:00
Then candle is:
  | O     | H     | L     | C     | V   |
  | 50000 | 50100 | 49900 | 49900 | 3.5 |
```

**AC-KL-002: Empty Period Handling**
```gherkin
Given no trades occur between 10:01 and 10:02
When requesting 1-minute candle at 10:01
Then either: no candle returned, OR candle with O=H=L=C=previous close, V=0
```

### 4.5 Wallet

**AC-WL-001: Deposit Credit After Confirmations**
```gherkin
Given user's BTC deposit address receives 1.0 BTC in tx_abc
And the network requires 3 confirmations
When the transaction reaches 3 confirmations
Then user's BTC available balance increases by 1.0
And deposit record shows status="completed", tx_hash="tx_abc"
```

**AC-WL-002: Double-Spend Prevention on Deposit**
```gherkin
Given tx_abc has already been credited to user
When the system detects tx_abc again (re-scan, webhook retry)
Then no additional credit is applied
And an idempotency log entry is recorded
```

**AC-WL-003: Concurrent Withdrawal Race**
```gherkin
Given user has 1.0 BTC available
When two withdrawal requests for 0.8 BTC are submitted simultaneously
Then exactly one succeeds and one fails with "insufficient_balance"
And final balance = 0.2 BTC (not -0.6 BTC)
```

**AC-WL-004: Withdrawal During Active Order**
```gherkin
Given user has 1.0 BTC total, 0.5 BTC frozen (in open sell order)
When user requests withdrawal of 0.8 BTC
Then withdrawal is rejected: available=0.5 < requested=0.8
And frozen balance is unaffected
```

### 4.6 User System

**AC-US-001: Registration**
```gherkin
Given no account exists for email "test@example.com"
When a registration request is submitted with email="test@example.com", password="Str0ng!Pass"
Then account is created with status="active"
And a verification email is sent
And password is stored as bcrypt/argon2 hash (not plaintext)
```

**AC-US-002: Login with 2FA**
```gherkin
Given user has 2FA enabled with TOTP secret
When user provides correct email, password, and valid TOTP code
Then JWT access token is issued (expiry ≤ 15min)
And refresh token is issued (expiry ≤ 7 days)
```

**AC-US-003: Brute Force Protection**
```gherkin
Given user has failed login 5 times in 10 minutes
When user attempts a 6th login (even with correct password)
Then login is rejected with "account_temporarily_locked"
And lockout duration = 30 minutes
And admin is notified
```

### 4.7 WebSocket

**AC-WS-001: Real-Time Trade Push**
```gherkin
Given client is subscribed to BTC/USDT trade stream via WebSocket
When a trade executes at price=50000, qty=1.0
Then client receives trade message within 100ms
And message contains: price, qty, side, timestamp, trade_id
```

**AC-WS-002: Reconnection with Recovery**
```gherkin
Given client was connected and received messages up to seq=500
When connection drops and client reconnects after 5 seconds
Then client can request messages from seq=501
Or client receives a full snapshot with current seq
And no messages are permanently lost
```

### 4.8 Admin Backend

**AC-AB-001: Disable Trading Pair**
```gherkin
Given BTC/USDT pair is active with 100 open orders
When admin disables BTC/USDT pair
Then all 100 open orders are cancelled
And users' frozen balances are unfrozen
And new order placement for BTC/USDT is rejected
And existing positions are unaffected
```

**AC-AB-002: Fee Configuration**
```gherkin
Given admin sets BTC/USDT fees: maker=0.1%, taker=0.2%
When a taker trade of 1.0 BTC occurs
Then taker pays 0.002 BTC fee
And when a maker trade of 1.0 BTC occurs
Then maker pays 0.001 BTC fee
```

### 4.9 Risk Control

**AC-RC-001: Price Protection**
```gherkin
Given BTC/USDT last price = 50000
And price protection = ±5%
When user places buy limit at 55000 (10% above)
Then order is rejected with error "price_exceeds_protection_range"
```

**AC-RC-002: Withdrawal Daily Limit**
```gherkin
Given user KYC level 1 has daily withdrawal limit = 10,000 USDT equivalent
And user has withdrawn 9,500 USDT today
When user requests withdrawal of 1,000 USDT
Then withdrawal is rejected with error "daily_limit_exceeded"
And message shows remaining limit = 500 USDT
```

---

## 5. Concrete Test Cases (80+)

### 5.1 Matching Engine (TC-ME)

| ID | Test Case | Priority | Type |
|----|-----------|----------|------|
| TC-ME-001 | Limit buy matches exact limit sell at same price | P0 | Unit |
| TC-ME-002 | Limit buy at higher price matches lower sell (buyer gets better price) | P0 | Unit |
| TC-ME-003 | Market buy fills against multiple sell levels (price walk) | P0 | Unit |
| TC-ME-004 | Market buy on empty book → rejected | P0 | Unit |
| TC-ME-005 | Price priority: lower ask fills before higher ask | P0 | Unit |
| TC-ME-006 | Time priority: earlier order at same price fills first | P0 | Unit |
| TC-ME-007 | Partial fill: buy qty > sell qty, remainder stays in book | P0 | Unit |
| TC-ME-008 | Self-trade prevention: same user_id on both sides | P0 | Unit |
| TC-ME-009 | Dust order: remaining qty < min_lot_size → auto-filled/cancelled | P1 | Unit |
| TC-ME-010 | Price overflow: qty × price > max safe integer | P0 | Unit |
| TC-ME-011 | Zero-quantity order rejected | P0 | Unit |
| TC-ME-012 | Negative price order rejected | P0 | Unit |
| TC-ME-013 | Order at tick size boundary (e.g., 50000.01 when tick=0.01) | P1 | Unit |
| TC-ME-014 | Order not at tick size boundary rejected (50000.015 when tick=0.01) | P1 | Unit |
| TC-ME-015 | 10,000 orders at same price: all fill in time order | P1 | Unit |
| TC-ME-016 | Matching engine restart: book reconstructed from DB | P0 | Integration |
| TC-ME-017 | Concurrent order placement: two market buys hit same sell | P0 | Integration |
| TC-ME-018 | Trade event emitted with correct maker/taker labels | P1 | Unit |
| TC-ME-019 | Maker fee and taker fee calculated correctly per trade | P0 | Unit |
| TC-ME-020 | Limit buy at exactly best ask → immediate fill (taker) | P1 | Unit |

### 5.2 Order Management (TC-OM)

| ID | Test Case | Priority | Type |
|----|-----------|----------|------|
| TC-OM-001 | Place valid limit buy order → balance frozen | P0 | Integration |
| TC-OM-002 | Place order with insufficient balance → rejected | P0 | Integration |
| TC-OM-003 | Cancel open order → balance unfrozen | P0 | Integration |
| TC-OM-004 | Cancel already-filled order → error | P1 | Integration |
| TC-OM-005 | Cancel already-cancelled order → error (idempotent) | P1 | Integration |
| TC-OM-006 | Query open orders with pagination (limit=20, offset) | P1 | Integration |
| TC-OM-007 | Query order history by date range | P2 | Integration |
| TC-OM-008 | Order status transitions: new→open→partial_fill→filled | P0 | Unit |
| TC-OM-009 | IOC order: partial fill + cancel remainder | P0 | Unit |
| TC-OM-010 | FOK order: full book has enough → fill all | P0 | Unit |
| TC-OM-011 | FOK order: book has partial → reject entirely | P0 | Unit |
| TC-OM-012 | Post-only order that would match → rejected | P1 | Unit |
| TC-OM-013 | Batch cancel all orders for a trading pair | P1 | Integration |
| TC-OM-014 | Rate limit: >100 orders/sec → throttled | P1 | Integration |
| TC-OM-015 | Duplicate client_order_id → rejected | P1 | Integration |

### 5.3 Order Book (TC-OB)

| ID | Test Case | Priority | Type |
|----|-----------|----------|------|
| TC-OB-001 | Snapshot returns sorted bids (desc) and asks (asc) | P0 | Integration |
| TC-OB-002 | Depth aggregation: multiple orders at same price → summed qty | P0 | Unit |
| TC-OB-003 | Incremental update after new order placement | P0 | Integration |
| TC-OB-004 | Incremental update after order cancel | P0 | Integration |
| TC-OB-005 | Incremental update after trade (qty reduced) | P0 | Integration |
| TC-OB-006 | Depth levels limited to configurable max (e.g., 200 levels) | P2 | Unit |
| TC-OB-007 | Empty book returns empty bids and asks arrays | P1 | Unit |
| TC-OB-008 | Book checksum matches expected value | P1 | Integration |

### 5.4 K-Line (TC-KL)

| ID | Test Case | Priority | Type |
|----|-----------|----------|------|
| TC-KL-001 | Single trade → O=H=L=C, V=qty | P0 | Unit |
| TC-KL-002 | Multiple trades → correct OHLCV | P0 | Unit |
| TC-KL-003 | No trades in period → gap or carry-forward | P1 | Unit |
| TC-KL-004 | 1m, 5m, 15m, 1h, 1d periods all computed | P0 | Integration |
| TC-KL-005 | Trade at exact period boundary (e.g., 10:00:00.000) → belongs to new period | P1 | Unit |
| TC-KL-006 | Quote volume = Σ(price × qty) per period | P1 | Unit |
| TC-KL-007 | Historical candle query with start/end time filter | P1 | Integration |
| TC-KL-008 | Real-time candle update via WebSocket | P1 | Integration |

### 5.5 Wallet (TC-WL)

| ID | Test Case | Priority | Type |
|----|-----------|----------|------|
| TC-WL-001 | Query balance: available + frozen = total | P0 | Integration |
| TC-WL-002 | Deposit credited after N confirmations | P0 | Integration |
| TC-WL-003 | Deposit with duplicate tx_hash → idempotent | P0 | Integration |
| TC-WL-004 | Withdrawal: balance debited, tx broadcast | P0 | Integration |
| TC-WL-005 | Withdrawal with insufficient available balance → rejected | P0 | Integration |
| TC-WL-006 | Concurrent withdrawals: only one succeeds | P0 | Integration |
| TC-WL-007 | Freeze on order placement exact to order value | P0 | Unit |
| TC-WL-008 | Unfreeze on order cancel exact to unfilled value | P0 | Unit |
| TC-WL-009 | Withdrawal below minimum amount → rejected | P1 | Integration |
| TC-WL-010 | Withdrawal fee deduction correct | P1 | Unit |
| TC-WL-011 | Chain reorg: credited deposit reversed | P0 | Integration |
| TC-WL-012 | Hot wallet balance alert when below threshold | P1 | Integration |

### 5.6 User System (TC-US)

| ID | Test Case | Priority | Type |
|----|-----------|----------|------|
| TC-US-001 | Register with valid email and strong password | P0 | Integration |
| TC-US-002 | Register with duplicate email → error | P0 | Integration |
| TC-US-003 | Register with weak password → rejected | P1 | Integration |
| TC-US-004 | Login with correct credentials → tokens issued | P0 | Integration |
| TC-US-005 | Login with wrong password → 401 | P0 | Integration |
| TC-US-006 | Login brute force: 5 failures → lockout | P0 | Integration |
| TC-US-007 | 2FA setup: generate secret, verify first code | P0 | Integration |
| TC-US-008 | 2FA login: correct code → success | P0 | Integration |
| TC-US-009 | 2FA login: wrong code → rejected | P0 | Integration |
| TC-US-010 | 2FA login: replayed code → rejected | P1 | Integration |
| TC-US-011 | JWT refresh: valid refresh token → new access token | P1 | Integration |
| TC-US-012 | JWT expired → 401, must re-login | P1 | Integration |
| TC-US-013 | Password reset flow: email → token → new password | P1 | E2E |
| TC-US-014 | SQL injection in registration fields → sanitized | P0 | Integration |

### 5.7 WebSocket (TC-WS)

| ID | Test Case | Priority | Type |
|----|-----------|----------|------|
| TC-WS-001 | Subscribe to trade stream → receive trade events | P0 | Integration |
| TC-WS-002 | Subscribe to depth stream → receive book updates | P0 | Integration |
| TC-WS-003 | Private order updates with valid auth | P0 | Integration |
| TC-WS-004 | Private stream without auth → rejected | P0 | Integration |
| TC-WS-005 | Reconnect after disconnect → state recovered | P0 | Integration |
| TC-WS-006 | Message sequence gap detection | P1 | Integration |
| TC-WS-007 | Server sends ping → client responds pong → connection alive | P1 | Integration |
| TC-WS-008 | Client doesn't pong within timeout → disconnected | P2 | Integration |
| TC-WS-009 | Subscribe to non-existent pair → error message | P2 | Integration |
| TC-WS-010 | 1000 concurrent WS connections all receive same trade | P1 | Performance |

### 5.8 Risk Control (TC-RC)

| ID | Test Case | Priority | Type |
|----|-----------|----------|------|
| TC-RC-001 | Order price within protection range → accepted | P0 | Unit |
| TC-RC-002 | Order price outside protection range → rejected | P0 | Unit |
| TC-RC-003 | Withdrawal within daily limit → processed | P0 | Integration |
| TC-RC-004 | Withdrawal exceeds daily limit → rejected | P0 | Integration |
| TC-RC-005 | Circuit breaker triggers on 10% drop in 1 min | P0 | Integration |
| TC-RC-006 | Circuit breaker cooldown → trading resumes | P1 | Integration |
| TC-RC-007 | New device login → additional verification required | P1 | Integration |

### 5.9 E2E Trading Flows (TC-E2E)

| ID | Test Case | Priority | Type |
|----|-----------|----------|------|
| TC-E2E-001 | Full flow: register → KYC → deposit → buy BTC → sell BTC → withdraw | P0 | E2E |
| TC-E2E-002 | Maker places limit sell, taker places market buy → trade settles, balances correct | P0 | E2E |
| TC-E2E-003 | User places order, partial fill, cancel remainder, withdraw filled amount | P0 | E2E |
| TC-E2E-004 | WebSocket client receives real-time trade + order update during E2E trade | P0 | E2E |
| TC-E2E-005 | Admin disables pair → user's open orders cancelled → user receives WS notification | P1 | E2E |
| TC-E2E-006 | Concurrent: 100 users place orders simultaneously → all matched correctly | P0 | E2E |
| TC-E2E-007 | System under load: 10k orders/sec → no data loss, latency within SLA | P0 | Performance |

**Total test cases: 83**

---

## 6. Performance Benchmarks

### 6.1 Matching Engine

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Single match latency (p50) | ≤ 50μs | Micro-benchmark, in-process |
| Single match latency (p99) | ≤ 200μs | Micro-benchmark, in-process |
| Throughput (orders/sec) | ≥ 100,000 | Sustained load test, 5 min |
| Throughput (matches/sec) | ≥ 50,000 | Crossing orders at same price |
| Order book depth rebuild | ≤ 5s for 1M orders | Cold start from DB |
| Cancel latency | ≤ 100μs | Cancel open order |

### 6.2 API

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Place order API (p50) | ≤ 5ms | k6 load test |
| Place order API (p99) | ≤ 20ms | k6 load test, 10k concurrent |
| Query order API (p50) | ≤ 10ms | With pagination |
| Query balance API (p50) | ≤ 5ms | Cached response |
| Order book snapshot API (p50) | ≤ 10ms | 200 levels |
| API throughput | ≥ 10,000 req/sec | Mixed read/write |

### 6.3 WebSocket

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Message delivery latency (p50) | ≤ 10ms | Trade event → client receipt |
| Message delivery latency (p99) | ≤ 100ms | Under load |
| Fan-out: 10k subscribers | ≤ 50ms for all | Single trade event |
| Fan-out: 100k subscribers | ≤ 200ms for all | Single trade event |
| Max concurrent connections | 100,000 | Sustained, no OOM |
| Messages/sec per connection | ≥ 100 | Burst scenario |
| Reconnection time | ≤ 2s | Client auto-reconnect |

### 6.4 Database

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Trade write latency (p99) | ≤ 5ms | Insert single trade record |
| Balance update latency (p99) | ≤ 5ms | Atomic update with row lock |
| Order query (indexed) | ≤ 10ms | By user_id + status |
| K-line query (time range) | ≤ 20ms | 500 candles |
| DB connection pool utilization | ≤ 70% | Under peak load |

### 6.5 System-Level

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| End-to-end order-to-trade | ≤ 50ms | API submit → trade confirmed |
| System uptime | ≥ 99.95% | Monthly measurement |
| Recovery time (engine crash) | ≤ 30s | Kill process → auto-restart → serving |
| Data loss on crash | 0 trades lost | WAL + journaling verification |

---

## 7. Test Data Strategy

### 7.1 Seed Trading Pairs

```json
[
  {
    "symbol": "BTC/USDT",
    "base": "BTC",
    "quote": "USDT",
    "price_precision": 2,
    "qty_precision": 6,
    "min_qty": 0.000001,
    "max_qty": 1000,
    "min_notional": 10,
    "tick_size": 0.01,
    "lot_size": 0.000001,
    "maker_fee": 0.001,
    "taker_fee": 0.002,
    "status": "active"
  },
  {
    "symbol": "ETH/USDT",
    "base": "ETH",
    "quote": "USDT",
    "price_precision": 2,
    "qty_precision": 5,
    "min_qty": 0.00001,
    "max_qty": 10000,
    "min_notional": 10,
    "tick_size": 0.01,
    "lot_size": 0.00001,
    "maker_fee": 0.001,
    "taker_fee": 0.002,
    "status": "active"
  },
  {
    "symbol": "ETH/BTC",
    "base": "ETH",
    "quote": "BTC",
    "price_precision": 6,
    "qty_precision": 4,
    "min_qty": 0.0001,
    "max_qty": 50000,
    "min_notional": 0.0001,
    "tick_size": 0.000001,
    "lot_size": 0.0001,
    "maker_fee": 0.001,
    "taker_fee": 0.002,
    "status": "active"
  },
  {
    "symbol": "DOGE/USDT",
    "base": "DOGE",
    "quote": "USDT",
    "price_precision": 5,
    "qty_precision": 0,
    "min_qty": 1,
    "max_qty": 100000000,
    "min_notional": 1,
    "tick_size": 0.00001,
    "lot_size": 1,
    "maker_fee": 0.001,
    "taker_fee": 0.002,
    "status": "active"
  },
  {
    "symbol": "XRP/USDT",
    "base": "XRP",
    "quote": "USDT",
    "price_precision": 4,
    "qty_precision": 1,
    "min_qty": 0.1,
    "max_qty": 10000000,
    "min_notional": 5,
    "tick_size": 0.0001,
    "lot_size": 0.1,
    "maker_fee": 0.001,
    "taker_fee": 0.002,
    "status": "active"
  }
]
```

### 7.2 Test Users

| User ID | Role | KYC Level | Balances | Purpose |
|---------|------|-----------|----------|---------|
| `test-maker-01` | Trader | Level 2 | 100 BTC, 5,000,000 USDT | Market maker simulation |
| `test-maker-02` | Trader | Level 2 | 1000 ETH, 3,000,000 USDT | Market maker simulation |
| `test-taker-01` | Trader | Level 1 | 10 BTC, 500,000 USDT | Regular taker |
| `test-taker-02` | Trader | Level 1 | 100 ETH, 200,000 USDT | Regular taker |
| `test-new-user` | Trader | Level 0 | 0 (all assets) | New user flows |
| `test-broke-user` | Trader | Level 1 | 0.00000001 BTC | Insufficient balance tests |
| `test-whale` | Trader | Level 3 | 1000 BTC, 50,000,000 USDT | Large order tests |
| `test-restricted` | Trader | Frozen | 10 BTC, 100,000 USDT | Frozen account tests |
| `test-admin-01` | Admin | — | — | Admin operations |
| `test-support-01` | Support | — | — | Read-only admin |
| `test-stp-user` | Trader | Level 1 | 10 BTC, 500,000 USDT | Self-trade prevention tests |
| `test-bot-01` | API Bot | Level 2 | 50 BTC, 2,000,000 USDT | High-frequency order tests |

### 7.3 Seed Order Book (BTC/USDT)

For integration and E2E tests, pre-populate the book:

```
SELL SIDE (ASKS):
  52000.00  |  2.000000
  51500.00  |  5.000000
  51000.00  |  3.500000
  50800.00  |  1.200000
  50500.00  |  0.800000
  ---------------------
  50200.00  |  1.500000   ← best ask
  =====================
  50000.00  |  2.000000   ← best bid
  ---------------------
  49800.00  |  1.000000
  49500.00  |  3.000000
  49000.00  |  5.000000
  48500.00  |  2.500000
  48000.00  |  10.000000
BUY SIDE (BIDS)
```

### 7.4 Test Data Generation Strategy

| Data Type | Strategy | Volume |
|-----------|----------|--------|
| **Unit tests** | Hardcoded fixtures in test files | Per-test |
| **Integration** | DB seeds via migration scripts | ~1000 orders, ~100 trades |
| **E2E** | API-driven setup in `beforeAll` | Full user journey data |
| **Performance** | Programmatic generation | 1M+ orders, 100k+ trades |
| **Chaos** | Mirror of production snapshot (anonymized) | Production-scale |

### 7.5 Test Environment Isolation

```
┌─────────────────────────────────────────────────┐
│ CI/CD Pipeline                                   │
│                                                   │
│  ┌──────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  Unit     │  │ Integration  │  │    E2E     │ │
│  │  Tests    │  │   Tests      │  │   Tests    │ │
│  │          │  │              │  │            │ │
│  │ No deps  │  │ Testcontainer│  │  Staging   │ │
│  │ Mocked   │  │ Postgres     │  │  Env       │ │
│  │          │  │ Redis        │  │  (shared)  │ │
│  │          │  │ Kafka        │  │            │ │
│  └──────────┘  └──────────────┘  └────────────┘ │
│   <30s           <3min              <15min       │
└─────────────────────────────────────────────────┘
```

### 7.6 Data Cleanup Policy

- **Unit tests**: Stateless, no cleanup needed
- **Integration tests**: Each test uses a transaction that rolls back (`beforeEach` / `afterEach`)
- **E2E tests**: Dedicated DB, truncated between test suites
- **Performance tests**: Separate environment, data retained for analysis

---

## 8. Non-Functional Testing

### 8.1 Security Testing

| Area | Tests |
|------|-------|
| **Authentication** | JWT tampering, expired tokens, privilege escalation |
| **Authorization** | Cross-user data access, admin endpoint without role |
| **Input validation** | SQL injection, XSS in user fields, oversized payloads |
| **Rate limiting** | API DDoS simulation, WS connection flood |
| **Encryption** | TLS enforcement, password hashing verification, API key storage |
| **OWASP Top 10** | Full scan with ZAP/Burp |
| **Dependency audit** | Known CVE scan (npm audit / cargo audit) |

### 8.2 Reliability Testing

| Scenario | Expected Behavior |
|----------|-------------------|
| Database primary failover | Read-only mode, then full recovery < 30s |
| Redis cluster node failure | Graceful degradation, WS reconnect |
| Matching engine process crash | Auto-restart, book rebuilt, no trade loss |
| Network partition (engine ↔ DB) | Engine pauses matching, resumes on reconnect |
| Full disk on DB server | Alert, reject writes, no corruption |
| OOM on API server | Pod restart, request retry |

### 8.3 Compatibility Testing

| Client | Scope |
|--------|-------|
| Web (Chrome, Firefox, Safari, Edge) | Trading UI, order book, charts |
| Mobile (iOS Safari, Android Chrome) | Responsive layout, touch interactions |
| API clients (Python, Node, Go) | SDK compatibility, serialization |
| WebSocket clients | Multiple library compatibility |

---

## 9. Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Double-spend on deposit** | Low | Critical ($$$) | Idempotent tx processing, confirmation threshold |
| **Matching engine precision error** | Medium | Critical | Fixed-point arithmetic, comprehensive unit tests |
| **Balance going negative** | Low | Critical | DB-level CHECK constraint + app-level validation |
| **Self-trade manipulation** | Medium | High | STP mode per account, monitoring |
| **WebSocket data loss** | Medium | High | Sequence numbers, snapshot recovery |
| **Admin privilege escalation** | Low | Critical | RBAC, audit logging, 2FA for admin |
| **DDoS on trading API** | High | High | Rate limiting, WAF, geo-blocking |
| **Chain reorg after credit** | Medium | High | Adequate confirmation count, reorg monitoring |
| **Flash crash without circuit breaker** | Medium | Critical | Price band protection, circuit breaker |
| **Data corruption on crash** | Low | Critical | WAL, fsync, transaction integrity tests |

---

## Appendix A: Test Naming Convention

```
<Module>.<Feature>.<Scenario>

Examples:
  matching.limit_order.exact_price_match
  matching.market_order.empty_book_rejected
  wallet.deposit.duplicate_txhash_idempotent
  wallet.withdraw.concurrent_race_condition
  websocket.trade_stream.message_ordering
  user.login.brute_force_lockout
  risk.price_protection.order_exceeds_band
```

## Appendix B: CI/CD Test Gates

| Stage | Tests Run | Pass Criteria | Block Release? |
|-------|-----------|---------------|----------------|
| Pre-commit | Lint + Unit | 100% pass | Yes |
| PR | Unit + Integration | 100% pass, coverage ≥ 80% | Yes |
| Merge to main | Unit + Integration + E2E | 100% pass | Yes |
| Pre-release | All + Performance + Security | All pass, perf within SLA | Yes |
| Post-release | Smoke tests in production | Core flows pass | Rollback |

## Appendix C: Coverage Targets

| Module | Line Coverage | Branch Coverage |
|--------|--------------|-----------------|
| Matching Engine | ≥ 95% | ≥ 90% |
| Order Management | ≥ 90% | ≥ 85% |
| Wallet | ≥ 90% | ≥ 85% |
| User/Auth | ≥ 85% | ≥ 80% |
| WebSocket | ≥ 80% | ≥ 75% |
| Admin | ≥ 80% | ≥ 75% |
| Risk Control | ≥ 90% | ≥ 85% |

---

*End of Test Strategy Document*
