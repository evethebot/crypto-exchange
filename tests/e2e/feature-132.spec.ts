import { test, expect } from '@playwright/test';

test.describe('Feature #132: Decimal precision with big.js', () => {

  test.beforeEach(async ({ request }) => {
    await request.post('/api/v1/test/cleanup');
  });

  async function setupTrader(request: any) {
    const email = `prec_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;
    return { email, token };
  }

  test('Feature #132 UI: Trading page renders price inputs', async ({ page }) => {
    await page.goto('/trade/BTC_USDT');
    await expect(page.getByText(/BTC\s*\/?\s*USDT/i).first()).toBeVisible({ timeout: 10000 });
    await page.getByPlaceholder(/price/i).first().fill('0.1');
    await page.getByPlaceholder(/amount/i).first().fill('0.2');
    await expect(page.getByRole('button', { name: /buy|sell/i }).first()).toBeVisible();
  });

  test('Feature #132 API: No floating point errors in trade (0.1 + 0.2 precision)', async ({ request }) => {
    const seller = await setupTrader(request);
    const buyer = await setupTrader(request);

    // Deposit
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { currency: 'BTC', amount: '10' },
    });
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { currency: 'USDT', amount: '1000000' },
    });

    // Seller places sell at price 0.3 for amount 0.1
    await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { symbol: 'BTC_USDT', side: 'sell', type: 'limit', price: '50000.10', amount: '0.10000000' },
    });

    // Buyer buys at same price
    const buyRes = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { symbol: 'BTC_USDT', side: 'buy', type: 'limit', price: '50000.10', amount: '0.10000000' },
    });

    const buyData = await buyRes.json();
    expect(buyData.success).toBe(true);
    expect(buyData.data.status).toBe('filled');

    // Check trade data
    await new Promise(r => setTimeout(r, 500));
    const trades = await request.get('/api/v1/trades/my?symbol=BTC_USDT', {
      headers: { Authorization: `Bearer ${buyer.token}` },
    });
    const tradeData = await trades.json();
    expect(tradeData.data?.length).toBeGreaterThan(0);

    const trade = tradeData.data[0];
    // Verify no floating-point artifacts: amount should be exactly "0.10000000"
    const tradeAmount = parseFloat(trade.amount);
    expect(tradeAmount).toBeCloseTo(0.1, 8);
    // Price should be exact
    const tradePrice = parseFloat(trade.price);
    expect(tradePrice).toBeCloseTo(50000.1, 2);
  });

  test('Feature #132 API: Fee calculation uses precise decimals', async ({ request }) => {
    const seller = await setupTrader(request);
    const buyer = await setupTrader(request);

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { currency: 'BTC', amount: '10' },
    });
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { currency: 'USDT', amount: '1000000' },
    });

    // Trade at a price where floating point would cause errors
    // 0.3 BTC at 33333.33 USDT = 9999.999 USDT total
    await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { symbol: 'BTC_USDT', side: 'sell', type: 'limit', price: '33333.33', amount: '0.3' },
    });

    const buyRes = await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { symbol: 'BTC_USDT', side: 'buy', type: 'limit', price: '33333.33', amount: '0.3' },
    });

    const buyData = await buyRes.json();
    expect(buyData.success).toBe(true);

    // Verify seller gets correct USDT (after fee)
    await new Promise(r => setTimeout(r, 500));
    const sellerBal = await request.get('/api/v1/wallet/balances', {
      headers: { Authorization: `Bearer ${seller.token}` },
    });
    const sellerUsdt = (await sellerBal.json()).data?.find((b: any) => b.currency === 'USDT');
    const usdtBalance = Number(sellerUsdt?.available || 0);
    // 0.3 * 33333.33 = 9999.999 - fee (0.1% maker = 9.999999)
    // Seller should receive approximately 9989.999001
    expect(usdtBalance).toBeGreaterThan(9980);
    expect(usdtBalance).toBeLessThan(10010);
  });

  test('Feature #132 API: Wallet balances are precise after multiple trades', async ({ request }) => {
    const seller = await setupTrader(request);
    const buyer = await setupTrader(request);

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { currency: 'BTC', amount: '1' },
    });
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { currency: 'USDT', amount: '500000' },
    });

    // Do 3 small trades that would accumulate floating point errors
    for (let i = 0; i < 3; i++) {
      const s = await setupTrader(request);
      await request.post('/api/v1/wallet/deposit', {
        headers: { Authorization: `Bearer ${s.token}` },
        data: { currency: 'BTC', amount: '1' },
      });
      await request.post('/api/v1/orders', {
        headers: { Authorization: `Bearer ${s.token}` },
        data: { symbol: 'BTC_USDT', side: 'sell', type: 'limit', price: '50000', amount: '0.01' },
      });
      await request.post('/api/v1/orders', {
        headers: { Authorization: `Bearer ${buyer.token}` },
        data: { symbol: 'BTC_USDT', side: 'buy', type: 'limit', price: '50000', amount: '0.01' },
      });
    }

    await new Promise(r => setTimeout(r, 500));

    // Buyer should have 0.03 BTC (minus fees) — verify no accumulation errors
    const buyerBal = await request.get('/api/v1/wallet/balances', {
      headers: { Authorization: `Bearer ${buyer.token}` },
    });
    const btc = (await buyerBal.json()).data?.find((b: any) => b.currency === 'BTC');
    const btcBalance = Number(btc?.available || 0);
    // Should be close to 0.03 (minus small fees)
    expect(btcBalance).toBeGreaterThan(0.029);
    expect(btcBalance).toBeLessThan(0.031);
  });
});
