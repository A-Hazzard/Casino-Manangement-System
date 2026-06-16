import { test, expect } from '../fixtures/test.fixture';
import { type Page, type Route } from 'playwright';
import { MOCK_CURRENT_USER } from '../mocks/auth.mocks';
import { MOCK_LICENCEES_LIST, MOCK_LOCATION_1 } from '../mocks/locations.mocks';

const SESSION_ID = 'sess_001';

const MOCK_SESSION_DETAIL_IN_PROGRESS = {
  success: true,
  data: {
    sessionId: SESSION_ID,
    sessionStatus: 'in-progress',
    locationId: 'loc_001',
    locationName: 'Grand Casino North',
    licencee: 'lic_001',
    collector: 'collector_001',
    collectorName: 'E2E Collector',
    collectorFirstName: 'E2E',
    collectorLastName: 'Collector',
    collectorEmail: 'collector@example.com',
    sessionStartTime: '2026-01-01T08:00:00.000Z',
    machinesTotal: 2,
    machinesCaptured: 0,
    machinesConfirmed: 0,
    machinesSkipped: 0,
    createdAt: '2026-01-01T08:00:00.000Z',
    machines: [
      {
        reportedMachineId: 'rm_001',
        machineId: 'mach_001',
        machineName: 'Lucky Dragon',
        machineCustomName: 'Lucky Dragon',
        serialNumber: 'SN-10001',
        manufacturer: 'IGT',
        game: 'Dragon Fortune',
        status: 'pending',
        sequenceOrder: 0,
        sasMetersIn: 9646000,
        sasMetersOut: 4823000,
        metersMatch: null,
        hasRelay: true,
        ramClear: false,
        lastCollectionTime: '2025-12-31T08:00:00.000Z',
        sasStartTime: '2025-12-31T08:00:00.000Z',
        isSupplemental: false,
      },
      {
        reportedMachineId: 'rm_002',
        machineId: 'mach_002',
        machineName: 'Golden Pharaoh',
        machineCustomName: 'Golden Pharaoh',
        serialNumber: 'SN-10002',
        manufacturer: 'Aristocrat',
        game: 'Pharaoh Gold',
        status: 'pending',
        sequenceOrder: 1,
        sasMetersIn: 7360000,
        sasMetersOut: 3680000,
        hasRelay: true,
        ramClear: false,
        lastCollectionTime: '2025-12-31T08:00:00.000Z',
        isSupplemental: false,
      },
    ],
  },
};

const MOCK_SESSION_DETAIL_SUBMITTED = {
  success: true,
  data: {
    sessionId: SESSION_ID,
    sessionStatus: 'submitted',
    locationId: 'loc_001',
    locationName: 'Grand Casino North',
    licencee: 'lic_001',
    collector: 'collector_001',
    collectorName: 'E2E Collector',
    collectorFirstName: 'E2E',
    collectorLastName: 'Collector',
    collectorEmail: 'collector@example.com',
    sessionStartTime: '2026-01-01T08:00:00.000Z',
    machinesTotal: 2,
    machinesCaptured: 2,
    machinesConfirmed: 2,
    machinesSkipped: 0,
    createdAt: '2026-01-01T08:00:00.000Z',
    machines: [
      {
        reportedMachineId: 'rm_001',
        machineId: 'mach_001',
        machineName: 'Lucky Dragon',
        machineCustomName: 'Lucky Dragon',
        serialNumber: 'SN-10001',
        manufacturer: 'IGT',
        game: 'Dragon Fortune',
        status: 'confirmed',
        sequenceOrder: 0,
        sasMetersIn: 9646000,
        sasMetersOut: 4823000,
        metersMatch: true,
        hasRelay: true,
        ramClear: false,
        lastCollectionTime: '2025-12-31T08:00:00.000Z',
        sasStartTime: '2025-12-31T08:00:00.000Z',
        isSupplemental: false,
        machineGross: 4823000,
        sasGross: 4823000,
        variation: 0,
      },
      {
        reportedMachineId: 'rm_002',
        machineId: 'mach_002',
        machineName: 'Golden Pharaoh',
        machineCustomName: 'Golden Pharaoh',
        serialNumber: 'SN-10002',
        manufacturer: 'Aristocrat',
        game: 'Pharaoh Gold',
        status: 'confirmed',
        sequenceOrder: 1,
        sasMetersIn: 7360000,
        sasMetersOut: 3680000,
        hasRelay: true,
        ramClear: false,
        lastCollectionTime: '2025-12-31T08:00:00.000Z',
        isSupplemental: false,
        machineGross: 3680000,
        sasGross: 3680000,
        variation: 0,
      },
    ],
  },
};

const MOCK_LAST_COLLECTION_TIME = {
  success: true,
  data: {
    collectionTime: '2025-12-31T08:00:00.000Z',
    firstCollectionTime: '2025-06-01T08:00:00.000Z',
  },
};

async function mockCollectionSessionAPIs(page: Page, sessionData: Record<string, unknown> = MOCK_SESSION_DETAIL_IN_PROGRESS as unknown as Record<string, unknown>) {
  // Auth mock
  await page.route('**/api/auth/current-user', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token', (route: Route) =>
    route.fulfill({ status: 200, json: { userId: MOCK_CURRENT_USER.user.id } })
  );
  await page.route('**/api/users/**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, user: MOCK_CURRENT_USER.user } })
  );
  await page.route('**/api/licencees', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
  await page.route('**/api/locations/**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, data: MOCK_LOCATION_1, location: MOCK_LOCATION_1 } })
  );
  await page.route('**/api/locations', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, locations: [MOCK_LOCATION_1] } })
  );

  // V2 collection report sessions APIs
  await page.route('**/api/collection-reports-v2/sessions/**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/submit') && method === 'PATCH') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    return route.fulfill({ status: 200, json: sessionData });
  });

  await page.route('**/api/collection-reports-v2/machines/last-collection-time**', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_LAST_COLLECTION_TIME })
  );

  await page.route('**/api/collection-reports-v2/machines**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true } })
  );
}

test.describe('Collection Report V2 Session Detail Page', () => {
  test('1. Page loads and shows location name and progress', async ({ page }) => {
    await mockCollectionSessionAPIs(page);
    await page.goto(`/collection-report/report/session/${SESSION_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Grand Casino North').first()).toBeVisible({ timeout: 15_000 });
    // Verify progress indicator (machines captured vs total) is visible
    await expect(page.getByText(/0.*2|machines?\s*captured/i).first()).toBeVisible();
  });

  test('2. Machine 1 of 2 header shows correct machine name and serial', async ({ page }) => {
    await mockCollectionSessionAPIs(page);
    await page.goto(`/collection-report/report/session/${SESSION_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Machine 1 of 2' })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Lucky Dragon').first()).toBeVisible();
    await expect(page.getByText('SN: SN-10001').first()).toBeVisible();
  });

  test('3. System Meters SMIB section is visible', async ({ page }) => {
    await mockCollectionSessionAPIs(page);
    await page.goto(`/collection-report/report/session/${SESSION_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('System Meters (from SMIB)')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Meters In').first()).toBeVisible();
    await expect(page.getByText('Meters Out').first()).toBeVisible();
  });

  test('4. Photo upload zone is visible', async ({ page }) => {
    await mockCollectionSessionAPIs(page);
    await page.goto(`/collection-report/report/session/${SESSION_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Tap to take a photo')).toBeVisible({ timeout: 10_000 });
  });

  test('5. Meters match buttons are visible', async ({ page }) => {
    await mockCollectionSessionAPIs(page);
    await page.goto(`/collection-report/report/session/${SESSION_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('✓ Yes, they match')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('✗ No, enter manually')).toBeVisible();
  });

  test('6. Clicking Yes, they match enables/shows Save & Next action button', async ({ page }) => {
    await mockCollectionSessionAPIs(page);
    await page.goto(`/collection-report/report/session/${SESSION_ID}`);
    await page.waitForLoadState('networkidle');

    const saveNextBtn = page.getByRole('button', { name: /save & next|review/i }).first();
    await expect(saveNextBtn).toBeDisabled();

    await page.getByText('✓ Yes, they match').click();
    await expect(saveNextBtn).toBeEnabled();
  });

  test('7. RAM Clear checkbox is visible and clickable', async ({ page }) => {
    await mockCollectionSessionAPIs(page);
    await page.goto(`/collection-report/report/session/${SESSION_ID}`);
    await page.waitForLoadState('networkidle');

    const ramClearCheckbox = page.getByRole('checkbox');
    await expect(ramClearCheckbox).toBeVisible({ timeout: 10_000 });
    await expect(ramClearCheckbox).not.toBeChecked();

    await ramClearCheckbox.click();
    await expect(ramClearCheckbox).toBeChecked();
  });

  test('8. Skip Machine button is visible', async ({ page }) => {
    await mockCollectionSessionAPIs(page);
    await page.goto(`/collection-report/report/session/${SESSION_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /skip machine/i })).toBeVisible({ timeout: 10_000 });
  });

  test('9. Close button is visible', async ({ page }) => {
    await mockCollectionSessionAPIs(page);
    await page.goto(`/collection-report/report/session/${SESSION_ID}`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('button', { name: /close/i })).toBeVisible({ timeout: 10_000 });
  });

  test('10. Delete session button is visible and shows modal confirm', async ({ page }) => {
    await mockCollectionSessionAPIs(page);
    await page.goto(`/collection-report/report/session/${SESSION_ID}`);
    await page.waitForLoadState('networkidle');

    const deleteBtn = page.getByText('Delete session');
    await expect(deleteBtn).toBeVisible({ timeout: 10_000 });

    await deleteBtn.click();
    await expect(page.getByText('Delete Session', { exact: true })).toBeVisible();
    await expect(page.getByText('Are you sure? This will permanently remove all captured data')).toBeVisible();
  });

  test('11. Submitted view loads with heading and content', async ({ page }) => {
    await mockCollectionSessionAPIs(page, MOCK_SESSION_DETAIL_SUBMITTED);
    await page.goto(`/collection-report/report/session/${SESSION_ID}`);
    await page.waitForLoadState('networkidle');

    // The submitted view may show a "submitted" status badge or the location name
    await expect(
      page.getByText(/submitted|Grand Casino North|Session Complete/i).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test('12. Submitted view shows Edit Session button for authorized users', async ({ page }) => {
    await mockCollectionSessionAPIs(page, MOCK_SESSION_DETAIL_SUBMITTED);
    await page.goto(`/collection-report/report/session/${SESSION_ID}`);
    await page.waitForLoadState('networkidle');

    // The edit button may say "Edit Session", "Edit", or may not be present if
    // the session is in a different state. Check for any edit-related action.
    await expect(
      page.getByRole('button', { name: /edit|modify|reopen/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });
});
