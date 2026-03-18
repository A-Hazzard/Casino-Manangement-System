/**
 * Authentication Fixture
 * ──────────────────────
 * Provides helpers for authentication in Playwright tests.
 *
 * Key exports:
 *   loginViaMock        — calls /api/e2e/auth (dev-only server endpoint) to get a
 *                         real signed JWT, then navigates to the app so the cookie
 *                         is applied. No login form interaction needed.
 *   setRoleAuthCookie   — same as above but accepts any role user payload.
 *                         Use this in role-restriction tests BEFORE page.goto().
 *
 * Why /api/e2e/auth instead of generating JWTs in the test process?
 *   The Next.js middleware (proxy.ts) verifies the JWT with JWT_SECRET and
 *   validates dbContext.connectionString == MONGODB_URI. These secrets live in
 *   .env.local which dotenvx may not expose to the test process. Calling the
 *   server endpoint lets the server sign the token with the correct secrets.
 *
 * Auth strategy (AUTH_STRATEGY env var):
 *   "mock" (default) — uses /api/e2e/auth; no real user in DB needed.
 *   "real"           — hits the actual /api/auth/login endpoint.
 *                       Requires TEST_USER_IDENTIFIER / TEST_USER_PASSWORD
 *                       env vars pointing to a real user in the database.
 */

import { type BrowserContext, type Page, expect } from '@playwright/test';
import * as fs from 'fs';
import * as nodePath from 'path';
import {
  MOCK_USER_PAYLOAD,
  MockUserPayload,
  mockCurrentUserResponse,
} from '../mocks/auth.mocks';

// ─── Test credentials (real login only) ──────────────────────────────────────

export const TEST_USER = {
  identifier: process.env.TEST_USER_IDENTIFIER ?? 'testadmin',
  password: process.env.TEST_USER_PASSWORD ?? 'Test@Password1!',
};

// ─── Strategy selector ────────────────────────────────────────────────────────

type AuthStrategy = 'real' | 'mock';
const AUTH_STRATEGY: AuthStrategy =
  (process.env.AUTH_STRATEGY as AuthStrategy) ?? 'mock';

// ─── Zustand store seeding ────────────────────────────────────────────────────

/**
 * The localStorage key used by the Zustand `persist` middleware in
 * lib/store/userStore.ts — must stay in sync with that file's `name` option.
 */
const ZUSTAND_STORE_KEY = 'user-auth-store';

/**
 * The localStorage key used by the Zustand `persist` middleware in
 * lib/store/dashboardStore.ts — must stay in sync with that file's `name` option.
 */
const DASHBOARD_STORE_KEY = 'dashboard-store';

/**
 * Registers a Playwright init script that seeds the Zustand user-auth-store
 * and dashboard-store in localStorage BEFORE any page JavaScript runs.
 *
 * Why this matters:
 *   ProtectedRoute waits for `isLoading` (React Query) to be false before
 *   checking the user. When isLoading becomes false, it reads `user` from the
 *   Zustand store via a closure captured at render time. If that closure
 *   captured `user = null`, it calls `router.push('/login')` — even if
 *   `useCurrentUserQuery`'s own effect is about to call `setUser` in the same
 *   tick. Seeding localStorage ensures Zustand hydrates with the correct user
 *   from the very first render, so the closure never contains a null user.
 *
 *   We also seed the dashboard-store with a selectedLicencee so the dashboard
 *   renders metric cards instead of the <NoLicenceeAssigned> placeholder.
 *
 * Implementation note — string-based addInitScript:
 *   We embed the serialized JSON directly into the script string rather than
 *   using the page.addInitScript(fn, arg) overload. The function+arg overload
 *   relies on Playwright serializing the arg via structured-clone, which can
 *   silently fail for some payloads. The string overload is always reliable.
 */
async function seedZustandUser(
  page: Page,
  userPayload: MockUserPayload
): Promise<void> {
  const userStoreJSON = JSON.stringify({
    state: {
      user: {
        _id: userPayload._id,
        username: userPayload.username,
        emailAddress: userPayload.emailAddress,
        profile: userPayload.profile,
        roles: userPayload.roles,
        isEnabled: userPayload.isEnabled,
        assignedLocations: userPayload.assignedLocations,
        assignedLicencees: userPayload.assignedLicencees,
      },
      isInitialized: true,
      hasActiveVaultShift: false,
      isVaultReconciled: false,
      isStaleShift: false,
    },
    version: 0,
  });

  // Use the first assignedLicencee as the active licencee context, falling
  // back to empty string (which triggers the NoLicenceeAssigned UI).
  const activeLicencee = userPayload.assignedLicencees[0] ?? '';
  const dashboardStoreJSON = JSON.stringify({
    state: {
      selectedLicencee: activeLicencee,
      activeMetricsFilter: 'Today',
      displayCurrency: 'TTD',
      gameDayOffset: 8,
      customDateRange: {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      },
    },
    version: 0,
  });

  await page.addInitScript(`
    localStorage.setItem(${JSON.stringify(ZUSTAND_STORE_KEY)}, ${JSON.stringify(userStoreJSON)});
    localStorage.setItem(${JSON.stringify(DASHBOARD_STORE_KEY)}, ${JSON.stringify(dashboardStoreJSON)});
  `);
}

/**
 * Calls the dev-only /api/e2e/auth endpoint to obtain a real signed JWT
 * for the given user. The server uses its own JWT_SECRET + MONGODB_URI so
 * the token passes proxy.ts middleware verification.
 *
 * The Set-Cookie header in the response is automatically stored in
 * page.context()'s cookie jar (Playwright shares cookies between
 * page.request and page navigation).
 */
async function obtainAuthCookie(
  page: Page,
  userPayload: MockUserPayload
): Promise<void> {
  const response = await page.request.post('/api/e2e/auth', {
    data: { user: userPayload },
  });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `[auth.fixture] /api/e2e/auth failed (${response.status()}): ${body}\n` +
      'Ensure the Next.js dev server is running and NODE_ENV !== "production".'
    );
  }

  await page.context().cookies();
}

// ─── Role-based cookie injection ──────────────────────────────────────────────

/**
 * Injects a real signed JWT cookie for the given role user and mocks
 * the /api/auth/current-user endpoint to return that user's payload.
 *
 * Call BEFORE page.goto() in role-restriction tests.
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
  // Clear the existing auth cookie so the old admin session is gone
  await page.context().clearCookies();

  // Seed Zustand's localStorage with the role user BEFORE page navigation.
  // This prevents the ProtectedRoute race condition where user=null is captured
  // in the effect closure when isLoading transitions to false.
  await seedZustandUser(page, userPayload);

  // Mock current-user so the API confirms the role (keeps Zustand in sync)
  await page.route('**/api/auth/current-user**', (route) =>
    route.fulfill({
      status: 200,
      json: mockCurrentUserResponse(userPayload),
    })
  );

  // Mock token API so fetchUserId doesn't hit the DB and return 401
  await page.route('**/api/auth/token**', (route) =>
    route.fulfill({
      status: 200,
      json: { userId: userPayload._id }
    })
  );

  // Mock profile API so AppSidebar doesn't get 404
  await page.route(`**/api/users/${userPayload._id}**`, (route) =>
    route.fulfill({
      status: 200,
      json: { success: true, user: mockCurrentUserResponse(userPayload).user }
    })
  );

  // Obtain a real JWT from the server and store it in the context cookie jar
  await obtainAuthCookie(page, userPayload);
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

// ─── Login via mock (no real user in DB needed) ───────────────────────────────

/**
 * Obtains a real JWT from the dev-only test endpoint, mocks current-user,
 * then navigates to the dashboard. Skips the login form entirely.
 */
export async function loginViaMock(
  page: Page,
  userPayload = MOCK_USER_PAYLOAD
): Promise<void> {
  // Mock current-user so the API confirms the user (keeps Zustand in sync)
  await page.route('**/api/auth/current-user**', (route) =>
    route.fulfill({
      status: 200,
      json: mockCurrentUserResponse(userPayload),
    })
  );

  // Mock token API so fetchUserId doesn't hit the DB and return 401
  await page.route('**/api/auth/token**', (route) =>
    route.fulfill({
      status: 200,
      json: { userId: userPayload._id }
    })
  );

  // Mock profile API so AppSidebar doesn't get 404
  await page.route(`**/api/users/${userPayload._id}**`, (route) =>
    route.fulfill({
      status: 200,
      json: { success: true, user: mockCurrentUserResponse(userPayload).user }
    })
  );

  // Seed Zustand's localStorage so ProtectedRoute has the user immediately on
  // first render — avoids the race condition where user=null is in the closure
  // when isLoading first becomes false.
  await seedZustandUser(page, userPayload);

  // Get a real JWT cookie from the server (uses server's JWT_SECRET + MONGODB_URI)
  await obtainAuthCookie(page, userPayload);

  // Navigate to the dashboard — the cookie and seeded Zustand state are ready
  await page.goto('/');
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 15_000,
  });
}

// ─── Main exported setup function ─────────────────────────────────────────────

export async function setupAuthState(
  page: Page,
  context: BrowserContext,
  statePath: string
): Promise<void> {
  if (AUTH_STRATEGY === 'mock') {
    await loginViaMock(page);
  } else {
    await loginViaUI(page);
  }

  // Ensure the directory exists before writing the storage state file
  fs.mkdirSync(nodePath.dirname(statePath), { recursive: true });
  await context.storageState({ path: statePath });
}
