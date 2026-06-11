/**
 * Shared VAULT API route-mock helper.
 *
 * Lives in mocks/ (NOT a spec file) so multiple vault spec files can import it
 * without Playwright's "test file should not import test file" error.
 *
 * `mockVaultManagerAPIs(page)` mocks every endpoint a vault-management page
 * touches on load with sane shapes. Register page-specific routes AFTER calling
 * it (later route = higher LIFO priority) for per-page data.
 */

import { type Page } from '@playwright/test';
import {
  MOCK_VAULT_BALANCE,
  MOCK_VAULT_METRICS,
  MOCK_VAULT_TRANSACTIONS,
  MOCK_CASHIER_SHIFTS_EMPTY,
  MOCK_FLOAT_REQUESTS_EMPTY,
  MOCK_VAULT_OVERVIEW_GLOBAL,
  MOCK_CASH_DESKS,
} from './vault.mocks';
import { MOCK_LICENCEES_LIST, MOCK_LOCATION_1 } from './locations.mocks';

export async function mockVaultManagerAPIs(page: Page) {
  // Broad safety nets (registered first → lowest LIFO priority). Include EVERY
  // array field the vault hooks read after `data.success` — VaultManagerHeader's
  // useNotifications does setNotifications(data.notifications), so an absent
  // `notifications` array becomes undefined and crashes `.map` on every page.
  await page.route('**/api/vault/**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        data: [],
        items: [],
        notifications: [],
        transactions: [],
        shifts: [],
        floatRequests: [],
        transfers: [],
        expenses: [],
        cashDesks: [],
        unreadCount: 0,
        total: 0,
        totalPages: 0,
      },
    })
  );
  await page.route('**/api/cashier/**', route =>
    route.fulfill({ status: 200, json: { success: true, shifts: [], data: [] } })
  );

  // VaultManagerHeader notification bell — shared by ALL vault-management pages.
  await page.route('**/api/vault/notifications**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        notifications: [],
        unreadCount: 0,
        pendingFloatRequests: 0,
        pendingShiftReviews: 0,
      },
    })
  );

  // Specific vault endpoints (registered after → higher priority)
  await page.route('**/api/vault/balance**', route =>
    route.fulfill({ status: 200, json: MOCK_VAULT_BALANCE })
  );
  await page.route('**/api/vault/metrics**', route =>
    route.fulfill({ status: 200, json: MOCK_VAULT_METRICS })
  );
  await page.route('**/api/vault/transactions**', route =>
    route.fulfill({ status: 200, json: MOCK_VAULT_TRANSACTIONS })
  );
  await page.route('**/api/vault/float-request**', route =>
    route.fulfill({ status: 200, json: MOCK_FLOAT_REQUESTS_EMPTY })
  );
  await page.route('**/api/vault/overview/global**', route =>
    route.fulfill({ status: 200, json: MOCK_VAULT_OVERVIEW_GLOBAL })
  );
  await page.route('**/api/vault/cash-desks**', route =>
    route.fulfill({ status: 200, json: MOCK_CASH_DESKS })
  );
  await page.route('**/api/cashier/shifts**', route =>
    route.fulfill({ status: 200, json: MOCK_CASHIER_SHIFTS_EMPTY })
  );

  // Supporting CMS endpoints used by shared layout / currency / location lookups
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
  await page.route('**/api/locations/**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, data: MOCK_LOCATION_1, location: MOCK_LOCATION_1 },
    })
  );
  await page.route('**/api/locations**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, locations: [MOCK_LOCATION_1] },
    })
  );
  await page.route('**/api/activity-logs**', route =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );
  await page.route('**/api/cabinets/aggregation**', route =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );
}
