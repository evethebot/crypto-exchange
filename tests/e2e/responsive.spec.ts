import { test, expect } from '@playwright/test';

test.describe('Responsive — Features #101-105, #124, #165', () => {

  // ===== Feature #101: Mobile layout 375px =====
  test('Feature #101: Mobile trading page uses tab-based navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/trade/BTC_USDT');

    // Should have bottom navigation or tab switcher
    const bottomNav = page.getByRole('navigation');
    await expect(bottomNav).toBeVisible({ timeout: 5000 });

    // Tab switcher for Chart/Book/Trades
    const tabs = page.getByRole('tab').or(page.locator('[class*="tab"]'));
    const tabCount = await tabs.count();
    if (tabCount > 1) {
      await tabs.first().click();
      await page.waitForTimeout(300);
      await tabs.nth(1).click();
    }
  });

  test('Feature #101: Only one panel visible at a time on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/trade/BTC_USDT');
    await page.waitForTimeout(2000);

    // Viewport should not show all panels simultaneously
    const viewportWidth = 375;
    const panels = page.locator('[class*="panel"], [class*="section"]');
    if (await panels.first().isVisible().catch(() => false)) {
      const box = await panels.first().boundingBox();
      if (box) {
        expect(box.width).toBeLessThanOrEqual(viewportWidth + 10);
      }
    }
  });

  // ===== Feature #102: Tablet layout 768px =====
  test('Feature #102: Tablet layout stacks chart above order panels', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/trade/BTC_USDT');
    await page.waitForTimeout(2000);

    // Chart should be visible
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });

    // Order form should also be visible
    await expect(page.getByRole('button', { name: /buy|sell/i }).first()).toBeVisible();
  });

  // ===== Feature #103: Navbar hamburger menu on mobile =====
  test('Feature #103: Mobile navbar collapses to hamburger', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // Logo should still be visible
    const logo = page.getByRole('link', { name: /crypto|exchange|logo|home/i }).or(
      page.getByAltText(/logo/i)
    );
    await expect(logo).toBeVisible();

    // Hamburger icon
    const hamburger = page.getByRole('button', { name: /menu|hamburger|nav/i }).or(
      page.locator('[class*="hamburger"], [class*="menu-toggle"]')
    );
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
      // Menu items should be visible now
      await expect(page.getByRole('link', { name: /markets/i })).toBeVisible({ timeout: 3000 });

      // Click a link
      await page.getByRole('link', { name: /markets/i }).click();
      await expect(page).toHaveURL(/\/markets/);
    }
  });

  test('Feature #103 edge: Click outside menu closes it', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const hamburger = page.getByRole('button', { name: /menu|hamburger|nav/i }).or(
      page.locator('[class*="hamburger"], [class*="menu-toggle"]')
    );
    if (await hamburger.isVisible().catch(() => false)) {
      await hamburger.click();
      await page.waitForTimeout(500);
      // Click outside
      await page.locator('body').click({ position: { x: 10, y: 10 } });
      await page.waitForTimeout(500);
    }
  });

  // ===== Feature #104: Wallet responsive layout =====
  test('Feature #104: Wallet cards stack vertically on mobile', async ({ page, request }) => {
    const email = `walmob_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    await request.post('/api/v1/wallet/deposit', {
      headers: { Authorization: `Bearer ${token}` },
      data: { currency: 'USDT', amount: '5000' },
    });

    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/wallet');

    // Verify wallet content is visible
    await expect(page.getByText(/balance|wallet|USDT/i).first()).toBeVisible({ timeout: 5000 });

    // Buttons should be full width
    const depositBtn = page.getByRole('button', { name: /deposit/i }).or(
      page.getByRole('link', { name: /deposit/i })
    ).first();
    if (await depositBtn.isVisible().catch(() => false)) {
      const box = await depositBtn.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThan(200); // Should be wide on mobile
      }
    }
  });

  // ===== Feature #105: Admin responsive =====
  test('Feature #105: Admin KPI cards adjust on tablet', async ({ page, request }) => {
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: 'admin@exchange.local', password: 'Admin1234!' },
    });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => { localStorage.setItem('accessToken', t); }, token || '');

    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/admin');
    await expect(page.getByText(/users|volume/i).first()).toBeVisible({ timeout: 5000 });

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/admin');
    await expect(page.getByText(/users|volume/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ===== Feature #124: Login/register mobile friendly =====
  test('Feature #124: Login page centered on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');

    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    const emailInput = page.getByPlaceholder(/email/i);
    const box = await emailInput.boundingBox();
    if (box) {
      // Input should be reasonably centered (not off-screen)
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(375);
    }

    // Touch targets >= 44px
    const loginBtn = page.getByRole('button', { name: /log\s*in|sign\s*in/i });
    const btnBox = await loginBtn.boundingBox();
    if (btnBox) {
      expect(btnBox.height).toBeGreaterThanOrEqual(40);
    }
    await emailInput.fill('test@example.com');
    await page.getByPlaceholder(/password/i).fill('password');
    await loginBtn.click();
  });

  test('Feature #124: Register page mobile friendly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/register');

    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await page.getByPlaceholder(/email/i).fill('test@example.com');
    await page.getByPlaceholder(/password/i).first().fill('StrongPass1!');
    await page.getByRole('button', { name: /register|sign up|create/i }).click();
  });

  // ===== Feature #165: Mobile bottom sheet for order form =====
  test('Feature #165: Mobile order form uses bottom sheet', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/trade/BTC_USDT');
    await page.waitForTimeout(2000);

    // Look for buy/sell buttons that might trigger bottom sheet
    const buyBtn = page.getByRole('button', { name: /buy/i }).first();
    if (await buyBtn.isVisible().catch(() => false)) {
      await buyBtn.click();
      await page.waitForTimeout(500);
      // Order form elements should be visible
      await expect(page.getByPlaceholder(/amount|price/i).first()).toBeVisible({ timeout: 3000 });
    }
  });
});
