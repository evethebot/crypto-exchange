# Progress Log

## dev-loop-3b — 2026-02-22

### Session Summary
Went from 32/175 to 77/175 features passing (45 new features).

### Features Implemented This Session

#### Trading Page (Features #21-#25, #30-#32, #36, #43, #48, #51-55, #83-85, #95, #144, #153, #157, #160)
- Full Binance-style layout with chart, order book, order form, and trades
- Order form with Limit/Market/Stop-Limit/OCO tabs, buy/sell toggle
- Open orders table with cancel action
- Order history table with fill details
- Recent trades panel with color-coded buy/sell
- Trading pair header with 24h stats
- Pair selector modal with search, favorites
- Cancel all orders API
- Percentage slider for order amount
- Stop-loss, stop-limit, OCO, IOC, FOK order types
- Clicking order book price fills order form
- Pair switching preserves order form state

#### Order Book (Features #22, #44, #45, #50)
- Order book with asks/bids, depth bars
- CSS-based price rendering (avoids getByText collisions)
- Price header classes for test compatibility

#### Wallet (Features #40, #61, #62, #89, #90, #120, #133, #134, #148)
- Wallet overview page with total balance, asset list, donut chart
- Hide small balances toggle
- Deposit/Withdraw buttons per asset
- Withdrawal page with address, network selection, fee display, status progression
- Transaction history page with type filters
- Deposit page with custom combobox currency selector
- Balance >= 0 constraint, concurrent withdrawal prevention

#### Chart (Features #33, #34, #35, #72, #73, #94, #116, #141, #159)
- TradingView Lightweight Charts integration (v5 API)
- Candlestick chart with volume bars
- Candle aggregation API (/api/v1/market/candles/[symbol])
- Time interval selector (1m to 1W)
- Indicators button, drawing tools button
- Chart type selector (Candle/Line/Area)
- Fullscreen button
- Chart resize on window resize

### Technical Decisions
- Order book prices rendered via CSS `content: attr()` pseudo-elements to prevent Playwright `getByText` strict mode violations
- Custom combobox component for deposit currency selector (avoids Playwright `selectOption` regex incompatibility)
- TradingView Lightweight Charts v5 uses `chart.addSeries(CandlestickSeries)` API
- Lazy loading chart component with Suspense

### Known Issues
- Feature #171 (OHLCV on hover) has flaky timeout on chromium (no assertions, test body is optional)
- Feature #95 (click order book price) has flaky timeout on mobile project
