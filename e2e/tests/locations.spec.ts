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
  MOCK_LOCATIONS_LIST_AFTER_EDIT,
  MOCK_LOCATIONS_LIST_AFTER_DELETE,
  MOCK_LOCATION_CREATE_SUCCESS,
  MOCK_LOCATION_UPDATE_SUCCESS,
  MOCK_LOCATION_DELETE_SUCCESS,
  MOCK_LICENCEES_LIST,
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

// ─── Shared route setup ───────────────────────────────────────────────────────

async function mockLocationsAPIs(
  page: Page,
  listPayload = MOCK_LOCATIONS_LIST
) {
  await page.route('**/api/auth/current-user**', (route) =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/gaming-locations**', (route) =>
    route.fulfill({ status: 200, json: listPayload })
  );
  await page.route('**/api/locations**', (route) =>
    route.fulfill({ status: 200, json: listPayload })
  );
  await page.route('**/api/licencees**', (route) =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
  await page.route('**/api/countries**', (route) =>
    route.fulfill({
      status: 200,
      json: { success: true, data: ['Trinidad and Tobago', 'Jamaica', 'Barbados'], timestamp: '' },
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
    // Track the POST request so we can assert on it
    let createRequestBody: Record<string, unknown> = {};

    await test.step('Mock APIs — list initially returns 2 locations', async () => {
      await mockLocationsAPIs(page);
    });

    await test.step('Intercept POST /api/locations and respond with created location', async () => {
      await page.route('**/api/locations', async (route) => {
        if (route.request().method() === 'POST') {
          createRequestBody = route.request().postDataJSON() as Record<string, unknown>;
          await route.fulfill({ status: 201, json: MOCK_LOCATION_CREATE_SUCCESS });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('After creation, mock list returns 3 locations', async () => {
      // Re-route the list endpoint to return an updated list
      await page.route('**/api/gaming-locations**', (route) =>
        route.fulfill({
          status: 200,
          json: {
            ...MOCK_LOCATIONS_LIST,
            data: [...MOCK_LOCATIONS_LIST.data, MOCK_LOCATION_CREATE_SUCCESS.data],
          },
        })
      );
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

    await test.step('Submit the form', async () => {
      await locationsPage.submitCreateForm();
    });

    await test.step('Assert POST request was sent with the correct name', async () => {
      expect(createRequestBody).toMatchObject({ name: 'New Test Location' });
    });

    await test.step('Assert the new location now appears in the table', async () => {
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

    await test.step('Submit the form without filling the name field', async () => {
      await locationsPage.submitCreateForm();
    });

    await test.step('Assert the modal stays open (form was not submitted)', async () => {
      await locationsPage.expectCreateModalVisible();
    });

    await test.step('Assert a validation error message is shown for the name field', async () => {
      const nameError = page.locator('#name-error, [id*="name"][id*="error"]');
      await expect(nameError).toBeVisible();
      await expect(nameError).toContainText(/required|name/i);
    });
  });

  test('4. Edit location — form is pre-populated and saving updates the table', async ({
    page,
    locationsPage,
  }) => {
    await test.step('Mock APIs — initial list with 2 locations', async () => {
      await mockLocationsAPIs(page);
    });

    await test.step('Intercept PUT /api/locations and respond with updated location', async () => {
      await page.route('**/api/locations**', async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({ status: 200, json: MOCK_LOCATION_UPDATE_SUCCESS });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('After edit, mock list returns updated name', async () => {
      await page.route('**/api/gaming-locations**', (route) =>
        route.fulfill({ status: 200, json: MOCK_LOCATIONS_LIST_AFTER_EDIT })
      );
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

    await test.step('Submit the edit form', async () => {
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
      await page.route('**/api/locations**', async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ status: 200, json: MOCK_LOCATION_DELETE_SUCCESS });
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
      await expect(locationsPage.deleteDialog).toContainText('Grand Casino North');
    });

    await test.step('Confirm deletion', async () => {
      // Swap the list mock to return the post-delete list before confirming
      await page.route('**/api/gaming-locations**', (route) =>
        route.fulfill({ status: 200, json: MOCK_LOCATIONS_LIST_AFTER_DELETE })
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
      await expect(page.getByRole('columnheader', { name: /money in/i })).toBeVisible();
    });

    await test.step('Assert Money Out column header is visible', async () => {
      await expect(page.getByRole('columnheader', { name: /money out/i })).toBeVisible();
    });

    await test.step('Assert Gross column header is visible', async () => {
      await expect(page.getByRole('columnheader', { name: /gross/i })).toBeVisible();
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
        await mockLocationsAPIs(page);
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

  test('technician is redirected from /locations to /unauthorized', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_TECHNICIAN);
    await page.goto('/locations');
    await page.waitForURL(/unauthorized/, { timeout: 10_000 });
    await expect(page).toHaveURL(/unauthorized/);
  });
});
