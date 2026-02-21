# Refinement Questions — Round 1

> **Date:** 2026-02-22  
> **Context:** Post-synthesis, targeting specific gaps and unresolved issues  
> **Goal:** Collect answers to finalize the specification before implementation begins

---

## For the Technical Architect

### Schema & Data Model

**RQ-ARCH-001:** Your schema is missing tables for KYC, deposits/withdrawals (with status tracking), audit logs, and login history. The synthesis proposes additions in §6. Please review and either:
- (a) Adopt the proposed schema additions as-is
- (b) Provide your own versions with rationale for differences
- (c) Flag any that you believe should be deferred and why

**RQ-ARCH-002:** The `users` table currently has no fields for `kyc_level` or `kyc_status`. The designer requires KYC Level 0 (email only), Level 1 (phone), Level 2 (ID document). Should we:
- (a) Add `kyc_level` and `kyc_status` columns directly to the `users` table
- (b) Keep user clean and derive KYC state from the `kyc_verifications` table
- (c) Both (denormalized field on users for fast checks + verification table for audit)

**RQ-ARCH-003:** Your current schema uses `wallet_transactions` for audit but has no separate `deposits`/`withdrawals` tables. The designer defines 7 withdrawal states (pending_approval → processing → confirming → completed/failed/rejected/cancelled). How should we model this?
- (a) Separate `deposits` and `withdrawals` tables (synthesis proposal)
- (b) Extended `wallet_transactions` with a `status` column and withdrawal-specific fields
- (c) Something else?

### Auth Flow

**RQ-ARCH-004:** Your auth design doesn't include email verification or password reset flows, but the designer requires both. For email verification, which approach do you recommend?
- (a) JWT-based verification token (signed URL, expires in 24h, stateless)
- (b) Database-stored verification code (6-digit, expires in 10min, like OTP)
- (c) Skip email verification for MVP (auto-verify on registration)

**RQ-ARCH-005:** For password reset, same question:
- (a) JWT-based reset token in email link
- (b) Database-stored reset token
- (c) Defer to post-MVP

### Matching Engine

**RQ-ARCH-006:** The QA strategist tests for "Post-only" orders (TC-OM-012: limit order that would immediately match → rejected instead of filled). This is a useful feature for market makers. Is it in scope? If yes, should it be:
- (a) A new `order_time_in_force` value: `POST_ONLY`
- (b) A boolean flag on the order: `postOnly: true`
- (c) Out of scope for this project

**RQ-ARCH-007:** The QA strategist tests for market order slippage protection (OT-E8: "fills only up to max slippage; remainder cancelled"). Should we add a `maxSlippage` parameter to market orders? This prevents users from accidentally filling at terrible prices on thin order books.

**RQ-ARCH-008:** How should we handle empty K-line periods (no trades in a candle interval)?
- (a) No candle record created (API returns gap, frontend interpolates)
- (b) Carry-forward candle: O=H=L=C=previous.close, V=0 (written to DB)
- (c) Only carry-forward on real-time WebSocket push, but no DB record

**RQ-ARCH-009:** For WebSocket reconnection, you use snapshot-based recovery. The QA strategist expects sequence-number-based message replay (AC-WS-002, WS-E1). Should we:
- (a) Stick with snapshot-only (simpler, your current design)
- (b) Add a short message buffer (last 1000 messages per channel) for seq-based replay
- (c) Snapshot + client-side seq validation (detect gaps, request fresh snapshot)

### Performance

**RQ-ARCH-010:** QA's original performance benchmarks (100k orders/sec, p99 200μs) are unrealistic for single-process Node.js. The synthesis revises to 10k orders/sec, p99 5ms. Are these revised targets achievable and appropriate for the project? Should we add any benchmarks the architect considers critical?

---

## For the Product Designer

### Scope & Priority

**RQ-DESIGN-001:** Your sitemap includes a "Referral Program" under Account. No other agent addresses this, and it requires its own data model (referral codes, tracking, rewards). Should we:
- (a) Remove from sitemap entirely for MVP
- (b) Keep the UI placeholder but mark as "Coming Soon"
- (c) It's important — please provide minimal spec

**RQ-DESIGN-002:** Your KYC flow requires Level 0 (email only) users to have **no trading access**. This means every new user must complete at least Level 1 KYC before making their first trade. For an educational/demo project, this adds friction to the "try it out" experience. Should we:
- (a) Keep your design (Level 0 = view only, Level 1 required for trading)
- (b) Allow trading immediately after registration, KYC only gates withdrawal limits
- (c) Allow trading with a low limit (e.g., $100/day) at Level 0

**RQ-DESIGN-003:** The VIP fee tier system (4 tiers in your fee configuration UI) requires:
- 30-day volume tracking per user
- Fee calculation based on tier
- Tier progression/demotion logic
For an MVP, should we:
- (a) Implement full VIP tier system
- (b) Simplify to: flat fee per pair (admin configurable), no VIP tiers
- (c) Tiers exist in config but no automatic volume-based progression (admin manually assigns)

**RQ-DESIGN-004:** Your security settings page includes "Anti-Phishing Code" and "IP whitelist" — neither has architecture support. Should these be:
- (a) Deferred entirely
- (b) UI only with "Coming Soon" badge
- (c) Simplified implementation needed (specify requirements)

### Missing States

**RQ-DESIGN-005:** You define 7 withdrawal states but no deposit states. What are the deposit status states? Proposed:
- `pending` → `confirming (X/N)` → `completed`
- `failed` (edge case)
Since deposits are simulated, should we:
- (a) Skip status tracking, instant credit
- (b) Show a simulated confirmation progress (e.g., 3-second delay with "Confirming 1/3... 2/3... 3/3... Complete")

**RQ-DESIGN-006:** Your 2FA setup flow shows QR code scanning, but the state transitions during setup aren't defined. What happens if:
- The user scans the QR but never enters the verification code (partial setup state)?
- The user tries to enable 2FA twice?
- The user loses their device — what's the recovery flow for a demo project?

**RQ-DESIGN-007:** You mention "Biometric login" (Face ID / Touch ID) for mobile. This requires WebAuthn/FIDO2 implementation. Should we:
- (a) Defer entirely (no biometric)
- (b) If using a PWA approach, leverage the Web Authentication API
- (c) Out of scope for web demo

### Layout

**RQ-DESIGN-008:** For the desktop trading layout, you show Chart at ~55%, Order Book at ~20%, and Order Form at ~25%. The order form seems narrow for OCO orders (which have 5+ input fields). Have you validated this fits at 480px width (25% of 1920)?

**RQ-DESIGN-009:** The landing page (your sitemap root `/`) includes "Market Overview (ticker tape, top movers), CTA, feature highlights." How elaborate should this be? Options:
- (a) Simple hero + CTA + live ticker marquee (1 day of work)
- (b) Full marketing page with feature sections, screenshots, trust badges (3+ days)
- (c) Skip landing page, `/` redirects to `/markets` or `/trade/BTC_USDT`

---

## For the Market Researcher

### Feature Prioritization

**RQ-MARKET-001:** You recommend a simplified architecture (§6.4) with Next.js + Redis, but the architect designs a Redis-free in-memory approach. Given this is an educational project that emphasizes "npm run dev 一键启动," do you agree Redis is unnecessary for MVP? Or do you see specific educational value in including it?

**RQ-MARKET-002:** You list "移动 APP" as "🔲 (响应式)" — confirming responsive web only, no native app. The designer defines detailed mobile breakpoints. Should we consider PWA (Progressive Web App) support?
- (a) No PWA, responsive web only
- (b) Basic PWA (manifest + service worker for offline shell)
- (c) Full PWA with push notifications

**RQ-MARKET-003:** Your competitive analysis shows all major exchanges support 40+ languages. You recommend Chinese + English (i18n). The architect doesn't address i18n. Should we:
- (a) Chinese-only for MVP, add i18n framework in Phase 7
- (b) English-only for MVP (broader educational audience)
- (c) Include next-intl from the start with CN + EN (adds complexity to every component)

**RQ-MARKET-004:** You identify a gap: "市面上没有 Next.js 技术栈的完整 CEX 教学项目." Should the project include:
- (a) Code comments in Chinese (primary audience)
- (b) Code comments in English (wider reach, standard practice)
- (c) Bilingual comments
- (d) English code + Chinese documentation/README

### Market Data

**RQ-MARKET-005:** For the seed data market simulation (making the demo feel alive), what approach do you recommend?
- (a) Static seed data (pre-populated trades and candles, order book snapshot)
- (b) Bot-driven simulation (automated market maker places random orders at startup)
- (c) Import historical data from a real exchange (via CCXT) for realistic charts
- (d) Combination: historical candles + live bot for ongoing activity

---

## For the QA Strategist

### Test Scope Adjustments

**RQ-QA-001:** Your performance benchmarks assume C++/Rust-level throughput (100k orders/sec). The project is Node.js single-process. Please revise the following benchmarks to Node.js-realistic targets:
- Matching throughput (orders/sec)
- Match latency (p50, p99)
- Order book rebuild time for N orders
- WS fan-out latency for N subscribers
- Max concurrent WS connections

**RQ-QA-002:** You have 0 test cases for KYC flows, but KYC is a Phase 6 feature. Please provide test cases for:
- Level 1 submission (phone verification)
- Level 2 submission (document upload)
- Admin review (approve/reject)
- KYC status transitions
- KYC level gates (Level 0 trying to trade should be rejected)

**RQ-QA-003:** You have 0 test cases for the admin dashboard stats endpoint. Please provide test cases for:
- GET /admin/stats returns correct 24h volume
- GET /admin/stats returns correct user counts
- Admin user can access, regular user gets 403

**RQ-QA-004:** You test for "book checksum" (TC-OB-008) but the architect doesn't implement checksums. Should we:
- (a) Add checksum to the order book (CRC32 of price levels, like OKX does)
- (b) Drop this test case (unnecessary for demo)
- (c) Use `lastUpdateId` sequence as a lighter-weight consistency check

**RQ-QA-005:** Your test data strategy references Redis and Kafka (`testcontainers: Postgres, Redis, Kafka`) but the architecture uses neither. Please update the test infrastructure plan to match the actual stack:
- PostgreSQL (Docker, testcontainers)
- In-memory order book (no external dependency)
- In-process WebSocket (no separate service)

**RQ-QA-006:** You define `test-stp-user` for self-trade prevention tests. The architect implements STP by "cancel the resting (maker) order." The QA expects "newer order rejected or cancelled (configurable STP mode)." Should we:
- (a) Single mode: cancel incoming (taker) order — simplest
- (b) Single mode: cancel resting (maker) order — architect's choice
- (c) Configurable per-user STP mode (cancel-newest, cancel-oldest, cancel-both) — QA's suggestion

**RQ-QA-007:** You have no test cases for responsive/mobile layout or accessibility. Given the designer specifies WCAG 2.1 AA compliance and detailed mobile breakpoints, should we add:
- (a) Playwright viewport tests for mobile/tablet breakpoints (at least verify layout doesn't break)
- (b) axe-core automated accessibility tests
- (c) Both
- (d) Defer all UI-level testing to manual QA

### Missing Test Cases

**RQ-QA-008:** Please provide test cases for the following gaps identified in synthesis:
1. Email verification flow (send, verify, resend, expired token)
2. Password reset flow (request, invalid email, token expiry, success, reuse)
3. Deposit flow E2E (simulated)
4. Withdrawal flow E2E (request → approval → processing → complete)
5. Admin user management (freeze user during active session, unfreeze)
6. Landing page / markets page (loads, displays tickers, search works)

---

## Cross-Cutting Questions (For All / Product Owner)

**RQ-ALL-001:** The designer specifies an `(admin)/` route group as a "SEPARATE APP/ROUTE." Should the admin dashboard:
- (a) Live in the same Next.js app under `/admin` route group (simpler deployment)
- (b) Be a separate Next.js app in a monorepo (better separation)
- The architect's structure uses `src/app/(admin)/` — option (a).

**RQ-ALL-002:** What should happen when a trading pair is disabled by admin while users have open orders?
- Architect: not specified
- Designer: not specified
- QA (AC-AB-001): "All 100 open orders are cancelled, frozen balances unfrozen, new orders rejected"
- **Confirm this is the correct behavior.** Should users receive WS notification of forced cancellation?

**RQ-ALL-003:** The project targets "educational/demo" use. Should there be an explicit "DEMO MODE" indicator in the UI to prevent confusion with real exchanges? Options:
- (a) Persistent banner: "⚠️ This is a demo exchange. No real funds are used."
- (b) Watermark on trading page
- (c) Noted only in README/docs
- (d) Both (a) and (c)

---

*End of Refinement Questions — Round 1*

**Total questions:** 30  
**Blocking questions (must answer before implementation):** RQ-ARCH-001, RQ-ARCH-004, RQ-DESIGN-002, RQ-QA-001  
**Non-blocking (can decide during implementation):** Most others
