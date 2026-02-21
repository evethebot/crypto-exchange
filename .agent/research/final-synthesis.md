# Final Synthesis — All Refinement Questions Resolved

> **Date:** 2026-02-22
> **Status:** FINAL — All 30 questions resolved
> **Round:** 2 (Final)
> **Guiding Principles:** Simplicity wins, one-click startup, English code / Chinese docs, MVP-first, real-feeling demo

---

## 1. Refinement Question Resolutions

### Architecture Questions

**RQ-ARCH-001: Missing schema tables (KYC, deposits/withdrawals, audit logs, login history)**
- **Decision:** Adopt the proposed schema additions as-is from synthesis §6.
- **Rationale:** All four tables are necessary for the features that all agents agree on. The schema additions are clean, minimal, and directly support the designer's UX flows.

**RQ-ARCH-002: KYC fields on users table**
- **Decision:** Option (c) — Both denormalized fields on `users` + `kyc_verifications` table.
- **Rationale:** Denormalized `kyc_level` and `kyc_status` on `users` enables fast checks in middleware (every order placement checks KYC level). The `kyc_verifications` table provides audit trail and supports the admin review queue. This is the standard pattern for frequently-read, rarely-written data.

**RQ-ARCH-003: Deposit/withdrawal data model**
- **Decision:** Option (a) — Separate `deposits` and `withdrawals` tables.
- **Rationale:** Deposits and withdrawals have fundamentally different state machines (deposit: pending→confirming→completed; withdrawal: pending_approval→processing→confirming→completed/rejected/cancelled). Separate tables are cleaner than overloading `wallet_transactions` with polymorphic status columns. `wallet_transactions` remains as the financial ledger (every balance change), while deposits/withdrawals track the operational workflow.

**RQ-ARCH-004: Email verification approach**
- **Decision:** Option (c) — Skip email verification for MVP, auto-verify on registration.
- **Rationale:** Email verification requires SMTP setup (another external dependency). For an educational demo, users should be able to register and start exploring immediately. The registration flow still collects email, and the `users.status` field supports `pending_verification` for future implementation. Auto-verify means `status = 'active'` immediately after registration.

**RQ-ARCH-005: Password reset**
- **Decision:** Option (c) — Defer to post-MVP.
- **Rationale:** Password reset requires either SMTP (for reset emails) or a separate token system. For a demo project where users can simply re-register, this adds complexity without educational value. The API endpoint stubs can exist (return 501) to demonstrate the architecture pattern.

**RQ-ARCH-006: Post-only orders**
- **Decision:** Option (c) — Out of scope for this project.
- **Rationale:** Post-only is a niche feature primarily for professional market makers. It adds complexity to the matching engine (must check if order would cross, reject if so) without significant educational value. The matching engine already demonstrates maker/taker concepts through limit orders.

**RQ-ARCH-007: Market order slippage protection (maxSlippage)**
- **Decision:** Yes, add `maxSlippage` parameter to market orders.
- **Rationale:** This is a simple but important safety feature with high educational value. It teaches students about slippage risk, market impact, and order protection. Implementation is straightforward: during matching, if cumulative slippage exceeds `maxSlippage`, cancel remaining quantity. Default: no limit (for backward compatibility). Optional parameter on the API.

**RQ-ARCH-008: Empty K-line period behavior**
- **Decision:** Option (b) — Carry-forward candles (O=H=L=C=previous close, V=0).
- **Rationale:** Carry-forward creates a continuous time series, which is what TradingView Lightweight Charts expects. Gaps in data cause visual artifacts in the chart. Writing carry-forward candles to DB is minimal overhead and simplifies the frontend chart integration. The `trade_count=0` field distinguishes real candles from carry-forward ones.

**RQ-ARCH-009: WebSocket reconnection strategy**
- **Decision:** Option (c) — Snapshot + client-side seq validation.
- **Rationale:** Full message replay requires server-side message buffering (memory overhead, complexity). Snapshot-based recovery is simpler and reliable. Adding `lastUpdateId` to depth snapshots lets clients detect gaps (if their local seq doesn't match, request fresh snapshot). This is exactly how Binance does it — proven pattern.

**RQ-ARCH-010: Performance benchmark targets**
- **Decision:** Yes, 10k orders/sec is appropriate and achievable for Node.js single-process demo.
- **Revised targets:**
  - Matching throughput: 10,000 orders/sec
  - Match latency p50: 500μs, p99: 5ms
  - API place order p99: 50ms
  - WS fan-out 1k subscribers: 100ms
  - Max concurrent WS connections: 10,000
  - Order book rebuild (10k orders): < 2s

### Design Questions

**RQ-DESIGN-001: Referral program**
- **Decision:** Option (a) — Remove from MVP entirely.
- **Rationale:** Referral programs require their own data model (referral codes, tracking, rewards calculation). Zero educational value for a trading system demo. Remove from sitemap.

**RQ-DESIGN-002: KYC level required for trading**
- **Decision:** Option (c) — Allow trading with low limits at Level 0.
- **Rationale:** For an educational demo, the "register → trade immediately" experience is paramount. Users should feel the exchange working within seconds. KYC gates withdrawal limits only:
  - Level 0 (email only): Trade up to $500/day, no withdrawals
  - Level 1 (phone verified): Trade up to $10,000/day, withdraw $2,000/day
  - Level 2 (ID verified): Unlimited trading, withdraw $50,000/day

**RQ-DESIGN-003: VIP fee tier system**
- **Decision:** Option (b) — Flat fee per pair, admin configurable.
- **Rationale:** VIP tiers require 30-day volume tracking, automatic tier progression/demotion, and per-user fee calculation. This is significant complexity for a demo. Flat fees per pair (stored as `maker_fee_bps` and `taker_fee_bps` on `trading_pairs`) are simpler and demonstrate the fee concept adequately. Admin can adjust fees per pair. The `fee_tiers` table stays in schema for future use but is not active in MVP.

**RQ-DESIGN-004: Anti-phishing code and IP whitelist**
- **Decision:** Option (a) — Defer entirely.
- **Rationale:** Both features require additional infrastructure (anti-phishing: email template system; IP whitelist: request IP tracking and comparison). Low educational value for a demo. Remove from security settings UI.

**RQ-DESIGN-005: Deposit states**
- **Decision:** Option (b) — Simulated confirmation progress.
- **Rationale:** Showing the deposit confirmation flow (pending → confirming 1/3 → 2/3 → 3/3 → completed) teaches users about blockchain confirmations, which is a core CEX concept. Implementation: 3-second delay with animated progress, then auto-complete. This makes the demo feel realistic without requiring actual blockchain integration.

**RQ-DESIGN-006: 2FA setup edge cases**
- **Decision:** Simplified 2FA for demo:
  - If user scans QR but doesn't verify: `totp_secret` is stored but `totp_enabled` remains `false`. User can re-initiate setup (generates new secret).
  - Enable 2FA twice: idempotent — if already enabled, show "2FA is already enabled" message.
  - Lost device recovery: For demo, admin can disable user's 2FA via admin panel. No self-service recovery flow (would require backup codes or SMTP).

**RQ-DESIGN-007: Biometric login**
- **Decision:** Option (a) — No biometric.
- **Rationale:** WebAuthn/FIDO2 is a significant implementation effort. The demo runs in a browser where biometric is handled by the OS/browser password manager, not our code. Out of scope.

**RQ-DESIGN-008: OCO order form at 480px width**
- **Decision:** OCO form uses expandable/collapsible sections at narrow widths.
- **Rationale:** At 480px, the OCO form shows "Take Profit" and "Stop Loss" as collapsible sections, with amount shared between them. This fits within the 25% panel width. On mobile, the order form becomes full-width as a bottom sheet, so width is not an issue.

**RQ-DESIGN-009: Landing page scope**
- **Decision:** Option (a) — Simple hero + CTA + live ticker marquee.
- **Rationale:** The landing page is not the core educational value of this project. A simple, clean landing page with a live ticker (demonstrating the WebSocket integration), a hero section with CTA ("Start Trading"), and brief feature highlights (3-4 cards) is sufficient. One day of work maximum.

### Market Questions

**RQ-MARKET-001: Redis necessity**
- **Decision:** Agree — Redis is unnecessary for MVP.
- **Rationale:** The architect's in-memory approach is correct for a single-process demo. Redis would add a Docker dependency and network overhead without benefit at this scale. The project's "npm run dev 一键启动" goal is better served by fewer dependencies.

**RQ-MARKET-002: PWA support**
- **Decision:** Option (b) — Basic PWA (manifest + service worker for offline shell).
- **Rationale:** A basic PWA manifest enables "Add to Home Screen" on mobile, which is a nice touch for a demo. The service worker can cache the app shell for fast reload. No push notifications needed. This is ~2 hours of work with next-pwa.

**RQ-MARKET-003: Language for code and docs**
- **Decision:** Option (d) — English code + Chinese docs/README.
- **Rationale:** English code is standard practice and reaches a wider audience. Chinese README and documentation serve the primary audience (Chinese developers learning CEX architecture). Code comments in English, README.md in Chinese with English section.

**RQ-MARKET-004: Code comments language**
- **Decision:** Option (d) — English code + Chinese documentation.
- **Rationale:** Same as RQ-MARKET-003. All code, comments, variable names, and commit messages in English. README, CONTRIBUTING, and tutorial docs in Chinese. This is the standard for Chinese open-source projects targeting an international audience.

**RQ-MARKET-005: Seed data market simulation**
- **Decision:** Option (d) — Historical candles + live bot for ongoing activity.
- **Rationale:** Static seed data makes the exchange feel dead. A combination of:
  1. Pre-seeded historical candles (imported from public API data) for chart history
  2. A simple market-making bot that runs on startup, placing random orders around current price
  This creates a "living" exchange where new users immediately see activity. The bot is also an excellent educational component (students can study/modify it).

### QA Questions

**RQ-QA-001: Revised performance benchmarks**
- **Decision:** Adopt revised Node.js-realistic targets:
  - Matching throughput: 10,000 orders/sec
  - Match latency p50: 500μs, p99: 5ms
  - API place order p50: 10ms, p99: 50ms
  - Order book rebuild (10k orders): < 2s
  - WS fan-out 1k subscribers: < 100ms
  - Max concurrent WS connections: 10,000
  - End-to-end order-to-trade: < 100ms

**RQ-QA-002: KYC test cases**
- **Decision:** Add simplified KYC test cases for demo:
  - TC-KYC-001: Level 1 submission (simulated phone code) → auto-approved
  - TC-KYC-002: Level 2 submission (simulated document upload) → pending review
  - TC-KYC-003: Admin approves KYC → user level updated
  - TC-KYC-004: Admin rejects KYC → user notified, can resubmit
  - TC-KYC-005: Level 0 user can trade within limits
  - TC-KYC-006: Level 0 user cannot withdraw

**RQ-QA-003: Admin stats test cases**
- **Decision:** Add admin stats test cases:
  - TC-ADMIN-001: GET /admin/stats returns correct 24h volume
  - TC-ADMIN-002: GET /admin/stats returns correct total users count
  - TC-ADMIN-003: GET /admin/stats returns per-pair breakdown
  - TC-ADMIN-004: Regular user → 403 on admin endpoints
  - TC-ADMIN-005: Admin can freeze/unfreeze user

**RQ-QA-004: Order book checksum vs lastUpdateId**
- **Decision:** Option (c) — Use `lastUpdateId` sequence as a lighter-weight consistency check.
- **Rationale:** CRC32 checksum computation on every book update is unnecessary overhead for a demo. `lastUpdateId` (monotonically increasing sequence number) is how Binance handles it: client tracks the sequence, detects gaps, and requests a fresh snapshot when needed. Simpler to implement, equally effective for consistency.

**RQ-QA-005: Test infrastructure to match actual stack**
- **Decision:** Updated test infrastructure:
  - PostgreSQL: Docker (testcontainers for integration tests)
  - Order book: In-memory (no external dependency, tested in-process)
  - WebSocket: In-process `ws` server (test client connects to same process)
  - No Redis, no Kafka — remove from test strategy
  - E2E: Playwright against dev server running full stack

**RQ-QA-006: Self-trade prevention mode**
- **Decision:** Option (b) — Single mode, cancel resting (maker) order.
- **Rationale:** The architect's choice is the industry standard (Binance uses this mode by default). Configurable STP modes add complexity without educational value. Cancel-resting ensures the taker's intent is honored (they wanted to trade NOW), while the maker's passive order is removed. Simple, deterministic, easy to test.

**RQ-QA-007: Responsive and accessibility testing**
- **Decision:** Option (c) — Both viewport tests + axe-core.
- **Rationale:** Playwright supports viewport testing natively (set viewport size, take screenshot, verify elements visible). axe-core integration (@axe-core/playwright) provides automated WCAG compliance checking. Both are low-effort, high-value additions to the E2E test suite. Focus on:
  - Viewport tests: 375px (mobile), 768px (tablet), 1920px (desktop)
  - axe-core: Run on trading page, wallet page, admin dashboard

**RQ-QA-008: Missing test cases**
- **Decision:** Add all missing test cases:
  1. Email verification: Skipped (auto-verify, see RQ-ARCH-004)
  2. Password reset: Deferred (see RQ-ARCH-005)
  3. Deposit flow E2E: TC-DEP-001 (simulated deposit with confirmation progress)
  4. Withdrawal flow E2E: TC-WD-001 through TC-WD-004 (request → status tracking)
  5. Admin user management: TC-ADMIN-006 (freeze user), TC-ADMIN-007 (unfreeze)
  6. Landing page: TC-LP-001 (loads, ticker displays), TC-LP-002 (CTA navigates to register)

### Cross-Cutting Questions

**RQ-ALL-001: Admin dashboard location**
- **Decision:** Option (a) — Same Next.js app, `/admin` route group.
- **Rationale:** Single deployment, shared types, shared auth. The `(admin)` route group in Next.js App Router provides clean separation. Admin routes are protected by middleware checking `user.role === 'admin'`. No need for a separate app for a demo project.

**RQ-ALL-002: Behavior when admin disables trading pair**
- **Decision:** Yes — cancel all open orders + WS notification.
- **Behavior:**
  1. Admin sets pair status to `suspended`
  2. All open orders for that pair are cancelled
  3. Frozen balances are unfrozen
  4. Each affected user receives a WS `orders` channel message with `event: 'order.cancelled'` and `reason: 'pair_suspended'`
  5. New order placement for that pair returns 400 with error `pair_not_active`
  6. Existing positions (balances) are unaffected

**RQ-ALL-003: Demo mode indicator**
- **Decision:** Option (d) — Persistent banner + README.
- **Rationale:** A small, non-intrusive banner at the top of the page ("🔬 Demo Exchange — No real funds") prevents confusion while not disrupting the UI. The README prominently states this is an educational project. The banner can be dismissed by the user (stored in localStorage) but reappears on new sessions.

---

## 2. Unified Feature Requirements (Post-Resolution)

All 30 questions are now resolved. The unified requirements incorporate:
- Architect's full schema + 4 additional tables (KYC, deposits, withdrawals, audit_logs)
- Designer's UX flows with simplified KYC (Level 0 can trade)
- No email verification, no password reset (MVP simplification)
- No Redis, no Socket.io, no NextAuth.js, no biometric
- Market order slippage protection included
- Carry-forward candles for chart continuity
- Snapshot + seq validation for WS reconnection
- Flat fees per pair (no VIP tiers for MVP)
- English code, Chinese documentation
- Historical candles + live market-making bot for seed data
- Basic PWA support
- Simple landing page with live ticker
- Demo mode banner

---

## 3. Final Phase Plan

### Phase 1: Foundation (Week 1)
- Next.js 14+ project setup with custom server.ts
- Full database schema (all tables including KYC, deposits, withdrawals, audit_logs)
- Drizzle ORM configuration + migrations
- User registration (email + password, auto-verified)
- User login (JWT access + refresh tokens)
- Basic wallet system (balance, simulated deposit with confirmation animation)
- Dark theme UI shell (navigation, layout)
- Landing page (hero + CTA + live ticker placeholder)
- Demo mode banner

### Phase 2: Trading Core (Week 2)
- Matching engine: limit orders (price-time priority)
- Order placement API + balance freeze
- Order cancellation API + balance unfreeze
- Trade execution + settlement
- Trading pair seed data (BTC/USDT, ETH/USDT, ETH/BTC, DOGE/USDT, XRP/USDT)
- Basic trading page layout (chart placeholder + order book + order form)
- Open orders table

### Phase 3: Real-Time (Week 3)
- Matching engine: market orders (with maxSlippage)
- WebSocket server (ws library, custom server.ts upgrade handler)
- Channels: depth, trade, ticker, kline, orders, wallet
- Frontend: live order book component
- Frontend: recent trades component
- Frontend: order form connected to API
- Frontend: order history table
- WS reconnection with snapshot recovery

### Phase 4: Charts & Market Data (Week 4)
- Candle aggregation engine (OHLCV, carry-forward)
- Historical candle REST API
- TradingView Lightweight Charts integration
- Chart header (time intervals, type selector)
- Trading pair selector modal (search, favorites, sort)
- Market-making bot (seed data + ongoing activity)
- Historical candle seed data

### Phase 5: Advanced Orders & Risk (Week 5)
- Stop-loss + stop-limit orders
- OCO orders
- IOC / FOK time-in-force
- Self-trade prevention (cancel resting order)
- Price protection (circuit breaker)
- Full order validation suite
- Rate limiting

### Phase 6: Polish & Admin (Week 6)
- 2FA (TOTP) setup + login
- KYC flow (simulated L0/L1/L2)
- Simulated withdrawal (with status tracking)
- Admin dashboard (stats, volume, user count)
- Admin: pair management (CRUD + disable with order cancellation)
- Admin: fee configuration (per-pair)
- Admin: user management (list, freeze/unfreeze)
- Admin: KYC review queue
- Wallet overview (total balance, allocation)
- Transaction history (deposits/withdrawals)
- Light theme option
- Basic PWA (manifest + service worker)
- Responsive layout adjustments
- Accessibility basics (ARIA labels, keyboard nav)

---

*End of Final Synthesis — All conflicts resolved, ready for spec.md and features.json generation.*
