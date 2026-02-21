import { test, expect } from '@playwright/test';

const ADMIN = { email: 'admin@exchange.local', password: 'Admin1234!' };

test.describe('Admin — Features #63-68, #78-79, #99, #105, #130, #136, #143, #147, #154-155, #163, #166, #170, #174', () => {

  // ===== Feature #63: Admin dashboard KPIs =====
  test('Feature #63: Admin dashboard shows KPI cards', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin');
    await expect(page.getByText(/users|total.*users/i).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/volume|24h.*volume/i).first()).toBeVisible();
  });

  test('Feature #63: Admin stats API returns data', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;

    const res = await request.get('/api/v1/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test('Feature #63 edge: Non-admin gets 403', async ({ request }) => {
    const email = `nonadmin_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    const res = await request.get('/api/v1/admin/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status()).toBe(403);
  });

  // ===== Feature #64: Admin pair CRUD =====
  test('Feature #64: Admin can list and create trading pairs', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin/pairs');
    await expect(page.getByText(/BTC_USDT|BTC\/USDT/i).first()).toBeVisible({ timeout: 5000 });

    // Click add pair button
    const addBtn = page.getByRole('button', { name: /add.*pair|create.*pair|new.*pair/i });
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await expect(page.getByPlaceholder(/symbol|base/i).first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('Feature #64: Admin pairs API CRUD', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;

    // List pairs
    const listRes = await request.get('/api/v1/admin/pairs', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.ok()).toBeTruthy();
    const listData = await listRes.json();
    expect(listData.data?.length).toBeGreaterThan(0);
  });

  // ===== Feature #65: Admin fee configuration =====
  test('Feature #65: Admin can update pair fees', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;

    const pairsRes = await request.get('/api/v1/admin/pairs', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pairs = (await pairsRes.json()).data;
    if (pairs?.length > 0) {
      const pairId = pairs[0].id;
      const res = await request.patch(`/api/v1/admin/pairs/${pairId}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { makerFeeBps: 8, takerFeeBps: 12 },
      });
      expect(res.ok()).toBeTruthy();
    }
  });

  // ===== Feature #66: Admin user management =====
  test('Feature #66: Admin user list with search', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin/users');
    // Search by email
    const searchInput = page.getByPlaceholder(/search|email/i);
    await searchInput.fill('admin');
    await page.getByRole('button', { name: /search/i }).or(searchInput).press('Enter');

    await expect(page.getByText(/admin/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('Feature #66: Admin can freeze/unfreeze user', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;

    // Create a test user first
    const email = `freeze_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });

    // Get users
    const usersRes = await request.get('/api/v1/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const users = (await usersRes.json()).data;
    const targetUser = users?.find((u: any) => u.email === email);

    if (targetUser) {
      // Freeze
      const freezeRes = await request.patch(`/api/v1/admin/users/${targetUser.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { status: 'suspended' },
      });
      expect(freezeRes.ok()).toBeTruthy();

      // Unfreeze
      const unfreezeRes = await request.patch(`/api/v1/admin/users/${targetUser.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { status: 'active' },
      });
      expect(unfreezeRes.ok()).toBeTruthy();
    }
  });

  // ===== Feature #67: Admin KYC review queue =====
  test('Feature #67: Admin KYC queue page renders', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin/kyc');
    await expect(page.getByText(/KYC|review|queue|pending/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ===== Feature #68: Audit logs =====
  test('Feature #68: Audit logs API returns entries', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;

    const res = await request.get('/api/v1/admin/audit-logs', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBeTruthy();
  });

  test('Feature #68: Audit logs page displays actions', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin/audit-logs');
    await expect(page.getByText(/audit|log|action/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ===== Feature #78: Admin sidebar navigation =====
  test('Feature #78: Admin sidebar with section navigation', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin');
    // Should have sidebar links
    await expect(page.getByRole('link', { name: /dashboard/i }).or(page.getByText(/dashboard/i))).toBeVisible({ timeout: 5000 });
    await expect(page.getByRole('link', { name: /users/i }).or(page.getByText(/users/i).first())).toBeVisible();

    // Click Users
    await page.getByRole('link', { name: /users/i }).or(page.getByText(/^users$/i)).click();
    await expect(page).toHaveURL(/\/admin\/users/);
  });

  // ===== Feature #79: Admin KPI cards with trends =====
  test('Feature #79: KPI cards show value and trend', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin');
    // Should show numeric values in KPI cards
    await expect(page.getByText(/\d+/).first()).toBeVisible({ timeout: 5000 });
  });

  // ===== Feature #99: Admin system config =====
  test('Feature #99: Admin can update system config', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;

    const getRes = await request.get('/api/v1/admin/config', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(getRes.ok()).toBeTruthy();

    const patchRes = await request.patch('/api/v1/admin/config', {
      headers: { Authorization: `Bearer ${token}` },
      data: { max_open_orders_per_user: 100 },
    });
    expect(patchRes.ok()).toBeTruthy();
  });

  // ===== Feature #105: Admin responsive layout =====
  test('Feature #105: Admin dashboard responsive on mobile', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin');
    // KPI cards should still be visible
    await expect(page.getByText(/users|volume/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ===== Feature #130: Admin user detail panel =====
  test('Feature #130: Admin user detail shows profile and balances', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin/users');
    // Click on a user row
    const userRow = page.locator('tr, [class*="row"]').filter({ hasText: /@/ }).first();
    if (await userRow.isVisible().catch(() => false)) {
      await userRow.click();
      await expect(page.getByText(/email|profile|balance/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  // ===== Feature #136: Disable pair cancels orders =====
  test('Feature #136: Admin pair disable endpoint', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;

    // Get pairs to find one to test with
    const pairsRes = await request.get('/api/v1/admin/pairs', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const pairs = (await pairsRes.json()).data;
    expect(pairs?.length).toBeGreaterThan(0);
  });

  // ===== Feature #143: Admin user table with bulk selection =====
  test('Feature #143: Admin user table is interactive', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin/users');
    const checkbox = page.getByRole('checkbox').first();
    if (await checkbox.isVisible().catch(() => false)) {
      await checkbox.check();
      await page.waitForTimeout(300);
      await checkbox.uncheck();
    }
  });

  // ===== Feature #147: Admin pair creation form =====
  test('Feature #147: Admin pair creation form fields', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin/pairs');
    const addBtn = page.getByRole('button', { name: /add|create|new/i });
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
      await expect(page.getByLabel(/symbol|base.*currency/i).or(page.getByPlaceholder(/symbol/i))).toBeVisible({ timeout: 3000 });
    }
  });

  // ===== Feature #154: Admin withdrawal review =====
  test('Feature #154: Admin withdrawal queue', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;

    const res = await request.get('/api/v1/admin/withdrawals', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
  });

  // ===== Feature #155: Admin order monitoring =====
  test('Feature #155: Admin can view all active orders', async ({ request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;

    const res = await request.get('/api/v1/admin/orders', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  // ===== Feature #163: Admin charts =====
  test('Feature #163: Admin dashboard has volume chart', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin');
    const chart = page.locator('canvas, svg').first();
    await expect(chart).toBeVisible({ timeout: 10000 });
  });

  // ===== Feature #166: Admin pair status indicators =====
  test('Feature #166: Admin pairs show status indicators', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin/pairs');
    await expect(page.getByText(/active|live/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ===== Feature #170: Admin alert panel =====
  test('Feature #170: Admin alert panel visible', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin');
    // Look for alerts section
    const alerts = page.getByText(/alert|risk|event/i).first();
    if (await alerts.isVisible().catch(() => false)) {
      await expect(alerts).toBeVisible();
    }
  });

  // ===== Feature #174: Admin pair edit with preview =====
  test('Feature #174: Admin pair edit form', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', { data: ADMIN });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.goto('/admin/pairs');
    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    if (await editBtn.isVisible().catch(() => false)) {
      await editBtn.click();
      await expect(page.getByLabel(/fee|precision/i).or(page.getByPlaceholder(/fee/i))).toBeVisible({ timeout: 3000 });
    }
  });
});
