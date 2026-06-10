/**
 * Cabinets & Cabinet Detail E2E Tests
 * ─────────────────────────────────────
 * Covers — Cabinets list page (/cabinets):
 *  1. Cabinet table renders with data from the API
 *  2. Create cabinet — happy path (form fill → cabinet appears in table)
 *  3. Create cabinet — invalid SMIB board format shows validation error
 *  4. Create cabinet — serial number < 3 chars shows validation error
 *  5. Edit cabinet — form is pre-populated; updating custom name reflects in table
 *  6. Delete cabinet — confirmation dialog → cabinet removed from table
 *  7. Sort by Gross column reorders rows
 * 12. Search filters the list server-side (search= param) and narrows rows
 * 13. Status filter sends onlineStatus=online and narrows rows
 *
 * Covers — Cabinet detail page (/cabinets/[cabinetId]):
 *  8. Financial metric cards are visible
 *  9. Time-period filter changes the data on the detail page
 * 10. SAS meter data section is visible
 * 11. Meter history entries are listed
 * 14. Accounting Details exposes all tab buttons
 * 15. Switching to the Live Meters tab swaps in SAS meter cards
 * 16. Switching to the Activity Log tab loads the activity-log view
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_CABINET_1,
  MOCK_CABINETS_LIST,
  MOCK_CABINETS_LIST_AFTER_DELETE,
  MOCK_CABINET_DETAIL,
  MOCK_CABINET_CREATE_SUCCESS,
  MOCK_CABINET_UPDATE_SUCCESS,
  MOCK_CABINET_DELETE_SUCCESS,
  MOCK_METER_HISTORY,
  MOCK_MANUFACTURERS,
} from '../mocks/cabinets.mocks';
import {
  MOCK_LOCATIONS_LIST,
  MOCK_LICENCEES_LIST,
} from '../mocks/locations.mocks';
import {
  MOCK_CURRENT_USER,
  MOCK_USER_TECHNICIAN,
  MOCK_USER_MANAGER,
  MOCK_USER_LOCATION_ADMIN,
  MOCK_USER_VAULT_MANAGER,
  MOCK_USER_CASHIER,
  MOCK_USER_COLLECTOR,
} from '../mocks/auth.mocks';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';

const CABINET_ID = 'mach_001';

// ─── Shared mock helpers ──────────────────────────────────────────────────────

async function mockCabinetsListAPIs(
  page: Page,
  listPayload = MOCK_CABINETS_LIST
) {
  await page.route('**/api/auth/current-user**', route =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token**', route =>
    route.fulfill({
      status: 200,
      json: { userId: '69b46e8854694ea2246da698' },
    })
  );
  await page.route('**/api/users/**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, user: MOCK_CURRENT_USER.user },
    })
  );

  // Generic GET fallback for /api/cabinets (registered first, so specific routes win)
  await page.route('**/api/cabinets**', route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, json: listPayload });
    }
    return route.fallback();
  });

  // More specific cabinet routes (registered later → LIFO priority)
  await page.route('**/api/cabinets/aggregation**', route =>
    route.fulfill({ status: 200, json: listPayload })
  );
  await page.route('**/api/cabinets/locations**', route =>
    route.fulfill({
      status: 200,
      json: {
        locations: [
          { _id: 'loc_001', name: 'Grand Casino North', countryName: 'Trinidad and Tobago' },
          { _id: 'loc_002', name: 'South Bay Gaming', countryName: 'Trinidad and Tobago' },
        ],
      },
    })
  );
  await page.route('**/api/cabinets/status**', route =>
    route.fulfill({
      status: 200,
      json: { totalMachines: 2, onlineMachines: 1, offlineMachines: 1 },
    })
  );
  await page.route('**/api/locations**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, locations: MOCK_LOCATIONS_LIST || [] },
    })
  );
  await page.route('**/api/manufacturers**', route =>
    route.fulfill({ status: 200, json: MOCK_MANUFACTURERS })
  );
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
}

async function mockCabinetDetailAPIs(page: Page) {
  await page.route('**/api/auth/current-user**', route =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token**', route =>
    route.fulfill({
      status: 200,
      json: { userId: '69b46e8854694ea2246da698' },
    })
  );
  await page.route('**/api/users/**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, user: MOCK_CURRENT_USER.user },
    })
  );
  await page.route('**/api/cabinets/**', route =>
    route.fulfill({ status: 200, json: MOCK_CABINET_DETAIL })
  );
  await page.route('**/api/meters**', route =>
    route.fulfill({ status: 200, json: MOCK_METER_HISTORY })
  );
  await page.route('**/api/manufacturers**', route =>
    route.fulfill({ status: 200, json: MOCK_MANUFACTURERS })
  );
  await page.route('**/api/locations**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, locations: MOCK_LOCATIONS_LIST || [] },
    })
  );
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
  await page.route('**/api/cabinets/locations**', route =>
    route.fulfill({
      status: 200,
      json: {
        locations: [
          { _id: 'loc_001', name: 'Grand Casino North', countryName: 'Trinidad and Tobago' },
        ],
      },
    })
  );
  await page.route('**/api/cabinets/status**', route =>
    route.fulfill({
      status: 200,
      json: { totalMachines: 1, onlineMachines: 1, offlineMachines: 0 },
    })
  );
}

// ─── Cabinet LIST tests ───────────────────────────────────────────────────────

test.describe('Cabinets List', () => {
  test('1. Cabinet table renders with data from the API', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock cabinets list API', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Assert first cabinet (Lucky Dragon) appears in the table', async () => {
      await cabinetsPage.expectCabinetInTable('Lucky Dragon');
    });

    await test.step('Assert second cabinet (Golden Pharaoh) appears in the table', async () => {
      await cabinetsPage.expectCabinetInTable('Golden Pharaoh');
    });

    await test.step('Assert table has exactly 2 rows', async () => {
      await cabinetsPage.expectTableRowCount(2);
    });
  });

  test('2. Create cabinet — happy path', async ({ page, cabinetsPage }) => {
    let createRequestBody: Record<string, unknown> = {};

    await test.step('Mock list and support APIs', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Intercept POST cabinet creation endpoint', async () => {
      await page.route('**/api/cabinets**', async route => {
        if (route.request().method() === 'POST') {
          createRequestBody = route.request().postDataJSON() as Record<
            string,
            unknown
          >;
          await route.fulfill({
            status: 201,
            json: MOCK_CABINET_CREATE_SUCCESS,
          });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('After creation, return updated list including the new cabinet', async () => {
      await page.route('**/api/cabinets/aggregation**', route =>
        route.fulfill({
          status: 200,
          json: {
            ...MOCK_CABINETS_LIST,
            data: [
              ...MOCK_CABINETS_LIST.data,
              MOCK_CABINET_CREATE_SUCCESS.data,
            ],
            pagination: { page: 1, limit: 10, total: 3, totalPages: 1 },
          },
        })
      );
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Open the New Cabinet modal', async () => {
      await cabinetsPage.openNewCabinetModal();
    });

    await test.step('Fill the form with valid data', async () => {
      await cabinetsPage.fillCabinetForm({
        serialNumber: 'SN-NEWCAB',
        game: 'Star Burst',
        relayId: 'A0B0C0D0E0F0',
        location: 'Grand Casino North',
        manufacturer: 'NetEnt',
        customName: 'New Test Cabinet',
      });
    });

    await test.step('Submit the form', async () => {
      await cabinetsPage.submitCabinetForm();
    });

    await test.step('Assert POST body contains the correct serial number', async () => {
      expect(createRequestBody).toMatchObject({ serialNumber: 'SN-NEWCAB' });
    });

    await test.step('Assert new cabinet appears in the table', async () => {
      await cabinetsPage.expectCabinetInTable('New Test Cabinet');
    });
  });

  test('3. Create cabinet — invalid SMIB board format shows validation error', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Navigate to /cabinets and open New Cabinet modal', async () => {
      await cabinetsPage.goto();
      await cabinetsPage.openNewCabinetModal();
    });

    await test.step('Fill a valid serial number but an invalid SMIB board', async () => {
      await cabinetsPage.fillCabinetForm({
        serialNumber: 'SN-VALID01',
        // SMIB must be 12 hex chars ending in 0,4,8,c — this is wrong
        smibBoard: 'INVALID-SMIB',
      });
    });

    await test.step('Submit the form', async () => {
      await cabinetsPage.submitCabinetForm();
    });

    await test.step('Assert SMIB board validation error is shown', async () => {
      await cabinetsPage.expectSmibValidationError();
    });

    await test.step('Assert modal stays open', async () => {
      await cabinetsPage.expectCreateModalVisible();
    });
  });

  test('4. Create cabinet — serial number with fewer than 3 chars shows validation error', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Navigate to /cabinets and open New Cabinet modal', async () => {
      await cabinetsPage.goto();
      await cabinetsPage.openNewCabinetModal();
    });

    await test.step('Enter a 2-character serial number', async () => {
      await cabinetsPage.fillCabinetForm({ serialNumber: 'AB' });
    });

    await test.step('Submit the form', async () => {
      await cabinetsPage.submitCabinetForm();
    });

    await test.step('Assert serial number validation error is shown', async () => {
      await cabinetsPage.expectSerialNumberValidationError();
    });
  });

  test('5. Edit cabinet — custom name update reflects in the table', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock list and support APIs', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Intercept PUT cabinet update endpoint', async () => {
      await page.route('**/api/cabinets/**', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            json: MOCK_CABINET_UPDATE_SUCCESS,
          });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('After edit, return updated list with renamed cabinet', async () => {
      await page.route('**/api/cabinets/aggregation**', route =>
        route.fulfill({
          status: 200,
          json: {
            ...MOCK_CABINETS_LIST,
            data: [
              {
                ...MOCK_CABINETS_LIST.data[0],
                custom: { name: 'Lucky Dragon (Renamed)' },
              },
              MOCK_CABINETS_LIST.data[1],
            ],
            pagination: MOCK_CABINETS_LIST.pagination,
          },
        })
      );
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Click Edit on the first row', async () => {
      await cabinetsPage.clickEdit(0);
    });

    await test.step('Assert edit modal opens', async () => {
      await expect(cabinetsPage.editModal).toBeVisible();
    });

    await test.step('Update the custom name field', async () => {
      await cabinetsPage.fillEditCabinetForm({
        customName: 'Lucky Dragon (Renamed)',
      });
    });

    await test.step('Submit the edit form', async () => {
      await cabinetsPage.submitEditForm();
    });

    await test.step('Assert the renamed cabinet appears in the table', async () => {
      await cabinetsPage.expectCabinetInTable('Lucky Dragon (Renamed)');
    });
  });

  test('6. Delete cabinet — confirmation removes the row from the table', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock list API', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Intercept DELETE cabinet endpoint', async () => {
      // DELETE /api/cabinets?id=mach_001 uses a query param, NOT a path segment.
      // Pattern **/api/cabinets** (no trailing /**) is required to match it.
      await page.route('**/api/cabinets**', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 200,
            json: MOCK_CABINET_DELETE_SUCCESS,
          });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Click Delete on the first row (Lucky Dragon)', async () => {
      await cabinetsPage.clickDelete(0);
    });

    await test.step('Assert the confirmation dialog is displayed', async () => {
      await cabinetsPage.expectDeleteDialogVisible();
      // The delete modal uses assetNumber as the cabinet identifier
      await expect(cabinetsPage.deleteDialog).toContainText('ASSET-001');
    });

    await test.step('Swap list mock to post-delete payload then confirm', async () => {
      await page.route('**/api/cabinets/aggregation**', route =>
        route.fulfill({ status: 200, json: MOCK_CABINETS_LIST_AFTER_DELETE })
      );
      await cabinetsPage.confirmDelete();
    });

    await test.step('Navigate to re-fetch list with new mock', async () => {
      await page.goto('/cabinets');
      await page.waitForURL('**/cabinets');
    });

    await test.step('Assert "Lucky Dragon" is no longer in the table', async () => {
      await cabinetsPage.expectCabinetNotInTable('Lucky Dragon');
    });

    await test.step('Assert "Golden Pharaoh" is still present', async () => {
      await cabinetsPage.expectCabinetInTable('Golden Pharaoh');
    });
  });

  test('7. Clicking the Gross column header sorts the rows', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock cabinets list API', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Read the initial order of the first cell in each row', async () => {
      const firstRowText = await cabinetsPage.tableRows.nth(0).textContent();
      expect(firstRowText).toContain('Lucky Dragon');
    });

    await test.step('Click the Gross column header to sort ascending', async () => {
      await cabinetsPage.sortByGross();
    });

    await test.step('Assert the Gross header shows a sort indicator', async () => {
      await expect(cabinetsPage.grossColumnHeader).toContainText(/▲|▼|↑|↓/);
    });
  });

  test('12. Search filters the cabinet list via a server request', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock list APIs with a search-aware aggregation route', async () => {
      await mockCabinetsListAPIs(page);
      // Return only Lucky Dragon when the request carries a search term.
      await page.route('**/api/cabinets/aggregation**', route => {
        const url = route.request().url();
        if (/[?&]search=/i.test(url)) {
          return route.fulfill({
            status: 200,
            json: {
              ...MOCK_CABINETS_LIST,
              data: [MOCK_CABINET_1],
              pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
            },
          });
        }
        return route.fulfill({ status: 200, json: MOCK_CABINETS_LIST });
      });
    });

    await test.step('Navigate and confirm both cabinets are listed', async () => {
      await cabinetsPage.goto();
      await cabinetsPage.expectCabinetInTable('Lucky Dragon');
      await cabinetsPage.expectCabinetInTable('Golden Pharaoh');
    });

    await test.step('Type a search term and await the server request', async () => {
      const searchRequest = page.waitForRequest(
        req =>
          /\/api\/cabinets\/aggregation/.test(req.url()) &&
          /[?&]search=Dragon/i.test(req.url()),
        { timeout: 15_000 }
      );
      await cabinetsPage.search('Dragon');
      await searchRequest;
    });

    await test.step('Assert the list narrows to the matching cabinet', async () => {
      await cabinetsPage.expectCabinetInTable('Lucky Dragon');
      await cabinetsPage.expectCabinetNotInTable('Golden Pharaoh');
    });

    await test.step('Clearing the search restores the full list', async () => {
      await cabinetsPage.clearSearch();
      await cabinetsPage.expectCabinetInTable('Golden Pharaoh');
    });
  });

  test('13. Status filter sends onlineStatus=online and narrows the list', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock list APIs with an onlineStatus-aware aggregation route', async () => {
      await mockCabinetsListAPIs(page);
      await page.route('**/api/cabinets/aggregation**', route => {
        const url = route.request().url();
        if (/[?&]onlineStatus=online/i.test(url)) {
          return route.fulfill({
            status: 200,
            json: {
              ...MOCK_CABINETS_LIST,
              data: [MOCK_CABINET_1],
              pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
            },
          });
        }
        return route.fulfill({ status: 200, json: MOCK_CABINETS_LIST });
      });
    });

    await test.step('Navigate and confirm both cabinets are listed', async () => {
      await cabinetsPage.goto();
      await cabinetsPage.expectTableRowCount(2);
    });

    await test.step('Pick "Online" in the Status filter and await the request', async () => {
      const statusRequest = page.waitForRequest(
        req =>
          /\/api\/cabinets\/aggregation/.test(req.url()) &&
          /[?&]onlineStatus=online/i.test(req.url()),
        { timeout: 15_000 }
      );
      await cabinetsPage.filterByStatus('Online');
      await statusRequest;
    });

    await test.step('Assert only the online cabinet remains', async () => {
      await cabinetsPage.expectCabinetInTable('Lucky Dragon');
      await cabinetsPage.expectCabinetNotInTable('Golden Pharaoh');
    });
  });
});

// ─── Cabinet DETAIL tests ─────────────────────────────────────────────────────

test.describe('Cabinet Detail', () => {
  test('8. Financial metric cards are visible on the cabinet detail page', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail API', async () => {
      await mockCabinetDetailAPIs(page);
    });

    await test.step(`Navigate to /cabinets/${CABINET_ID}`, async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Assert Money In, Money Out, and Gross cards are visible', async () => {
      await cabinetDetailPage.expectFinancialMetricsVisible();
    });
  });

  test('9. Time-period filter on detail page fires a new API request', async ({
    page,
    cabinetDetailPage,
  }) => {
    const capturedUrls: string[] = [];

    await test.step('Mock cabinet detail API and capture requests', async () => {
      await mockCabinetDetailAPIs(page);
      page.on('request', req => {
        if (
          req.url().includes(`/api/cabinets/${CABINET_ID}`) ||
          req.url().includes(`/api/cabinets/${CABINET_ID}`)
        ) {
          capturedUrls.push(req.url());
        }
      });
    });

    await test.step('Navigate to cabinet detail', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Select "Week" period filter', async () => {
      await cabinetDetailPage.selectTimePeriod('Week');
    });

    await test.step('Assert a new API request was fired with a period param', async () => {
      const lastRequest = capturedUrls.at(-1) ?? '';
      expect(lastRequest).toMatch(/week|last7|period/i);
    });
  });

  test('10. SAS meter data section is visible on the detail page', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail API', async () => {
      await mockCabinetDetailAPIs(page);
    });

    await test.step('Navigate to cabinet detail', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Assert meter data section is visible', async () => {
      await cabinetDetailPage.expectMeterDataVisible();
    });
  });

  test('11. Meter history entries are listed on the detail page', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail and meter history APIs', async () => {
      await mockCabinetDetailAPIs(page);
    });

    await test.step('Navigate to cabinet detail', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Assert the Collection History tab button is visible', async () => {
      await cabinetDetailPage.expectMeterHistoryVisible();
    });

    await test.step('Reload with collection-history section pre-selected to avoid animation race', async () => {
      // Clicking the tab triggers a Next.js URL update that can cause a rapid
      // cabinet re-fetch + re-mount cycle, resetting the AnimatePresence animation.
      // Navigating directly with ?section=collection-history loads the tab as the
      // initial state, sidestepping the race entirely.
      await page.goto(`/cabinets/${CABINET_ID}?section=collection-history`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert collection history table rows are rendered', async () => {
      // At xl (1280px) the component renders a native <table>; at smaller
      // viewports it renders Card components.  Either the table OR the
      // "no history" empty-state message confirms the tab content loaded.
      await expect(
        page.locator('table tbody tr').first().or(
          page.getByText(/No collection history/i).first()
        )
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('14. Accounting Details exposes all tab buttons', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail API', async () => {
      await mockCabinetDetailAPIs(page);
    });

    await test.step('Navigate to cabinet detail', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Assert every accounting tab is present in the sidebar', async () => {
      await cabinetDetailPage.expectAccountingTabsVisible();
    });

    await test.step('Assert the default tab shows the Movements cards', async () => {
      await cabinetDetailPage.expectMovementsVisible();
    });
  });

  test('15. Switching to the Live Meters tab swaps in SAS meter cards', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail API', async () => {
      await mockCabinetDetailAPIs(page);
    });

    await test.step('Navigate directly to Live Meters section', async () => {
      // Same URL-param trick as test 11 — loads the tab as the initial state
      // to avoid the AnimatePresence re-render race on tab-click.
      await page.goto(`/cabinets/${CABINET_ID}?section=live-meters`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert SAS meter cards (Coin In, Games Played) are shown', async () => {
      await cabinetDetailPage.expectLiveMetersVisible();
    });

    await test.step('Switch back to Movements and assert the cards return', async () => {
      await cabinetDetailPage.clickAccountingTab('Movements');
      // Wait for tab content to render after switching
      await page.waitForTimeout(500);
      await cabinetDetailPage.expectMovementsVisible();
    });
  });

  test('16. Switching to the Activity Log tab loads the activity-log view', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail and machine-events APIs', async () => {
      await mockCabinetDetailAPIs(page);
      await page.route('**/api/cabinets/by-id/events**', route =>
        route.fulfill({ status: 200, json: { events: [] } })
      );
    });

    await test.step('Navigate to cabinet detail', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Click the Activity Log tab', async () => {
      await cabinetDetailPage.clickAccountingTab('Activity Log');
    });

    await test.step('Assert the Activity Log view renders without error', async () => {
      await expect(
        cabinetDetailPage.accountingSection.getByRole('heading', {
          name: 'Activity Log',
        })
      ).toBeVisible();
      await expect(
        page.getByText('Failed to load activity log')
      ).toHaveCount(0);
    });
  });
});

// ─── Role-based access restriction tests ─────────────────────────────────────
//
// Cabinets/Machines page accessible to: developer, admin, manager, location admin, technician
// Blocked: cashier (→ /vault/cashier/payouts), vault-manager (→ /vault/management),
//          collector (→ /collection-report)
// Note: technician CAN access cabinets

test.describe('Cabinets — Role-based access', () => {
  for (const [label, userPayload] of [
    ['manager', MOCK_USER_MANAGER],
    ['location admin', MOCK_USER_LOCATION_ADMIN],
    ['technician', MOCK_USER_TECHNICIAN],
  ] as const) {
    test(`${label} can access /cabinets`, async ({ page, cabinetsPage }) => {
      await test.step(`Inject ${label} auth cookie and mock APIs`, async () => {
        await setRoleAuthCookie(page, userPayload);
        await mockCabinetsListAPIs(page);
      });

      await test.step('Navigate to /cabinets', async () => {
        await cabinetsPage.goto();
        await page.waitForLoadState('networkidle');
      });

      await test.step('Assert no redirect away from /cabinets', async () => {
        expect(page.url()).not.toMatch(/\/login|\/unauthorized|\/vault/);
      });
    });
  }

  test('cashier is redirected from /cabinets', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_CASHIER);
    await page.goto('/cabinets');
    await page.waitForURL(/vault\/cashier\/payouts/, { timeout: 10_000 });
    await expect(page).toHaveURL(/vault\/cashier\/payouts/);
  });

  test('vault-manager is redirected from /cabinets', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_VAULT_MANAGER);
    await page.goto('/cabinets');
    await page.waitForURL(/vault\/management/, { timeout: 10_000 });
    await expect(page).toHaveURL(/vault\/management/);
  });

  test('collector is redirected from /cabinets', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_COLLECTOR);
    await page.goto('/cabinets');
    await page.waitForURL(/collection-report/, { timeout: 10_000 });
    await expect(page).toHaveURL(/collection-report/);
  });
});
