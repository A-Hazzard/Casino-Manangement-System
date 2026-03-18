/**
 * Authentication Fixture
 * ──────────────────────
 * Provides a helper for programmatic login via the API.
 * Used by auth.setup.ts to populate the shared storageState file
 * so that subsequent test projects inherit valid cookies.
 *
 * Two strategies are supported:
 *   1. REAL LOGIN  — hits /api/auth/login with test credentials from env vars.
 *                    Requires a running app + seeded test user.
 *   2. MOCK LOGIN  — intercepts the login API and returns a fake success response,
 *                    then sets an artificial JWT cookie.  Useful when a real DB is
 *                    not available during CI.
 *
 * Switch between strategies by setting AUTH_STRATEGY env var:
 *   AUTH_STRATEGY=real   (default)
 *   AUTH_STRATEGY=mock
 */

import { type BrowserContext, type Page, expect } from '@playwright/test';
import { MOCK_LOGIN_SUCCESS, MOCK_CURRENT_USER } from '../mocks/auth.mocks';

// ─── Test credentials (override via .env.test or CI env vars) ─────────────────

export const TEST_USER = {
  identifier: process.env.TEST_USER_IDENTIFIER ?? 'testadmin',
  password: process.env.TEST_USER_PASSWORD ?? 'Test@Password1!',
};

// ─── Auth state file path (kept in sync with playwright.config.ts) ────────────

export const AUTH_STATE_PATH = './e2e/.auth/user.json';

// ─── Strategy selector ────────────────────────────────────────────────────────

type AuthStrategy = 'real' | 'mock';
const AUTH_STRATEGY: AuthStrategy =
  (process.env.AUTH_STRATEGY as AuthStrategy) ?? 'mock';

// ─── Helper: perform real login via the app's login page ──────────────────────

/**
 * Navigates to /login, fills credentials, submits the form, and waits for the
 * redirect to the dashboard.  After returning, the context's cookies include the
 * valid HttpOnly JWT issued by the server.
 */
export async function loginViaUI(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('#identifier').fill(TEST_USER.identifier);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();

  // Wait until the app redirects away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15_000,
  });
}

// ─── Helper: perform login via direct API call ────────────────────────────────

/**
 * Sends a POST request directly to /api/auth/login using the Playwright
 * request context (shares cookies with the browser context).
 * Faster than UI login but still requires a real running server.
 */
export async function loginViaAPI(context: BrowserContext): Promise<void> {
  const response = await context.request.post('/api/auth/login', {
    data: {
      identifier: TEST_USER.identifier,
      password: TEST_USER.password,
      rememberMe: false,
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);
}

// ─── Helper: mock login (no real server needed) ───────────────────────────────

/**
 * Registers Playwright route handlers to intercept the login and current-user
 * APIs, then "logs in" by navigating to /login and submitting the form against
 * the mock.  The mock response sets a fake token cookie so the app considers
 * the user authenticated.
 */
export async function loginViaMock(page: Page): Promise<void> {
  // Intercept login API
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_LOGIN_SUCCESS),
      // Simulate the HttpOnly cookie the real server would set
      headers: {
        'Set-Cookie': [
          'token=fake-jwt-token; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800',
          'refreshToken=fake-refresh-token; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000',
        ].join(', '),
      },
    })
  );

  // Intercept current-user so ProtectedRoute resolves successfully
  await page.route('**/api/auth/current-user', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_CURRENT_USER),
    })
  );

  // Navigate to login and submit — the mock will handle the request
  await page.goto('/login');
  await page.locator('#identifier').fill(TEST_USER.identifier);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 10_000,
  });
}

// ─── Main exported setup function ─────────────────────────────────────────────

/**
 * Performs authentication using the configured strategy and saves the resulting
 * browser context's storage state (cookies + localStorage) to AUTH_STATE_PATH.
 *
 * Called from auth.setup.ts.
 */
export async function setupAuthState(page: Page, context: BrowserContext): Promise<void> {
  if (AUTH_STRATEGY === 'mock') {
    await loginViaMock(page);
  } else {
    // Default: real login via UI
    await loginViaUI(page);
  }

  // Persist cookies so all other test projects can reuse this session
  await context.storageState({ path: AUTH_STATE_PATH });
}
