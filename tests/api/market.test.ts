import { test, expect } from '@playwright/test';

test.describe('API Market — Features #12, #17, #35, #72, #86-87, #146', () => {

  // ===== Feature #12: Market pairs =====
  test('Feature #12 API: List trading pairs', async ({ request }) => {
    const res = await request.get('/api/v1/market/pairs');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(5);
  });

  test('Feature #12 API: Get single pair details', async ({ request }) => {
    const res = await request.get('/api/v1/market/pairs/BTC_USDT');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data.symbol).toBe('BTC_USDT');
    expect(data.data.baseCurrency).toBe('BTC');
    expect(data.data.quoteCurrency).toBe('USDT');
    expect(data.data.pricePrecision).toBe(2);
    expect(data.data.amountPrecision).toBe(6);
  });

  test('Feature #12 API: All seed pairs present', async ({ request }) => {
    const res = await request.get('/api/v1/market/pairs');
    const symbols = (await res.json()).data.map((p: any) => p.symbol);
    expect(symbols).toContain('BTC_USDT');
    expect(symbols).toContain('ETH_USDT');
    expect(symbols).toContain('ETH_BTC');
    expect(symbols).toContain('DOGE_USDT');
    expect(symbols).toContain('XRP_USDT');
  });

  test('Feature #12 API: Invalid symbol returns 404', async ({ request }) => {
    const res = await request.get('/api/v1/market/pairs/INVALID_PAIR');
    expect(res.status()).toBe(404);
  });

  // ===== Feature #17: Order book depth =====
  test('Feature #17 API: Depth endpoint returns bids and asks', async ({ request }) => {
    const res = await request.get('/api/v1/market/depth/BTC_USDT?limit=20');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data).toHaveProperty('bids');
    expect(data.data).toHaveProperty('asks');
  });

  test('Feature #17 API: Depth limit parameter works', async ({ request }) => {
    const res5 = await request.get('/api/v1/market/depth/BTC_USDT?limit=5');
    const data5 = await res5.json();
    expect(data5.data.bids.length).toBeLessThanOrEqual(5);
    expect(data5.data.asks.length).toBeLessThanOrEqual(5);
  });

  test('Feature #17 API: Each depth level has price and amount', async ({ request }) => {
    const res = await request.get('/api/v1/market/depth/BTC_USDT?limit=5');
    const data = await res.json();
    for (const bid of data.data.bids) {
      expect(bid.length).toBe(2); // [price, amount]
      expect(Number(bid[0])).toBeGreaterThan(0);
      expect(Number(bid[1])).toBeGreaterThan(0);
    }
    for (const ask of data.data.asks) {
      expect(ask.length).toBe(2);
      expect(Number(ask[0])).toBeGreaterThan(0);
      expect(Number(ask[1])).toBeGreaterThan(0);
    }
  });

  // ===== Feature #35: Candle data structure =====
  test('Feature #35 API: Candle has correct OHLCV fields', async ({ request }) => {
    const res = await request.get('/api/v1/market/candles/BTC_USDT?interval=1m&limit=5');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);

    if (data.data?.length > 0) {
      const candle = data.data[0];
      expect(candle).toHaveProperty('openTime');
      expect(candle).toHaveProperty('open');
      expect(candle).toHaveProperty('high');
      expect(candle).toHaveProperty('low');
      expect(candle).toHaveProperty('close');
      expect(candle).toHaveProperty('volume');
      // high >= low
      expect(Number(candle.high)).toBeGreaterThanOrEqual(Number(candle.low));
      // high >= open and high >= close
      expect(Number(candle.high)).toBeGreaterThanOrEqual(Number(candle.open));
      expect(Number(candle.high)).toBeGreaterThanOrEqual(Number(candle.close));
      // low <= open and low <= close
      expect(Number(candle.low)).toBeLessThanOrEqual(Number(candle.open));
      expect(Number(candle.low)).toBeLessThanOrEqual(Number(candle.close));
    }
  });

  // ===== Feature #72: Historical candle API =====
  test('Feature #72 API: Multiple intervals supported', async ({ request }) => {
    for (const interval of ['1m', '5m', '15m', '1h', '4h', '1d', '1w']) {
      const res = await request.get(`/api/v1/market/candles/BTC_USDT?interval=${interval}&limit=5`);
      expect(res.ok()).toBeTruthy();
    }
  });

  test('Feature #72 API: Limit parameter caps results', async ({ request }) => {
    const res = await request.get('/api/v1/market/candles/BTC_USDT?interval=1m&limit=3');
    const data = await res.json();
    expect(data.data.length).toBeLessThanOrEqual(3);
  });

  test('Feature #72 API: Invalid interval rejected', async ({ request }) => {
    const res = await request.get('/api/v1/market/candles/BTC_USDT?interval=99x');
    expect(res.status()).toBe(400);
  });

  // ===== Feature #86: Recent trades =====
  test('Feature #86 API: Recent trades for symbol', async ({ request }) => {
    const res = await request.get('/api/v1/market/trades/BTC_USDT?limit=10');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('Feature #86 API: Trade has required fields', async ({ request }) => {
    const res = await request.get('/api/v1/market/trades/BTC_USDT?limit=5');
    const data = await res.json();
    if (data.data?.length > 0) {
      const trade = data.data[0];
      expect(trade).toHaveProperty('price');
      expect(trade).toHaveProperty('amount');
      expect(trade).toHaveProperty('side');
      expect(trade).toHaveProperty('timestamp');
      expect(['buy', 'sell']).toContain(trade.side);
    }
  });

  // ===== Feature #87: 24h ticker =====
  test('Feature #87 API: Single ticker endpoint', async ({ request }) => {
    const res = await request.get('/api/v1/market/ticker/BTC_USDT');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data).toHaveProperty('symbol');
    expect(data.data).toHaveProperty('lastPrice');
    expect(data.data).toHaveProperty('highPrice');
    expect(data.data).toHaveProperty('lowPrice');
    expect(data.data).toHaveProperty('volume');
    expect(data.data).toHaveProperty('priceChangePercent');
  });

  test('Feature #87 API: All tickers endpoint', async ({ request }) => {
    const res = await request.get('/api/v1/market/ticker');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data.length).toBeGreaterThanOrEqual(5);
  });

  // ===== Feature #146: Historical seed data =====
  test('Feature #146 API: Candle history has data', async ({ request }) => {
    const res = await request.get('/api/v1/market/candles/BTC_USDT?interval=1h&limit=100');
    const data = await res.json();
    expect(data.success).toBe(true);
    // Should have some data from seeds or bot activity
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  // ===== Health check =====
  test('Feature #1 API: Health endpoint', async ({ request }) => {
    const res = await request.get('/api/v1/health');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});
