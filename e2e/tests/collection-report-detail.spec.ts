/**
 * Collection Report DETAIL Page E2E Tests
 * ─────────────────────────────────────────
 * Covers — /collection-report/report/[reportId]:
 *  1. Detail page loads — header shows location name, Report ID, Collector
 *  2. Machine Metrics tab (default) renders the machine table with both machines
 *  3. Machine Metrics table shows the expected column headers
 *  4. Machine Metrics search filters the machine list
 *  5. Location Metrics tab (via ?section=location) shows variance/revenue sections
 *  6. SAS Metrics Compare tab (via ?section=sas) shows SAS totals
 *  7. Clicking the Location Metrics sidebar tab switches content
 *  8. Back arrow navigates to /collection-report
 *  9. Modify Report button is visible for admin and opens the edit dialog
 * 10. Modify Report button is hidden for a collector (view-only role)
 * 11. Invalid report id renders the "Collection Report Not Found" state
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_REPORT_DETAIL,
  MOCK_REPORT_DETAIL_COLLECTIONS,
  MOCK_LOCATIONS_WITH_MACHINES,
} from '../mocks/collectionReport.mocks';
import {
  MOCK_LICENCEES_LIST,
} from '../mocks/locations.mocks';
import {
  MOCK_CURRENT_USER,
  MOCK_USER_PAYLOAD,
  MOCK_USER_COLLECTOR,
  mockCurrentUserResponse,
} from '../mocks/auth.mocks';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';

const REPORT_ID = 'report_001';

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockReportDetailAPIs(
  page: Page,
  reportPayload: unknown = MOCK_REPORT_DETAIL
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

  // Machine online-status dots (useMachineOnlineStatus in the table)
  await page.route('**/api/cabinets/online-status**', route =>
    route.fulfill({ status: 200, json: {} })
  );

  // Licencees (header)
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );

  // Edit modal support — locations with machines + activity logs
  await page.route('**/api/locations**', route => {
    const url = route.request().url();
    if (url.includes('locationsWithMachines=true')) {
      return route.fulfill({ status: 200, json: MOCK_LOCATIONS_WITH_MACHINES });
    }
    return route.fulfill({ status: 200, json: { success: true, locations: [] } });
  });
  await page.route('**/api/activity-logs**', route =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );

  // The two endpoints the detail hook calls:
  //   GET /api/collection-reports/collections?locationReportId=  → raw array
  //   GET /api/collection-reports/[reportId]                     → CollectionReportData object
  await page.route('**/api/collection-reports/**', async route => {
    const url = route.request().url();
    if (url.includes('/collections')) {
      return route.fulfill({
        status: 200,
        json: MOCK_REPORT_DETAIL_COLLECTIONS,
      });
    }
    return route.fulfill({ status: 200, json: reportPayload });
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Collection Report — Detail Page', () => {
  test('1. Detail page loads with header (location, report ID, collector)', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock detail APIs', async () => {
      await mockReportDetailAPIs(page);
    });

    await test.step('Navigate to the report detail page', async () => {
      await collectionReportDetailPage.goto(REPORT_ID);
    });

    await test.step('Assert header shows location name and report ID', async () => {
      await collectionReportDetailPage.expectHeaderVisible(
        'Grand Casino North',
        REPORT_ID
      );
    });

    await test.step('Assert collector name is shown', async () => {
      await expect(
        page.getByText(/Collector:\s*E2E Collector/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('2. Machine Metrics tab renders the machine table', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock detail APIs', async () => {
      await mockReportDetailAPIs(page);
    });

    await test.step('Navigate to the detail page', async () => {
      await collectionReportDetailPage.goto(REPORT_ID);
    });

    await test.step('Assert both machines appear in the table', async () => {
      await collectionReportDetailPage.expectMachineInTable('Lucky Dragon');
      await collectionReportDetailPage.expectMachineInTable('Golden Pharaoh');
    });
  });

  test('3. Machine Metrics table shows expected column headers', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock detail APIs', async () => {
      await mockReportDetailAPIs(page);
    });

    await test.step('Navigate to the detail page', async () => {
      await collectionReportDetailPage.goto(REPORT_ID);
    });

    await test.step('Assert MACHINE / MACHINE GROSS / SAS GROSS headers', async () => {
      await collectionReportDetailPage.expectMachineTableHeaders();
    });
  });

  test('4. Machine Metrics search filters the list', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock detail APIs', async () => {
      await mockReportDetailAPIs(page);
    });

    await test.step('Navigate to the detail page', async () => {
      await collectionReportDetailPage.goto(REPORT_ID);
    });

    await test.step('Wait for both machines to appear', async () => {
      await collectionReportDetailPage.expectMachineInTable('Lucky Dragon');
      await collectionReportDetailPage.expectMachineInTable('Golden Pharaoh');
    });

    await test.step('Search for "Dragon" (client-side filter)', async () => {
      await collectionReportDetailPage.searchMachines('Dragon');
    });

    await test.step('Assert Golden Pharaoh is filtered out', async () => {
      await expect(
        page.locator('td').filter({ hasText: 'Lucky Dragon' }).first()
      ).toBeVisible({ timeout: 5_000 });
      await expect(
        page.locator('td').filter({ hasText: 'Golden Pharaoh' })
      ).toHaveCount(0, { timeout: 5_000 });
    });
  });

  test('5. Location Metrics tab shows variance/revenue sections', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock detail APIs', async () => {
      await mockReportDetailAPIs(page);
    });

    await test.step('Navigate directly to the Location Metrics section', async () => {
      await collectionReportDetailPage.goto(REPORT_ID, 'location');
    });

    await test.step('Assert the Collection Variance section is shown', async () => {
      await expect(
        page.getByText(/Collection Variance/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert an "Amount To Collect" metric label is shown', async () => {
      await expect(
        page.getByText(/Amount To Collect/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('6. SAS Metrics Compare tab shows SAS totals', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock detail APIs', async () => {
      await mockReportDetailAPIs(page);
    });

    await test.step('Navigate directly to the SAS Compare section', async () => {
      await collectionReportDetailPage.goto(REPORT_ID, 'sas');
    });

    await test.step('Assert SAS Drop / Cancelled / Gross totals are shown', async () => {
      // The SAS tab renders identical labels in BOTH a mobile card (lg:hidden, first
      // in DOM) and the desktop table — filter to the visible (desktop) copy.
      await expect(
        page.getByText(/SAS Drop Total/i).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByText(/SAS Gross Total/i).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('7. Clicking the Location Metrics sidebar tab switches content', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock detail APIs', async () => {
      await mockReportDetailAPIs(page);
    });

    await test.step('Navigate to the detail page (default Machine Metrics tab)', async () => {
      await collectionReportDetailPage.goto(REPORT_ID);
      await collectionReportDetailPage.expectMachineInTable('Lucky Dragon');
    });

    await test.step('Click the Location Metrics sidebar tab', async () => {
      await collectionReportDetailPage.locationMetricsTab.click();
    });

    await test.step('Assert the Collection Variance section appears', async () => {
      await expect(
        page.getByText(/Collection Variance/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('8. Back arrow navigates to /collection-report', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock detail APIs', async () => {
      await mockReportDetailAPIs(page);
    });

    await test.step('Navigate to the detail page', async () => {
      await collectionReportDetailPage.goto(REPORT_ID);
      await collectionReportDetailPage.expectHeaderVisible(
        'Grand Casino North',
        REPORT_ID
      );
    });

    await test.step('Click the Back link', async () => {
      await collectionReportDetailPage.backLink.click();
    });

    await test.step('Assert URL is /collection-report', async () => {
      await expect(page).toHaveURL(/\/collection-report(\?|$)/, {
        timeout: 8_000,
      });
    });
  });

  test('9. Modify Report button is visible for admin and opens the edit dialog', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock detail APIs', async () => {
      await mockReportDetailAPIs(page);
      // The edit modal fetches collections (raw array) — already handled by the
      // /collections branch — plus first-collection + online-status checks.
      await page.route('**/api/collection-reports/collections/check-first**', route =>
        route.fulfill({
          status: 200,
          json: { success: true, isFirstCollection: false },
        })
      );
    });

    await test.step('Navigate to the detail page as admin', async () => {
      await collectionReportDetailPage.goto(REPORT_ID);
      await collectionReportDetailPage.expectHeaderVisible(
        'Grand Casino North',
        REPORT_ID
      );
    });

    await test.step('Assert Modify Report button is visible', async () => {
      await expect(collectionReportDetailPage.editButton).toBeVisible({
        timeout: 8_000,
      });
    });

    await test.step('Click Modify Report and assert the dialog opens', async () => {
      await collectionReportDetailPage.editButton.click();
      await expect(page.getByRole('dialog').first()).toBeVisible({
        timeout: 12_000,
      });
    });
  });

  test('10. Modify Report button is hidden for a collector (view-only)', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Set collector auth cookie', async () => {
      await setRoleAuthCookie(page, MOCK_USER_COLLECTOR);
    });

    await test.step('Mock detail APIs for collector', async () => {
      await mockReportDetailAPIs(page);
      await page.route('**/api/auth/current-user**', route =>
        route.fulfill({
          status: 200,
          json: mockCurrentUserResponse(MOCK_USER_COLLECTOR),
        })
      );
    });

    await test.step('Navigate to the detail page', async () => {
      await collectionReportDetailPage.goto(REPORT_ID);
      await collectionReportDetailPage.expectHeaderVisible(
        'Grand Casino North',
        REPORT_ID
      );
    });

    await test.step('Assert Modify Report button is NOT present', async () => {
      await expect(
        page.getByRole('button', { name: /modify report/i })
      ).toHaveCount(0, { timeout: 5_000 });
    });
  });

  test('11. Invalid report renders the Not Found state', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock detail APIs to return an invalid (empty) report', async () => {
      await mockReportDetailAPIs(page, {});
    });

    await test.step('Navigate to the detail page', async () => {
      await collectionReportDetailPage.goto(REPORT_ID);
    });

    await test.step('Assert the Not Found error is shown', async () => {
      await expect(
        page.getByText(/Collection Report Not Found/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});
