import { test, expect } from '@playwright/test';

test.describe('API Auth — Features #7-9, #58, #81, #88, #131', () => {

  test('Feature #7 API: Register with valid credentials', async ({ request }) => {
    const email = `api_reg_${Date.now()}@example.com`;
    const res = await request.post('/api/v1/auth/register', {
      data: { email, password: 'StrongPass1!' },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('accessToken');
    expect(data.data).toHaveProperty('refreshToken');
  });

  test('Feature #7 API: Register with duplicate email returns 409/400', async ({ request }) => {
    const email = `api_dup_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const res = await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    expect([400, 409]).toContain(res.status());
  });

  test('Feature #7 API: Register with weak password rejected', async ({ request }) => {
    const res = await request.post('/api/v1/auth/register', {
      data: { email: `weak_${Date.now()}@example.com`, password: '123' },
    });
    expect(res.status()).toBe(400);
  });

  test('Feature #7 API: SQL injection in email rejected', async ({ request }) => {
    const res = await request.post('/api/v1/auth/register', {
      data: { email: "'; DROP TABLE users; --", password: 'Test1234!' },
    });
    expect(res.status()).toBe(400);
  });

  test('Feature #8 API: Login with valid credentials', async ({ request }) => {
    const email = `api_login_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });

    const res = await request.post('/api/v1/auth/login', {
      data: { email, password: 'Test1234!' },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data.accessToken).toBeTruthy();
    expect(data.data.refreshToken).toBeTruthy();
  });

  test('Feature #8 API: Login with wrong password returns 401', async ({ request }) => {
    const email = `api_wrongpw_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });

    const res = await request.post('/api/v1/auth/login', {
      data: { email, password: 'WrongPassword!' },
    });
    expect(res.status()).toBe(401);
  });

  test('Feature #8 API: Login with non-existent email returns 401', async ({ request }) => {
    const res = await request.post('/api/v1/auth/login', {
      data: { email: 'nonexistent_xyz@test.com', password: 'Test1234!' },
    });
    expect(res.status()).toBe(401);
  });

  test('Feature #9 API: Refresh token returns new access token', async ({ request }) => {
    const email = `api_refresh_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const { refreshToken } = (await loginRes.json()).data;

    const res = await request.post('/api/v1/auth/refresh', {
      data: { refreshToken },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data.accessToken).toBeTruthy();
  });

  test('Feature #9 API: Expired/invalid refresh token returns 401', async ({ request }) => {
    const res = await request.post('/api/v1/auth/refresh', {
      data: { refreshToken: 'expired-or-invalid-token' },
    });
    expect(res.status()).toBe(401);
  });

  test('Feature #58 API: 2FA setup returns secret and QR URL', async ({ request }) => {
    const email = `api_2fa_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    const res = await request.post('/api/v1/auth/2fa/setup', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.data).toHaveProperty('secret');
  });

  test('Feature #81 API: Password change with correct old password', async ({ request }) => {
    const email = `api_pwch_${Date.now()}@example.com`;
    const oldPw = 'OldPass1234!';
    const newPw = 'NewPass5678!';
    await request.post('/api/v1/auth/register', { data: { email, password: oldPw } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: oldPw } });
    const token = (await loginRes.json()).data?.accessToken;

    const res = await request.put('/api/v1/auth/password', {
      headers: { Authorization: `Bearer ${token}` },
      data: { oldPassword: oldPw, newPassword: newPw },
    });
    expect(res.ok()).toBeTruthy();

    // Verify new password works
    const loginRes2 = await request.post('/api/v1/auth/login', { data: { email, password: newPw } });
    expect(loginRes2.ok()).toBeTruthy();
  });

  test('Feature #81 API: Wrong old password rejected', async ({ request }) => {
    const email = `api_pwwrong_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const token = (await loginRes.json()).data?.accessToken;

    const res = await request.put('/api/v1/auth/password', {
      headers: { Authorization: `Bearer ${token}` },
      data: { oldPassword: 'WrongOld!', newPassword: 'NewPass5678!' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('Feature #88 API: Logout invalidates refresh token', async ({ request }) => {
    const email = `api_logout_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });
    const loginRes = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    const { accessToken, refreshToken } = (await loginRes.json()).data;

    // Logout
    const logoutRes = await request.post('/api/v1/auth/logout', {
      headers: { Authorization: `Bearer ${accessToken}` },
      data: { refreshToken },
    });
    expect(logoutRes.ok()).toBeTruthy();

    // Refresh should fail now
    const refreshRes = await request.post('/api/v1/auth/refresh', {
      data: { refreshToken },
    });
    expect(refreshRes.status()).toBe(401);
  });

  test('Feature #131 API: 5 failed logins trigger lockout', async ({ request }) => {
    const email = `api_brute_${Date.now()}@example.com`;
    await request.post('/api/v1/auth/register', { data: { email, password: 'Test1234!' } });

    // Fail 5 times
    for (let i = 0; i < 5; i++) {
      await request.post('/api/v1/auth/login', { data: { email, password: 'Wrong!' } });
    }

    // 6th attempt with correct password should still fail
    const res = await request.post('/api/v1/auth/login', { data: { email, password: 'Test1234!' } });
    expect([401, 403, 429]).toContain(res.status());
  });
});
