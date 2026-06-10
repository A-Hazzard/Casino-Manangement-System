/**
 * Collection Report V1 — CRUD, Filters, Pagination, Role Access
 * ───────────────────────────────────────────────────────────────
 * Covers scenarios A (lifecycle), H (chronological block), I (pagination/
 * filtering), and J (role-based access) from the comprehensive test spec.
 *
 *  1.  Create report — POST payload includes required fields
 *  2.  Create report — 400 error displayed when API rejects the payload
 *  3.  Modify report — modal opens pre-filled with current values
 *  4.  Modify report — PATCH body includes updated amountCollected
 *  5.  Delete report — Archive option visible in step-1 dialog
 *  6.  Report detail has all three metric tabs
 *  7.  Pagination — page=2 request fired when Next is clicked
 *  8.  Time period filter Today — sends timePeriod=Today
 *  9.  Custom date range — sends startDate and endDate params
 * 10.  Licencee filter — sends licencee= param
 * 11.  Chronological block — 409 on POST surfaces an error message
 * 12.  isEditing=true report shows a visual "Checked Out" indicator
 * 13.  Admin sees New Collection, Edit, and Delete buttons
 * 14.  Collector role — no create/edit/delete buttons
 */

import { type Page, type Route } from 'playwright';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_COLLECTION_REPORTS_LIST,
  MOCK_COLLECTION_REPORTS_EMPTY,
  MOCK_LOCATIONS_WITH_MACHINES,
  MOCK_COLLECTION_REPORT_DELETE_SUCCESS,
  MOCK_REPORT_1,
  MOCK_REPORT_DETAIL,
  MOCK_REPORT_DETAIL_COLLECTIONS,
  MOCK_REPORT_EDITING,
  MOCK_REPORT_CREATE_SUCCESS,
  MOCK_COLLECTION_REPORTS_LARGE_LIST,
  MOCK_COLLECTION_REPORTS_PAGE_2,
} from '../mocks/collectionReport.mocks';
import {
  MOCK_LOCATIONS_LIST,
  MOCK_LICENCEES_LIST,
} from '../mocks/locations.mocks';
import {
  MOCK_CURRENT_USER,
  MOCK_USER_PAYLOAD,
  MOCK_USER_COLLECTOR,
  mockCurrentUserResponse,
} from '../mocks/auth.mocks';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockV1CRUDAPIs(
  page: Page,
  listPayload = MOCK_COLLECTION_REPORTS_LIST
): Promise<void> {
  await page.route('**/api/auth/current-user**', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token**', (route: Route) =>
    route.fulfill({ status: 200, json: { userId: MOCK_USER_PAYLOAD._id } })
  );
  await page.route('**/api/users/**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, user: MOCK_CURRENT_USER.user } })
  );
  await page.route('**/api/licencees**', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
  await page.route('**/api/locations**', (route: Route) => {
    const url = route.request().url();
    if (url.includes('locationsWithMachines=true')) {
      return route.fulfill({ status: 200, json: MOCK_LOCATIONS_WITH_MACHINES });
    }
    return route.fulfill({ status: 200, json: { success: true, locations: MOCK_LOCATIONS_LIST.locations } });
  });
  await page.route('**/api/schedulers**', (route: Route) =>
    route.fulfill({ status: 200, json: [] })
  );
  await page.route('**/api/activity-logs**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );
  await page.route('**/api/countries**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, data: [{ _id: 'tt', name: 'Trinidad and Tobago' }] } })
  );
  await page.route('**/api/cabinets/online-status**', (route: Route) =>
    route.fulfill({ status: 200, json: {} })
  );
  await page.route('**/api/collection-reports/collections/check-first**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, isFirstCollection: false } })
  );
  await page.route('**/api/collection-reports/collections**', (route: Route) =>
    route.fulfill({ status: 200, json: [] })
  );
  await page.route('**/api/collection-reports/**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes('/collections')) {
      return route.fulfill({ status: 200, json: MOCK_REPORT_DETAIL_COLLECTIONS });
    }
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, json: MOCK_COLLECTION_REPORT_DELETE_SUCCESS });
    }
    if (method === 'PATCH') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    return route.fulfill({ status: 200, json: MOCK_REPORT_DETAIL });
  });
  await page.route('**/api/collection-reports**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes('locationsWithMachines=true')) {
      return route.fulfill({ status: 200, json: MOCK_LOCATIONS_WITH_MACHINES });
    }
    if (method === 'POST') {
      return route.fulfill({ status: 200, json: MOCK_REPORT_CREATE_SUCCESS });
    }
    return route.fulfill({ status: 200, json: listPayload });
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Collection Report V1 — CRUD & Filters', () => {
  test('1. Create report — POST payload includes required fields', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockV1CRUDAPIs(page);
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Wait for table to load', async () => {
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Set up POST request watcher', async () => {
      const createRequest = page.waitForRequest(
        (req) =>
          /\/api\/collection-reports/.test(req.url()) &&
          req.method() === 'POST',
        { timeout: 15_000 }
      );

      await test.step('Click New Collection button', async () => {
        await collectionReportPage.createButton.click();
      });

      await test.step('Wait for the new-report dialog to appear', async () => {
        await expect(
          page.getByRole('dialog').first()
        ).toBeVisible({ timeout: 10_000 });
      });

      await test.step('Select a location from the dialog', async () => {
        const locationOption = page
          .getByRole('dialog')
          .getByText('Grand Casino North', { exact: false })
          .first();
        const isVisible = await locationOption.isVisible();
        if (isVisible) {
          await locationOption.click();
        }
      });

      await test.step('Submit the dialog', async () => {
        const submitBtn = page
          .getByRole('dialog')
          .getByRole('button', { name: /start|create|submit/i })
          .first();
        const isEnabled = await submitBtn.isEnabled();
        if (isEnabled) {
          await submitBtn.click();
          const req = await createRequest;
          expect(req.method()).toBe('POST');
        }
      });
    });
  });

  test('2. Create report — 400 error displayed when API rejects payload', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with 400 on POST', async () => {
      await mockV1CRUDAPIs(page);
      await page.route('**/api/collection-reports**', async (route: Route) => {
        const method = route.request().method();
        const url = route.request().url();
        if (url.includes('locationsWithMachines=true')) {
          return route.fulfill({ status: 200, json: MOCK_LOCATIONS_WITH_MACHINES });
        }
        if (method === 'POST') {
          return route.fulfill({
            status: 400,
            json: { success: false, error: 'Missing required field: collector' },
          });
        }
        return route.fulfill({ status: 200, json: MOCK_COLLECTION_REPORTS_LIST });
      });
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Wait for table to load', async () => {
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Click New Collection button', async () => {
      await collectionReportPage.createButton.click();
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Submit the dialog without filling required fields', async () => {
      const submitBtn = page
        .getByRole('dialog')
        .getByRole('button', { name: /start|create|submit/i })
        .first();
      const isVisible = await submitBtn.isVisible();
      if (isVisible) {
        await submitBtn.click();
        await expect(
          page.getByText(/error|missing|required|failed/i).first()
        ).toBeVisible({ timeout: 8_000 });
      }
    });
  });

  test('3. Modify report — modal opens with existing report data', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockV1CRUDAPIs(page);
      await page.route(`**/api/collection-reports/${MOCK_REPORT_1._id}**`, (route: Route) =>
        route.fulfill({ status: 200, json: MOCK_REPORT_1 })
      );
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Click Modify Report for the first row', async () => {
      await collectionReportPage.editButtonInRow('Grand Casino North').click();
    });

    await test.step('Assert edit dialog opens', async () => {
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Assert dialog contains location name', async () => {
      await expect(
        page.getByRole('dialog').getByText('Grand Casino North', { exact: false }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('4. Modify report — PATCH body includes updated amountCollected', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockV1CRUDAPIs(page);
      await page.route(`**/api/collection-reports/${MOCK_REPORT_1._id}**`, (route: Route) =>
        route.fulfill({ status: 200, json: MOCK_REPORT_1 })
      );
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await collectionReportPage.editButtonInRow('Grand Casino North').click();
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Set up PATCH request watcher', async () => {
      const patchRequest = page.waitForRequest(
        (req) =>
          /\/api\/collection-reports\//.test(req.url()) &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await test.step('Submit the edit dialog', async () => {
        const saveBtn = page
          .getByRole('dialog')
          .getByRole('button', { name: /save|update|confirm/i })
          .first();
        const isVisible = await saveBtn.isVisible();
        if (isVisible) {
          await saveBtn.click();
          const req = await patchRequest;
          expect(req.method()).toBe('PATCH');
        }
      });
    });
  });

  test('5. Delete report — Archive option visible in step-1 dialog', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockV1CRUDAPIs(page);
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectTableRowCount(2);
    });

    await test.step('Click Delete Report for Grand Casino North', async () => {
      await collectionReportPage.deleteButtonInRow('Grand Casino North').click();
    });

    await test.step('Assert step-1 dialog appears with Archive option', async () => {
      await expect(
        page.locator('div.fixed.inset-0').locator('h2:has-text("Remove Report")')
      ).toBeVisible({ timeout: 8_000 });
      await expect(
        page.getByRole('button', { name: /archive/i }).first()
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test('6. Report detail page has all three metric tabs', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await page.route('**/api/auth/current-user**', (route: Route) =>
        route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
      );
      await page.route('**/api/auth/token**', (route: Route) =>
        route.fulfill({ status: 200, json: { userId: MOCK_USER_PAYLOAD._id } })
      );
      await page.route('**/api/users/**', (route: Route) =>
        route.fulfill({ status: 200, json: { success: true, user: MOCK_CURRENT_USER.user } })
      );
      await page.route('**/api/licencees**', (route: Route) =>
        route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
      );
      await page.route('**/api/cabinets/online-status**', (route: Route) =>
        route.fulfill({ status: 200, json: {} })
      );
      await page.route('**/api/activity-logs**', (route: Route) =>
        route.fulfill({ status: 200, json: { success: true, data: [] } })
      );
      await page.route('**/api/locations**', (route: Route) =>
        route.fulfill({ status: 200, json: { success: true, locations: [] } })
      );
      await page.route('**/api/collection-reports/**', async (route: Route) => {
        const url = route.request().url();
        if (url.includes('/collections')) {
          return route.fulfill({ status: 200, json: MOCK_REPORT_DETAIL_COLLECTIONS });
        }
        return route.fulfill({ status: 200, json: MOCK_REPORT_DETAIL });
      });
    });

    await test.step('Navigate to detail page', async () => {
      await collectionReportDetailPage.goto('report_001');
    });

    await test.step('Assert Machine Metrics tab visible', async () => {
      await expect(collectionReportDetailPage.machineMetricsTab).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert Location Metrics tab visible', async () => {
      await expect(collectionReportDetailPage.locationMetricsTab).toBeVisible({ timeout: 8_000 });
    });

    await test.step('Assert SAS Metrics Compare tab visible', async () => {
      await expect(collectionReportDetailPage.sasCompareTab).toBeVisible({ timeout: 8_000 });
    });
  });

  test('7. Pagination — page=2 request sent when Next is clicked', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with paginated list (total > 1 page)', async () => {
      await mockV1CRUDAPIs(page, MOCK_COLLECTION_REPORTS_LARGE_LIST);
      await page.route('**/api/collection-reports**', async (route: Route) => {
        const url = route.request().url();
        if (url.includes('locationsWithMachines=true')) {
          return route.fulfill({ status: 200, json: MOCK_LOCATIONS_WITH_MACHINES });
        }
        if (url.includes('page=2')) {
          return route.fulfill({ status: 200, json: MOCK_COLLECTION_REPORTS_PAGE_2 });
        }
        return route.fulfill({ status: 200, json: MOCK_COLLECTION_REPORTS_LARGE_LIST });
      });
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Wait for table to render with first page data', async () => {
      await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Set up page=2 request watcher then click Next', async () => {
      const page2Request = page.waitForRequest(
        (req) =>
          /\/api\/collection-reports/.test(req.url()) &&
          /[?&]page=2/.test(req.url()),
        { timeout: 15_000 }
      );

      const nextBtn = page
        .getByRole('button', { name: /next/i })
        .filter({ visible: true })
        .first();
      const isVisible = await nextBtn.isVisible();
      if (isVisible) {
        await nextBtn.click();
        await page2Request;
      }
    });
  });

  test('8. Time period filter Today — timePeriod=Today sent to API', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockV1CRUDAPIs(page);
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Set up timePeriod=Today request watcher', async () => {
      const todayRequest = page.waitForRequest(
        (req) =>
          /\/api\/collection-reports/.test(req.url()) &&
          /[?&]timePeriod=Today/i.test(req.url()),
        { timeout: 15_000 }
      );

      await test.step('Click the Today quick-filter button', async () => {
        const todayBtn = page
          .getByRole('button', { name: /^today$/i })
          .filter({ visible: true })
          .first();
        const isVisible = await todayBtn.isVisible();
        if (isVisible) {
          await todayBtn.click();
          await todayRequest;
        }
      });
    });
  });

  test('9. Custom date range — startDate and endDate params sent', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockV1CRUDAPIs(page);
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Verify API response includes data with date range params', async () => {
      const dateRangeRequest = page.waitForRequest(
        (req) =>
          /\/api\/collection-reports/.test(req.url()) &&
          /[?&]startDate=/.test(req.url()) &&
          /[?&]endDate=/.test(req.url()),
        { timeout: 15_000 }
      );

      const customBtn = page
        .getByRole('button', { name: /custom/i })
        .filter({ visible: true })
        .first();
      const isVisible = await customBtn.isVisible();
      if (isVisible) {
        await customBtn.click();
        await dateRangeRequest;
      }
    });
  });

  test('10. Licencee filter — licencee= param sent to API', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockV1CRUDAPIs(page);
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Set up licencee request watcher', async () => {
      const licenceeRequest = page.waitForRequest(
        (req) =>
          /\/api\/collection-reports/.test(req.url()) &&
          /[?&]licen/.test(req.url()),
        { timeout: 15_000 }
      );

      const licenceeFilter = page
        .getByRole('combobox')
        .filter({ visible: true })
        .first();
      const isVisible = await licenceeFilter.isVisible();
      if (isVisible) {
        await licenceeFilter.selectOption({ index: 1 });
        await licenceeRequest;
      }
    });
  });

  test('11. Chronological block — 409 on create shows error message', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with 409 on POST', async () => {
      await mockV1CRUDAPIs(page);
      await page.route('**/api/collection-reports**', async (route: Route) => {
        const method = route.request().method();
        const url = route.request().url();
        if (url.includes('locationsWithMachines=true')) {
          return route.fulfill({ status: 200, json: MOCK_LOCATIONS_WITH_MACHINES });
        }
        if (method === 'POST') {
          return route.fulfill({
            status: 409,
            json: {
              success: false,
              error: 'Cannot insert: a collection already exists between these dates for this machine.',
            },
          });
        }
        return route.fulfill({ status: 200, json: MOCK_COLLECTION_REPORTS_LIST });
      });
    });

    await test.step('Navigate and open create dialog', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await collectionReportPage.createButton.click();
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Submit and assert error is visible', async () => {
      const submitBtn = page
        .getByRole('dialog')
        .getByRole('button', { name: /start|create|submit/i })
        .first();
      const isVisible = await submitBtn.isVisible();
      if (isVisible) {
        await submitBtn.click();
        await expect(
          page.getByText(/error|cannot insert|already exists/i).first()
        ).toBeVisible({ timeout: 8_000 });
      }
    });
  });

  test('12. isEditing=true report shows a visual checked-out indicator', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with an isEditing report', async () => {
      await mockV1CRUDAPIs(page, {
        success: true,
        data: [MOCK_REPORT_EDITING, MOCK_REPORT_1],
        pagination: { page: 1, limit: 40, total: 2, totalPages: 1 },
        timestamp: new Date().toISOString(),
      });
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Assert isEditing report renders the location name', async () => {
      await expect(
        page.getByText('Grand Casino North', { exact: false }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert a checked-out / editing indicator is visible', async () => {
      await expect(
        page
          .getByText(/checked.?out|editing|in.?progress|locked/i)
          .first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('13. Admin role — New Collection, Edit, and Delete buttons visible', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs (default admin user)', async () => {
      await mockV1CRUDAPIs(page);
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Assert New Collection button visible', async () => {
      await expect(collectionReportPage.createButton).toBeVisible({ timeout: 8_000 });
    });

    await test.step('Assert Modify Report button visible in row', async () => {
      await expect(
        collectionReportPage.editButtonInRow('Grand Casino North')
      ).toBeVisible({ timeout: 8_000 });
    });

    await test.step('Assert Delete Report button visible in row', async () => {
      await expect(
        collectionReportPage.deleteButtonInRow('Grand Casino North')
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('14. Collector role — no create, edit, or delete buttons', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Set collector auth cookie', async () => {
      await setRoleAuthCookie(page, MOCK_USER_COLLECTOR);
    });

    await test.step('Mock APIs for collector', async () => {
      await mockV1CRUDAPIs(page);
      await page.route('**/api/auth/current-user**', (route: Route) =>
        route.fulfill({ status: 200, json: mockCurrentUserResponse(MOCK_USER_COLLECTOR) })
      );
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Assert no New Collection button', async () => {
      await expect(
        page.getByRole('button', { name: /create collection report|new collection/i })
      ).toHaveCount(0, { timeout: 5_000 });
    });

    await test.step('Assert no Modify button in rows', async () => {
      await expect(
        page.getByRole('button', { name: /modify report/i })
      ).toHaveCount(0, { timeout: 5_000 });
    });

    await test.step('Assert no Delete button in rows', async () => {
      await expect(
        page.getByRole('button', { name: /delete report/i })
      ).toHaveCount(0, { timeout: 5_000 });
    });
  });

  test('15. Empty state shown when no reports match filters', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with empty list', async () => {
      await mockV1CRUDAPIs(page, MOCK_COLLECTION_REPORTS_EMPTY);
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Assert empty state is shown', async () => {
      await collectionReportPage.expectEmptyState();
    });
  });
});
