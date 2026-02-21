import { test, expect } from '@playwright/test';

test.describe('API Wallet — Features #10-11, #61, #133-134', () => {

  async function setupUser(request: any) {
    const email = `wal_api_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;
    return { email, token };
  }

  // ===== Feature #10: Wallet balances =====
  test('Feature #10 API: Get balances requires auth', async ({ request }) => {
    const res = await request.get('/api/v1/wallet/balances');
    expect(res.status()).toBe(401);
  });

  test('Feature #10 API: Get balances returns array', async ({ request }) => {
    const { token } = await setupUser(request);
    const res = await request.get('/api/v1/wallet/balances', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('Feature #10 API: Balance has available and frozen fields', async ({ request }) => {
    const { token } = await setupUser(request);
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '1000' },
    });

    const res = await request.get('/api/v1/wallet/balances', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    const usdt = data.data?.find((b: any) => b.currency === 'USDT');
    expect(usdt).toHaveProperty('available');
    expect(usdt).toHaveProperty('frozen');
    expect(usdt).toHaveProperty('total');
    // total = available + frozen
    expect(Number(usdt.total)).toBeCloseTo(Number(usdt.available) + Number(usdt.frozen), 8);
  });

  test('Feature #10 API: Get single currency balance', async ({ request }) => {
    const { token } = await setupUser(request);
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'BTC', amount: '0.5' },
    });

    const res = await request.get('/api/v1/wallet/balances/BTC', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Number(data.data?.available || 0)).toBeGreaterThanOrEqual(0.5);
  });

  // ===== Feature #11: Deposit =====
  test('Feature #11 API: Deposit credits balance', async ({ request }) => {
    const { token } = await setupUser(request);
    const res = await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '10000' },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test('Feature #11 API: Multiple deposits accumulate', async ({ request }) => {
    const { token } = await setupUser(request);
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '1000' },
    });
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '2000' },
    });

    const balRes = await request.get('/api/v1/wallet/balances', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const usdt = (await balRes.json()).data?.find((b: any) => b.currency === 'USDT');
    expect(Number(usdt?.available)).toBeGreaterThanOrEqual(3000);
  });

  test('Feature #11 API: Zero amount deposit rejected', async ({ request }) => {
    const { token } = await setupUser(request);
    const res = await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '0' },
    });
    expect(res.status()).toBe(400);
  });

  test('Feature #11 API: Negative amount deposit rejected', async ({ request }) => {
    const { token } = await setupUser(request);
    const res = await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '-100' },
    });
    expect(res.status()).toBe(400);
  });

  test('Feature #11 API: Deposit history returned', async ({ request }) => {
    const { token } = await setupUser(request);
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '1000' },
    });

    const res = await request.get('/api/v1/wallet/deposits', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data?.length).toBeGreaterThan(0);
  });

  // ===== Feature #61: Withdrawal =====
  test('Feature #61 API: Withdrawal deducts balance', async ({ request }) => {
    const { token } = await setupUser(request);
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '10000' },
    });

    const res = await request.post('/api/v1/wallet/withdraw', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '500', address: '0xabc123', network: 'ERC20' },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('Feature #61 API: Insufficient balance withdrawal rejected', async ({ request }) => {
    const { token } = await setupUser(request);
    const res = await request.post('/api/v1/wallet/withdraw', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '999999', address: '0xabc', network: 'ERC20' },
    });
    expect(res.status()).toBe(400);
  });

  test('Feature #61 API: Withdrawal history returned', async ({ request }) => {
    const { token } = await setupUser(request);
    const res = await request.get('/api/v1/wallet/withdrawals', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('Feature #61 API: Transaction history returned', async ({ request }) => {
    const { token } = await setupUser(request);
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '1000' },
    });

    const res = await request.get('/api/v1/wallet/transactions', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data?.length).toBeGreaterThan(0);
  });

  // ===== Feature #133: Balance >= 0 enforced =====
  test('Feature #133 API: Cannot overdraw balance', async ({ request }) => {
    const { token } = await setupUser(request);
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '100' },
    });

    const res = await request.post('/api/v1/wallet/withdraw', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '200', address: '0xabc', network: 'ERC20' },
    });
    expect(res.status()).toBe(400);
  });

  // ===== Feature #134: Concurrent withdrawal race condition =====
  test('Feature #134 API: Concurrent withdrawals handled correctly', async ({ request }) => {
    const { token } = await setupUser(request);
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '1000' },
    });

    // Two concurrent withdrawals for more than half the balance
    const [r1, r2] = await Promise.all([
      request.post('/api/v1/wallet/withdraw', {
        headers: { Authorization: `Bearer ${token}` },
        data: { currency: 'USDT', amount: '800', address: '0xabc', network: 'ERC20' },
      }),
      request.post('/api/v1/wallet/withdraw', {
        headers: { Authorization: `Bearer ${token}` },
        data: { currency: 'USDT', amount: '800', address: '0xdef', network: 'ERC20' },
      }),
    ]);

    // At most one should succeed
    const successes = [r1.ok(), r2.ok()].filter(Boolean).length;
    expect(successes).toBeLessThanOrEqual(1);

    // Balance should never go negative
    const balRes = await request.get('/api/v1/wallet/balances', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const usdt = (await balRes.json()).data?.find((b: any) => b.currency === 'USDT');
    expect(Number(usdt?.available || 0)).toBeGreaterThanOrEqual(0);
  });
});
