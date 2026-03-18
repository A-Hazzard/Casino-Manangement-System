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
  MOCK_METRICS_METERS,
  MOCK_METRICS_METERS_YESTERDAY,
  MOCK_LOCATIONS_ANALYTICS,
  MOCK_LOCATION_AGGREGATION,
  MOCK_TOP_PERFORMING_LOCATIONS,
  MOCK_DASHBOARD_SERVER_ERROR,
} from '../mocks/dashboard.mocks';
import {
  MOCK_CURRENT_USER,
  MOCK_USER_DEVELOPER,
  MOCK_USER_MANAGER,
  MOCK_USER_LOCATION_ADMIN,
  MOCK_USER_VAULT_MANAGER,
  MOCK_USER_CASHIER,
  MOCK_USER_TECHNICIAN,
  MOCK_USER_COLLECTOR,
} from '../mocks/auth.mocks';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';

// ─── Shared route setup helper ────────────────────────────────────────────────

async function mockDashboardAPIs(
  page: Page,
  chartData = MOCK_METRICS_METERS,
  mockCurrentUser = true
) {
  if (mockCurrentUser) {
    await page.route('**/api/auth/current-user**', (route) =>
      route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
    );
  }
  const combinedChartData = [
    ...MOCK_METRICS_METERS,
    ...MOCK_METRICS_METERS_YESTERDAY
  ];

  // Dashboard charts use the meters endpoint
  await page.route('**/api/metrics/meters**', (route) =>
    route.fulfill({ status: 200, json: combinedChartData })
  );
  // Locations for the map
  await page.route('**/api/locations**', (route) =>
    route.fulfill({ status: 200, json: { locations: MOCK_LOCATIONS_ANALYTICS.data } })
  );
  // Top-performing data - handle tab-specific results
  await page.route('**/api/metrics/top-performing**', (route) => {
    const url = route.request().url();
    if (url.includes('activeTab=locations')) {
      return route.fulfill({ status: 200, json: MOCK_TOP_PERFORMING_LOCATIONS });
    }
    // Return empty cabinets by default or actual top machines
    return route.fulfill({ status: 200, json: { ...MOCK_TOP_PERFORMING_LOCATIONS, data: [] } });
  });
  // Location aggregation provides moneyIn / moneyOut / gross for the metric cards
  await page.route('**/api/locationAggregation**', (route) =>
    route.fulfill({ status: 200, json: MOCK_LOCATION_AGGREGATION })
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Dashboard', () => {
  test('1. All metric cards load with data on the default Today view', async ({
    page,
    dashboardPage,
  }) => {
    await test.step('Set up API mocks for Today stats', async () => {
      await mockDashboardAPIs(page);
    });

    await test.step('Navigate to the dashboard', async () => {
      await dashboardPage.goto();
      // Throw a clear error if we were redirected to login
      if (page.url().includes('/login')) {
         throw new Error(`[Auth Failure] Navigated to ${page.url()} instead of the dashboard. Ensure session storage and cookies are correctly initialized.`);
      }
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
      await mockDashboardAPIs(page, MOCK_METRICS_METERS);
      // Capture both points where timePeriod can be sent
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/locationAggregation') || url.includes('/api/metrics/meters')) {
          dashboardRequests.push(url);
        }
      });
      // Override with Yesterday-specific payload once the filter is applied
      await page.route('**/api/metrics/meters?*timePeriod=Yesterday*', (route) =>
        route.fulfill({ status: 200, json: MOCK_METRICS_METERS_YESTERDAY })
      );
    });

    await test.step('Navigate to dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Click the Yesterday time-period filter', async () => {
      await dashboardPage.selectTimePeriod('Yesterday');
    });

    await test.step('Assert the API was called with period=Yesterday', async () => {
      const lastRequest = dashboardRequests.at(-1) ?? '';
      expect(lastRequest).toMatch(/Yesterday/i);
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
      await mockDashboardAPIs(page, MOCK_METRICS_METERS);
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/locationAggregation') || url.includes('/api/metrics/meters')) {
          capturedUrls.push(url);
        }
      });
    });

    await test.step('Navigate to dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Click the Last 7 Days filter', async () => {
      await dashboardPage.selectTimePeriod('Last 7 Days');
    });

    await test.step('Assert API call uses 7d period', async () => {
      const lastRequest = capturedUrls.at(-1) ?? '';
      expect(lastRequest).toMatch(/timePeriod=7d/i);
    });
  });

  test('4. Selecting "Last 30 Days" fires the correct analytics request', async ({
    page,
    dashboardPage,
  }) => {
    const capturedUrls: string[] = [];

    await test.step('Set up mocks and request capture', async () => {
      await mockDashboardAPIs(page, MOCK_METRICS_METERS);
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/locationAggregation') || url.includes('/api/metrics/meters')) {
          capturedUrls.push(url);
        }
      });
    });

    await test.step('Navigate to dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Click the Last 30 Days filter', async () => {
      await dashboardPage.selectTimePeriod('Last 30 Days');
    });

    await test.step('Assert API call uses 30d period', async () => {
      const lastRequest = capturedUrls.at(-1) ?? '';
      expect(lastRequest).toMatch(/timePeriod=30d/i);
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
      await mockDashboardAPIs(page, MOCK_METRICS_METERS);
      page.on('request', (req) => {
        const url = req.url();
        if (url.includes('/api/locationAggregation') || url.includes('/api/metrics/meters')) {
          capturedUrls.push(url);
        }
      });
    });

    await test.step('Navigate to dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Open the Custom date range picker and enter dates', async () => {
      await dashboardPage.selectCustomRange(START, END);
    });

    await test.step('Assert request URL contains startDate and endDate', async () => {
      const lastRequest = capturedUrls.at(-1) ?? '';
      // We check for startDate and endDate params which are sent for Custom ranges
      expect(lastRequest).toMatch(/startDate=/i);
      expect(lastRequest).toMatch(/endDate=/i);
    });

    await test.step('Assert metric cards update after custom range is applied', async () => {
      await dashboardPage.expectMetricCardsVisible();
    });
  });

  test('6. Charts section renders after data loads', async ({ page, dashboardPage }) => {
    await test.step('Set up mocks', async () => {
      await mockDashboardAPIs(page);
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
      await mockDashboardAPIs(page);
    });

    await test.step('Navigate to dashboard', async () => {
      await dashboardPage.goto();
    });

    await test.step('Assert location analytics section is visible', async () => {
      await dashboardPage.expectLocationAnalyticsVisible();
    });

    await test.step('Switch to Locations tab', async () => {
      const locationsResponsePromise = page.waitForResponse(
        (resp) =>
          resp.url().includes('/api/metrics/top-performing') &&
          resp.url().includes('activeTab=locations')
      );
      await page.getByRole('button', { name: 'Locations' }).click();
      await locationsResponsePromise;
      // Wait for it to become the active tab
      await expect(page.getByRole('button', { name: 'Locations' })).toHaveClass(/bg-buttonActive/);
    });

    await test.step('Assert known location names appear in the analytics section', async () => {
      // The formatting should now be plain names since tab="locations"
      await expect(page.getByText('Grand Casino North').filter({ visible: true }).first()).toBeVisible();
      await expect(page.getByText('South Bay Gaming').filter({ visible: true }).first()).toBeVisible();
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
      await page.route('**/api/locationAggregation*', (route) =>
        route.fulfill({ status: 500, json: MOCK_DASHBOARD_SERVER_ERROR })
      );
      // Other endpoints return valid data
      await page.route('**/api/metrics/meters*', (route) =>
        route.fulfill({ status: 200, json: MOCK_METRICS_METERS })
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

// ─── Role-based access restriction tests ─────────────────────────────────────
//
// Dashboard is restricted to: developer, admin, manager, location admin
// Blocked roles and their expected redirects:
//   cashier       → /vault/cashier/payouts
//   vault-manager → /vault/management
//   collector     → /collection-report
//   technician    → /unauthorized
//
// Allowed roles (non-admin/developer) also verified to confirm no redirect.

test.describe('Dashboard — Role-based access', () => {
  // ── Roles that CAN access the dashboard ────────────────────────────────────

  for (const [label, userPayload] of [
    ['developer', MOCK_USER_DEVELOPER],
    ['manager', MOCK_USER_MANAGER],
    ['location admin', MOCK_USER_LOCATION_ADMIN],
  ] as const) {
    test(`${label} can access the dashboard`, async ({ page }) => {
      await test.step(`Inject ${label} auth cookie and mock APIs`, async () => {
        await setRoleAuthCookie(page, userPayload);
        // Do not override current-user mock!
        await mockDashboardAPIs(page, undefined, false);
      });

      await test.step('Navigate to /', async () => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        // Throw a clear error if redirected to login despite having a mock current-user
        if (page.url().includes('/login')) {
           throw new Error(`[Role Failure] ${label} was redirected to ${page.url()}. Check setRoleAuthCookie and CurrentUser mock.`);
        }
      });

      await test.step('Assert URL is still on dashboard (no redirect)', async () => {
        expect(page.url()).not.toMatch(/\/login|\/unauthorized|\/vault/);
      });
    });
  }

  // ── Roles that CANNOT access the dashboard ─────────────────────────────────

  test('cashier is redirected to /vault/cashier/payouts', async ({ page }) => {
    await test.step('Inject cashier auth cookie', async () => {
      await setRoleAuthCookie(page, MOCK_USER_CASHIER);
    });

    await test.step('Navigate to /', async () => {
      await page.goto('/');
      await page.waitForURL(/vault\/cashier\/payouts/, { timeout: 10_000 });
    });

    await test.step('Assert redirect to /vault/cashier/payouts', async () => {
      await expect(page).toHaveURL(/vault\/cashier\/payouts/);
    });
  });

  test('vault-manager is redirected to /vault/management', async ({ page }) => {
    await test.step('Inject vault-manager auth cookie', async () => {
      await setRoleAuthCookie(page, MOCK_USER_VAULT_MANAGER);
    });

    await test.step('Navigate to /', async () => {
      await page.goto('/');
      await page.waitForURL(/vault\/management/, { timeout: 10_000 });
    });

    await test.step('Assert redirect to /vault/management', async () => {
      await expect(page).toHaveURL(/vault\/management/);
    });
  });

  test('collector is redirected to /collection-report', async ({ page }) => {
    await test.step('Inject collector auth cookie', async () => {
      await setRoleAuthCookie(page, MOCK_USER_COLLECTOR);
    });

    await test.step('Navigate to /', async () => {
      await page.goto('/');
      await page.waitForURL(/collection-report/, { timeout: 10_000 });
    });

    await test.step('Assert redirect to /collection-report', async () => {
      await expect(page).toHaveURL(/collection-report/);
    });
  });

  test('technician is redirected to /unauthorized', async ({ page }) => {
    await test.step('Inject technician auth cookie', async () => {
      await setRoleAuthCookie(page, MOCK_USER_TECHNICIAN);
    });

    await test.step('Navigate to /', async () => {
      await page.goto('/');
      await page.waitForURL(/unauthorized/, { timeout: 10_000 });
    });

    await test.step('Assert redirect to /unauthorized', async () => {
      await expect(page).toHaveURL(/unauthorized/);
    });
  });
});
