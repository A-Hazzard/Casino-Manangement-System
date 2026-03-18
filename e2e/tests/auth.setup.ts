/**
 * Auth Setup — Global Project
 * ────────────────────────────
 * This file runs once as part of the "setup" Playwright project (defined in
 * playwright.config.ts).  It authenticates as a test admin user and saves the
 * resulting cookies + localStorage to e2e/.auth/user.json.
 *
 * All other test projects declare `dependencies: ['setup']` and load the
 * persisted state via `storageState: AUTH_STATE_PATH`, so they start already
 * authenticated without having to re-login on every spec file.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * Strategy selection (AUTH_STRATEGY env var):
 *   "real" (default) — hits the actual /api/auth/login endpoint.
 *                       Requires the dev server to be running with a seeded DB.
 *   "mock"           — mocks the login + current-user APIs so no real server
 *                       is needed.  Suitable for CI pipelines that only test UI.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { test as setup } from '@playwright/test';
import { setupAuthState } from '../fixtures/auth.fixture';
import { AUTH_STATE_PATH } from '../playwright.config';

setup('authenticate and persist session', async ({ page, context }) => {
  await setup.step('Perform login and save auth state to disk', async () => {
    await setupAuthState(page, context, AUTH_STATE_PATH);
  });
});
