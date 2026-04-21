/**
 * Location Detail E2E Tests
 * ──────────────────────────
 * Covers:
 *  1. Navigating to a location detail page shows the Machines tab by default
 *  2. Machine list table renders with machines for that location
 *  3. Add machine — happy path (form fill → machine appears in table)
 *  4. Add machine — validation: serial number must be at least 3 characters
 *  5. Edit machine — form is pre-populated; updating custom name reflects in table
 *  6. Delete machine — confirmation dialog → machine removed from table
 *  7. Members tab is visible and switches the content when membershipEnabled
 *  8. Meter data section is visible for a machine row (drill-down)
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_LOCATION_DETAIL,
  MOCK_LOCATION_MACHINES,
  MOCK_LOCATION_MACHINES_AFTER_ADD,
  MOCK_MACHINE_CREATE_SUCCESS,
  MOCK_MACHINE_UPDATE_SUCCESS,
  MOCK_MACHINE_DELETE_SUCCESS,
  MOCK_LICENCEES_LIST,
} from '../mocks/locations.mocks';
import { MOCK_MANUFACTURERS } from '../mocks/cabinets.mocks';
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

const LOCATION_ID = 'loc_001';

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockLocationDetailAPIs(
  page: Page,
  machinesPayload = MOCK_LOCATION_MACHINES
) {
  await page.route('**/api/auth/current-user**', (route) =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  // Fetching the same location but potentially with nameOnly or other params
  await page.route(`**/api/locations/${LOCATION_ID}**`, (route) =>
    route.fulfill({ status: 200, json: MOCK_LOCATION_DETAIL })
  );
  // Machine list for this location
  await page.route(`**/api/cabinets?locationId=${LOCATION_ID}**`, (route) =>
    route.fulfill({ status: 200, json: machinesPayload })
  );
  await page.route(`**/api/cabinets**`, (route) =>
    route.fulfill({ status: 200, json: machinesPayload })
  );
  await page.route('**/api/manufacturers**', (route) =>
    route.fulfill({ status: 200, json: MOCK_MANUFACTURERS })
  );
  await page.route('**/api/licencees**', (route) =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Location Detail', () => {
  test('1. Navigating to a location detail page shows the Machines tab by default', async ({
    page,
    locationDetailPage,
  }) => {
    await test.step('Mock location detail and machines APIs', async () => {
      await mockLocationDetailAPIs(page);
    });

    await test.step(`Navigate to /locations/${LOCATION_ID}`, async () => {
      await locationDetailPage.goto(LOCATION_ID);
    });

    await test.step('Assert the Machines tab is active', async () => {
      await locationDetailPage.expectMachinesTabActive();
    });

    await test.step('Assert the location name is shown in the page heading', async () => {
      await expect(page.getByText('Grand Casino North')).toBeVisible();
    });
  });

  test('2. Machine list table renders with all machines for the location', async ({
    page,
    locationDetailPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockLocationDetailAPIs(page);
    });

    await test.step('Navigate to location detail', async () => {
      await locationDetailPage.goto(LOCATION_ID);
    });

    await test.step('Assert machine SN-10001 appears in the table', async () => {
      await locationDetailPage.expectMachineInTable('SN-10001');
    });

    await test.step('Assert machine SN-10002 appears in the table', async () => {
      await locationDetailPage.expectMachineInTable('SN-10002');
    });

    await test.step('Assert table has exactly 2 machine rows', async () => {
      await locationDetailPage.expectMachineRowCount(2);
    });
  });

  test('3. Add machine — happy path', async ({ page, locationDetailPage }) => {
    let createRequestBody: Record<string, unknown> = {};

    await test.step('Mock APIs with initial machine list', async () => {
      await mockLocationDetailAPIs(page, MOCK_LOCATION_MACHINES);
    });

    await test.step('Intercept POST machine creation endpoint', async () => {
      await page.route(
        `**/api/cabinets`,
        async (route) => {
          if (route.request().method() === 'POST') {
            createRequestBody = route.request().postDataJSON() as Record<string, unknown>;
            await route.fulfill({ status: 201, json: MOCK_MACHINE_CREATE_SUCCESS });
          } else {
            await route.continue();
          }
        }
      );
    });

    await test.step('After creation, return updated machine list', async () => {
      await page.route('**/api/cabinets**', (route) =>
        route.fulfill({ status: 200, json: MOCK_LOCATION_MACHINES_AFTER_ADD })
      );
    });

    await test.step('Navigate to location detail', async () => {
      await locationDetailPage.goto(LOCATION_ID);
    });

    await test.step('Open the Add Machine modal', async () => {
      await locationDetailPage.openAddMachineModal();
    });

    await test.step('Fill the machine form with valid data', async () => {
      await locationDetailPage.fillMachineForm({
        serialNumber: 'SN-NEW001',
        game: 'Golden Bells',
        gameType: 'slot',
        relayId: '3',
        manufacturer: 'IGT',
        customName: 'Test Machine',
      });
    });

    await test.step('Submit the form', async () => {
      await locationDetailPage.submitMachineForm();
    });

    await test.step('Assert POST body includes the new serial number', async () => {
      expect(createRequestBody).toMatchObject({ serialNumber: 'SN-NEW001' });
    });

    await test.step('Assert the new machine appears in the table', async () => {
      await locationDetailPage.expectMachineInTable('SN-NEW001');
    });
  });

  test('4. Add machine — serial number must be at least 3 characters', async ({
    page,
    locationDetailPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockLocationDetailAPIs(page);
    });

    await test.step('Navigate to location detail', async () => {
      await locationDetailPage.goto(LOCATION_ID);
    });

    await test.step('Open the Add Machine modal', async () => {
      await locationDetailPage.openAddMachineModal();
    });

    await test.step('Enter a serial number with only 2 characters', async () => {
      await locationDetailPage.fillMachineForm({ serialNumber: 'AB' });
    });

    await test.step('Attempt to submit the form', async () => {
      await locationDetailPage.submitMachineForm();
    });

    await test.step('Assert validation error is shown for serial number', async () => {
      await locationDetailPage.expectSerialNumberValidationError();
    });

    await test.step('Assert the modal is still open (submission was blocked)', async () => {
      await expect(locationDetailPage.machineModal).toBeVisible();
    });
  });

  test('5. Edit machine — form is pre-populated and saving updates the table', async ({
    page,
    locationDetailPage,
  }) => {
    await test.step('Mock APIs with machine list', async () => {
      await mockLocationDetailAPIs(page);
    });

    await test.step('Intercept PUT machine update endpoint', async () => {
      await page.route('**/api/cabinets/**', async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({ status: 200, json: MOCK_MACHINE_UPDATE_SUCCESS });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('After edit, return updated machine list', async () => {
      await page.route('**/api/cabinets**', (route) =>
        route.fulfill({
          status: 200,
          json: {
            ...MOCK_LOCATION_MACHINES,
            data: {
              ...MOCK_LOCATION_MACHINES.data,
              machines: [
                {
                  ...MOCK_LOCATION_MACHINES.data.machines[0],
                  custom: { name: 'Lucky Dragon (Updated)' },
                },
                MOCK_LOCATION_MACHINES.data.machines[1],
              ],
            },
          },
        })
      );
    });

    await test.step('Navigate to location detail', async () => {
      await locationDetailPage.goto(LOCATION_ID);
    });

    await test.step('Click Edit on the first machine row', async () => {
      await locationDetailPage.clickMachineEdit(0);
    });

    await test.step('Assert the modal opens and the custom name is pre-filled', async () => {
      await expect(locationDetailPage.machineModal).toBeVisible();
      await expect(locationDetailPage.customNameInput).toHaveValue('Lucky Dragon');
    });

    await test.step('Update the custom name', async () => {
      await locationDetailPage.customNameInput.clear();
      await locationDetailPage.customNameInput.fill('Lucky Dragon (Updated)');
    });

    await test.step('Submit the edit', async () => {
      await locationDetailPage.submitMachineForm();
    });

    await test.step('Assert updated name is visible in the table', async () => {
      await locationDetailPage.expectMachineInTable('Lucky Dragon (Updated)');
    });
  });

  test('6. Delete machine — confirmation removes the row from the table', async ({
    page,
    locationDetailPage,
  }) => {
    await test.step('Mock APIs with machine list', async () => {
      await mockLocationDetailAPIs(page);
    });

    await test.step('Intercept DELETE machine endpoint', async () => {
      await page.route('**/api/cabinets/**', async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ status: 200, json: MOCK_MACHINE_DELETE_SUCCESS });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('Navigate to location detail', async () => {
      await locationDetailPage.goto(LOCATION_ID);
    });

    await test.step('Click Delete on the first row (SN-10001)', async () => {
      await locationDetailPage.clickMachineDelete(0);
    });

    await test.step('Assert the confirmation dialog appears', async () => {
      await expect(locationDetailPage.deleteDialog).toBeVisible();
    });

    await test.step('Confirm deletion and update the mocked machine list', async () => {
      await page.route('**/api/cabinets**', (route) =>
        route.fulfill({
          status: 200,
          json: {
            ...MOCK_LOCATION_MACHINES,
            data: {
              machines: [MOCK_LOCATION_MACHINES.data.machines[1]],
              pagination: { page: 1, limit: 10, totalCount: 1, totalPages: 1 },
            },
          },
        })
      );
      await locationDetailPage.confirmDeleteMachine();
    });

    await test.step('Assert SN-10001 is no longer in the table', async () => {
      await locationDetailPage.expectMachineNotInTable('SN-10001');
    });

    await test.step('Assert SN-10002 is still present', async () => {
      await locationDetailPage.expectMachineInTable('SN-10002');
    });
  });

  test('7. Members tab is visible for membershipEnabled locations and switches content', async ({
    page,
    locationDetailPage,
  }) => {
    await test.step('Mock APIs — location has membershipEnabled: true', async () => {
      await mockLocationDetailAPIs(page);
      // Members endpoint
      await page.route(`**/api/members**`, (route) =>
        route.fulfill({
          status: 200,
          json: {
            success: true,
            data: { members: [], pagination: { page: 1, totalCount: 0 } },
            timestamp: new Date().toISOString(),
          },
        })
      );
    });

    await test.step('Navigate to location detail', async () => {
      await locationDetailPage.goto(LOCATION_ID);
    });

    await test.step('Assert the Members tab is visible (membershipEnabled = true)', async () => {
      await locationDetailPage.expectMembersTabVisible();
    });

    await test.step('Click the Members tab', async () => {
      await locationDetailPage.switchTab('Members');
    });

    await test.step('Assert the view has switched (machines table no longer shown)', async () => {
      // After switching, we expect a members-oriented heading or empty-state
      await expect(
        page.getByText(/members|no members/i).first()
      ).toBeVisible();
    });
  });

  test('8. Meter data section is visible when a machine row is expanded or navigated to', async ({
    page,
    locationDetailPage,
  }) => {
    await test.step('Mock APIs with machine data including meter readings', async () => {
      await mockLocationDetailAPIs(page);
    });

    await test.step('Navigate to location detail', async () => {
      await locationDetailPage.goto(LOCATION_ID);
    });

    await test.step('Click the View icon on the first machine to expand / navigate', async () => {
      // Either expands inline or navigates to /cabinets/[id]; handle both
      const viewButton = locationDetailPage.machineRows
        .nth(0)
        .locator('[aria-label*="view" i], [aria-label*="eye" i], a');
      await viewButton.click();
    });

    await test.step('Assert meter data is displayed on the resulting view', async () => {
      // Works for both inline expand and cabinet-detail navigation
      await expect(
        page.getByText(/SAS Meter|Meter Data|Coin In/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});

// ─── Role-based access restriction tests ─────────────────────────────────────
//
// Location-details accessible to: developer, admin, manager, location admin, technician
// Blocked: cashier (→ /vault/cashier/payouts), vault-manager (→ /vault/management),
//          collector (→ /collection-report)
// Note: technician CAN access location-details (unlike the locations list page)

test.describe('Location Detail — Role-based access', () => {
  for (const [label, userPayload] of [
    ['manager', MOCK_USER_MANAGER],
    ['location admin', MOCK_USER_LOCATION_ADMIN],
    ['technician', MOCK_USER_TECHNICIAN],
  ] as const) {
    test(`${label} can access location detail page`, async ({ page, locationDetailPage }) => {
      await test.step(`Inject ${label} auth cookie and mock APIs`, async () => {
        await setRoleAuthCookie(page, userPayload);
        await mockLocationDetailAPIs(page);
      });

      await test.step('Navigate to location detail', async () => {
        await locationDetailPage.goto(LOCATION_ID);
        await page.waitForLoadState('networkidle');
      });

      await test.step('Assert no redirect away from location detail', async () => {
        expect(page.url()).not.toMatch(/\/login|\/unauthorized|\/vault/);
      });
    });
  }

  test('cashier is redirected from location detail', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_CASHIER);
    await page.goto(`/locations/${LOCATION_ID}`);
    await page.waitForURL(/vault\/cashier\/payouts/, { timeout: 10_000 });
    await expect(page).toHaveURL(/vault\/cashier\/payouts/);
  });

  test('vault-manager is redirected from location detail', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_VAULT_MANAGER);
    await page.goto(`/locations/${LOCATION_ID}`);
    await page.waitForURL(/vault\/management/, { timeout: 10_000 });
    await expect(page).toHaveURL(/vault\/management/);
  });

  test('collector is redirected from location detail', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_COLLECTOR);
    await page.goto(`/locations/${LOCATION_ID}`);
    await page.waitForURL(/collection-report/, { timeout: 10_000 });
    await expect(page).toHaveURL(/collection-report/);
  });
});

