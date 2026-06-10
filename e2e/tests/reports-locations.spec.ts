/**
 * Reports Locations Tab E2E Tests
 * ────────────────────────────────
 * Tests the /reports?section=locations page including:
 * 1. Metrics Overview cards verification
 * 2. Locations table rendering
 * 3. Search input functionality
 * 4. Table header sorting functionality
 * 5. Pagination controls
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_LICENCEES_LIST,
  MOCK_LOCATIONS_LIST,
} from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER, MOCK_USER_PAYLOAD } from '../mocks/auth.mocks';

// Helper to generate a list of mock locations to support pagination, search, sorting
const generateMockLocations = (count: number) => {
  return Array.from({ length: count }, (_, idx) => {
    const idNum = idx + 1;
    return {
      _id: `loc_${String(idNum).padStart(3, '0')}`,
      location: `loc_${String(idNum).padStart(3, '0')}`,
      locationName: idNum === 1 ? 'Grand Casino North' : `Mock Location ${idNum}`,
      moneyIn: 10000 + idNum * 1000, // 11000, 12000, ...
      moneyOut: 1000 + idNum * 100,  // 1100, 1200, ...
      gross: 9000 + idNum * 900,     // 9900, 10800, ...
      jackpot: idNum * 50,
      totalMachines: 10 + idNum,     // 11, 12, ...
      onlineMachines: 5 + idNum,     // 6, 7, ...
      includeJackpot: false,
      sasMachines: idNum % 2 === 0 ? 5 : 0,
      nonSasMachines: 5,
    };
  });
};

const ALL_MOCK_LOCATIONS = generateMockLocations(25);

async function mockReportsLocationsAPIs(page: Page) {
  // Current user and auth token
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

  // Locations / licencees configuration
  await page.route('**/api/locations**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, locations: MOCK_LOCATIONS_LIST.locations },
    })
  );
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );

  // Dashboard location aggregation totals
  await page.route('**/api/locationAggregation**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        data: [
          {
            location: 'loc_001',
            locationName: 'Grand Casino North',
            moneyIn: 500000,
            moneyOut: 50000,
            gross: 450000,
            jackpot: 5000,
            onlineMachines: 25,
            totalMachines: 28,
          },
        ],
        totalCount: 1,
      },
    })
  );

  // Mock aggregated locations report API
  await page.route('**/api/reports/locations**', async route => {
    const url = route.request().url();
    if (url.includes('summary=true')) {
      // Returns all locations for map / dropdown dropdowns
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: ALL_MOCK_LOCATIONS,
          pagination: {
            page: 1,
            limit: 1000,
            totalCount: ALL_MOCK_LOCATIONS.length,
            totalPages: Math.ceil(ALL_MOCK_LOCATIONS.length / 20),
          },
        }),
      });
    } else {
      // Paginated list requests
      const urlObj = new URL(url);
      const pageParam = parseInt(urlObj.searchParams.get('page') || '1', 10);
      const limitParam = parseInt(urlObj.searchParams.get('limit') || '20', 10);
      const skip = (pageParam - 1) * limitParam;
      const paginatedItems = ALL_MOCK_LOCATIONS.slice(skip, skip + limitParam);

      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: paginatedItems,
          pagination: {
            page: pageParam,
            limit: limitParam,
            totalCount: ALL_MOCK_LOCATIONS.length,
            // Calculate totalPages based on itemsPerPage (20) rather than limitParam (100)
            // to support client-side pagination correctly in the hook
            totalPages: Math.ceil(ALL_MOCK_LOCATIONS.length / 20),
          },
        }),
      });
    }
  });

  // Empty response for other unused report tabs to prevent failing requests
  await page.route('**/api/reports/machines**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        data: [],
        summary: {},
        pagination: { page: 1, total: 0, totalPages: 0, totalCount: 0 },
      },
    })
  );
  await page.route('**/api/reports/meters**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        data: [],
        summary: {},
        pagination: { page: 1, total: 0, totalPages: 0, totalCount: 0 },
      },
    })
  );
  await page.route('**/api/analytics/**', route =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );
}

test.describe('Reports - Locations Tab E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Increase timeouts to support slow VM compile times
    test.setTimeout(90_000);
    page.setDefaultNavigationTimeout(45_000);
    await mockReportsLocationsAPIs(page);
  });

  test('1. Navigation directly to /reports?section=locations and verifying Metrics Overview Cards', async ({ page }) => {
    await test.step('Navigate to Locations section', async () => {
      await page.goto('/reports?section=locations');
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Verify heading and general layout is loaded', async () => {
      await expect(
        page.getByRole('heading', { name: /Metrics Overview/i }).first()
      ).toBeVisible({ timeout: 25_000 });
    });

    await test.step('Verify the 4 Metrics Cards show correct values', async () => {
      // Total Gross Revenue card
      const grossCard = page.locator('div.grid > div:has-text("Total Gross Revenue")');
      await expect(grossCard).toBeVisible();
      await expect(grossCard.getByText(/(TTD|USD) 450,000/)).toBeVisible();

      // Money In card
      const moneyInCard = page.locator('div.grid > div:has-text("Money In")');
      await expect(moneyInCard).toBeVisible();
      await expect(moneyInCard.getByText(/(TTD|USD) 500,000/)).toBeVisible();

      // Money Out card
      const moneyOutCard = page.locator('div.grid > div:has-text("Money Out")');
      await expect(moneyOutCard).toBeVisible();
      await expect(moneyOutCard.getByText(/(TTD|USD) 50,000/)).toBeVisible();

      // Online Machines card
      const onlineMachinesCard = page.locator('div.grid > div:has-text("Online Machines")');
      await expect(onlineMachinesCard).toBeVisible();
      await expect(onlineMachinesCard.getByText('25/28')).toBeVisible();
    });
  });

  test('2. Table columns rendering and list rows verification', async ({ page }) => {
    await test.step('Navigate to Locations section', async () => {
      await page.goto('/reports?section=locations');
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Verify locations list table is visible', async () => {
      await expect(page.getByRole('table')).toBeVisible({ timeout: 25_000 });
    });

    await test.step('Verify table columns are present', async () => {
      const headers = [
        /Location Name/i,
        /Machines/i,
        /Drop \(Money In\)/i,
        /Money Out/i,
        /Gross Revenue/i,
        /Hold %/i,
        /Floor Position %/i,
        /Handle/i,
        /Win/i,
        /Jackpot/i,
        /Games Played/i,
        /Avg. Wager per Game/i,
      ];
      for (const header of headers) {
        await expect(
          page.getByRole('columnheader', { name: header }).first()
        ).toBeVisible();
      }
    });

    await test.step('Verify the mock rows are rendered accurately', async () => {
      // Row 1: Grand Casino North
      const firstRow = page.getByRole('row').filter({ hasText: 'Grand Casino North' });
      await expect(firstRow).toBeVisible();
      await expect(firstRow.getByText('11', { exact: true })).toBeVisible(); // totalMachines = 10 + 1 = 11
      await expect(firstRow.getByText(/\$11,000\.00/)).toBeVisible(); // moneyIn = 10000 + 1000 = 11000
      await expect(firstRow.getByText(/\$1,100\.00/)).toBeVisible(); // moneyOut = 1000 + 100 = 1100
      await expect(firstRow.getByText(/\$9,900\.00/)).toBeVisible(); // gross = 9000 + 900 = 9900
    });
  });

  test('3. Search input filters the locations list', async ({ page }) => {
    await test.step('Navigate to Locations section', async () => {
      await page.goto('/reports?section=locations');
      await page.waitForLoadState('domcontentloaded');
    });

    await expect(page.getByRole('table')).toBeVisible({ timeout: 25_000 });

    // Target the search input specifically inside the table card
    const searchInput = page.locator('div.rounded-lg.bg-white.shadow').getByPlaceholder(/Search locations\.\.\./i);
    await expect(searchInput).toBeVisible();

    await test.step('Search for a specific location name', async () => {
      await searchInput.fill('Mock Location 15');
      await page.waitForTimeout(200); // Allow react state to filter
    });

    await test.step('Verify table is filtered correctly', async () => {
      // "Mock Location 15" should be visible
      await expect(page.getByRole('row', { name: 'Mock Location 15' })).toBeVisible();
      // "Grand Casino North" should not be visible
      await expect(page.getByRole('row', { name: 'Grand Casino North' })).not.toBeVisible();
    });

    await test.step('Clear the search input', async () => {
      await searchInput.fill('');
      await page.waitForTimeout(200);
      // Both should be visible again
      await expect(page.getByRole('row', { name: 'Grand Casino North' })).toBeVisible();
      await expect(page.getByRole('row', { name: 'Mock Location 15' })).toBeVisible();
    });
  });

  test('4. Table sorting by header click', async ({ page }) => {
    await test.step('Navigate to Locations section', async () => {
      await page.goto('/reports?section=locations');
      await page.waitForLoadState('domcontentloaded');
    });

    await expect(page.getByRole('table')).toBeVisible({ timeout: 25_000 });

    // Default sort is moneyIn desc. Let's sort by Location Name.
    const nameHeader = page.getByRole('columnheader', { name: /Location Name/i }).first();
    await expect(nameHeader).toBeVisible({ timeout: 25_000 });

    await test.step('Click Location Name header once to sort descending', async () => {
      // First click on a new sort column sets it to descending
      await nameHeader.click({ timeout: 25_000 });
      const firstRowCell = page.locator('tbody > tr').first().locator('td').first();
      await expect(firstRowCell).toContainText('Mock Location 9', { timeout: 15_000 });
    });

    await test.step('Click Location Name header again to sort ascending', async () => {
      // Second click toggles it to ascending
      await nameHeader.click({ timeout: 25_000 });
      const firstRowCell = page.locator('tbody > tr').first().locator('td').first();
      await expect(firstRowCell).toContainText('Grand Casino North', { timeout: 15_000 });
    });
  });

  test('5. Pagination controls change pages', async ({ page }) => {
    await test.step('Navigate to Locations section', async () => {
      await page.goto('/reports?section=locations');
      await page.waitForLoadState('domcontentloaded');
    });

    await expect(page.getByRole('table')).toBeVisible({ timeout: 25_000 });

    // Page size is 20, totalCount is 25, so we should have 2 pages.
    const pageInput = page.getByLabel('Page number');
    await expect(pageInput).toBeVisible({ timeout: 15_000 });
    await expect(pageInput).toHaveValue('1');

    const nextButton = page.getByRole('button', { name: /Go to next page/i });
    await expect(nextButton).toBeVisible();
    await expect(nextButton).not.toBeDisabled();

    await test.step('Click next page button', async () => {
      await nextButton.click({ timeout: 25_000 });
    });

    await test.step('Verify page 2 is loaded', async () => {
      await expect(pageInput).toHaveValue('2', { timeout: 20_000 });
      // Verify some location on page 2 (indices 20-24, i.e., Mock Location 21 to 25) is displayed
      await expect(page.getByRole('row', { name: 'Mock Location 21' })).toBeVisible();
      // "Grand Casino North" (page 1) should not be visible
      await expect(page.getByRole('row', { name: 'Grand Casino North' })).not.toBeVisible();
    });

    await test.step('Click previous page button', async () => {
      const prevButton = page.getByRole('button', { name: /Go to previous page/i });
      await expect(prevButton).toBeVisible();
      await prevButton.click({ timeout: 25_000 });
    });

    await test.step('Verify returned to page 1', async () => {
      await expect(pageInput).toHaveValue('1', { timeout: 20_000 });
      await expect(page.getByRole('row', { name: 'Grand Casino North' })).toBeVisible();
      await expect(page.getByRole('row', { name: 'Mock Location 21' })).not.toBeVisible();
    });
  });
});
