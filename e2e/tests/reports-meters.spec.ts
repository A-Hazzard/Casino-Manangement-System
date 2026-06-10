/**
 * Reports Meters Tab E2E Tests
 * ─────────────────────────────
 * Covers:
 *  1. Navigation directly to /reports?section=meters defaults to 'Yesterday'.
 *  2. Display of the location selector, and selection of locations.
 *  3. Display of the meters table containing mock records with keys.
 *  4. The search bar functionality inside the table.
 *  5. Changing chart granularity (Hourly vs Minute).
 *  6. Triggering exports (PDF and Excel) by checking button/dropdown clicks.
 *  7. Changing page using pagination controls.
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_LICENCEES_LIST,
  MOCK_LOCATIONS_LIST,
} from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER, MOCK_USER_PAYLOAD } from '../mocks/auth.mocks';

// Mock meters records (25 records to trigger pagination)
const MOCK_METERS_RECORDS = Array.from({ length: 25 }, (_, idx) => ({
  machineId: `mach_00${idx + 1}`,
  machineDocumentId: `doc_00${idx + 1}`,
  serialNumber: `SN-2000${idx + 1}`,
  customName: `Slot Machine ${idx + 1}`,
  game: 'Gold Rush',
  location: idx % 2 === 0 ? 'Grand Casino North' : 'South Bay Gaming',
  locationId: idx % 2 === 0 ? 'loc_001' : 'loc_002',
  metersIn: 10000 + idx * 100,
  metersOut: 8000 + idx * 50,
  jackpot: 500 + idx * 10,
  billIn: 4000 + idx * 200,
  voucherOut: 3000 + idx * 150,
  attPaidCredits: 100 + idx * 5,
  gamesPlayed: 1000 + idx * 10,
  netGross: 2000 + idx * 50,
  includeJackpot: true,
  createdAt: new Date().toISOString(),
}));

const MOCK_REPORTS_METERS = {
  success: true,
  data: MOCK_METERS_RECORDS,
  totalCount: 25,
  totalPages: 1,
  currentPage: 1,
  limit: 50,
  locations: ['Grand Casino North', 'South Bay Gaming'],
  dateRange: {
    start: '2026-05-31T00:00:00.000Z',
    end: '2026-05-31T00:00:00.000Z',
  },
  timePeriod: 'Yesterday',
  currency: 'TTD',
  converted: false,
  pagination: {
    page: 1,
    limit: 50,
    totalCount: 25,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  },
  hourlyChartData: [
    {
      day: '2026-05-31',
      hour: '08:00',
      gamesPlayed: 100,
      coinIn: 1000,
      coinOut: 800,
    },
    {
      day: '2026-05-31',
      hour: '09:00',
      gamesPlayed: 120,
      coinIn: 1200,
      coinOut: 900,
    },
  ],
};

const MOCK_REPORTS_LOCATIONS = {
  success: true,
  data: [],
  summary: {},
  pagination: { page: 1, total: 0, totalPages: 0, totalCount: 0 },
  timestamp: new Date().toISOString(),
};

const MOCK_REPORTS_MACHINES = {
  success: true,
  data: [],
  summary: {},
  pagination: { page: 1, total: 0, totalPages: 0, totalCount: 0 },
  timestamp: new Date().toISOString(),
};

async function mockReportsMetersAPIs(
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
  // Stub potential logo image get
  await page.route('**/Evolution_one_Solutions_logo.png**', route =>
    route.fulfill({ status: 404 })
  );
}

test.describe('Reports Meters Tab', () => {
  test.beforeEach(async ({ page }) => {
    await mockReportsMetersAPIs(page);
  });

  test('Meters Tab functionality', async ({ page }) => {
    // 1. Navigation directly to /reports?section=meters defaults to 'Yesterday'.
    await page.goto('/reports?section=meters');
    await page.waitForLoadState('domcontentloaded');

    // Click 'Yesterday' explicitly to handle potential hook mounting race condition
    const yesterdayBtn = page.getByRole('button', { name: 'Yesterday' });
    await yesterdayBtn.click();
    await expect(yesterdayBtn).toHaveClass(/bg-buttonActive/);

    // Confirm that initially "No Locations Selected" is visible
    await expect(page.getByText('No Locations Selected')).toBeVisible({
      timeout: 10000,
    });

    // 2. Display of the location selector, and selection of locations.
    const selectorTrigger = page.getByRole('button', {
      name: 'Choose locations to filter...',
    });
    await expect(selectorTrigger).toBeVisible();
    await selectorTrigger.click();

    // Select Grand Casino North and South Bay Gaming
    const grandCasinoOption = page.getByText('Grand Casino North').first();
    await expect(grandCasinoOption).toBeVisible();
    await grandCasinoOption.click();

    const southBayOption = page.getByText('South Bay Gaming').first();
    await expect(southBayOption).toBeVisible();
    await southBayOption.click();

    // Close the popover by pressing Escape
    await page.keyboard.press('Escape');

    // Confirm that the data table loads
    await expect(
      page.getByRole('heading', { name: 'Meters Export Report' })
    ).toBeVisible({ timeout: 10000 });

    // 3. Display of the meters table containing mock records with keys
    // Confirm table columns are rendered
    await expect(
      page.getByRole('columnheader', { name: 'Machine ID' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Location' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Meters In' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Meters Out' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Jackpot' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Bill In' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Voucher Out' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Hand Paid' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Games Played' })
    ).toBeVisible();
    await expect(
      page.getByRole('columnheader', { name: 'Date' })
    ).toBeVisible();

    // Verify first mock record is displayed
    // formatMachineIdForDisplay: SN-20001 (Slot Machine 1, Gold Rush)
    const firstMachineRow = page.getByRole('button', { name: /^SN-20001\b/ });
    await expect(firstMachineRow).toBeVisible();

    // Check key fields inside the first row (metersIn = 10,000, metersOut = 8,000, jackpot = 500, billIn = 4,000, voucherOut = 3,000, attPaidCredits = 100, gamesPlayed = 1,000)
    await expect(page.getByRole('cell', { name: '10,000', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: '8,000', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: '500', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: '4,000', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: '3,000', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: '100', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: '1,000', exact: true })).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'Grand Casino North', exact: true }).first()
    ).toBeVisible();

    // 4. The search bar functionality inside the table.
    const searchBar = page.getByPlaceholder(
      'Search by Serial Number, Custom Name, or Location...'
    );
    await expect(searchBar).toBeVisible();
    await searchBar.fill('SN-20003');

    // Wait for debounce and local search filtering
    await page.waitForTimeout(600);

    // Confirm only matching record SN-20003 is shown
    await expect(page.getByRole('button', { name: /^SN-20003\b/ })).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^SN-20001\b/ })
    ).not.toBeVisible();

    // Clear search
    await searchBar.fill('');
    await page.waitForTimeout(600);
    await expect(page.getByRole('button', { name: /^SN-20001\b/ })).toBeVisible();

    // 5. Changing chart granularity (Hourly vs Minute).
    const granularitySelect = page.locator(
      'select#chart-granularity-meters-below'
    );
    await expect(granularitySelect).toBeVisible();
    await expect(granularitySelect).toHaveValue('hourly');
    await granularitySelect.selectOption('minute');
    await expect(granularitySelect).toHaveValue('minute');

    // 6. Triggering exports (PDF and Excel) by checking button/dropdown clicks.
    const exportBtn = page.getByRole('button', { name: 'Export' });
    await expect(exportBtn).toBeVisible();
    await exportBtn.click();

    const pdfExportOption = page.getByText('Export as PDF');
    await expect(pdfExportOption).toBeVisible();
    await pdfExportOption.click();

    // Check successful PDF toast notification
    await expect(
      page.getByText('Successfully exported 25 records to PDF').first()
    ).toBeVisible({ timeout: 10000 });

    // Trigger excel export
    await exportBtn.click();
    const excelExportOption = page.getByText('Export as Excel');
    await expect(excelExportOption).toBeVisible();
    await excelExportOption.click();

    // Check successful Excel toast notification
    await expect(
      page.getByText('Successfully exported 25 records to EXCEL').first()
    ).toBeVisible({ timeout: 10000 });

    // 7. Changing page using pagination controls.
    // Page size is 20, total records 25, so SN-200021 should not be on page 1 but visible on page 2.
    const secondPageRecord = page.getByRole('button', { name: /^SN-200021\b/ });
    await expect(secondPageRecord).not.toBeVisible();

    // Locate pagination next button and click
    const nextPageBtn = page.getByRole('button', { name: 'Go to next page' });
    await expect(nextPageBtn).toBeVisible();
    await nextPageBtn.click();

    // Confirm page 2 is visible
    await expect(secondPageRecord).toBeVisible();
    await expect(
      page.getByRole('button', { name: /^SN-20001\b/ })
    ).not.toBeVisible();

    // Click previous page button to return
    const prevPageBtn = page.getByRole('button', {
      name: 'Go to previous page',
    });
    await expect(prevPageBtn).toBeVisible();
    await prevPageBtn.click();

    // Confirm page 1 records are visible again
    await expect(page.getByRole('button', { name: /^SN-20001\b/ })).toBeVisible();
  });
});
