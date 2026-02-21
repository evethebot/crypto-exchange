import { test, expect } from '@playwright/test';

test.describe('Feature #70: Rate limiting — 5 orders/sec per user', () => {

  test.beforeEach(async ({ request }) => {
    await request.post('/api/v1/test/cleanup');
    // Wait for rate limit windows to expire
    await new Promise(r => setTimeout(r, 1100));
  });

  async function setupTrader(request: any) {
    const email = `rl_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;
    return { email, token };
  }

  test('Feature #70 UI: Trading page shows order form', async ({ page }) => {
    await page.goto('/trade/BTC_USDT');
    await expect(page.getByText(/BTC\s*\/?\s*USDT/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /buy|sell/i }).first()).toBeVisible();
    await page.getByPlaceholder(/price/i).first().fill('50000');
    await page.getByPlaceholder(/amount/i).first().fill('0.1');
  });

  test('Feature #70 API: 6th order in 1 second returns 429', async ({ request }) => {
    const { token } = await setupTrader(request);

    // Deposit enough funds
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '1000000' },
    });

    // Rapidly place 6 orders
    const results: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request.post('/api/v1/orders', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          symbol: 'BTC_USDT',
          side: 'buy',
          type: 'limit',
          price: (10000 + i).toString(),
          amount: '0.01',
        },
      });
      results.push(res.status());
    }

    // First 5 should succeed (200), 6th should be rate-limited (429)
    const successes = results.filter(s => s === 200).length;
    const rateLimited = results.filter(s => s === 429).length;
    expect(successes).toBe(5);
    expect(rateLimited).toBeGreaterThanOrEqual(1);
  });

  test('Feature #70 API: After 1 second, orders succeed again', async ({ request }) => {
    const { token } = await setupTrader(request);

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '1000000' },
    });

    // Exhaust rate limit
    for (let i = 0; i < 5; i++) {
      await request.post('/api/v1/orders', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          symbol: 'BTC_USDT',
          side: 'buy',
          type: 'limit',
          price: (20000 + i).toString(),
          amount: '0.01',
        },
      });
    }

    // Wait for rate limit window to reset
    await new Promise(r => setTimeout(r, 1100));

    // Next order should succeed
    const res = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        symbol: 'BTC_USDT',
        side: 'buy',
        type: 'limit',
        price: '20010',
        amount: '0.01',
      },
    });
    expect(res.status()).toBe(200);
  });

  test('Feature #70 API: Rate limit is per-user', async ({ request }) => {
    const user1 = await setupTrader(request);
    const user2 = await setupTrader(request);

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${user1.token}` },
      data: { currency: 'USDT', amount: '1000000' },
    });
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${user2.token}` },
      data: { currency: 'USDT', amount: '1000000' },
    });

    // Exhaust user1's rate limit
    for (let i = 0; i < 5; i++) {
      await request.post('/api/v1/orders', {
        headers: { Authorization: `Bearer ${user1.token}` },
        data: {
          symbol: 'BTC_USDT',
          side: 'buy',
          type: 'limit',
          price: (30000 + i).toString(),
          amount: '0.01',
        },
      });
    }

    // user2 should still be able to place orders
    const res = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${user2.token}` },
      data: {
        symbol: 'BTC_USDT',
        side: 'buy',
        type: 'limit',
        price: '30000',
        amount: '0.01',
      },
    });
    expect(res.status()).toBe(200);
  });
});
