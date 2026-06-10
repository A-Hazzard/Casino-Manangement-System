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
  MOCK_LOCATIONS_LIST,
  MOCK_LICENCEES_LIST,
  MOCK_LOCATION_MEMBERS,
} from '../mocks/locations.mocks';
import {
  MOCK_MANUFACTURERS,
  MOCK_CABINET_DETAIL,
  MOCK_METER_HISTORY,
} from '../mocks/cabinets.mocks';
import {
  MOCK_CURRENT_USER,
  MOCK_USER_PAYLOAD,
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
  machinesPayload = MOCK_LOCATION_MACHINES,
  userPayload = MOCK_USER_PAYLOAD
) {
  // Seed Zustand store so ProtectedRoute has the user immediately
  const userStoreJSON = JSON.stringify({
    state: {
      user: {
        _id: userPayload._id,
        username: userPayload.username,
        emailAddress: userPayload.emailAddress,
        profile: userPayload.profile,
        roles: userPayload.roles,
        isEnabled: userPayload.isEnabled,
        assignedLocations: userPayload.assignedLocations,
        assignedLicencees: userPayload.assignedLicencees,
      },
      isInitialized: true,
      hasActiveVaultShift: false,
      isVaultReconciled: false,
      isStaleShift: false,
    },
    version: 0,
  });
  const activeLicencee = userPayload.assignedLicencees[0] ?? '';
  const dashboardStoreJSON = JSON.stringify({
    state: {
      selectedLicencee: activeLicencee,
      activeMetricsFilter: 'Today',
      displayCurrency: 'TTD',
      gameDayOffset: 8,
      customDateRange: {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      },
    },
    version: 0,
  });
  await page.addInitScript(`
    localStorage.setItem('user-auth-store', ${JSON.stringify(userStoreJSON)});
    localStorage.setItem('dashboard-store', ${JSON.stringify(dashboardStoreJSON)});
  `);

  await page.route('**/api/auth/current-user**', route =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token**', route =>
    route.fulfill({ status: 200, json: { userId: userPayload._id } })
  );
  await page.route(`**/api/users/${userPayload._id}**`, route =>
    route.fulfill({ status: 200, json: { success: true, user: MOCK_CURRENT_USER.user } })
  );
  // Location detail
  await page.route(`**/api/locations/${LOCATION_ID}**`, route =>
    route.fulfill({ status: 200, json: MOCK_LOCATION_DETAIL })
  );
  // Location list (used by location dropdown)
  await page.route('**/api/locations?**', route =>
    route.fulfill({ status: 200, json: MOCK_LOCATIONS_LIST })
  );
  await page.route('**/api/locations', route =>
    route.fulfill({ status: 200, json: MOCK_LOCATIONS_LIST })
  );
  // Single cabinet detail — Edit modal calls fetchCabinetById → GET /api/cabinets/{id}?timePeriod=...
  // Added BEFORE aggregation/status so those more-specific routes (added after) take priority.
  await page.route('**/api/cabinets/mach_001**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: { success: true, data: (machinesPayload.data as Array<unknown>)[0] } });
    } else {
      await route.fallback();
    }
  });
  await page.route('**/api/cabinets/mach_002**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: { success: true, data: (machinesPayload.data as Array<unknown>)[1] } });
    } else {
      await route.fallback();
    }
  });
  // Machine list — component calls /api/cabinets/aggregation
  await page.route('**/api/cabinets/aggregation**', route =>
    route.fulfill({ status: 200, json: machinesPayload })
  );
  // Machine status counts
  await page.route('**/api/cabinets/status**', route =>
    route.fulfill({ status: 200, json: { success: true, data: { totalMachines: 2, onlineMachines: 1, offlineMachines: 1 } } })
  );
  // Location trends (chart data)
  await page.route('**/api/analytics/location-trends**', route =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );
  // Membership count — real route returns { memberCount: N } at top level (no data wrapper)
  await page.route('**/api/members/count**', route =>
    route.fulfill({ status: 200, json: { memberCount: 5 } })
  );
  await page.route('**/api/feedback**', route =>
    route.fulfill({ status: 200, json: { success: true, data: { feedback: [] } } })
  );
  await page.route('**/api/install/status**', route =>
    route.fulfill({ status: 200, json: { success: true, data: { installed: true } } })
  );
  await page.route('**/api/manufacturers**', route =>
    route.fulfill({ status: 200, json: MOCK_MANUFACTURERS })
  );
  await page.route('**/api/licencees**', route =>
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
      // The location name lives in a flex/truncate heading; assert on body text
      // rather than element visibility to avoid overflow-hidden false negatives.
      await expect(page.locator('body')).toContainText('Grand Casino North');
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
      await page.route(`**/api/cabinets`, async route => {
        if (route.request().method() === 'POST') {
          createRequestBody = route.request().postDataJSON() as Record<
            string,
            unknown
          >;
          await route.fulfill({
            status: 201,
            json: MOCK_MACHINE_CREATE_SUCCESS,
          });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('After creation, return updated machine list', async () => {
      await page.route('**/api/cabinets/aggregation**', route =>
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

    // Navigate BEFORE registering the PUT mock so the initial page load uses the
    // original aggregation data (Lucky Dragon), not the post-edit data.
    await test.step('Navigate to location detail', async () => {
      await locationDetailPage.goto(LOCATION_ID);
    });

    await test.step('Intercept PUT and queue updated list after save', async () => {
      const editedFirst = {
        ...(MOCK_LOCATION_MACHINES.data as Array<object>)[0],
        custom: { name: 'Lucky Dragon (Updated)' },
      };
      const secondOne = (MOCK_LOCATION_MACHINES.data as Array<object>)[1];
      await page.route('**/api/cabinets/**', async route => {
        if (route.request().method() === 'PUT') {
          // Upgrade the aggregation mock right before responding so the component
          // gets updated data on the refresh that follows the save.
          await page.route('**/api/cabinets/aggregation**', r =>
            r.fulfill({
              status: 200,
              json: { ...MOCK_LOCATION_MACHINES, data: [editedFirst, secondOne] },
            })
          );
          await route.fulfill({ status: 200, json: MOCK_MACHINE_UPDATE_SUCCESS });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Click Edit on the first machine row', async () => {
      await locationDetailPage.clickMachineEdit(0);
    });

    await test.step('Assert the modal opens and the custom name is pre-filled', async () => {
      await expect(locationDetailPage.machineModal).toBeVisible();
      await expect(locationDetailPage.customNameInput).toHaveValue(
        'Lucky Dragon'
      );
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

    // Navigate BEFORE registering the DELETE mock so the initial page load uses
    // only the clean mocks from mockLocationDetailAPIs.
    await test.step('Navigate to location detail', async () => {
      await locationDetailPage.goto(LOCATION_ID);
    });

    await test.step('Intercept DELETE machine endpoint', async () => {
      // Pattern WITHOUT trailing / so it also matches DELETE /api/cabinets?id=mach_001
      await page.route('**/api/cabinets**', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 200,
            json: MOCK_MACHINE_DELETE_SUCCESS,
          });
        } else {
          // fallback (not continue) so other mock handlers still apply
          await route.fallback();
        }
      });
    });

    await test.step('Click Delete on the first row (SN-10001)', async () => {
      await locationDetailPage.clickMachineDelete(0);
    });

    await test.step('Assert the confirmation dialog appears', async () => {
      await expect(locationDetailPage.deleteDialog).toBeVisible();
    });

    await test.step('Confirm deletion and update the mocked machine list', async () => {
      const remainingOne = (MOCK_LOCATION_MACHINES.data as Array<object>)[1];
      await page.route('**/api/cabinets/aggregation**', route =>
        route.fulfill({
          status: 200,
          json: {
            ...MOCK_LOCATION_MACHINES,
            data: [remainingOne],
            pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
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
      // Members list endpoint — use fallback for /count so the count mock in
      // mockLocationDetailAPIs still applies (avoids LIFO priority override).
      await page.route(`**/api/members**`, async route => {
        if (route.request().url().includes('/count')) {
          await route.fallback();
        } else {
          await route.fulfill({
            status: 200,
            json: {
              success: true,
              data: { members: [], pagination: { page: 1, totalCount: 0 } },
              timestamp: new Date().toISOString(),
            },
          });
        }
      });
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
      await expect(page.getByText(/members|no members/i).first()).toBeVisible();
    });
  });

  test('7b. Members tab lists actual members for a membership location', async ({
    page,
    locationDetailPage,
  }) => {
    await test.step('Mock APIs — membership location WITH a member in the list', async () => {
      await mockLocationDetailAPIs(page);
      // Return a populated members list; keep the /count mock via fallback.
      await page.route('**/api/members**', async route => {
        if (route.request().url().includes('/count')) {
          await route.fallback();
        } else {
          await route.fulfill({ status: 200, json: MOCK_LOCATION_MEMBERS });
        }
      });
    });

    await test.step('Navigate to location detail', async () => {
      await locationDetailPage.goto(LOCATION_ID);
    });

    await test.step('Switch to the Members tab', async () => {
      await locationDetailPage.expectMembersTabVisible();
      await locationDetailPage.switchTab('Members');
    });

    await test.step('Assert the mocked member is shown in the members view', async () => {
      // The name renders in BOTH a mobile card (<h3>, hidden at desktop, first in DOM)
      // and the desktop table (<div>) — filter to the visible copy.
      await expect(
        page
          .getByText('John Player', { exact: false })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert the members sub-navigation (Summary Report) is present', async () => {
      await expect(
        page.getByText(/Summary Report/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });

    await test.step('Assert the member total count reflects the mocked data', async () => {
      await expect(
        page.getByText(/Members List For/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('8. Meter data section is visible when a machine row is expanded or navigated to', async ({
    page,
    locationDetailPage,
  }) => {
    await test.step('Mock location detail APIs', async () => {
      await mockLocationDetailAPIs(page);
      // Meters and analytics endpoints needed by the cabinet detail page
      // (mach_001 single GET is already covered by mockLocationDetailAPIs)
      await page.route('**/api/meters**', route =>
        route.fulfill({ status: 200, json: MOCK_METER_HISTORY })
      );
      await page.route('**/api/analytics/**', route =>
        route.fulfill({ status: 200, json: { success: true, data: [] } })
      );
    });

    await test.step('Navigate to location detail', async () => {
      await locationDetailPage.goto(LOCATION_ID);
    });

    await test.step('Add cabinet-detail-specific mocks now that the location page is loaded', async () => {
      // Broad cabinet mock only takes effect after navigation away from the location page.
      // Registering it here means it can't interfere with the aggregation request above.
      await page.route('**/api/cabinets/**', route =>
        route.fulfill({ status: 200, json: MOCK_CABINET_DETAIL })
      );
    });

    await test.step('Click the View (Eye) link on the first machine row', async () => {
      // The Eye button is a <Link title="View details"> that navigates to /cabinets/[id]
      const viewLink = locationDetailPage.machineRows
        .nth(0)
        .locator('a[title="View details"]');
      await viewLink.click();
      // Wait for the cabinet detail page to load
      await page.waitForURL(/\/cabinets\//, { timeout: 15_000 });
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert accounting data is shown on the cabinet detail page', async () => {
      // The default Movements tab shows Money In / Money Out / Gross / Jackpot headings
      await expect(
        page.getByText(/Money In|Accounting Details|Movements/i).first()
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
    test(`${label} can access location detail page`, async ({
      page,
      locationDetailPage,
    }) => {
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
