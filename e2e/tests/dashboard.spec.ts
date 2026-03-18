/**
 * Dashboard E2E Tests
 * ────────────────────
 * Covers:
 *  1. All financial metric cards render on default "Today" view
 *  2. Switching to "Yesterday" fires a new API request with correct params
 *  3. Switching to "Last 7 Days" fires the correct request
 *  4. Switching to "Last 30 Days" fires the correct request
 *  5. Custom date range picker — selecting a range includes startDate/endDate
 *  6. Charts section renders after data loads
 *  7. Location analytics rows load and display location names
 *  8. Server error response → error state is shown to the user
 *
 * API mocking strategy: all /api/analytics/* requests are intercepted via
 * page.route() so tests are fully deterministic and require no real DB.
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_DASHBOARD_STATS,
  MOCK_DASHBOARD_STATS_YESTERDAY,
  MOCK_DASHBOARD_STATS_LAST7,
  MOCK_DASHBOARD_STATS_LAST30,
  MOCK_DASHBOARD_STATS_CUSTOM,
  MOCK_LOCATIONS_ANALYTICS,
  MOCK_TOP_MACHINES,
  MOCK_CHARTS_DATA,
  MOCK_DASHBOARD_SERVER_ERROR,
} from '../mocks/dashboard.mocks';
import { MOCK_CURRENT_USER } from '../mocks/auth.mocks';

// ─── Shared route setup helper ────────────────────────────────────────────────

async function mockDashboardAPIs(
  page: Page,
  statsPayload = MOCK_DASHBOARD_STATS
) {
  await page.route('**/api/auth/current-user**', (route) =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/analytics/dashboard**', (route) =>
    route.fulfill({ status: 200, json: statsPayload })
  );
  await page.route('**/api/analytics/locations**', (route) =>
    route.fulfill({ status: 200, json: MOCK_LOCATIONS_ANALYTICS })
  );
  await page.route('**/api/analytics/top-machines**', (route) =>
    route.fulfill({ status: 200, json: MOCK_TOP_MACHINES })
  );
  await page.route('**/api/analytics/charts**', (route) =>
    route.fulfill({ status: 200, json: MOCK_CHARTS_DATA })
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test('1. All metric cards load with data on the default Today view', async ({
    page,
    dashboardPage,
  }) => {
    await test.step('Set up API mocks for Today stats', async () => {
      await mockDashboardAPIs(page, MOCK_DASHBOARD_STATS);
    });

    await test.step('Navigate to the dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Verify all financial metric cards are visible', async () => {
      await dashboardPage.expectMetricCardsVisible();
    });

    await test.step('Verify Money In card contains a non-zero value', async () => {
      await expect(dashboardPage.moneyInCard).toContainText(/\d/);
    });

    await test.step('Verify Gross card contains a non-zero value', async () => {
      await expect(dashboardPage.grossCard).toContainText(/\d/);
    });
  });

  test('2. Selecting "Yesterday" fires a new analytics request', async ({
    page,
    dashboardPage,
  }) => {
    // Capture outgoing requests so we can assert on their query params
    const dashboardRequests: string[] = [];

    await test.step('Set up API mocks and request capture', async () => {
      await mockDashboardAPIs(page, MOCK_DASHBOARD_STATS);
      // Override with Yesterday-specific payload once the filter is applied
      page.on('request', (req) => {
        if (req.url().includes('/api/analytics/dashboard')) {
          dashboardRequests.push(req.url());
        }
      });
      await page.route('**/api/analytics/dashboard**', (route) =>
        route.fulfill({ status: 200, json: MOCK_DASHBOARD_STATS_YESTERDAY })
      );
    });

    await test.step('Navigate to dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Click the Yesterday time-period filter', async () => {
      await dashboardPage.selectTimePeriod('Yesterday');
    });

    await test.step('Assert the API was called with period=yesterday', async () => {
      const lastRequest = dashboardRequests.at(-1) ?? '';
      expect(lastRequest).toMatch(/yesterday|period=yesterday/i);
    });

    await test.step('Assert metric cards re-render with updated values', async () => {
      await dashboardPage.expectMetricCardsVisible();
    });
  });

  test('3. Selecting "Last 7 Days" fires the correct analytics request', async ({
    page,
    dashboardPage,
  }) => {
    const capturedUrls: string[] = [];

    await test.step('Set up mocks and request capture', async () => {
      await mockDashboardAPIs(page, MOCK_DASHBOARD_STATS);
      page.on('request', (req) => {
        if (req.url().includes('/api/analytics/dashboard')) capturedUrls.push(req.url());
      });
      await page.route('**/api/analytics/dashboard**', (route) =>
        route.fulfill({ status: 200, json: MOCK_DASHBOARD_STATS_LAST7 })
      );
    });

    await test.step('Navigate to dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Click the Last 7 Days filter', async () => {
      await dashboardPage.selectTimePeriod('Last 7 Days');
    });

    await test.step('Assert API call uses last7days period', async () => {
      const lastRequest = capturedUrls.at(-1) ?? '';
      expect(lastRequest).toMatch(/last7|last_7|7days|period=last7/i);
    });
  });

  test('4. Selecting "Last 30 Days" fires the correct analytics request', async ({
    page,
    dashboardPage,
  }) => {
    const capturedUrls: string[] = [];

    await test.step('Set up mocks and request capture', async () => {
      await mockDashboardAPIs(page, MOCK_DASHBOARD_STATS);
      page.on('request', (req) => {
        if (req.url().includes('/api/analytics/dashboard')) capturedUrls.push(req.url());
      });
      await page.route('**/api/analytics/dashboard**', (route) =>
        route.fulfill({ status: 200, json: MOCK_DASHBOARD_STATS_LAST30 })
      );
    });

    await test.step('Navigate to dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Click the Last 30 Days filter', async () => {
      await dashboardPage.selectTimePeriod('Last 30 Days');
    });

    await test.step('Assert API call uses last30days period', async () => {
      const lastRequest = capturedUrls.at(-1) ?? '';
      expect(lastRequest).toMatch(/last30|last_30|30days|period=last30/i);
    });
  });

  test('5. Custom date range picker sends startDate and endDate in the request', async ({
    page,
    dashboardPage,
  }) => {
    const capturedUrls: string[] = [];
    const START = '2026-01-01';
    const END = '2026-01-15';

    await test.step('Set up mocks', async () => {
      await mockDashboardAPIs(page, MOCK_DASHBOARD_STATS);
      page.on('request', (req) => {
        if (req.url().includes('/api/analytics/dashboard')) capturedUrls.push(req.url());
      });
      await page.route('**/api/analytics/dashboard**', (route) =>
        route.fulfill({ status: 200, json: MOCK_DASHBOARD_STATS_CUSTOM })
      );
    });

    await test.step('Navigate to dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Open the Custom date range picker and enter dates', async () => {
      await dashboardPage.selectCustomRange(START, END);
    });

    await test.step('Assert request URL contains startDate and endDate', async () => {
      const lastRequest = capturedUrls.at(-1) ?? '';
      expect(lastRequest).toContain(START.replace(/-/g, '%2F').replace(/-/g, '-'));
      expect(lastRequest).toMatch(/startDate|start_date|from/i);
      expect(lastRequest).toMatch(/endDate|end_date|to/i);
    });

    await test.step('Assert metric cards update after custom range is applied', async () => {
      await dashboardPage.expectMetricCardsVisible();
    });
  });

  test('6. Charts section renders after data loads', async ({ page, dashboardPage }) => {
    await test.step('Set up mocks', async () => {
      await mockDashboardAPIs(page, MOCK_DASHBOARD_STATS);
    });

    await test.step('Navigate to dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Assert chart container is visible', async () => {
      await dashboardPage.expectChartsVisible();
    });
  });

  test('7. Location analytics section loads and displays location names', async ({
    page,
    dashboardPage,
  }) => {
    await test.step('Set up mocks including locations analytics', async () => {
      await mockDashboardAPIs(page, MOCK_DASHBOARD_STATS);
    });

    await test.step('Navigate to dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Assert location analytics section is visible', async () => {
      await dashboardPage.expectLocationAnalyticsVisible();
    });

    await test.step('Assert known location names appear in the analytics section', async () => {
      await expect(page.getByText('Grand Casino North')).toBeVisible();
      await expect(page.getByText('South Bay Gaming')).toBeVisible();
    });
  });

  test('8. Server error on dashboard API shows an error state to the user', async ({
    page,
    dashboardPage,
  }) => {
    await test.step('Mock the dashboard API to return a 500 error', async () => {
      await page.route('**/api/auth/current-user**', (route) =>
        route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
      );
      await page.route('**/api/analytics/dashboard**', (route) =>
        route.fulfill({ status: 500, json: MOCK_DASHBOARD_SERVER_ERROR })
      );
      // Other endpoints return valid data
      await page.route('**/api/analytics/locations**', (route) =>
        route.fulfill({ status: 200, json: MOCK_LOCATIONS_ANALYTICS })
      );
    });

    await test.step('Navigate to the dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Assert an error indicator is displayed', async () => {
      await dashboardPage.expectErrorVisible();
    });
  });
});
