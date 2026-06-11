/**
 * VAULT — Management Operations Pages
 * ───────────────────────────────────
 * Coverage for the vault-manager "management operations" sub-pages. Each page is
 * checked for: (a) it does NOT fall into the PageErrorBoundary fallback (render
 * crash), and (b) a stable piece of page chrome — a heading, table column header,
 * filter input, or mocked row — is visible.
 *
 * Builds on the proven foundation:
 *   - setRoleAuthCookie(page, MOCK_USER_VAULT_MANAGER)  → signed JWT + seeded store
 *   - mockVaultManagerAPIs(page)                        → broad vault/cashier mocks
 *   Page-specific mocks are registered INLINE *after* mockVaultManagerAPIs so they
 *   win via Playwright's LIFO route priority.
 *
 * Pages covered:
 *   1. /vault/management/expenses              — Expenses (summary + filters + table)
 *   2. /vault/management/transfers             — Inter-location Transfers (deliberate 404)
 *   3. /vault/management/cash-desks            — Cash Desks (Feature Coming Soon placeholder)
 *   4. /vault/management/cashiers              — Cashiers (Active Cashiers table + search)
 *   5. /vault/management/soft-counts           — Soft Counts (SoftCountForm)
 *   6. /vault/management/reports/end-of-day    — End of Day report
 *
 * NOTE on /vault/management/transfers: the route's page.tsx calls Next's
 * notFound() unconditionally, so it intentionally renders the global 404 page,
 * not a transfers UI. The test asserts the 404 (not a crash / not a redirect to
 * login).
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import { mockVaultManagerAPIs } from '../mocks/vaultApiMocks';
import { MOCK_USER_VAULT_MANAGER } from '../mocks/auth.mocks';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';

// ============================================================================
// Shared helpers
// ============================================================================

/**
 * Authenticate as the vault-manager and register the shared vault API mocks.
 * Returns nothing — callers add page-specific routes afterwards.
 */
async function authAsVaultManager(page: Page): Promise<void> {
  await setRoleAuthCookie(page, MOCK_USER_VAULT_MANAGER);
  await mockVaultManagerAPIs(page);
}

/**
 * Navigate to a vault route tolerating the slow cold-compile under OneDrive.
 */
async function gotoVault(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
}

/**
 * Assert the page did NOT fall into an error-boundary / maintenance fallback.
 * Covers both the PageErrorBoundary "Page Error" UI and the global
 * "under maintenance" fallback the harness may surface on a render crash.
 */
async function expectNoErrorBoundary(page: Page): Promise<void> {
  await expect(
    page.getByText(/this page is currently under maintenance/i)
  ).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: /^Page Error$/i })
  ).toHaveCount(0);
}

/** Text that appears in both the mobile-card and desktop-table layouts. */
function visibleText(page: Page, pattern: RegExp) {
  return page.getByText(pattern).filter({ visible: true }).first();
}

// ============================================================================
// Page-specific mock payloads
// ============================================================================

// Expenses page reads /api/vault/expense (singular) → { success, expenses }.
// The table renders expense.to?.id (category), the 2nd segment of
// notes.split(' - ') (description), expense.amount, and expense.timestamp.
const MOCK_EXPENSE_RESPONSE = {
  success: true,
  expenses: [
    {
      _id: 'exp_e2e_001',
      locationId: 'loc_001',
      type: 'expense',
      to: { id: 'Repairs', type: 'expense' },
      from: { id: 'vault', type: 'vault' },
      amount: 5_000,
      notes: 'Expense: Repairs - SMIB control board swap',
      timestamp: new Date('2026-01-02T12:00:00.000Z').toISOString(),
      denominations: [],
      isVoid: false,
      performedBy: 'vaultManager',
    },
  ],
};

// Cashiers page reads /api/users?role=cashier → { success, users, total, totalPages }.
// This endpoint is NOT covered by the broad api/vault catch-all, so it must be
// mocked explicitly or it would hit the real dev server.
const MOCK_CASHIER_USERS_RESPONSE = {
  success: true,
  users: [
    {
      _id: 'cash_e2e_001',
      username: 'frontdesk1',
      emailAddress: 'frontdesk1@example.com',
      isEnabled: true,
      shiftStatus: 'inactive',
      currentBalance: 0,
      tempPassword: null,
      tempPasswordChanged: true,
      lastLoginAt: null,
      profile: { firstName: 'Front', lastName: 'Desk' },
    },
  ],
  total: 1,
  totalPages: 1,
};

// End-of-Day page reads /api/vault/end-of-day → { success, data }. A 'closed'
// shiftStatus unlocks the full report (Summary tab + tables); otherwise the page
// shows a "Shift Not Started"/"Shift Still In Progress" gate card.
const MOCK_END_OF_DAY_RESPONSE = {
  success: true,
  data: {
    shiftStatus: 'closed',
    previousShiftActive: false,
    denominationBreakdown: { '100': 10, '50': 4, '20': 5 },
    vaultBalance: { systemBalance: 250_000, physicalCount: 250_000, variance: 0 },
    cashierFloats: [
      {
        _id: 'float_e2e_001',
        cashierName: 'Front Desk',
        status: 'closed',
        balance: 20_000,
      },
    ],
    midDaySoftCounts: [],
    endOfDaySoftCounts: [],
    slotCounts: [],
  },
};

// ============================================================================
// 1. Expenses
// ============================================================================

test.describe('VAULT management ops — Expenses', () => {
  test('renders the expenses page chrome (summary cards + filters + table)', async ({
    page,
  }) => {
    await authAsVaultManager(page);

    await page.route('**/api/vault/expense**', route =>
      route.fulfill({ status: 200, json: MOCK_EXPENSE_RESPONSE })
    );

    await gotoVault(page, '/vault/management/expenses');

    await expect(page).toHaveURL(/\/vault\/management\/expenses/, {
      timeout: 10_000,
    });
    await expectNoErrorBoundary(page);

    // Heading + the key page sections
    await expect(
      page.getByRole('heading', { name: 'Expenses', exact: true })
    ).toBeVisible({ timeout: 12_000 });
    await expect(
      page.getByText('Expense History', { exact: true })
    ).toBeVisible();
    await expect(page.getByText('Filters', { exact: true })).toBeVisible();
  });

  test('shows a mocked expense row and the Category filter', async ({
    page,
  }) => {
    await authAsVaultManager(page);

    await page.route('**/api/vault/expense**', route =>
      route.fulfill({ status: 200, json: MOCK_EXPENSE_RESPONSE })
    );

    await gotoVault(page, '/vault/management/expenses');
    await expectNoErrorBoundary(page);

    // The mocked expense's description (parsed from notes) appears in the table/card.
    await expect(visibleText(page, /SMIB control board swap/i)).toBeVisible({
      timeout: 12_000,
    });

    // Category filter trigger (the Select shows "All Categories" once chosen,
    // placeholder "All" initially) — assert the Category label is present.
    await expect(
      page.getByText('Category', { exact: true }).first()
    ).toBeVisible();
  });
});

// ============================================================================
// 2. Inter-location Transfers (deliberate 404 via notFound())
// ============================================================================

test.describe('VAULT management ops — Transfers', () => {
  test('transfers route renders the 404 page (notFound) without a crash or login bounce', async ({
    page,
  }) => {
    await authAsVaultManager(page);

    await gotoVault(page, '/vault/management/transfers');

    // We are still authenticated — not redirected to login/unauthorized.
    await expect(page).not.toHaveURL(/\/login|\/unauthorized/);

    // The page.tsx calls notFound() → global 404 ("404" + "Page Not Found").
    await expect(
      visibleText(page, /Page Not Found|Sorry, the page you are looking for/i)
    ).toBeVisible({ timeout: 12_000 });

    // Confirm it is the 404 path, not the render-crash fallback.
    await expectNoErrorBoundary(page);
  });
});

// ============================================================================
// 3. Cash Desks (Feature Coming Soon placeholder)
// ============================================================================

test.describe('VAULT management ops — Cash Desks', () => {
  test('renders the Cash Desks placeholder page', async ({ page }) => {
    await authAsVaultManager(page);

    await gotoVault(page, '/vault/management/cash-desks');

    await expect(page).toHaveURL(/\/vault\/management\/cash-desks/, {
      timeout: 10_000,
    });
    await expectNoErrorBoundary(page);

    await expect(
      page.getByRole('heading', { name: 'Cash Desks', exact: true })
    ).toBeVisible({ timeout: 12_000 });
    await expect(
      page.getByText('Feature Coming Soon', { exact: true })
    ).toBeVisible();
  });
});

// ============================================================================
// 4. Cashiers
// ============================================================================

test.describe('VAULT management ops — Cashiers', () => {
  test('renders the Active Cashiers table with a mocked cashier + search filter', async ({
    page,
  }) => {
    await authAsVaultManager(page);

    // /api/users is outside the vault catch-all — must be mocked explicitly.
    await page.route('**/api/users**', route =>
      route.fulfill({ status: 200, json: MOCK_CASHIER_USERS_RESPONSE })
    );

    await gotoVault(page, '/vault/management/cashiers');

    await expect(page).toHaveURL(/\/vault\/management\/cashiers/, {
      timeout: 10_000,
    });
    await expectNoErrorBoundary(page);

    // Table card heading + the search filter that gates the list.
    await expect(
      page.getByText('Active Cashiers', { exact: true })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByPlaceholder('Search cashiers...')
    ).toBeVisible();

    // The mocked cashier surfaces in either the desktop table or mobile card.
    await expect(visibleText(page, /frontdesk1/i)).toBeVisible();
  });
});

// ============================================================================
// 5. Soft Counts
// ============================================================================

test.describe('VAULT management ops — Soft Counts', () => {
  test('renders the Soft Count page + form placeholder', async ({ page }) => {
    await authAsVaultManager(page);

    await gotoVault(page, '/vault/management/soft-counts');

    await expect(page).toHaveURL(/\/vault\/management\/soft-counts/, {
      timeout: 10_000,
    });
    await expectNoErrorBoundary(page);

    // Page header.
    await expect(
      page.getByRole('heading', { name: 'Soft Count', exact: true })
    ).toBeVisible({ timeout: 12_000 });

    // With no machine pre-selected, SoftCountForm shows its empty guard.
    await expect(
      page.getByText('Select a machine to begin counting.', { exact: true })
    ).toBeVisible();
  });
});

// ============================================================================
// 6. End of Day report
// ============================================================================

test.describe('VAULT management ops — End of Day', () => {
  test('renders the End-of-Day report (closed shift → summary + tables)', async ({
    page,
  }) => {
    await authAsVaultManager(page);

    // A 'closed' shift unlocks the full report instead of the gate card.
    await page.route('**/api/vault/end-of-day**', route =>
      route.fulfill({ status: 200, json: MOCK_END_OF_DAY_RESPONSE })
    );

    await gotoVault(page, '/vault/management/reports/end-of-day');

    await expect(page).toHaveURL(/\/vault\/management\/reports\/end-of-day/, {
      timeout: 10_000,
    });
    await expectNoErrorBoundary(page);

    // Header is always rendered.
    await expect(
      page.getByRole('heading', { name: 'End-of-Day Reports', exact: true })
    ).toBeVisible({ timeout: 15_000 });

    // Full report content: the Summary tab + a section table heading.
    await expect(
      visibleText(page, /Summary Statistics|Detailed Distribution/i)
    ).toBeVisible({ timeout: 12_000 });
  });

  test('shows the report date filter on the End-of-Day page', async ({
    page,
  }) => {
    await authAsVaultManager(page);

    await page.route('**/api/vault/end-of-day**', route =>
      route.fulfill({ status: 200, json: MOCK_END_OF_DAY_RESPONSE })
    );

    await gotoVault(page, '/vault/management/reports/end-of-day');
    await expectNoErrorBoundary(page);

    // The "Report Date:" label sits next to the DatePicker control.
    await expect(
      page.getByText('Report Date:', { exact: true })
    ).toBeVisible({ timeout: 12_000 });
  });
});
