/**
 * Authentication Fixture
 * ──────────────────────
 * Provides helpers for authentication in Playwright tests.
 *
 * Key exports:
 *   loginViaMock        — intercepts the login API and navigates through the UI
 *                         using a REAL signed JWT so the Next.js middleware
 *                         (proxy.ts) accepts the token.
 *   setRoleAuthCookie   — directly injects a signed JWT cookie for a given role
 *                         without going through the login UI. Use this in
 *                         role-restriction tests.
 *
 * Auth strategy (AUTH_STRATEGY env var):
 *   "mock" (default) — intercepts login API; no real DB or server needed.
 *   "real"           — hits the actual /api/auth/login endpoint.
 *                       Requires a running app with a seeded test user.
 */

import { SignJWT } from 'jose';
import { type BrowserContext, type Page, expect } from '@playwright/test';
import {
  MOCK_LOGIN_SUCCESS,
  MOCK_CURRENT_USER,
  MOCK_USER_PAYLOAD,
  MockUserPayload,
  mockCurrentUserResponse,
} from '../mocks/auth.mocks';

// ─── Test credentials (override via env vars) ─────────────────────────────────

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

// ─── JWT generation ───────────────────────────────────────────────────────────

/**
 * Generates a real JWT signed with JWT_SECRET that includes the dbContext
 * required by the Next.js middleware (proxy.ts).
 *
 * The middleware calls jwtVerify() + validateDatabaseContext(), both of which
 * need a properly signed token with a matching connectionString.
 */
export async function createTestJwt(
  userPayload: MockUserPayload
): Promise<string> {
  const JWT_SECRET =
    process.env.JWT_SECRET ?? 'e2e-playwright-test-secret-key-32chars';
  const MONGODB_URI = process.env.MONGODB_URI ?? '';

  const payload = {
    _id: userPayload._id,
    emailAddress: userPayload.emailAddress,
    username: userPayload.username,
    isEnabled: userPayload.isEnabled,
    roles: userPayload.roles,
    assignedLocations: userPayload.assignedLocations,
    assignedLicencees: userPayload.assignedLicencees,
    sessionId: `test-session-${userPayload._id}`,
    dbContext: {
      connectionString: MONGODB_URI,
      timestamp: Date.now(),
    },
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(JWT_SECRET));
}

// ─── Role-based cookie injection ──────────────────────────────────────────────

/**
 * Injects a valid signed JWT as the `token` cookie and mocks the
 * /api/auth/current-user endpoint to return the given user's payload.
 *
 * Use this in role-restriction tests instead of going through the login UI.
 * Call BEFORE page.goto().
 *
 * @example
 *   await setRoleAuthCookie(page, MOCK_USER_CASHIER);
 *   await page.goto('/');
 *   await expect(page).toHaveURL(/vault\/cashier\/payouts/);
 */
export async function setRoleAuthCookie(
  page: Page,
  userPayload: MockUserPayload
): Promise<void> {
  const token = await createTestJwt(userPayload);

  // Replace any existing auth cookies with this role's JWT
  await page.context().clearCookies();
  await page.context().addCookies([
    {
      name: 'token',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  // Mock current-user so ProtectedRoute resolves the correct role
  await page.route('**/api/auth/current-user**', (route) =>
    route.fulfill({
      status: 200,
      json: mockCurrentUserResponse(userPayload),
    })
  );
}

// ─── Login via real UI ────────────────────────────────────────────────────────

export async function loginViaUI(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('#identifier').fill(TEST_USER.identifier);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15_000,
  });
}

// ─── Login via direct API call ────────────────────────────────────────────────

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

// ─── Login via mock (no real server / DB needed) ──────────────────────────────

/**
 * Generates a real signed JWT, sets it via the intercepted login response,
 * and navigates through the login UI so the auth cookie is properly applied.
 *
 * The token is signed with JWT_SECRET and contains the correct dbContext so
 * proxy.ts middleware accepts it without redirecting to /login.
 */
export async function loginViaMock(
  page: Page,
  userPayload = MOCK_USER_PAYLOAD
): Promise<void> {
  const token = await createTestJwt(userPayload);

  // Intercept login API — return success with a real signed cookie
  await page.route('**/api/auth/login', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ...MOCK_LOGIN_SUCCESS,
        data: { ...MOCK_LOGIN_SUCCESS.data, user: userPayload },
      }),
      headers: {
        'Set-Cookie': [
          `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
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

  // Navigate to login and submit — the mock handles the API call
  await page.goto('/login');
  await page.locator('#identifier').fill(TEST_USER.identifier);
  await page.locator('#password').fill(TEST_USER.password);
  await page.locator('button[type="submit"]').click();

  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15_000,
  });
}

// ─── Main exported setup function ─────────────────────────────────────────────

export async function setupAuthState(
  page: Page,
  context: BrowserContext
): Promise<void> {
  if (AUTH_STRATEGY === 'mock') {
    await loginViaMock(page);
  } else {
    await loginViaUI(page);
  }

  await context.storageState({ path: AUTH_STATE_PATH });
}
