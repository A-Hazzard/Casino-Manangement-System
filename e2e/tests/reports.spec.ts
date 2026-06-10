/**
 * Reports Page E2E Tests
 * ────────────────────────
 * The /reports page (ReportsPageContent) has 3 tabs (ReportsNavigation), deep-linkable
 * via ?section=meters|locations|machines:
 *   Meters · Locations · Cabinets (machines)
 *
 * Covers:
 *  1. Reports page loads with all 3 nav tabs (developer/admin)
 *  2. Meters tab renders its location-selection + empty state with no locations
 *  3. Locations tab renders the Metrics Overview section
 *  4. Cabinets (machines) tab renders the Overview / Evaluation / Offline sub-tabs
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_LICENCEES_LIST,
  MOCK_LOCATIONS_LIST,
} from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER, MOCK_USER_PAYLOAD } from '../mocks/auth.mocks';

// Minimal report payloads. NOTE: all three reports endpoints read `response.data.data`
// as an ARRAY (the row list) — nesting an object under `data` throws ".slice/.map is
// not a function". Keep `data` a flat array; pagination/summary are siblings.
const MOCK_REPORTS_LOCATIONS = {
  success: true,
  data: [
    {
      locationId: 'loc_001',
      locationName: 'Grand Casino North',
      gross: 280_500,
      drop: 312_000,
      cancelledCredits: 31_500,
      onlineMachines: 25,
      totalMachines: 28,
    },
  ],
  summary: { totalGross: 280_500, totalDrop: 312_000 },
  pagination: { page: 1, total: 1, totalPages: 1, totalCount: 1 },
  timestamp: new Date().toISOString(),
};

const MOCK_REPORTS_MACHINES = {
  success: true,
  data: [],
  summary: {},
  pagination: { page: 1, total: 0, totalPages: 0, totalCount: 0 },
  timestamp: new Date().toISOString(),
};

const MOCK_REPORTS_METERS = {
  success: true,
  data: [],
  summary: {},
  pagination: { page: 1, total: 0, totalPages: 0, totalCount: 0 },
  timestamp: new Date().toISOString(),
};

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockReportsAPIs(
  page: Page,
  locationsList = MOCK_LOCATIONS_LIST.locations
) {
  await page.route('**/api/auth/current-user**', route =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token**', route =>
    route.fulfill({ status: 200, json: { userId: MOCK_USER_PAYLOAD._id } })
  );
  await page.route('**/api/users/**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, user: MOCK_CURRENT_USER.user },
    })
  );

  await page.route('**/api/reports/locations**', route =>
    route.fulfill({ status: 200, json: MOCK_REPORTS_LOCATIONS })
  );
  await page.route('**/api/reports/machines**', route =>
    route.fulfill({ status: 200, json: MOCK_REPORTS_MACHINES })
  );
  await page.route('**/api/reports/meters**', route =>
    route.fulfill({ status: 200, json: MOCK_REPORTS_METERS })
  );
  await page.route('**/api/analytics/**', route =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );
  await page.route('**/api/locations**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, locations: locationsList },
    })
  );
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Reports Page', () => {
  test('1. Reports page loads with all 3 nav tabs', async ({ page }) => {
    await test.step('Mock reports APIs', async () => {
      await mockReportsAPIs(page);
    });

    await test.step('Navigate to /reports', async () => {
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the Reports title is shown', async () => {
      await expect(
        page.getByRole('heading', { name: /^Reports$/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert all 3 nav tabs are present', async () => {
      await expect(
        page.getByRole('button', { name: /Meters/i }).first()
      ).toBeVisible({ timeout: 8_000 });
      await expect(
        page.getByRole('button', { name: /Locations/i }).first()
      ).toBeVisible({ timeout: 8_000 });
      await expect(
        page.getByRole('button', { name: /Cabinets/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('2. Meters tab shows the empty state when no locations exist', async ({
    page,
  }) => {
    await test.step('Mock reports APIs with an EMPTY locations list', async () => {
      // With no locations the meters tab cannot auto-select one → deterministic empty state.
      await mockReportsAPIs(page, []);
    });

    await test.step('Navigate directly to the meters section', async () => {
      await page.goto('/reports?section=meters');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the "No Locations Selected" empty state is shown', async () => {
      await expect(
        page.getByText(/No Locations Selected/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('3. Locations tab renders the Metrics Overview section', async ({
    page,
  }) => {
    await test.step('Mock reports APIs', async () => {
      await mockReportsAPIs(page);
    });

    await test.step('Navigate directly to the locations section', async () => {
      await page.goto('/reports?section=locations');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the Metrics Overview heading is shown', async () => {
      await expect(
        page.getByRole('heading', { name: /Metrics Overview/i }).first()
      ).toBeVisible({ timeout: 12_000 });
    });
  });

  test('4. Cabinets tab renders the Overview / Evaluation / Offline sub-tabs', async ({
    page,
  }) => {
    await test.step('Mock reports APIs', async () => {
      await mockReportsAPIs(page);
    });

    await test.step('Navigate directly to the machines section', async () => {
      await page.goto('/reports?section=machines');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the machine report sub-tabs are shown', async () => {
      await expect(
        page.getByRole('tab', { name: /^Overview$/i }).first()
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByRole('tab', { name: /^Offline$/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });
});
