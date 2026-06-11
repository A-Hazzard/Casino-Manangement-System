/**
 * VAULT Foundation Smoke Tests
 * ──────────────────────────────
 * Proves the shared vault e2e foundation works end-to-end:
 *   - Auth as a vault-manager (setRoleAuthCookie + MOCK_USER_VAULT_MANAGER)
 *   - In CMS mode the app ALLOWS /vault/* routes (ApplicationRouteGuard only
 *     restricts when APPLICATION=VAULT), so vault pages render against the
 *     normal dev server with no special server mode.
 *   - vault-manager has `vault-management` page access (ProtectedRoute passes).
 *
 * This file is the reference pattern for the per-area vault specs.
 *
 *  1. Vault-manager lands on /vault/management/transactions and sees the table
 *  2. Vault-manager reaches /vault/management (overview) without redirect
 */

import { test, expect } from '../fixtures/test.fixture';
import { MOCK_USER_VAULT_MANAGER } from '../mocks/auth.mocks';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';
import { mockVaultManagerAPIs } from '../mocks/vaultApiMocks';

test.describe('VAULT — foundation smoke', () => {
  test('1. Vault-manager sees the transactions table on /vault/management/transactions', async ({
    page,
  }) => {
    await test.step('Authenticate as vault-manager', async () => {
      await setRoleAuthCookie(page, MOCK_USER_VAULT_MANAGER);
    });

    await test.step('Mock vault APIs', async () => {
      await mockVaultManagerAPIs(page);
    });

    await test.step('Navigate to the vault transactions page', async () => {
      // Vault routes cold-compile slowly under OneDrive — use a generous timeout
      // and domcontentloaded rather than waiting for full load.
      await page.goto('/vault/management/transactions', {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await page.waitForLoadState('networkidle').catch(() => {});
    });

    await test.step('Assert we did NOT get bounced to login/unauthorized', async () => {
      await expect(page).toHaveURL(/\/vault\/management\/transactions/, {
        timeout: 10_000,
      });
    });

    await test.step('Assert a mocked transaction renders', async () => {
      await expect(
        page
          .getByText(/Opening top-up|add.?cash/i)
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
    });
  });

  test('2. Vault-manager reaches the overview without being redirected away', async ({
    page,
  }) => {
    await test.step('Authenticate as vault-manager', async () => {
      await setRoleAuthCookie(page, MOCK_USER_VAULT_MANAGER);
    });

    await test.step('Mock vault APIs', async () => {
      await mockVaultManagerAPIs(page);
    });

    await test.step('Navigate to the vault overview', async () => {
      await page.goto('/vault/management', {
        waitUntil: 'domcontentloaded',
        timeout: 60_000,
      });
      await page.waitForLoadState('networkidle').catch(() => {});
    });

    await test.step('Assert we stayed on /vault/management (not login/unauthorized/CMS)', async () => {
      await expect(page).toHaveURL(/\/vault\/management(\?|\/?$)/, {
        timeout: 10_000,
      });
      await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    });
  });
});
