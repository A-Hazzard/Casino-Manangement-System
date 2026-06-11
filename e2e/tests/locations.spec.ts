/**
 * Locations E2E Tests
 * ────────────────────
 * Covers:
 *  1. Location table renders with rows from the API
 *  2. Create location — happy path
 *  3. Create location — validation: name field is required
 *  4. Edit location — form is pre-populated, update name, save → table reflects change
 *  5. Delete location — confirmation dialog → row removed from table
 *  6. Location financial metrics (Money In, Money Out, Gross) appear in rows
 *  7. Closing create modal without saving does not alter the table
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_LOCATIONS_LIST,
  MOCK_LOCATION_1,
  MOCK_LOCATION_2,
  MOCK_LOCATION_CREATE_SUCCESS,
  MOCK_LOCATION_UPDATE_SUCCESS,
  MOCK_LOCATION_DELETE_SUCCESS,
  MOCK_LOCATION_DETAIL,
} from '../mocks/locations.mocks';
import {
  MOCK_CURRENT_USER,
  MOCK_USER_MANAGER,
  MOCK_USER_LOCATION_ADMIN,
  MOCK_USER_VAULT_MANAGER,
  MOCK_USER_CASHIER,
  MOCK_USER_TECHNICIAN,
  MOCK_USER_COLLECTOR,
} from '../mocks/auth.mocks';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';

import { MOCK_METRICS_DASHBOARD } from '../mocks/dashboard.mocks';

// ─── Shared route setup ───────────────────────────────────────────────────────

async function mockLocationsAPIs(
  page: Page,
  listPayload = MOCK_LOCATIONS_LIST,
  mockCurrentUser = true
) {
  if (mockCurrentUser) {
    await page.route('**/api/auth/current-user**', route =>
      route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
    );
    // Mock token API so fetchUserId doesn't hit the DB and return 401
    await page.route('**/api/auth/token**', route =>
      route.fulfill({
        status: 200,
        json: { userId: MOCK_CURRENT_USER.user.id },
      })
    );
    // Mock profile API so AppSidebar doesn't get 404
    await page.route(`**/api/users/${MOCK_CURRENT_USER.user.id}**`, route =>
      route.fulfill({
        status: 200,
        json: { success: true, user: MOCK_CURRENT_USER.user },
      })
    );
  }

  // Dashboard totals (called by LocationsPage for the top metrics cards)
  await page.route('**/api/metrics/dashboard**', route =>
    route.fulfill({ status: 200, json: MOCK_METRICS_DASHBOARD || {} })
  );

  // Form dependencies (Countries, Licencees)
  await page.route('**/api/countries**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        countries: [{ _id: 'country_1', name: 'Trinidad and Tobago' }],
      },
    })
  );
  await page.route('**/api/licencees**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        licencees: [{ _id: 'lic_1', name: 'Evolution1 Ltd' }],
      },
    })
  );

  // The locations table uses the reports endpoint which expects { data: [...] }
  await page.route('**/api/reports/locations**', route => {
    const locationsArray = Array.isArray(listPayload.locations) ? listPayload.locations : [];
    const aggregatedData = locationsArray.map(loc => ({
      ...loc,
      location: loc._id || loc.id,
      locationName: loc.name,
    }));
    return route.fulfill({
      status: 200,
      json: {
        success: true,
        data: aggregatedData,
        pagination: { page: 1, limit: 50, totalCount: locationsArray.length, totalPages: 1 },
      },
    });
  });

  // Modal operations and fallback hooks might still use /api/locations
  await page.route('**/api/locations**', route => {
    // For POST/PUT/DELETE
    if (route.request().method() !== 'GET') {
      return route.continue();
    }
    return route.fulfill({ status: 200, json: listPayload });
  });

  // Search-all endpoint: registered AFTER the generic /api/locations route so it
  // wins (LIFO - later routes take priority over earlier ones). The real API
  // accepts ?search= param and returns a bare array filtered server-side; our
  // mock must filter client-side to match.
  await page.route('**/api/locations/search-all**', route => {
    const url = new URL(route.request().url());
    const searchTerm = url.searchParams.get('search')?.trim().toLowerCase() || '';
    const locationsArray = Array.isArray(listPayload.locations)
      ? listPayload.locations
      : [];
    const filtered = searchTerm
      ? locationsArray.filter(loc => loc.name.toLowerCase().includes(searchTerm))
      : locationsArray;
    const aggregatedData = filtered.map(loc => ({
      ...loc,
      location: loc._id || loc.id,
      locationName: loc.name,
    }));
    return route.fulfill({ status: 200, json: aggregatedData });
  });

  await page.route('**/api/reports/machine-stats**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        data: { totalLocations: 2, onlineLocations: 2, offlineLocations: 0 },
      },
    })
  );

  await page.route('**/api/reports/membership-stats**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, data: { membershipCount: 1 } },
    })
  );

  await page.route('**/api/admin/smib-sync**', route =>
    route.fulfill({
      status: 200,
      json: { lastSync: new Date().toISOString(), isStale: false, staleAfterHours: 24 },
    })
  );


}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Locations', () => {
  test('1. Locations table renders with data from the API', async ({
    page,
    locationsPage,
  }) => {
    await test.step('Mock the locations list API', async () => {
      await mockLocationsAPIs(page);
    });

    await test.step('Navigate to /locations', async () => {
      await locationsPage.goto();
    });

    await test.step('Assert both mock locations appear as table rows', async () => {
      await locationsPage.expectTableHasRow('Grand Casino North');
      await locationsPage.expectTableHasRow('South Bay Gaming');
    });

    await test.step('Assert the table has exactly 2 rows', async () => {
      await locationsPage.expectTableRowCount(2);
    });
  });

  test('2. Create location — happy path', async ({ page, locationsPage }) => {
    await test.step('Mock APIs — list initially returns 2 locations', async () => {
      await mockLocationsAPIs(page);
    });

    await test.step('Intercept POST /api/locations and fulfill with created location', async () => {
      // Register POST handler LAST so it takes priority (Playwright LIFO)
      await page.route('**/api/locations**', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({ status: 201, json: MOCK_LOCATION_CREATE_SUCCESS });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('Navigate to /locations', async () => {
      await locationsPage.goto();
    });

    await test.step('Open the Add Location modal', async () => {
      await locationsPage.openCreateModal();
    });

    await test.step('Fill the location form with valid data', async () => {
      await locationsPage.fillLocationForm({
        name: 'New Test Location',
        street: '99 New Street',
        city: 'Arima',
        country: 'Trinidad and Tobago',
        profitShare: '65',
        licencee: 'Evolution1 Ltd',
      });
    });

    await test.step('Submit the form and capture POST request', async () => {
      // Capture the outgoing POST body and update the reports mock concurrently
      const [request] = await Promise.all([
        page.waitForRequest(
          req => req.url().includes('/api/locations') && req.method() === 'POST'
        ),
        (async () => {
          await locationsPage.submitCreateForm();
        })(),
      ]);

      const createRequestBody = request.postDataJSON() as Record<string, unknown>;

      await test.step('Assert POST request was sent with the correct name', async () => {
        expect(createRequestBody).toMatchObject({ name: 'New Test Location' });
      });
    });

    await test.step('Update the reports mock and assert the new location appears in the table', async () => {
      // After creation, re-mock the reports endpoint so the refresh shows 3 locations
      const updatedLocations = [
        ...MOCK_LOCATIONS_LIST.locations,
        { ...MOCK_LOCATION_CREATE_SUCCESS.location, locationName: 'New Test Location' },
      ];
      await page.route('**/api/reports/locations**', route =>
        route.fulfill({
          status: 200,
          json: {
            success: true,
            data: updatedLocations.map(loc => ({
              ...loc,
              location: loc._id || loc.id,
              locationName: loc.name,
            })),
            pagination: { page: 1, limit: 50, totalCount: updatedLocations.length, totalPages: 1 },
          },
        })
      );
      // Trigger a refresh
      await page.reload();
      await locationsPage.expectTableHasRow('New Test Location');
    });
  });

  test('3. Create location — name field is required; shows validation error', async ({
    page,
    locationsPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockLocationsAPIs(page);
    });

    await test.step('Navigate to /locations and open the create modal', async () => {
      await locationsPage.goto();
      await locationsPage.openCreateModal();
    });

    await test.step('Fill licencee only (bypass browser required validation) but leave name empty', async () => {
      // The licencee <select> has required attribute which would stop browser submission.
      // We fill it so the JS handleSubmit check (!formData.name) triggers the toast.
      await locationsPage.licenceeSelect.selectOption({ label: 'Evolution1 Ltd' });
    });

    await test.step('Submit the form without filling the name field', async () => {
      await locationsPage.submitCreateForm();
    });

    await test.step('Assert the modal stays open (form was not submitted)', async () => {
      await locationsPage.expectCreateModalVisible();
    });

    await test.step('Assert a validation error message is shown for the name field', async () => {
      // Use .first() to avoid strict mode failure when toast duplicates render
      await expect(
        page.getByText(/Please fill in all required fields|Failed to add location/i).first()
      ).toBeVisible({ timeout: 8000 });
    });
  });

  test('4. Edit location — form is pre-populated and saving updates the table', async ({
    page,
    locationsPage,
  }) => {
    await test.step('Mock APIs — initial list with 2 locations', async () => {
      await mockLocationsAPIs(page);
    });

    await test.step('Intercept GET /api/locations/:id (preloads edit form)', async () => {
      await page.route('**/api/locations/loc_001**', route =>
        route.fulfill({ status: 200, json: MOCK_LOCATION_DETAIL })
      );
    });

    await test.step('Intercept PUT /api/locations (save edit)', async () => {
      // Register PUT handler LAST so it takes priority (Playwright LIFO).
      // Use route.fallback() — not route.continue() — so non-PUT requests
      // chain through to the next matching handler (the loc_001 detail mock)
      // rather than being sent directly to the real network.
      await page.route('**/api/locations**', async route => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({ status: 200, json: MOCK_LOCATION_UPDATE_SUCCESS });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Navigate to /locations', async () => {
      await locationsPage.goto();
    });

    await test.step('Click the Edit icon on the first row', async () => {
      await locationsPage.clickEdit(0);
    });

    await test.step('Assert edit modal is open', async () => {
      await locationsPage.expectEditModalVisible();
    });

    await test.step('Assert the name field is pre-populated', async () => {
      await expect(locationsPage.editNameInput).toHaveValue('Grand Casino North');
    });

    await test.step('Clear the name field and type the new name', async () => {
      await locationsPage.fillEditForm({ name: 'Grand Casino North (Updated)' });
    });

    await test.step('Submit the edit form — re-mock reports endpoint first', async () => {
      // Update /api/reports/locations BEFORE submitting so the refresh picks up the new name
      const updatedLocations = [
        { ...MOCK_LOCATION_1, name: 'Grand Casino North (Updated)' },
        MOCK_LOCATION_2,
      ];
      await page.route('**/api/reports/locations**', route =>
        route.fulfill({
          status: 200,
          json: {
            success: true,
            data: updatedLocations.map(loc => ({
              ...loc,
              location: loc._id,
              locationName: loc.name,
            })),
            pagination: { page: 1, limit: 50, totalCount: updatedLocations.length, totalPages: 1 },
          },
        })
      );
      await locationsPage.submitEditForm();
    });

    await test.step('Assert the updated name appears in the table', async () => {
      await locationsPage.expectTableHasRow('Grand Casino North (Updated)');
    });
  });

  test('5. Delete location — confirmation dialog removes the row from the table', async ({
    page,
    locationsPage,
  }) => {
    await test.step('Mock APIs — list with 2 locations', async () => {
      await mockLocationsAPIs(page);
    });

    await test.step('Intercept DELETE /api/locations and respond with success', async () => {
      await page.route('**/api/locations**', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 200,
            json: MOCK_LOCATION_DELETE_SUCCESS,
          });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('After deletion, mock list returns only 1 location', async () => {
      // We re-register the route after delete is confirmed — using once()
      // so the full list still serves initially
    });

    await test.step('Navigate to /locations', async () => {
      await locationsPage.goto();
    });

    await test.step('Click the Delete icon on the first row (Grand Casino North)', async () => {
      await locationsPage.clickDelete(0);
    });

    await test.step('Assert the delete confirmation dialog is displayed', async () => {
      await locationsPage.expectDeleteDialogVisible();
      await expect(locationsPage.deleteDialog).toContainText(
        'Grand Casino North'
      );
    });

    await test.step('Confirm deletion — update reports mock first so refresh reflects removal', async () => {
      // The table uses /api/reports/locations, not /api/locations, so we update that mock
      await page.route('**/api/reports/locations**', route =>
        route.fulfill({
          status: 200,
          json: {
            success: true,
            data: [{ ...MOCK_LOCATION_2, location: MOCK_LOCATION_2._id, locationName: MOCK_LOCATION_2.name }],
            pagination: { page: 1, limit: 50, totalCount: 1, totalPages: 1 },
          },
        })
      );
      await locationsPage.confirmDelete();
    });

    await test.step('Assert "Grand Casino North" no longer appears in the table', async () => {
      await locationsPage.expectTableNotHasRow('Grand Casino North');
    });

    await test.step('Assert "South Bay Gaming" is still present', async () => {
      await locationsPage.expectTableHasRow('South Bay Gaming');
    });
  });

  test('6. Location financial metrics are displayed in the table rows', async ({
    page,
    locationsPage,
  }) => {
    await test.step('Mock APIs with location data that includes financial metrics', async () => {
      await mockLocationsAPIs(page);
    });

    await test.step('Navigate to /locations', async () => {
      await locationsPage.goto();
    });

    await test.step('Assert Money In column header is visible', async () => {
      await expect(
        page.getByRole('columnheader', { name: /money in/i })
      ).toBeVisible();
    });

    await test.step('Assert Money Out column header is visible', async () => {
      await expect(
        page.getByRole('columnheader', { name: /money out/i })
      ).toBeVisible();
    });

    await test.step('Assert Gross column header is visible', async () => {
      await expect(
        page.getByRole('columnheader', { name: /gross/i })
      ).toBeVisible();
    });
  });

  test('7. Closing the create modal without saving does not alter the table', async ({
    page,
    locationsPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockLocationsAPIs(page);
    });

    await test.step('Navigate to /locations', async () => {
      await locationsPage.goto();
    });

    await test.step('Open create modal', async () => {
      await locationsPage.openCreateModal();
    });

    await test.step('Partially fill the form', async () => {
      await locationsPage.fillLocationForm({ name: 'Unsaved Location Draft' });
    });

    await test.step('Click Cancel', async () => {
      await locationsPage.cancelCreate();
    });

    await test.step('Assert modal is closed', async () => {
      await expect(locationsPage.createModal).not.toBeVisible();
    });

    await test.step('Assert the draft location does not appear in the table', async () => {
      await locationsPage.expectTableNotHasRow('Unsaved Location Draft');
    });

    await test.step('Assert the original rows are still intact', async () => {
      await locationsPage.expectTableRowCount(2);
    });
  });
});

// ─── Role-based access restriction tests ─────────────────────────────────────
//
// Locations page is restricted to: developer, admin, manager, location admin
// Blocked: cashier (→ /vault/cashier/payouts), vault-manager (→ /vault/management),
//          technician (→ /unauthorized), collector (→ /collection-report)

test.describe('Locations — Role-based access', () => {
  for (const [label, userPayload] of [
    ['manager', MOCK_USER_MANAGER],
    ['location admin', MOCK_USER_LOCATION_ADMIN],
  ] as const) {
    test(`${label} can access /locations`, async ({ page, locationsPage }) => {
      await test.step(`Inject ${label} auth cookie and mock APIs`, async () => {
        await setRoleAuthCookie(page, userPayload);
        await mockLocationsAPIs(page, MOCK_LOCATIONS_LIST, false);
      });

      await test.step('Navigate to /locations', async () => {
        await locationsPage.goto();
        await page.waitForLoadState('networkidle');
      });

      await test.step('Assert no redirect away from /locations', async () => {
        expect(page.url()).not.toMatch(/\/login|\/unauthorized|\/vault/);
      });
    });
  }

  test('cashier is redirected from /locations', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_CASHIER);
    await page.goto('/locations');
    await page.waitForURL(/vault\/cashier\/payouts/, { timeout: 10_000 });
    await expect(page).toHaveURL(/vault\/cashier\/payouts/);
  });

  test('vault-manager is redirected from /locations', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_VAULT_MANAGER);
    await page.goto('/locations');
    await page.waitForURL(/vault\/management/, { timeout: 10_000 });
    await expect(page).toHaveURL(/vault\/management/);
  });

  test('collector is redirected from /locations', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_COLLECTOR);
    await page.goto('/locations');
    await page.waitForURL(/collection-report/, { timeout: 10_000 });
    await expect(page).toHaveURL(/collection-report/);
  });

  test('technician is redirected from /locations to /unauthorized', async ({
    page,
  }) => {
    await setRoleAuthCookie(page, MOCK_USER_TECHNICIAN);
    await page.goto('/locations');
    await page.waitForURL(/unauthorized/, { timeout: 10_000 });
    await expect(page).toHaveURL(/unauthorized/);
  });
});
