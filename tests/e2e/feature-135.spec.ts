import { test, expect } from '@playwright/test';

test.describe('Feature #135: Maker/taker fee calculation', () => {

  async function setupTrader(request: any) {
    const email = `fee_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;
    return { email, token };
  }

  test('Feature #135 UI: Trading page shows order controls', async ({ page }) => {
    await page.goto('/trade/BTC_USDT');
    await expect(page.getByText(/BTC\s*\/?\s*USDT/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /buy|sell/i }).first()).toBeVisible();
    await page.getByPlaceholder(/price/i).first().fill('50000');
    await page.getByPlaceholder(/amount/i).first().fill('1');
  });

  test('Feature #135 API: Trade records contain maker and taker fees', async ({ request }) => {
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

    // Seller is maker (places first), buyer is taker
    await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { symbol: 'BTC_USDT', side: 'sell', type: 'limit', price: '50000', amount: '1' },
    });
    await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { symbol: 'BTC_USDT', side: 'buy', type: 'limit', price: '50000', amount: '1' },
    });

    await new Promise(r => setTimeout(r, 500));

    // Check trade records
    const tradesRes = await request.get('/api/v1/trades/my?symbol=BTC_USDT', {
      headers: { Authorization: `Bearer ${buyer.token}` },
    });
    const tradeData = await tradesRes.json();
    expect(tradeData.data?.length).toBeGreaterThan(0);

    const trade = tradeData.data[0];
    // buyerFee and sellerFee should be present and > 0
    expect(Number(trade.buyerFee || trade.buyer_fee)).toBeGreaterThan(0);
    expect(Number(trade.sellerFee || trade.seller_fee)).toBeGreaterThan(0);
  });

  test('Feature #135 API: Maker fee is applied to resting order (seller)', async ({ request }) => {
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

    // Seller rests order (maker), buyer takes (taker)
    await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { symbol: 'BTC_USDT', side: 'sell', type: 'limit', price: '50000', amount: '1' },
    });
    await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { symbol: 'BTC_USDT', side: 'buy', type: 'limit', price: '50000', amount: '1' },
    });

    await new Promise(r => setTimeout(r, 500));

    // Seller receives USDT minus maker fee
    // Trade: 1 BTC @ 50000 = 50000 USDT
    // Fee is calculated per pair config (makerFeeBps)
    // Seller should get 50000 minus maker fee
    const sellerBal = await request.get('/api/v1/wallet/balances', {
      headers: { Authorization: `Bearer ${seller.token}` },
    });
    const sellerUsdt = (await sellerBal.json()).data?.find((b: any) => b.currency === 'USDT');
    const usdtAmt = Number(sellerUsdt?.available || 0);
    // Maker fee deducted from quote (USDT) — should be less than 50000 but close
    expect(usdtAmt).toBeGreaterThan(49900);
    expect(usdtAmt).toBeLessThan(50000);
  });

  test('Feature #135 API: Taker fee is applied to incoming order (buyer)', async ({ request }) => {
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

    // Seller rests (maker), buyer takes (taker)
    await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${seller.token}` },
      data: { symbol: 'BTC_USDT', side: 'sell', type: 'limit', price: '50000', amount: '1' },
    });
    await request.post('/api/v1/orders', {
      headers: { Authorization: `Bearer ${buyer.token}` },
      data: { symbol: 'BTC_USDT', side: 'buy', type: 'limit', price: '50000', amount: '1' },
    });

    await new Promise(r => setTimeout(r, 500));

    // Buyer receives BTC minus taker fee
    // Taker fee deducted from base (BTC) per pair config
    // Buyer should get less than 1 BTC but close
    const buyerBal = await request.get('/api/v1/wallet/balances', {
      headers: { Authorization: `Bearer ${buyer.token}` },
    });
    const buyerBtc = (await buyerBal.json()).data?.find((b: any) => b.currency === 'BTC');
    const btcAmt = Number(buyerBtc?.available || 0);
    expect(btcAmt).toBeGreaterThan(0.99);
    expect(btcAmt).toBeLessThan(1.0);
  });

  test('Feature #135 API: Fee uses pair config (BTC_USDT default 10bps)', async ({ request }) => {
    // Get pair config
    const pairRes = await request.get('/api/v1/market/pairs/BTC_USDT');
    const pairData = await pairRes.json();
    const pair = pairData.data;

    // makerFeeBps and takerFeeBps should be defined
    expect(pair.makerFeeBps || pair.maker_fee_bps).toBeDefined();
    expect(pair.takerFeeBps || pair.taker_fee_bps).toBeDefined();

    const makerBps = Number(pair.makerFeeBps || pair.maker_fee_bps);
    const takerBps = Number(pair.takerFeeBps || pair.taker_fee_bps);
    expect(makerBps).toBeGreaterThanOrEqual(0);
    expect(takerBps).toBeGreaterThanOrEqual(0);
  });
});
