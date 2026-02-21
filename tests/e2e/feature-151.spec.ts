import { test, expect } from '@playwright/test';

test.describe('Feature #151: Max open orders per user (200)', () => {
  test.setTimeout(120_000);

  async function setupTrader(request: any) {
    const email = `maxord_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;
    return { email, token };
  }

  async function placeOrdersBatch(request: any, token: string, count: number, startPrice: number) {
    let placed = 0;
    let idx = 0;
    while (placed < count) {
      const batchSize = Math.min(5, count - placed);
      const promises = [];
      for (let i = 0; i < batchSize; i++) {
        promises.push(
          request.post('/api/v1/orders', {
            headers: { Authorization: `Bearer ${token}` },
            data: {
              symbol: 'BTC_USDT',
              side: 'buy',
              type: 'limit',
              price: (startPrice + idx).toString(),
              amount: '0.01',
            },
          })
        );
        idx++;
      }
      const results = await Promise.all(promises);
      for (const r of results) {
        if (r.status() === 200) placed++;
      }
      // Wait for rate limit window to reset
      if (placed < count) {
        await new Promise(r => setTimeout(r, 1100));
      }
    }
    return placed;
  }

  test('Feature #151 UI: Trading page accessible', async ({ page }) => {
    await page.goto('/trade/BTC_USDT');
    await expect(page.getByText(/BTC\s*\/?\s*USDT/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /buy|sell/i }).first()).toBeVisible();
    await page.getByPlaceholder(/price/i).first().fill('50000');
    await page.getByPlaceholder(/amount/i).first().fill('0.01');
  });

  test('Feature #151 API: Can place orders up to limit', async ({ request }) => {
    const { token } = await setupTrader(request);

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '99999999' },
    });

    // Place 3 orders - should succeed
    for (let i = 0; i < 3; i++) {
      const res = await request.post('/api/v1/orders', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          symbol: 'BTC_USDT',
          side: 'buy',
          type: 'limit',
          price: (1000 + i).toString(),
          amount: '0.01',
        },
      });
      expect(res.status()).toBe(200);
    }
  });

  test('Feature #151 API: Order rejected when at max open orders (200)', async ({ request }) => {
    const { token } = await setupTrader(request);

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '99999999' },
    });

    // Place 200 orders in batches respecting rate limit
    await placeOrdersBatch(request, token, 200, 2000);

    // Wait for rate limit reset
    await new Promise(r => setTimeout(r, 1100));

    // 201st order should be rejected
    const res201 = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        symbol: 'BTC_USDT',
        side: 'buy',
        type: 'limit',
        price: '3000',
        amount: '0.01',
      },
    });
    expect(res201.status()).toBe(400);
    const data = await res201.json();
    expect(data.error).toContain('MAX_OPEN_ORDERS');
  });

  test('Feature #151 API: After cancelling, can place again', async ({ request }) => {
    const { token } = await setupTrader(request);

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '99999999' },
    });

    // Place 200 orders
    await placeOrdersBatch(request, token, 200, 4000);

    // Cancel all orders
    await new Promise(r => setTimeout(r, 1100));
    await request.delete('/api/v1/orders?symbol=BTC_USDT', {
      headers: { Authorization: `Bearer ${token}` },
    });

    // Should now be able to place again
    await new Promise(r => setTimeout(r, 1100));
    const res = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        symbol: 'BTC_USDT',
        side: 'buy',
        type: 'limit',
        price: '5000',
        amount: '0.01',
      },
    });
    expect(res.status()).toBe(200);
  });
});
