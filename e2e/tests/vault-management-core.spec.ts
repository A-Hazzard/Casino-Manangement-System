/**
 * VAULT Management Core — Page Coverage
 * ──────────────────────────────────────
 * Covers the four vault-manager "management core" pages:
 *   1. /vault/management               — Vault Overview
 *   2. /vault/management/transactions  — Transactions
 *   3. /vault/management/activity-log  — Activity Log
 *   4. /vault/management/floats        — Float Management
 *
 * Reuses the proven vault foundation:
 *   - Auth: setRoleAuthCookie(page, MOCK_USER_VAULT_MANAGER)
 *   - API mocks: mockVaultManagerAPIs(page) from vault-foundation.spec
 *
 * Each spec asserts on stable, always-rendered chrome (headings, summary-card
 * labels, filter inputs, table headers) plus mocked data rows. Page-specific
 * mocks are registered INLINE after mockVaultManagerAPIs so they win via
 * Playwright's LIFO route priority.
 *
 * Cold-compile note: vault routes compile slowly under OneDrive. We navigate
 * with domcontentloaded + a generous timeout and a best-effort networkidle.
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import { MOCK_USER_VAULT_MANAGER } from '../mocks/auth.mocks';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';
import { mockVaultManagerAPIs } from '../mocks/vaultApiMocks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Authenticate as a vault-manager and register the shared vault API mocks.
 */
async function authAsVaultManager(page: Page): Promise<void> {
  await setRoleAuthCookie(page, MOCK_USER_VAULT_MANAGER);
  await mockVaultManagerAPIs(page);
}

/**
 * Navigate to a vault route, tolerating slow first-run cold compilation.
 */
async function gotoVault(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
}

/**
 * Assert the page did not render the PageErrorBoundary maintenance fallback,
 * which signals a render crash (almost always a mock-shape mismatch).
 */
async function assertNoCrash(page: Page): Promise<void> {
  await expect(
    page.getByText(/this page is currently under maintenance/i)
  ).toHaveCount(0);
}

// ─── 1. Vault Overview (/vault/management) ──────────────────────────────────────

test.describe('VAULT management core — Overview', () => {
  test('renders the overview dashboard with balance + metrics chrome', async ({
    page,
  }) => {
    await authAsVaultManager(page);
    await gotoVault(page, '/vault/management');

    await test.step('Stays on the overview route', async () => {
      await expect(page).toHaveURL(/\/vault\/management(\?|\/?$)/, {
        timeout: 10_000,
      });
      await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    });

    await test.step('No render crash', async () => {
      await assertNoCrash(page);
    });

    await test.step('Vault Management header is visible', async () => {
      await expect(
        page
          .getByRole('heading', { name: /vault management/i })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
    });

    await test.step('End-of-Day report quick action is present', async () => {
      await expect(
        page
          .getByRole('link', { name: /view end-of-day report/i })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('shows a recent vault transaction from the mocked feed', async ({
    page,
  }) => {
    await authAsVaultManager(page);
    await gotoVault(page, '/vault/management');

    await test.step('Recent activity reflects a mocked transaction', async () => {
      await expect(
        page
          .getByText(/Opening top-up|Morning float/i)
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
    });
  });
});

// ─── 2. Transactions (/vault/management/transactions) ───────────────────────────

test.describe('VAULT management core — Transactions', () => {
  test('renders summary cards + transaction table', async ({ page }) => {
    await authAsVaultManager(page);
    await gotoVault(page, '/vault/management/transactions');

    await test.step('Stays on the transactions route', async () => {
      await expect(page).toHaveURL(/\/vault\/management\/transactions/, {
        timeout: 10_000,
      });
    });

    await test.step('No render crash', async () => {
      await assertNoCrash(page);
    });

    await test.step('Inflow / Outflow / Expenses summary cards render', async () => {
      await expect(
        page.getByText('Total Inflow').filter({ visible: true }).first()
      ).toBeVisible({ timeout: 12_000 });
      await expect(
        page.getByText('Total Outflow').filter({ visible: true }).first()
      ).toBeVisible();
      await expect(
        page.getByText('Total Expenses').filter({ visible: true }).first()
      ).toBeVisible();
    });

    await test.step('A mocked transaction row renders', async () => {
      await expect(
        page
          .getByText(/Opening top-up|Morning float/i)
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
    });
  });

  test('exposes search + type/status filters', async ({ page }) => {
    await authAsVaultManager(page);
    await gotoVault(page, '/vault/management/transactions');

    await test.step('Search input is usable', async () => {
      const search = page.getByPlaceholder(/search transactions/i);
      await expect(search).toBeVisible({ timeout: 12_000 });
      await search.fill('float');
      await expect(search).toHaveValue('float');
    });

    await test.step('Type + Status filter selects are present', async () => {
      await expect(
        page.getByRole('combobox').filter({ visible: true }).first()
      ).toBeVisible({ timeout: 10_000 });
      // Two filter selects render (type + status)
      const comboCount = await page
        .getByRole('combobox')
        .filter({ visible: true })
        .count();
      expect(comboCount).toBeGreaterThanOrEqual(2);
    });
  });
});

// ─── 3. Activity Log (/vault/management/activity-log) ───────────────────────────

test.describe('VAULT management core — Activity Log', () => {
  /**
   * The activity-log page reads GET /api/vault/activity-log → { success,
   * activities, totalCount }. The foundation catch-all returns no `activities`
   * array, so we register a page-specific mock with one audit row.
   */
  async function mockActivityLog(page: Page): Promise<void> {
    await page.route('**/api/vault/activity-log**', route =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          activities: [
            {
              _id: 'act_001',
              type: 'add_cash',
              amount: 50_000,
              timestamp: new Date('2026-01-01T09:00:00.000Z').toISOString(),
              performerName: 'E2E VaultManager',
              performedBy: 'vaultManager',
              notes: 'Opening top-up',
              from: { type: 'external' },
              to: { type: 'vault' },
              currency: 'TTD',
            },
            {
              _id: 'act_002',
              type: 'payout',
              amount: 8_000,
              timestamp: new Date('2026-01-01T10:30:00.000Z').toISOString(),
              performerName: 'E2E VaultManager',
              performedBy: 'vaultManager',
              notes: 'Jackpot payout',
              from: { type: 'vault' },
              to: { type: 'cashier' },
              currency: 'TTD',
            },
          ],
          totalCount: 2,
        },
      })
    );
  }

  test('renders the activity log table + filter chrome', async ({ page }) => {
    await authAsVaultManager(page);
    await mockActivityLog(page);
    await gotoVault(page, '/vault/management/activity-log');

    await test.step('Stays on the activity-log route', async () => {
      await expect(page).toHaveURL(/\/vault\/management\/activity-log/, {
        timeout: 10_000,
      });
    });

    await test.step('No render crash', async () => {
      await assertNoCrash(page);
    });

    await test.step('Activity Log header renders', async () => {
      await expect(
        page
          .getByRole('heading', { name: /^activity log$/i })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Filters card exposes cashier + type filters', async () => {
      await expect(
        page.getByText(/filter by cashier/i).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByText(/filter by type/i).filter({ visible: true }).first()
      ).toBeVisible();
    });

    await test.step('A mocked activity row renders', async () => {
      await expect(
        page
          .getByText(/Jackpot payout/i)
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
    });
  });

  test('type filter is operable', async ({ page }) => {
    await authAsVaultManager(page);
    await mockActivityLog(page);
    await gotoVault(page, '/vault/management/activity-log');

    await test.step('Type filter select opens and shows options', async () => {
      const typeFilter = page.locator('#type-filter');
      await expect(typeFilter).toBeVisible({ timeout: 12_000 });
      await typeFilter.click();
      await expect(
        page.getByRole('option', { name: /payouts/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });
});

// ─── 4. Float Management (/vault/management/floats) ─────────────────────────────

test.describe('VAULT management core — Float Management', () => {
  /**
   * The floats page derives cashier floats from GET
   * /api/cashier/shifts?...status=active. Register a page-specific mock with an
   * active shift so a cashier-float row renders (foundation returns none).
   */
  async function mockActiveCashierShifts(page: Page): Promise<void> {
    await page.route('**/api/cashier/shifts**', route =>
      route.fulfill({
        status: 200,
        json: {
          success: true,
          shifts: [
            {
              _id: 'shift_float_001',
              cashierId: 'cash_001',
              cashierName: 'E2E Cashier',
              cashierUsername: 'cashier',
              locationId: 'loc_001',
              status: 'active',
              openingBalance: 20_000,
              currentBalance: 18_500,
              payoutsTotal: 1_500,
              openedAt: new Date('2026-01-01T08:00:00.000Z').toISOString(),
              openingDenominations: [],
            },
          ],
        },
      })
    );
  }

  test('renders float summary cards + section tables', async ({ page }) => {
    await authAsVaultManager(page);
    await mockActiveCashierShifts(page);
    await gotoVault(page, '/vault/management/floats');

    await test.step('Stays on the floats route', async () => {
      await expect(page).toHaveURL(/\/vault\/management\/floats/, {
        timeout: 10_000,
      });
    });

    await test.step('No render crash', async () => {
      await assertNoCrash(page);
    });

    await test.step('Float Transactions header renders', async () => {
      await expect(
        page
          .getByRole('heading', { name: /float transactions/i })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Summary cards (Total Cashier Float + Active Cashiers) render', async () => {
      await expect(
        page
          .getByText(/total cashier float/i)
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
      await expect(
        page.getByText(/active cashiers/i).filter({ visible: true }).first()
      ).toBeVisible();
    });

    await test.step('Section headings for floats + history render', async () => {
      await expect(
        page
          .getByRole('heading', { name: /current cashier floats/i })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page
          .getByRole('heading', { name: /float transaction history/i })
          .filter({ visible: true })
          .first()
      ).toBeVisible();
    });

    await test.step('A mocked cashier float row renders', async () => {
      await expect(
        page.getByText(/E2E Cashier/i).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 12_000 });
    });
  });
});
