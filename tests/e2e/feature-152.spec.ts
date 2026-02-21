import { test, expect } from '@playwright/test';

test.describe('Feature #152: Circuit breaker — halts trading at 15% price move in 1min', () => {

  test.beforeEach(async ({ request }) => {
    await request.post('/api/v1/test/cleanup');
  });

  async function setupTrader(request: any) {
    const email = `cb_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;
    return { email, token };
  }

  async function executeTrade(request: any, price: string, amount: string = '0.01') {
    const seller = await setupTrader(request);
    const buyer = await setupTrader(request);

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { currency: 'BTC', amount: '100' },
    });
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { currency: 'USDT', amount: '99999999' },
    });

    await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { symbol: 'BTC_USDT', side: 'sell', type: 'limit', price, amount },
    });

    // Wait for rate limit
    await new Promise(r => setTimeout(r, 250));

    const res = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { symbol: 'BTC_USDT', side: 'buy', type: 'limit', price, amount },
    });

    return res;
  }

  test('Feature #152 UI: Trading page accessible', async ({ page }) => {
    await page.goto('/trade/BTC_USDT');
    await expect(page.getByText(/BTC\s*\/?\s*USDT/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /buy|sell/i }).first()).toBeVisible();
    await page.getByPlaceholder(/price/i).first().fill('50000');
    await page.getByPlaceholder(/amount/i).first().fill('0.01');
  });

  test('Feature #152 API: Normal trades succeed (no circuit breaker)', async ({ request }) => {
    // Trade at 50000
    const res1 = await executeTrade(request, '50000');
    expect(res1.status()).toBe(200);

    // Trade at 50100 (small move, < 15%)
    await new Promise(r => setTimeout(r, 1100));
    const res2 = await executeTrade(request, '50100');
    expect(res2.status()).toBe(200);
  });

  test('Feature #152 API: Circuit breaker triggers on >15% price drop', async ({ request }) => {
    // First establish a reference price
    const res1 = await executeTrade(request, '50000');
    expect(res1.status()).toBe(200);

    // Wait for rate limit
    await new Promise(r => setTimeout(r, 1100));

    // Try to trade at a price >15% below (50000 * 0.84 = 42000)
    const seller = await setupTrader(request);
    const buyer = await setupTrader(request);

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { currency: 'BTC', amount: '100' },
    });
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { currency: 'USDT', amount: '99999999' },
    });

    // Seller places order at extremely low price (>15% drop)
    await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { symbol: 'BTC_USDT', side: 'sell', type: 'limit', price: '42000', amount: '0.01' },
    });

    await new Promise(r => setTimeout(r, 250));

    // Buyer tries to buy at that low price - circuit breaker prevents matching
    const res2 = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { symbol: 'BTC_USDT', side: 'buy', type: 'limit', price: '42000', amount: '0.01' },
    });

    const data = await res2.json();
    // Order accepted but circuit breaker prevented the trade from filling
    expect(res2.status()).toBe(200);
    expect(data.data?.status).not.toBe('filled');
  });

  test('Feature #152 API: Circuit breaker triggers on >15% price spike', async ({ request }) => {
    // Reset state to clear any previous circuit breaker trips
    await request.post('/api/v1/test/cleanup');

    // Establish reference price
    const res1 = await executeTrade(request, '50000');
    expect(res1.status()).toBe(200);

    await new Promise(r => setTimeout(r, 1100));

    // Try to trade at a price >15% above (50000 * 1.16 = 58000)
    const seller = await setupTrader(request);
    const buyer = await setupTrader(request);

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { currency: 'BTC', amount: '100' },
    });
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { currency: 'USDT', amount: '99999999' },
    });

    await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { symbol: 'BTC_USDT', side: 'sell', type: 'limit', price: '58000', amount: '0.01' },
    });

    await new Promise(r => setTimeout(r, 250));

    const res2 = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { symbol: 'BTC_USDT', side: 'buy', type: 'limit', price: '58000', amount: '0.01' },
    });

    const data = await res2.json();
    // Order accepted but circuit breaker prevented the trade from filling
    expect(res2.status()).toBe(200);
    expect(data.data?.status).not.toBe('filled');
  });

  test('Feature #152 API: Circuit breaker status is queryable', async ({ request }) => {
    // The circuit breaker status should be available via market pair or health endpoint
    const res = await request.get('/api/v1/market/pairs/BTC_USDT');
    const data = await res.json();
    expect(data.success).toBe(true);
    // Circuit breaker info should be in the response
    expect(data.data).toHaveProperty('circuitBreaker');
  });
});
