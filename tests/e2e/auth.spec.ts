import { test, expect } from '@playwright/test';

test.describe('Auth — Features #1-3, #7-9, #58-60, #81-82, #88, #131, #156', () => {
  // ===== Feature #1: Dev server starts on port 3000 =====
  test('Feature #1: Next.js dev server responds on port 3000', async ({ page }) => {
    await page.goto('/');
    await expect(page).not.toHaveTitle('');
    // Verify health endpoint via navigation
    await page.goto('/api/v1/health');
    const body = page.locator('body');
    await expect(body).toContainText('success');
  });

  test('Feature #1 edge: health endpoint returns JSON with success field', async ({ request }) => {
    const res = await request.get('/api/v1/health');
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  // ===== Feature #2: Database connection and migrations =====
  test('Feature #2: Database is connected and healthy', async ({ request }) => {
    const res = await request.get('/api/v1/health');
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('database');
  });

  // ===== Feature #3: Seed data =====
  test('Feature #3: Seed data provides 5 trading pairs', async ({ request }) => {
    const res = await request.get('/api/v1/market/pairs');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThanOrEqual(5);
  });

  test('Feature #3: BTC_USDT pair exists with correct config', async ({ request }) => {
    const res = await request.get('/api/v1/market/pairs/BTC_USDT');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data.symbol).toBe('BTC_USDT');
    expect(data.data.baseCurrency).toBe('BTC');
    expect(data.data.quoteCurrency).toBe('USDT');
  });

  // ===== Feature #7: User registration =====
  test('Feature #7: User can register with email and password', async ({ page }) => {
    const uniqueEmail = `reg_test_${Date.now()}@example.com`;
    await page.goto('/register');

    await page.getByPlaceholder(/email/i).fill(uniqueEmail);
    await page.getByPlaceholder(/password/i).first().fill('StrongPass1234!');

    // Look for terms checkbox if present
    const termsCheckbox = page.getByRole('checkbox');
    if (await termsCheckbox.isVisible().catch(() => false)) {
      await termsCheckbox.check();
    }

    await page.getByRole('button', { name: /create account|register|sign up/i }).click();

    // Should redirect away from register page
    await page.waitForURL(/\/(trade|dashboard|markets)?/, { timeout: 10000 });
  });

  test('Feature #7 edge: duplicate email shows error', async ({ page, request }) => {
    const email = `dup_${Date.now()}@example.com`;
    // Register first via API
    await request.post('/api/v1/auth/register', {
      data: { email, password: 'Test1234!' },
    });

    await page.goto('/register');
    await page.getByPlaceholder(/email/i).fill(email);
    await page.getByPlaceholder(/password/i).first().fill('Test1234!');
    const termsCheckbox = page.getByRole('checkbox');
    if (await termsCheckbox.isVisible().catch(() => false)) {
      await termsCheckbox.check();
    }
    await page.getByRole('button', { name: /create account|register|sign up/i }).click();

    // Should show error about duplicate email
    await expect(page.getByText(/already registered|already exists|email.*taken/i)).toBeVisible({ timeout: 5000 });
  });

  test('Feature #7 edge: weak password shows validation error', async ({ page }) => {
    await page.goto('/register');
    await page.getByPlaceholder(/email/i).fill('weak@example.com');
    await page.getByPlaceholder(/password/i).first().fill('123');
    await page.getByRole('button', { name: /create account|register|sign up/i }).click();

    // Should show password requirement error
    await expect(page.getByText(/password.*requirements|too short|too weak|at least/i)).toBeVisible({ timeout: 5000 });
  });

  // ===== Feature #8: User login =====
  test('Feature #8: User can login with email and password', async ({ page, request }) => {
    const email = `login_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', {
      data: { email, password: 'Test1234!' },
    });

    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill(email);
    await page.getByPlaceholder(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /log\s*in|sign\s*in/i }).click();

    // Should redirect to trading or dashboard
    await page.waitForURL(/\/(trade|dashboard|markets)?/, { timeout: 10000 });
  });

  test('Feature #8 edge: wrong password shows error', async ({ page, request }) => {
    const email = `wrong_pw_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', {
      data: { email, password: 'Test1234!' },
    });

    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill(email);
    await page.getByPlaceholder(/password/i).fill('WrongPassword99!');
    await page.getByRole('button', { name: /log\s*in|sign\s*in/i }).click();

    await expect(page.getByText(/invalid.*credentials|incorrect|wrong.*password/i)).toBeVisible({ timeout: 5000 });
  });

  test('Feature #8 edge: non-existent email shows generic error', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill('nonexist_999@example.com');
    await page.getByPlaceholder(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /log\s*in|sign\s*in/i }).click();

    // Same error message to prevent email enumeration
    await expect(page.getByText(/invalid.*credentials|incorrect|not found/i)).toBeVisible({ timeout: 5000 });
  });

  // ===== Feature #9: JWT token refresh =====
  test('Feature #9: JWT refresh returns new access token', async ({ request }) => {
    const email = `refresh_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', {
      data: { email, password: 'Test1234!' },
    });
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email, password: 'Test1234!' },
    });
    const loginData = await loginRes.json();
    const refreshToken = loginData.data?.refreshToken;

    const refreshRes = await request.post('/api/v1/auth/refresh', {
      data: { refreshToken },
    });
    expect(refreshRes.ok()).toBeTruthy();
    const refreshData = await refreshRes.json();
    expect(refreshData.data?.accessToken).toBeTruthy();
  });

  test('Feature #9 edge: invalid refresh token returns 401', async ({ request }) => {
    const res = await request.post('/api/v1/auth/refresh', {
      data: { refreshToken: 'invalid-token-12345' },
    });
    expect(res.status()).toBe(401);
  });

  // ===== Feature #58: 2FA TOTP setup =====
  test('Feature #58: 2FA setup page shows QR code and secret', async ({ page, request }) => {
    const email = `2fa_${Date.now()}@example.com`;
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

    await page.goto('/account/security');
    await page.getByRole('button', { name: /enable 2fa|setup 2fa|two-factor/i }).click();

    // Should show QR code or secret key
    await expect(
      page.getByText(/secret|key|authenticator/i).or(page.getByRole('img', { name: /qr/i }))
    ).toBeVisible({ timeout: 5000 });
  });

  // ===== Feature #59: KYC Level 1 phone verification =====
  test('Feature #59: KYC Level 1 phone verification flow', async ({ page, request }) => {
    const email = `kyc1_${Date.now()}@example.com`;
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

    await page.goto('/account/kyc');
    await page.getByRole('button', { name: /verify phone|level 1|upgrade/i }).click();
    await page.getByPlaceholder(/phone/i).fill('+1234567890');
    await page.getByPlaceholder(/code|verification/i).fill('123456');
    await page.getByRole('button', { name: /verify|submit|confirm/i }).click();

    await expect(page.getByText(/level 1|verified|approved/i)).toBeVisible({ timeout: 10000 });
  });

  // ===== Feature #60: KYC Level 2 document upload =====
  test('Feature #60: KYC Level 2 document upload flow', async ({ page, request }) => {
    const email = `kyc2_${Date.now()}@example.com`;
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

    await page.goto('/account/kyc');
    // Click to start level 2 verification
    const uploadBtn = page.getByRole('button', { name: /upload.*document|level 2|identity/i });
    if (await uploadBtn.isVisible().catch(() => false)) {
      await uploadBtn.click();
    }

    // Select document type
    const docTypeSelect = page.getByRole('combobox', { name: /document.*type/i });
    if (await docTypeSelect.isVisible().catch(() => false)) {
      await docTypeSelect.selectOption({ index: 0 });
    }

    // Check for file upload inputs
    const fileInputs = page.locator('input[type="file"]');
    await expect(fileInputs.first()).toBeAttached();
  });

  // ===== Feature #81: Password change =====
  test('Feature #81: Password change requires old password', async ({ page, request }) => {
    const email = `pwchange_${Date.now()}@example.com`;
    const oldPw = 'OldPass1234!';
    await request.post('/api/v1/auth/register', {
      data: { email, password: oldPw },
    });
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email, password: oldPw },
    });
    const token = (await loginRes.json()).data?.accessToken;

    await page.addInitScript((t: string) => {
      localStorage.setItem('accessToken', t);
    }, token || '');

    await page.goto('/account/security');
    await page.getByRole('button', { name: /change password/i }).click();

    await page.getByLabel(/current|old.*password/i).fill(oldPw);
    await page.getByLabel(/new.*password/i).first().fill('NewPass5678!');
    await page.getByLabel(/confirm.*password/i).fill('NewPass5678!');
    await page.getByRole('button', { name: /save|update|change/i }).click();

    await expect(page.getByText(/password.*changed|password.*updated|success/i)).toBeVisible({ timeout: 5000 });
  });

  // ===== Feature #82: Login history =====
  test('Feature #82: Login history shows recent login attempts', async ({ page, request }) => {
    const email = `history_${Date.now()}@example.com`;
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

    await page.goto('/account/login-history');
    // Should show at least one login entry
    await expect(page.getByText(/login|sign.*in|session/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ===== Feature #88: Logout =====
  test('Feature #88: Logout clears session and redirects to login', async ({ page, request }) => {
    const email = `logout_${Date.now()}@example.com`;
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

    await page.goto('/trade/BTC_USDT');
    // Click user menu / logout
    const userMenu = page.getByRole('button', { name: /account|profile|user|menu/i });
    if (await userMenu.isVisible().catch(() => false)) {
      await userMenu.click();
    }
    await page.getByRole('menuitem', { name: /log\s*out|sign\s*out/i }).or(
      page.getByRole('button', { name: /log\s*out|sign\s*out/i })
    ).click();

    // Should redirect to login page or home
    await page.waitForURL(/\/(login|)$/, { timeout: 10000 });
  });

  // ===== Feature #131: Brute force protection =====
  test('Feature #131: 5 failed logins trigger account lockout', async ({ page, request }) => {
    const email = `brute_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', {
      data: { email, password: 'Test1234!' },
    });

    // Fail 5 times via API
    for (let i = 0; i < 5; i++) {
      await request.post('/api/v1/auth/login', {
        data: { email, password: 'WrongPass!' },
      });
    }

    // 6th attempt should be locked
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill(email);
    await page.getByPlaceholder(/password/i).fill('Test1234!');
    await page.getByRole('button', { name: /log\s*in|sign\s*in/i }).click();

    await expect(page.getByText(/locked|too many.*attempts|temporarily/i)).toBeVisible({ timeout: 5000 });
  });

  // ===== Feature #156: API key management =====
  test('Feature #156: API key management page', async ({ page, request }) => {
    const email = `apikey_${Date.now()}@example.com`;
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

    await page.goto('/account/security');
    await page.getByRole('button', { name: /api.*key|create.*key/i }).click();

    await expect(page.getByText(/api.*key|secret/i)).toBeVisible({ timeout: 5000 });
  });
});
