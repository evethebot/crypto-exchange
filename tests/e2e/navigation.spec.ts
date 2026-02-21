import { test, expect } from '@playwright/test';

test.describe('Navigation — Features #6, #39', () => {
  // ===== Feature #6: Top navigation bar =====
  test('Feature #6: Navbar renders with logo and nav links', async ({ page }) => {
    await page.goto('/');
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();

    // Logo/brand should be visible
    await expect(page.getByRole('link', { name: /crypto|exchange|logo/i }).or(
      page.getByAltText(/logo/i)
    )).toBeVisible();

    // Nav links
    await expect(page.getByRole('link', { name: /markets/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /trade/i })).toBeVisible();
  });

  test('Feature #6: Unauthenticated user sees Login/Register buttons', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('link', { name: /log\s*in|sign\s*in/i }).or(
        page.getByRole('button', { name: /log\s*in|sign\s*in/i })
      )
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /register|sign\s*up/i }).or(
        page.getByRole('button', { name: /register|sign\s*up/i })
      )
    ).toBeVisible();
  });

  test('Feature #6: Nav links navigate to correct pages', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: /markets/i }).click();
    await expect(page).toHaveURL(/\/markets/);

    await page.getByRole('link', { name: /trade/i }).click();
    await expect(page).toHaveURL(/\/trade/);
  });

  test('Feature #6: Theme toggle button exists', async ({ page }) => {
    await page.goto('/');
    const themeToggle = page.getByRole('button', { name: /theme|dark|light|mode/i });
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    // After clicking, the page should still be functional
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('Feature #6 edge: Navbar stays fixed on scroll', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 500));
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
    const navBox = await nav.boundingBox();
    expect(navBox?.y).toBeLessThanOrEqual(10); // Should be at top
  });

  // ===== Feature #39: Landing page =====
  test('Feature #39: Landing page displays hero section and CTA', async ({ page }) => {
    await page.goto('/');
    // Hero section with exchange name/tagline
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // CTA button
    const cta = page.getByRole('link', { name: /start trading|get started|trade now/i }).or(
      page.getByRole('button', { name: /start trading|get started|trade now/i })
    );
    await expect(cta).toBeVisible();
  });

  test('Feature #39: CTA navigates to register or trade', async ({ page }) => {
    await page.goto('/');
    const cta = page.getByRole('link', { name: /start trading|get started|trade now/i }).or(
      page.getByRole('button', { name: /start trading|get started|trade now/i })
    );
    await cta.click();
    await expect(page).toHaveURL(/\/(register|trade)/);
  });

  test('Feature #39: Landing page shows live ticker marquee', async ({ page }) => {
    await page.goto('/');
    // Ticker should show pair symbols and prices
    await expect(page.getByText(/BTC/i).first()).toBeVisible();
    await expect(page.getByText(/USDT/i).first()).toBeVisible();
  });

  test('Feature #39: Landing page shows feature highlight cards', async ({ page }) => {
    await page.goto('/');
    // Should have 3-4 feature cards
    const cards = page.locator('[class*="card"], [class*="feature"], article').filter({
      has: page.getByRole('heading'),
    });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('Feature #39 edge: Already logged in CTA says Go to Trading', async ({ page, request }) => {
    const email = `nav_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', {
      data: { email, password: 'Test1234!' },
    });
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email, password: 'Test1234!' },
    });
    const token = (await loginRes.json()).data?.accessToken;
    await page.addInitScript((t: string) => {
      localStorage.setItem('accessToken', t);
    }, token || '');

    await page.goto('/');
    const cta = page.getByRole('link', { name: /go to trading|trade now|dashboard/i }).or(
      page.getByRole('button', { name: /go to trading|trade now|dashboard/i })
    );
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/\/trade/);
  });
});
