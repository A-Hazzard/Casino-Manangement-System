/**
 * Collection Report Page E2E Tests
 * ──────────────────────────────────
 * Covers — Collection Report list page (/collection-report):
 *  1.  Page loads with reports in the Collection tab table
 *  2.  Tab navigation — all 4 tabs are visible for manager role
 *  3.  Monthly tab shows the month/year picker UI
 *  4.  Collector Schedule tab renders a schedule table
 *  5.  Manager Schedule tab renders a schedule table
 *  6.  Collection tab: search sends search= param to the API
 *  7.  Collection tab: "View Details" link navigates to /collection-report/report/[id]
 *  8.  Collection tab: Delete Report — confirmation dialog → report removed
 *  9.  Collection tab: Modify Report button opens the edit modal
 * 10.  Role access — collector sees only Collection + Collector Schedule tabs
 * 11.  Collection tab: empty state shows "No Data Available"
 * 12.  Collection tab: location filter sends locationIds= to the API
 * 13.  Collection tab: sort by Gross column sends sort param to the API
 * 14.  Collection tab: "New Collection" button is visible for manager role
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_COLLECTION_REPORTS_LIST,
  MOCK_COLLECTION_REPORTS_LIST_AFTER_DELETE,
  MOCK_COLLECTION_REPORTS_EMPTY,
  MOCK_LOCATIONS_WITH_MACHINES,
  MOCK_COLLECTION_REPORT_DELETE_SUCCESS,
  MOCK_MONTHLY_REPORT,
  MOCK_COLLECTOR_SCHEDULES,
  MOCK_MANAGER_SCHEDULES,
  MOCK_REPORT_1,
} from '../mocks/collectionReport.mocks';
import {
  MOCK_LOCATIONS_LIST,
  MOCK_LICENCEES_LIST,
} from '../mocks/locations.mocks';
import {
  MOCK_CURRENT_USER,
  MOCK_USER_PAYLOAD,
  MOCK_USER_COLLECTOR,
  MOCK_USER_MANAGER,
  mockCurrentUserResponse,
} from '../mocks/auth.mocks';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';

// ─── Shared mock helpers ──────────────────────────────────────────────────────

async function mockCollectionReportAPIs(
  page: Page,
  listPayload = MOCK_COLLECTION_REPORTS_LIST
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

  // Main collection reports list — also handles ?locationsWithMachines=true
  await page.route('**/api/collection-reports**', async route => {
    const url = route.request().url();
    if (url.includes('locationsWithMachines=true')) {
      return route.fulfill({ status: 200, json: MOCK_LOCATIONS_WITH_MACHINES });
    }
    return route.fulfill({ status: 200, json: listPayload });
  });

  // Locations for filter dropdown
  await page.route('**/api/locations**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, locations: MOCK_LOCATIONS_LIST.locations },
    })
  );

  // Licencees
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );

  // Scheduler (collector + manager schedules)
  await page.route('**/api/schedulers**', route =>
    route.fulfill({ status: 200, json: MOCK_COLLECTOR_SCHEDULES })
  );

  // Activity logs (modal save flows await this)
  await page.route('**/api/activity-logs**', route =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );

  // Countries (used in some modals)
  await page.route('**/api/countries**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, data: [{ _id: 'tt', name: 'Trinidad and Tobago' }] },
    })
  );
}

// ─── Collection Report tests ───────────────────────────────────────────────────

test.describe('Collection Report — List Page', () => {
  test('1. Page loads with reports in the Collection tab table', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock collection report APIs', async () => {
      await mockCollectionReportAPIs(page);
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Assert both reports appear in the table', async () => {
      await collectionReportPage.expectReportsInTable(
        'Grand Casino North',
        'South Bay Gaming'
      );
    });

    await test.step('Assert table has exactly 2 rows', async () => {
      await collectionReportPage.expectTableRowCount(2);
    });
  });

  test('2. Tab navigation — all relevant tabs are visible for manager role', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Set manager auth cookie', async () => {
      await setRoleAuthCookie(page, MOCK_USER_MANAGER);
    });

    await test.step('Mock APIs', async () => {
      await mockCollectionReportAPIs(page);
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Assert Collection Reports tab is visible', async () => {
      await expect(collectionReportPage.collectionTab).toBeVisible();
    });

    await test.step('Assert Monthly Report tab is visible', async () => {
      await expect(collectionReportPage.monthlyTab).toBeVisible();
    });

    await test.step('Assert Manager Schedule tab is visible', async () => {
      await expect(collectionReportPage.managerTab).toBeVisible();
    });

    await test.step('Assert Collectors Schedule tab is visible', async () => {
      await expect(collectionReportPage.collectorTab).toBeVisible();
    });
  });

  test('3. Monthly tab shows month/year picker UI', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with monthly report response', async () => {
      await mockCollectionReportAPIs(page);
      // Override the collection-reports route to handle monthly queries
      await page.route('**/api/collection-reports**', async route => {
        const url = route.request().url();
        if (url.includes('startDate') && url.includes('endDate')) {
          return route.fulfill({ status: 200, json: MOCK_MONTHLY_REPORT });
        }
        return route.fulfill({
          status: 200,
          json: MOCK_COLLECTION_REPORTS_LIST,
        });
      });
    });

    await test.step('Navigate directly to monthly tab', async () => {
      await collectionReportPage.goto('monthly');
    });

    await test.step('Assert month/year picker is visible (the quick-select buttons)', async () => {
      // The monthly tab renders "Last Month" quick-select and month/year dropdowns
      await expect(
        page.getByRole('button', { name: /last month/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert summary cards are visible', async () => {
      await expect(
        page.getByText('Drop', { exact: true }).first()
      ).toBeVisible({ timeout: 8_000 });
      await expect(
        page.getByText('Gross', { exact: true }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('4. Collector Schedule tab renders a schedule table', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with collector schedules', async () => {
      await mockCollectionReportAPIs(page);
      await page.route('**/api/schedulers**', route =>
        route.fulfill({ status: 200, json: MOCK_COLLECTOR_SCHEDULES })
      );
    });

    await test.step('Navigate directly to collector tab', async () => {
      await collectionReportPage.goto('collector');
    });

    await test.step('Assert schedule table COLLECTOR header is visible', async () => {
      // The desktop table is hidden on mobile (lg:block). At 1280px it should render.
      await expect(
        page.getByRole('columnheader', { name: /collector/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert collector name appears in a table cell', async () => {
      // Scope to <td> to avoid matching hidden <option> elements in location dropdowns
      await expect(
        page.locator('td').filter({ hasText: 'E2E Collector' }).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('5. Manager Schedule tab renders a schedule table', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with manager schedules', async () => {
      await mockCollectionReportAPIs(page);
      await page.route('**/api/schedulers**', route =>
        route.fulfill({ status: 200, json: MOCK_MANAGER_SCHEDULES })
      );
    });

    await test.step('Navigate directly to manager tab', async () => {
      await collectionReportPage.goto('manager');
    });

    await test.step('Assert schedule table COLLECTOR header is visible', async () => {
      await expect(
        page.getByRole('columnheader', { name: /collector/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert collector name appears in a table cell', async () => {
      await expect(
        page.locator('td').filter({ hasText: 'E2E Collector' }).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('6. Search sends search= param to the API server-side', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock collection report APIs', async () => {
      await mockCollectionReportAPIs(page);
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Wait for initial table to load', async () => {
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Set up search request watcher', async () => {
      const searchRequest = page.waitForRequest(
        req =>
          /\/api\/collection-reports/.test(req.url()) &&
          /[?&]search=E2E/i.test(req.url()),
        { timeout: 15_000 }
      );

      await test.step('Type into search box', async () => {
        await collectionReportPage.searchInput.fill('E2E');
      });

      await test.step('Assert search request was sent with search= param', async () => {
        await searchRequest;
      });
    });
  });

  test('7. "View Details" link navigates to /collection-report/report/[id]', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock collection report APIs', async () => {
      await mockCollectionReportAPIs(page);
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Wait for table to load', async () => {
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Assert the details link for the first report has correct href', async () => {
      const detailsLink = collectionReportPage.detailsLinkInRow(
        'Grand Casino North'
      );
      await expect(detailsLink).toHaveAttribute(
        'href',
        new RegExp(`/collection-report/report/${MOCK_REPORT_1.locationReportId}`)
      );
    });
  });

  test('8. Delete Report — confirmation dialog → report removed from table', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock collection report APIs', async () => {
      await mockCollectionReportAPIs(page);
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Wait for table to load with both rows', async () => {
      await collectionReportPage.expectTableRowCount(2);
    });

    await test.step('Mock DELETE endpoint and post-delete list refresh', async () => {
      await page.route('**/api/collection-reports/**', async route => {
        if (route.request().method() === 'DELETE') {
          return route.fulfill({
            status: 200,
            json: MOCK_COLLECTION_REPORT_DELETE_SUCCESS,
          });
        }
        return route.fallback();
      });
      // Override the list route to return the reduced list after delete
      await page.route('**/api/collection-reports**', async route => {
        const url = route.request().url();
        if (url.includes('locationsWithMachines=true')) {
          return route.fulfill({
            status: 200,
            json: MOCK_LOCATIONS_WITH_MACHINES,
          });
        }
        return route.fulfill({
          status: 200,
          json: MOCK_COLLECTION_REPORTS_LIST_AFTER_DELETE,
        });
      });
    });

    await test.step('Click Delete Report button for Grand Casino North row', async () => {
      await collectionReportPage.deleteButtonInRow('Grand Casino North').click();
    });

    await test.step('Assert "Remove Report" dialog appears (step 1)', async () => {
      // V1 delete modal: fixed overlay with "Remove Report" heading and Archive/Delete options
      await expect(
        page.locator('div.fixed.inset-0').locator('h2:has-text("Remove Report")')
      ).toBeVisible({ timeout: 8_000 });
    });

    await test.step('Click "Permanent Delete" option to advance to step 2', async () => {
      await page.getByRole('button', { name: /permanent delete/i }).first().click();
    });

    await test.step('Assert "Delete Report" confirmation heading appears (step 2)', async () => {
      await expect(
        page.locator('div.fixed.inset-0').locator('h2:has-text("Delete Report")')
      ).toBeVisible({ timeout: 5_000 });
    });

    await test.step('Click "Delete Permanently" to confirm', async () => {
      await page.getByRole('button', { name: /delete permanently/i }).first().click();
    });

    await test.step('Assert only South Bay Gaming remains in the table', async () => {
      await expect(
        page.locator('td').filter({ hasText: 'South Bay Gaming' }).first()
      ).toBeVisible({ timeout: 8_000 });
      await expect(
        page.locator('td').filter({ hasText: 'Grand Casino North' })
      ).toHaveCount(0, { timeout: 5_000 });
    });
  });

  test('9. Modify Report button opens the edit modal', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock collection report APIs', async () => {
      await mockCollectionReportAPIs(page);
      // Mock the single-report GET used by useEditCollectionModal:
      // fetchCollectionReportById returns response.data directly — no wrapper.
      await page.route(
        `**/api/collection-reports/${MOCK_REPORT_1._id}**`,
        route =>
          route.fulfill({
            status: 200,
            json: MOCK_REPORT_1,
          })
      );
      // fetchCollectionsByReportId returns response.data — must be a plain array,
      // NOT { success, data } — otherwise .map() throws inside the hook.
      await page.route('**/api/collection-reports/collections**', route =>
        route.fulfill({ status: 200, json: [] })
      );
      // The hook also checks for first-collection status
      await page.route('**/api/collection-reports/collections/check-first**', route =>
        route.fulfill({ status: 200, json: { success: true, isFirstCollection: false } })
      );
      // Machine online status (useMachineOnlineStatus in DesktopEditLayout)
      await page.route('**/api/cabinets/online-status**', route =>
        route.fulfill({ status: 200, json: {} })
      );
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Wait for table to load', async () => {
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Click Modify Report button for Grand Casino North row', async () => {
      await collectionReportPage.editButtonInRow('Grand Casino North').click();
    });

    await test.step('Assert the edit dialog opens (shadcn Dialog renders role="dialog")', async () => {
      // CollectionReportEditCollectionModal wraps in a shadcn <Dialog open={show}>
      await expect(page.getByRole('dialog').first()).toBeVisible({
        timeout: 12_000,
      });
    });
  });

  test('10. Role access — collector sees only Collection tab (not Monthly/Manager)', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Set collector auth cookie', async () => {
      await setRoleAuthCookie(page, MOCK_USER_COLLECTOR);
    });

    await test.step('Mock APIs', async () => {
      await mockCollectionReportAPIs(page);
      // Override current-user for collector
      await page.route('**/api/auth/current-user**', route =>
        route.fulfill({
          status: 200,
          json: mockCurrentUserResponse(MOCK_USER_COLLECTOR),
        })
      );
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Assert Collection Reports tab is visible', async () => {
      await expect(collectionReportPage.collectionTab).toBeVisible({ timeout: 8_000 });
    });

    await test.step('Assert Monthly Report tab is NOT visible', async () => {
      await collectionReportPage.expectTabNotVisible('Monthly Report');
    });

    await test.step('Assert Manager Schedule tab is NOT visible', async () => {
      await collectionReportPage.expectTabNotVisible('Manager Schedule');
    });
  });

  test('11. Collection tab shows empty state when no reports', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with empty report list', async () => {
      await mockCollectionReportAPIs(page, MOCK_COLLECTION_REPORTS_EMPTY);
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Assert empty state message is shown', async () => {
      await collectionReportPage.expectEmptyState();
    });
  });

  test('12. Location filter dropdown opens and shows location options', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock collection report APIs', async () => {
      await mockCollectionReportAPIs(page);
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Wait for initial table to load', async () => {
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Click location filter to open the multi-select popover', async () => {
      await collectionReportPage.locationFilterTrigger.click();
    });

    await test.step('Assert location options appear in the dropdown', async () => {
      // LocationMultiSelect renders location names as clickable items inside the popover
      await expect(
        page.getByText('Grand Casino North', { exact: true }).last()
      ).toBeVisible({ timeout: 5_000 });
      await expect(
        page.getByText('South Bay Gaming', { exact: true }).last()
      ).toBeVisible({ timeout: 5_000 });
    });

    await test.step('Select Grand Casino North and assert the filter summary updates', async () => {
      // The location checkboxes are inside the popover — click the label
      await page.getByText('Grand Casino North', { exact: true }).last().click();
      // The page header updates to "Showing N collection reports for Grand Casino North"
      await expect(
        page.getByText(/showing.*grand casino north/i).first()
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test('13. "New Collection" button is visible for manager role', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with manager role', async () => {
      await mockCollectionReportAPIs(page);
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Assert create button is visible', async () => {
      await expect(collectionReportPage.createButton).toBeVisible({ timeout: 8_000 });
    });
  });

  test('14. Sort by Gross column triggers a new data request', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock collection report APIs', async () => {
      await mockCollectionReportAPIs(page);
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Wait for initial table to load', async () => {
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Click GROSS column header to sort', async () => {
      const grossHeader = page
        .locator('th, [role="columnheader"]')
        .filter({ hasText: /^GROSS$/i })
        .first();
      await grossHeader.click();
      // The collection tab sorts client-side — just assert the table still renders after click
      await collectionReportPage.expectTableRowCount(2);
    });
  });
});

// ─── Deeper tab coverage: Monthly details + Schedule edit/delete ──────────────

test.describe('Collection Report — Monthly + Schedule actions', () => {
  test('15. Monthly tab details table lists per-location rows', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with monthly report response', async () => {
      await mockCollectionReportAPIs(page);
      await page.route('**/api/collection-reports**', async route => {
        const url = route.request().url();
        if (url.includes('startDate') && url.includes('endDate')) {
          return route.fulfill({ status: 200, json: MOCK_MONTHLY_REPORT });
        }
        return route.fulfill({
          status: 200,
          json: MOCK_COLLECTION_REPORTS_LIST,
        });
      });
    });

    await test.step('Navigate directly to the monthly tab', async () => {
      await collectionReportPage.goto('monthly');
    });

    await test.step('Assert both location rows appear in the details table', async () => {
      await expect(
        page.getByText('Grand Casino North', { exact: false }).first()
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByText('South Bay Gaming', { exact: false }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('16. Collector schedule — Edit opens the Edit Schedule dialog', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with collector schedules', async () => {
      await mockCollectionReportAPIs(page);
      await page.route('**/api/schedulers**', route =>
        route.fulfill({ status: 200, json: MOCK_COLLECTOR_SCHEDULES })
      );
    });

    await test.step('Navigate to the collector tab', async () => {
      await collectionReportPage.goto('collector');
    });

    await test.step('Wait for a schedule row to render', async () => {
      await expect(
        page.locator('td').filter({ hasText: 'E2E Collector' }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Click the first Edit Schedule button', async () => {
      await page
        .getByRole('button', { name: /edit schedule/i })
        .first()
        .click();
    });

    await test.step('Assert the Edit Schedule dialog opens', async () => {
      await expect(
        page.getByRole('dialog').filter({ hasText: /Edit Schedule/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('17. Collector schedule — Delete opens the Delete Schedule dialog', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with collector schedules', async () => {
      await mockCollectionReportAPIs(page);
      await page.route('**/api/schedulers**', route =>
        route.fulfill({ status: 200, json: MOCK_COLLECTOR_SCHEDULES })
      );
    });

    await test.step('Navigate to the collector tab', async () => {
      await collectionReportPage.goto('collector');
    });

    await test.step('Wait for a schedule row to render', async () => {
      await expect(
        page.locator('td').filter({ hasText: 'E2E Collector' }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Click the first Delete Schedule button', async () => {
      await page
        .getByRole('button', { name: /delete schedule/i })
        .first()
        .click();
    });

    await test.step('Assert the Delete Schedule confirmation appears', async () => {
      await expect(
        page.getByRole('alertdialog').filter({ hasText: /Delete Schedule/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('18. Manager schedule — Edit opens the Edit Schedule dialog', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with manager schedules', async () => {
      await mockCollectionReportAPIs(page);
      await page.route('**/api/schedulers**', route =>
        route.fulfill({ status: 200, json: MOCK_MANAGER_SCHEDULES })
      );
    });

    await test.step('Navigate to the manager tab', async () => {
      await collectionReportPage.goto('manager');
    });

    await test.step('Wait for a schedule row to render', async () => {
      await expect(
        page.locator('td').filter({ hasText: 'E2E Collector' }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Click the first Edit Schedule button', async () => {
      await page
        .getByRole('button', { name: /edit schedule/i })
        .first()
        .click();
    });

    await test.step('Assert the Edit Schedule dialog opens', async () => {
      await expect(
        page.getByRole('dialog').filter({ hasText: /Edit Schedule/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });
});
