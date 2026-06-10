/**
 * VAULT — Cashier pages
 * ─────────────────────
 * Coverage for the CASHIER-mode pages under /vault/cashier, authenticated as a
 * cashier-only user (MOCK_USER_CASHIER → isCashierOnly === true). A cashier-only
 * user is permitted ONLY on /vault/cashier and /vault/cashier/* (ProtectedRoute
 * redirects elsewhere) and has `vault-cashier` page access.
 *
 * Pages covered (each: renders without the PageErrorBoundary "under maintenance"
 * crash screen + a stable key element):
 *   1. /vault/cashier/payouts        — Payouts (cashier landing page)
 *   2. /vault/cashier/float-requests — Float Requests
 *   3. /vault/cashier/shifts         — Shifts (Cashier Dashboard)
 *   4. /vault/cashier/activity       — Activity (My Activity)
 *
 * SHIFT STATE
 *   Cashier pages gate on the active-shift state reported by
 *   GET /api/cashier/shift/current (consumed by lib/hooks/useCashierShift.ts).
 *   setRoleAuthCookie seeds the userStore with hasActiveVaultShift:false, and the
 *   shared mockVaultManagerAPIs broad /api/cashier/** handler returns no `shift`
 *   field → the hook resolves to the NO-ACTIVE-SHIFT ("idle") state.
 *
 *   To exercise the ACTIVE-SHIFT UI we register an INLINE /api/cashier/shift/current
 *   route AFTER mockVaultManagerAPIs(page) (LIFO → it wins). `openedAt` is set to
 *   "now" so isShiftStale() (lib/utils/vault/shift.ts) returns false and the active
 *   dashboard renders rather than the stale-shift banner.
 *
 * Foundation reused (NOT modified): mockVaultManagerAPIs from vault-foundation.spec.
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';
import { MOCK_USER_CASHIER } from '../mocks/auth.mocks';
import { mockVaultManagerAPIs } from '../mocks/vaultApiMocks';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Cashier WITH an assigned location. The shared MOCK_USER_CASHIER has
 * assignedLocations:[], and every cashier data fetch is gated on
 * user.assignedLocations[0] (e.g. VaultPayoutsPageContent.fetchPayouts returns
 * early when it is absent), so a location-less cashier can never load list data.
 * This local spread (does NOT mutate the shared mock) drives the populated UI.
 */
const MOCK_USER_CASHIER_WITH_LOCATION = {
  ...MOCK_USER_CASHIER,
  assignedLocations: ['loc_001'],
};

/** Navigate to a vault route tolerating slow cold-compile under OneDrive. */
async function gotoVault(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
}

/**
 * Assert the page did NOT crash into the PageErrorBoundary "under maintenance"
 * fallback (a caught render crash, usually a missing mock field → undefined.map).
 */
async function assertNoErrorBoundary(page: Page): Promise<void> {
  await expect(
    page.getByText(/currently under maintenance/i)
  ).toHaveCount(0);
}

/** An ACTIVE cashier shift payload as returned by GET /api/cashier/shift/current. */
function activeShiftCurrentResponse() {
  return {
    success: true,
    shift: {
      _id: 'shift_001',
      locationId: 'loc_001',
      cashierId: 'cash_001',
      cashierName: 'E2E Cashier',
      cashierUsername: 'cashier',
      vaultShiftId: 'vshift_001',
      status: 'active',
      openedAt: new Date().toISOString(), // today → not stale
      openingBalance: 20_000,
      openingDenominations: [{ denomination: 100, quantity: 200 }],
      expectedClosingBalance: 22_500,
      payoutsTotal: 2_500,
      payoutsCount: 3,
    },
    currentBalance: 17_500,
    hasActiveVaultShift: true,
    isVaultReconciled: true,
    isStale: false,
    pendingVmApproval: null,
    pendingRequest: null,
  };
}

// ============================================================================
// 1. Payouts — cashier landing page
// ============================================================================

test.describe('VAULT cashier — payouts', () => {
  test('1. Payouts (no active shift) renders the Player Payouts header and empty table', async ({
    page,
  }) => {
    await test.step('Authenticate as cashier-only user', async () => {
      await setRoleAuthCookie(page, MOCK_USER_CASHIER);
    });

    await test.step('Mock vault/cashier APIs + payouts endpoint', async () => {
      await mockVaultManagerAPIs(page);
      // VaultPayoutsPageContent reads data.payouts.map + data.pagination.total;
      // the broad /api/vault/** net lacks both → supply them explicitly.
      await page.route('**/api/vault/payouts**', route =>
        route.fulfill({
          status: 200,
          json: { success: true, payouts: [], pagination: { total: 0 } },
        })
      );
    });

    await test.step('Navigate to the cashier payouts page', async () => {
      await gotoVault(page, '/vault/cashier/payouts');
    });

    await test.step('Stayed on the payouts route (not redirected)', async () => {
      await expect(page).toHaveURL(/\/vault\/cashier\/payouts/, {
        timeout: 10_000,
      });
      await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    });

    await test.step('No error-boundary; header + empty state visible', async () => {
      await assertNoErrorBoundary(page);
      await expect(
        page
          .getByText('Player Payouts')
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
      await expect(
        page
          .getByText(/No payouts found/i)
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
    });
  });

  test('2. Payouts (active shift) renders a payout row from the mocked data', async ({
    page,
  }) => {
    await test.step('Authenticate as cashier-only user (with location)', async () => {
      // A location is required: fetchPayouts short-circuits without one.
      await setRoleAuthCookie(page, MOCK_USER_CASHIER_WITH_LOCATION);
    });

    await test.step('Mock APIs incl. active shift + a populated payout list', async () => {
      await mockVaultManagerAPIs(page);
      await page.route('**/api/cashier/shift/current**', route =>
        route.fulfill({ status: 200, json: activeShiftCurrentResponse() })
      );
      await page.route('**/api/vault/payouts**', route =>
        route.fulfill({
          status: 200,
          json: {
            success: true,
            payouts: [
              {
                _id: 'payout_001',
                type: 'ticket',
                ticketNumber: 'TKT-12345',
                amount: 1_500,
                cashierName: 'E2E Cashier',
                cashierId: 'cash_001',
                notes: 'Ticket redemption',
                createdAt: new Date().toISOString(),
              },
            ],
            pagination: { total: 1 },
          },
        })
      );
    });

    await test.step('Navigate to the cashier payouts page', async () => {
      await gotoVault(page, '/vault/cashier/payouts');
    });

    await test.step('No error-boundary; the mocked payout ticket renders', async () => {
      await assertNoErrorBoundary(page);
      await expect(
        page
          .getByText('TKT-12345')
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
    });
  });
});

// ============================================================================
// 2. Float Requests
// ============================================================================

test.describe('VAULT cashier — float requests', () => {
  test('3. Float Requests renders the header, pending + history sections', async ({
    page,
  }) => {
    await test.step('Authenticate as cashier-only user', async () => {
      await setRoleAuthCookie(page, MOCK_USER_CASHIER);
    });

    await test.step('Mock APIs incl. active shift + float-request list', async () => {
      await mockVaultManagerAPIs(page);
      await page.route('**/api/cashier/shift/current**', route =>
        route.fulfill({ status: 200, json: activeShiftCurrentResponse() })
      );
      // The page fetches /api/vault/float-request twice (status=pending and
      // status=all). Return one pending + one approved so both sections render.
      await page.route('**/api/vault/float-request**', route => {
        const url = route.request().url();
        const isPending = url.includes('status=pending');
        const pendingItem = {
          _id: 'float_pending_1',
          cashierName: 'E2E Cashier',
          cashierId: 'cash_001',
          type: 'increase',
          requestedAmount: 15_000,
          requestNotes: 'Need more float',
          status: 'pending',
          requestedAt: new Date().toISOString(),
        };
        const approvedItem = {
          _id: 'float_approved_1',
          cashierName: 'E2E Cashier',
          cashierId: 'cash_001',
          type: 'decrease',
          requestedAmount: 5_000,
          requestNotes: 'Return excess',
          status: 'approved',
          requestedAt: new Date('2026-01-01T08:00:00.000Z').toISOString(),
          processedAt: new Date('2026-01-01T09:00:00.000Z').toISOString(),
          processedByName: 'E2E VaultManager',
        };
        route.fulfill({
          status: 200,
          json: {
            success: true,
            data: isPending ? [pendingItem] : [pendingItem, approvedItem],
            pagination: { totalPages: 1, totalItems: 2 },
            total: 2,
          },
        });
      });
    });

    await test.step('Navigate to the cashier float-requests page', async () => {
      await gotoVault(page, '/vault/cashier/float-requests');
    });

    await test.step('Stayed on the float-requests route', async () => {
      await expect(page).toHaveURL(/\/vault\/cashier\/float-requests/, {
        timeout: 10_000,
      });
      await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    });

    await test.step('No error-boundary; header + history section visible', async () => {
      await assertNoErrorBoundary(page);
      await expect(
        page
          .getByText('Float Requests')
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
      await expect(
        page
          .getByText('Request History')
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
    });
  });
});

// ============================================================================
// 3. Shifts — Cashier Dashboard
// ============================================================================

test.describe('VAULT cashier — shifts', () => {
  test('4. Shifts (no active shift) renders the Cashier Dashboard + Start Shift', async ({
    page,
  }) => {
    await test.step('Authenticate as cashier-only user', async () => {
      await setRoleAuthCookie(page, MOCK_USER_CASHIER);
    });

    await test.step('Mock vault/cashier APIs (broad net → idle shift)', async () => {
      await mockVaultManagerAPIs(page);
    });

    await test.step('Navigate to the cashier shifts page', async () => {
      await gotoVault(page, '/vault/cashier/shifts');
    });

    await test.step('Stayed on the shifts route', async () => {
      await expect(page).toHaveURL(/\/vault\/cashier\/shifts/, {
        timeout: 10_000,
      });
      await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    });

    await test.step('No error-boundary; dashboard header + Start Shift visible', async () => {
      await assertNoErrorBoundary(page);
      await expect(
        page
          .getByText('Cashier Dashboard')
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
      await expect(
        page
          .getByRole('button', { name: /Start Shift/i })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
    });
  });

  test('5. Shifts (active shift) renders the Current Shift + Quick Actions', async ({
    page,
  }) => {
    await test.step('Authenticate as cashier-only user', async () => {
      await setRoleAuthCookie(page, MOCK_USER_CASHIER);
    });

    await test.step('Mock APIs incl. an active shift', async () => {
      await mockVaultManagerAPIs(page);
      await page.route('**/api/cashier/shift/current**', route =>
        route.fulfill({ status: 200, json: activeShiftCurrentResponse() })
      );
    });

    await test.step('Navigate to the cashier shifts page', async () => {
      await gotoVault(page, '/vault/cashier/shifts');
    });

    await test.step('No error-boundary; active-shift dashboard visible', async () => {
      await assertNoErrorBoundary(page);
      await expect(
        page
          .getByText('Current Shift')
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
      await expect(
        page
          .getByText('Quick Actions')
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
      await expect(
        page
          .getByRole('button', { name: /End Shift/i })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
    });
  });
});

// ============================================================================
// 4. Activity — My Activity
// ============================================================================

test.describe('VAULT cashier — activity', () => {
  test('6. Activity renders My Activity header + transactions history panel', async ({
    page,
  }) => {
    await test.step('Authenticate as cashier-only user', async () => {
      await setRoleAuthCookie(page, MOCK_USER_CASHIER);
    });

    await test.step('Mock vault/cashier APIs + activity-log endpoint', async () => {
      await mockVaultManagerAPIs(page);
      // CashierActivityPageContent.fetchStats + ActivityLogPanel both read
      // data.activities; the broad /api/vault/** net omits it. Return one entry
      // so the stats compute and the panel renders a row rather than empty.
      await page.route('**/api/vault/activity-log**', route =>
        route.fulfill({
          status: 200,
          json: {
            success: true,
            activities: [
              {
                _id: 'act_001',
                timestamp: new Date().toISOString(),
                type: 'payout',
                amount: 1_500,
                performedBy: 'E2E Cashier',
                notes: 'Ticket redemption',
              },
            ],
          },
        })
      );
    });

    await test.step('Navigate to the cashier activity page', async () => {
      await gotoVault(page, '/vault/cashier/activity');
    });

    await test.step('Stayed on the activity route', async () => {
      await expect(page).toHaveURL(/\/vault\/cashier\/activity/, {
        timeout: 10_000,
      });
      await expect(page).not.toHaveURL(/\/login|\/unauthorized/);
    });

    await test.step('No error-boundary; header + history panel visible', async () => {
      await assertNoErrorBoundary(page);
      await expect(
        page
          .getByText('My Activity')
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
      await expect(
        page
          .getByText('Recent Transactions History')
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 12_000 });
    });
  });
});
