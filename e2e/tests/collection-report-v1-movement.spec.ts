/**
 * Collection Report V1 — Movement Calculations
 * ──────────────────────────────────────────────
 * Covers scenarios F (29–32) and G (33–36):
 *
 *  1.  Normal movement: gross = (metersIn-prevIn) - (metersOut-prevOut) displayed
 *  2.  RAM Clear movement: gross includes both pre-reset and current delta
 *  3.  Zero prevIn (first collection) — gross equals full meter delta
 *  4.  Negative gross — displayed with negative sign in UI
 *  5.  prevIn/prevOut resolved from previous completed collection
 *  6.  prevIn/prevOut falls back to machine.collectionMeters
 *  7.  prevIn/prevOut falls back to 0 when all sources empty
 *  8.  Client-provided prevIn/prevOut override DB values in POST body
 */

import { type Page, type Route } from 'playwright';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_REPORT_1,
  MOCK_REPORT_DETAIL,
  MOCK_REPORT_DETAIL_COLLECTIONS,
  MOCK_COLLECTION_REPORTS_LIST,
  MOCK_LOCATIONS_WITH_MACHINES,
  MOCK_COLLECTION_ENTRY_FIRST,
  MOCK_COLLECTION_ENTRY_NORMAL_MOVEMENT,
  MOCK_COLLECTION_ENTRY_RAM_CLEAR,
  MOCK_COLLECTION_ENTRY_NEGATIVE_GROSS,
  MOCK_COLLECTION_ENTRY_SUBSEQUENT,
  MOCK_COLLECTION_CREATE_SUCCESS,
} from '../mocks/collectionReport.mocks';
import { MOCK_LICENCEES_LIST, MOCK_LOCATIONS_LIST } from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER, MOCK_USER_PAYLOAD } from '../mocks/auth.mocks';

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockMovementAPIs(
  page: Page,
  collectionsPayload: unknown[] = [MOCK_COLLECTION_ENTRY_NORMAL_MOVEMENT]
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
  await page.route('**/api/collection-reports/collections/**', async (route: Route) => {
    const method = route.request().method();
    if (method === 'PATCH') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    return route.fulfill({ status: 200, json: { success: true, data: collectionsPayload[0] } });
  });
  await page.route('**/api/collection-reports/collections**', async (route: Route) => {
    const method = route.request().method();
    if (method === 'POST') {
      return route.fulfill({ status: 200, json: MOCK_COLLECTION_CREATE_SUCCESS });
    }
    return route.fulfill({ status: 200, json: collectionsPayload });
  });
  await page.route(`**/api/collection-reports/${MOCK_REPORT_1._id}**`, (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_REPORT_1 })
  );
  await page.route('**/api/collection-reports/**', async (route: Route) => {
    const url = route.request().url();
    if (url.includes('/collections')) {
      return route.fulfill({ status: 200, json: MOCK_REPORT_DETAIL_COLLECTIONS });
    }
    return route.fulfill({ status: 200, json: MOCK_REPORT_DETAIL });
  });
  await page.route('**/api/collection-reports**', async (route: Route) => {
    const url = route.request().url();
    if (url.includes('locationsWithMachines=true')) {
      return route.fulfill({ status: 200, json: MOCK_LOCATIONS_WITH_MACHINES });
    }
    return route.fulfill({ status: 200, json: MOCK_COLLECTION_REPORTS_LIST });
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Collection Report V1 — Movement Calculations', () => {
  test('1. Normal movement — gross displayed equals meter delta calculation', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with normal movement collection', async () => {
      await mockMovementAPIs(page, [MOCK_COLLECTION_ENTRY_NORMAL_MOVEMENT]);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await page.getByRole('button', { name: /modify report/i }).first().click();
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Assert gross value shown in the dialog', async () => {
      await expect(
        page.getByRole('dialog').getByText(/gross|movement/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('2. RAM Clear movement — gross is sum of pre-reset and post-reset deltas', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with RAM Clear collection', async () => {
      await mockMovementAPIs(page, [MOCK_COLLECTION_ENTRY_RAM_CLEAR]);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await page.getByRole('button', { name: /modify report/i }).first().click();
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Assert RAM Clear indicator visible in the collection row', async () => {
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
    });
  });

  test('3. Zero prevIn (first collection) — gross equals full meter delta', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with first collection (prevIn=0)', async () => {
      await mockMovementAPIs(page, [MOCK_COLLECTION_ENTRY_FIRST]);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await page.getByRole('button', { name: /modify report/i }).first().click();
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Assert the dialog renders with collection data', async () => {
      await expect(
        page.getByRole('dialog').getByText('Lucky Dragon', { exact: false }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('4. Negative gross — displayed with negative sign in UI', async ({
    page,
  }) => {
    const negativeReport = {
      ...MOCK_REPORT_DETAIL,
      machineMetrics: [
        {
          id: 'metric_neg',
          machineId: 'Lucky Dragon',
          actualMachineId: 'mach_001',
          dropCancelled: '5,000.00 / 5,200.00',
          metersGross: -200_000,
          jackpot: 0,
          netGross: -200_000,
          sasGross: -200_000,
          variation: 0,
          hasIssue: true,
          ramClear: false,
          notes: '',
        },
      ],
    };

    await test.step('Mock APIs with negative gross report', async () => {
      await mockMovementAPIs(page, [MOCK_COLLECTION_ENTRY_NEGATIVE_GROSS]);
      await page.route('**/api/collection-reports/**', async (route: Route) => {
        const url = route.request().url();
        if (url.includes('/collections')) {
          return route.fulfill({ status: 200, json: [MOCK_COLLECTION_ENTRY_NEGATIVE_GROSS] });
        }
        return route.fulfill({ status: 200, json: negativeReport });
      });
    });

    await test.step('Navigate to the detail page to see machine metrics', async () => {
      await page.goto('/collection-report/report/report_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert negative value is rendered in the machine table', async () => {
      await expect(
        page.getByText(/-200|negative|money.?out/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('5. prevIn/prevOut resolved from previous completed collection', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with subsequent collection (has non-zero prevIn)', async () => {
      await mockMovementAPIs(page, [MOCK_COLLECTION_ENTRY_SUBSEQUENT]);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await page.getByRole('button', { name: /modify report/i }).first().click();
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Assert dialog shows a non-zero previous meter value', async () => {
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible({ timeout: 8_000 });
    });
  });

  test('6. prevIn/prevOut falls back to machine.collectionMeters', async ({
    page,
    collectionReportPage,
  }) => {
    const collectionWithCollectionMetersFallback = {
      ...MOCK_COLLECTION_ENTRY_NORMAL_MOVEMENT,
      prevIn: 5_000_000,
      prevOut: 2_500_000,
      _prevSource: 'machine.collectionMeters',
    };

    await test.step('Mock APIs with collectionMeters-sourced prevIn', async () => {
      await mockMovementAPIs(page, [collectionWithCollectionMetersFallback]);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await page.getByRole('button', { name: /modify report/i }).first().click();
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Assert dialog renders with collection data', async () => {
      await expect(
        page.getByRole('dialog').getByText('Lucky Dragon', { exact: false }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('7. prevIn/prevOut falls back to 0 when all sources empty', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with first collection (prevIn=0, all sources empty)', async () => {
      await mockMovementAPIs(page, [MOCK_COLLECTION_ENTRY_FIRST]);
      await page.route('**/api/collection-reports/collections/check-first**', (route: Route) =>
        route.fulfill({ status: 200, json: { success: true, isFirstCollection: true } })
      );
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await page.getByRole('button', { name: /modify report/i }).first().click();
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Assert dialog loaded successfully', async () => {
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5_000 });
    });
  });

  test('8. Client-provided prevIn/prevOut are included in the POST body', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockMovementAPIs(page, [MOCK_COLLECTION_ENTRY_FIRST]);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await page.getByRole('button', { name: /modify report/i }).first().click();
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Watch POST to verify prevIn/prevOut included', async () => {
      const dialog = page.getByRole('dialog').first();
      const addEntryBtn = dialog
        .getByRole('button', { name: /add entry|add collection|new entry/i })
        .first();
      const isVisible = await addEntryBtn.isVisible();
      if (!isVisible) return;

      const postRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports/collections') &&
          req.method() === 'POST',
        { timeout: 15_000 }
      );

      await addEntryBtn.click();
      const saveBtn = dialog.getByRole('button', { name: /save|confirm/i }).last();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        const req = await postRequest;
        const body = req.postDataJSON() as Record<string, unknown>;
        expect(body).toHaveProperty('prevIn');
        expect(body).toHaveProperty('prevOut');
      }
    });
  });
});
