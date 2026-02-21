import { test as base, expect, type Page, type APIRequestContext } from '@playwright/test';

// ============================================
// Test Users
// ============================================
export const TEST_USERS = {
  admin: {
    email: 'admin@exchange.local',
    password: 'Admin1234!',
    role: 'admin' as const,
  },
  trader: {
    email: 'trader@exchange.local',
    password: 'Trader1234!',
    role: 'user' as const,
  },
  newUser: {
    email: `newuser_${Date.now()}@exchange.local`,
    password: 'NewUser1234!',
    role: 'user' as const,
  },
};

// ============================================
// Authenticated Page Fixture
// ============================================
type TestFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
  apiContext: APIRequestContext;
};

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page, request }, use) => {
    // Register and login as trader
    const email = `test_${Date.now()}_${Math.random().toString(36).slice(2)}@exchange.local`;
    await request.post('/api/v1/auth/register', {
      data: { email, password: TEST_USERS.trader.password },
    });
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email, password: TEST_USERS.trader.password },
    });
    const loginData = await loginRes.json();
    const token = loginData?.data?.accessToken;

    if (token) {
      await page.addInitScript((t: string) => {
        localStorage.setItem('accessToken', t);
      }, token);
    }

    await use(page);
  },

  adminPage: async ({ page, request }, use) => {
    // Login as admin
    const loginRes = await request.post('/api/v1/auth/login', {
      data: { email: TEST_USERS.admin.email, password: TEST_USERS.admin.password },
    });
    const loginData = await loginRes.json();
    const token = loginData?.data?.accessToken;

    if (token) {
      await page.addInitScript((t: string) => {
        localStorage.setItem('accessToken', t);
      }, token);
    }

    await use(page);
  },

  apiContext: async ({ request }, use) => {
    await use(request);
  },
});

// ============================================
// API Helpers
// ============================================
export async function registerUser(
  request: APIRequestContext,
  email: string,
  password: string
) {
  return request.post('/api/v1/auth/register', {
    data: { email, password },
  });
}

export async function loginUser(
  request: APIRequestContext,
  email: string,
  password: string
) {
  return request.post('/api/v1/auth/login', {
    data: { email, password },
  });
}

export async function getAuthToken(
  request: APIRequestContext,
  email: string,
  password: string
): Promise<string> {
  const res = await loginUser(request, email, password);
  const data = await res.json();
  return data?.data?.accessToken ?? '';
}

export async function placeOrder(
  request: APIRequestContext,
  token: string,
  order: {
    symbol: string;
    side: 'buy' | 'sell';
    type: 'limit' | 'market';
    price?: string;
    amount: string;
  }
) {
  return request.post('/api/v1/orders', {
    headers: { Authorization: `Bearer ${token}` },
    data: order,
  });
}

export async function depositFunds(
  request: APIRequestContext,
  token: string,
  currency: string,
  amount: string
) {
  return request.post('/api/v1/wallet/deposit', {
    headers: { Authorization: `Bearer ${token}` },
    data: { currency, amount },
  });
}

// ============================================
// Common Assertions
// ============================================
export async function expectApiSuccess(response: any) {
  const data = await response.json();
  expect(data.success).toBe(true);
  return data;
}

export async function expectApiError(response: any, statusCode: number) {
  expect(response.status()).toBe(statusCode);
  const data = await response.json();
  expect(data.success).toBe(false);
  return data;
}

export { expect };
