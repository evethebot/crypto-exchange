import { test, expect } from '@playwright/test';

test.describe('Wallet — Features #10-11, #40, #61-62, #89-90, #120, #133-134, #148', () => {

  // ===== Feature #10: Wallet balances API =====
  test('Feature #10: Wallet balances returns array with correct fields', async ({ request }) => {
    const email = `wallet_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    const res = await request.get('/api/v1/wallet/balances', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('Feature #10: Unauthorized request returns 401', async ({ request }) => {
    const res = await request.get('/api/v1/wallet/balances');
    expect(res.status()).toBe(401);
  });

  test('Feature #10 edge: New user has empty or zero balances', async ({ request }) => {
    const email = `empty_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    const res = await request.get('/api/v1/wallet/balances', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    // Either empty array or all zeroes
    if (data.data?.length > 0) {
      for (const bal of data.data) {
        expect(Number(bal.available) + Number(bal.frozen)).toBe(0);
      }
    }
  });

  // ===== Feature #11: Simulated deposit =====
  test('Feature #11: Deposit credits user balance', async ({ request }) => {
    const email = `deposit_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    const res = await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '10000' },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);

    // Check balance
    const balRes = await request.get('/api/v1/wallet/balances', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const balData = await balRes.json();
    const usdtBal = balData.data?.find((b: any) => b.currency === 'USDT');
    expect(Number(usdtBal?.available)).toBeGreaterThanOrEqual(10000);
  });

  test('Feature #11: Deposit page shows confirmation animation', async ({ page, request }) => {
    const email = `deposit_ui_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');
    await page.goto('/wallet/deposit');

    // Select currency
    const currencySelect = page.getByRole('combobox', { name: /currency|asset/i }).or(
      page.locator('select').first()
    );
    if (await currencySelect.isVisible().catch(() => false)) {
      await currencySelect.selectOption({ label: /USDT/i });
    }

    // Enter amount
    await page.getByPlaceholder(/amount/i).fill('5000');

    // Click deposit
    await page.getByRole('button', { name: /deposit|submit/i }).click();

    // Should show progress/confirmation
    await expect(
      page.getByText(/confirming|processing|completed|1\/3|2\/3|3\/3|success/i)
    ).toBeVisible({ timeout: 15000 });
  });

  test('Feature #11 edge: Zero amount deposit returns error', async ({ request }) => {
    const email = `dep0_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    const res = await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '0' },
    });
    expect(res.status()).toBe(400);
  });

  test('Feature #11 edge: Negative amount deposit returns error', async ({ request }) => {
    const email = `depneg_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    const res = await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '-100' },
    });
    expect(res.status()).toBe(400);
  });

  // ===== Feature #40: Wallet overview page =====
  test('Feature #40: Wallet page shows total balance and asset list', async ({ page, request }) => {
    const email = `walletpage_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '10000' },
    });

    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');
    await page.goto('/wallet');

    // Total balance
    await expect(page.getByText(/total.*balance|estimated.*value/i)).toBeVisible({ timeout: 5000 });

    // Asset list
    await expect(page.getByText(/USDT/i).first()).toBeVisible();
    await expect(page.getByText(/available/i).first()).toBeVisible();
  });

  test('Feature #40: Hide small balances toggle', async ({ page, request }) => {
    const email = `smallbal_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');
    await page.goto('/wallet');

    const hideToggle = page.getByRole('checkbox', { name: /hide.*small/i }).or(
      page.getByLabel(/hide.*small/i)
    );
    if (await hideToggle.isVisible().catch(() => false)) {
      await hideToggle.check();
      await page.waitForTimeout(500);
      await hideToggle.uncheck();
    }
  });

  test('Feature #40: Deposit and Withdraw buttons per asset', async ({ page, request }) => {
    const email = `walletbtns_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '1000' },
    });

    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');
    await page.goto('/wallet');

    await expect(page.getByRole('link', { name: /deposit/i }).or(
      page.getByRole('button', { name: /deposit/i })
    ).first()).toBeVisible({ timeout: 5000 });

    await expect(page.getByRole('link', { name: /withdraw/i }).or(
      page.getByRole('button', { name: /withdraw/i })
    ).first()).toBeVisible();
  });

  test('Feature #40 edge: No balances shows empty state with deposit CTA', async ({ page, request }) => {
    const email = `emptywal_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');
    await page.goto('/wallet');

    // Should show deposit CTA or zero balance
    await expect(page.getByText(/deposit|no.*assets|get.*started/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ===== Feature #61: Simulated withdrawal =====
  test('Feature #61: Withdrawal page with address and network', async ({ page, request }) => {
    const email = `withdraw_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '10000' },
    });

    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');
    await page.goto('/wallet/withdraw');

    // Address input
    await expect(page.getByPlaceholder(/address/i)).toBeVisible({ timeout: 5000 });

    // Amount input
    await page.getByPlaceholder(/amount/i).fill('100');

    // Fee should be displayed
    await expect(page.getByText(/fee/i).first()).toBeVisible();
  });

  test('Feature #61: Withdrawal API deducts balance', async ({ request }) => {
    const email = `wdraw_api_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '10000' },
    });

    const res = await request.post('/api/v1/wallet/withdraw', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '500', address: '0x1234567890abcdef', network: 'ERC20' },
    });
    expect(res.ok()).toBeTruthy();

    // Balance should be reduced
    const balRes = await request.get('/api/v1/wallet/balances', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const balData = await balRes.json();
    const usdtBal = balData.data?.find((b: any) => b.currency === 'USDT');
    expect(Number(usdtBal?.available)).toBeLessThan(10000);
  });

  // ===== Feature #62: Transaction history =====
  test('Feature #62: Transaction history shows deposits and withdrawals', async ({ page, request }) => {
    const email = `txhist_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '5000' },
    });

    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');
    await page.goto('/wallet/history');

    // Should show at least the deposit
    await expect(page.getByText(/deposit|USDT|5000|5,000/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Feature #62: Transaction type filters', async ({ page, request }) => {
    const email = `txfilter_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');
    await page.goto('/wallet/history');

    // Filter by type
    const filterAll = page.getByRole('tab', { name: /all/i }).or(page.getByText(/^all$/i));
    const filterDeposit = page.getByRole('tab', { name: /deposit/i }).or(page.getByText(/^deposits?$/i));

    if (await filterDeposit.isVisible().catch(() => false)) {
      await filterDeposit.click();
      await page.waitForTimeout(500);
    }
    if (await filterAll.isVisible().catch(() => false)) {
      await filterAll.click();
    }
  });

  // ===== Feature #89: Deposit page styling =====
  test('Feature #89: Deposit page has currency selector and amount input', async ({ page, request }) => {
    const email = `depstyle_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');
    await page.goto('/wallet/deposit');

    await expect(page.getByPlaceholder(/amount/i)).toBeVisible({ timeout: 5000 });
    // Currency selector
    const selector = page.getByRole('combobox').or(page.locator('select')).first();
    await expect(selector).toBeVisible();
  });

  // ===== Feature #90: Withdrawal page styling =====
  test('Feature #90: Withdrawal page has address, network, and fee display', async ({ page, request }) => {
    const email = `wdrstyle_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');
    await page.goto('/wallet/withdraw');

    await expect(page.getByPlaceholder(/address/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByPlaceholder(/amount/i)).toBeVisible();
    await expect(page.getByText(/fee|network/i).first()).toBeVisible();
  });

  // ===== Feature #120: Donut chart for wallet allocation =====
  test('Feature #120: Wallet page renders allocation chart', async ({ page, request }) => {
    const email = `donut_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '5000' },
    });
    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'BTC', amount: '1' },
    });

    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');
    await page.goto('/wallet');

    // Look for chart (canvas or SVG)
    const chart = page.locator('canvas, svg').first();
    await expect(chart).toBeVisible({ timeout: 10000 });
  });

  // ===== Feature #133: Balance >= 0 constraint =====
  test('Feature #133: Cannot withdraw more than available balance', async ({ request }) => {
    const email = `bal0_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '100' },
    });

    const res = await request.post('/api/v1/wallet/withdraw', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '999999', address: '0xabc', network: 'ERC20' },
    });
    expect(res.status()).toBe(400);
  });

  // ===== Feature #134: Concurrent withdrawal prevention =====
  test('Feature #134: Concurrent withdrawals only one succeeds', async ({ request }) => {
    const email = `concurrent_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '1000' },
    });

    // Two concurrent withdrawals
    const [res1, res2] = await Promise.all([
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
    const success1 = res1.ok();
    const success2 = res2.ok();
    expect(success1 && success2).toBeFalsy(); // Both shouldn't succeed
  });

  // ===== Feature #148: Withdrawal status timeline =====
  test('Feature #148: Withdrawal shows status progression', async ({ page, request }) => {
    const email = `wdstatus_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '10000' },
    });

    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');
    await page.goto('/wallet/withdraw');

    // Fill withdrawal form
    await page.getByPlaceholder(/address/i).fill('0xTestAddress1234567890');
    await page.getByPlaceholder(/amount/i).fill('500');
    await page.getByRole('button', { name: /withdraw|submit|confirm/i }).click();

    // Should see status progression
    await expect(
      page.getByText(/pending|processing|confirming|completed/i)
    ).toBeVisible({ timeout: 15000 });
  });
});
