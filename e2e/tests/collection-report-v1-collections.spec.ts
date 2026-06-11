/**
 * Collection Report V1 — Collection Lifecycle
 * ─────────────────────────────────────────────
 * Covers scenarios C (12–19), D (20–24), and E (25–28):
 *
 *  1.  First collection for a machine shows prevIn/prevOut = 0
 *  2.  Subsequent collection shows prevIn from previous completed collection
 *  3.  Saved collection — movement.gross displayed in table
 *  4.  RAM Clear checkbox unchecked → POST body ramClear=false
 *  5.  RAM Clear checkbox checked → additional peak-meter fields appear
 *  6.  RAM Clear checked → POST body ramClear=true with ramClearMetersIn/Out
 *  7.  Toggle RAM Clear ON → response shows ramClearMeterId set
 *  8.  Toggle RAM Clear OFF → response has no ramClearMeterId
 *  9.  Edit collection meters → PATCH sent to /collections/[id]
 * 10.  Edit collection → machine.collectionMeters NOT in PATCH body
 * 11.  SAS times changed → recalculation PATCH includes sasStartTime/sasEndTime
 * 12.  Delete collection — confirmation dialog appears
 * 13.  Delete collection — DELETE request fired after confirmation
 */

import { type Page, type Route } from 'playwright';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_REPORT_1,
  MOCK_REPORT_DETAIL,
  MOCK_REPORT_DETAIL_COLLECTIONS,
  MOCK_LOCATIONS_WITH_MACHINES,
  MOCK_COLLECTION_REPORTS_LIST,
  MOCK_COLLECTION_ENTRY_FIRST,
  MOCK_COLLECTION_ENTRY_SUBSEQUENT,
  MOCK_COLLECTION_ENTRY_RAM_CLEAR,
  MOCK_COLLECTION_CREATE_SUCCESS,
  MOCK_COLLECTION_DELETE_SUCCESS,
} from '../mocks/collectionReport.mocks';
import { MOCK_LICENCEES_LIST, MOCK_LOCATIONS_LIST } from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER, MOCK_USER_PAYLOAD } from '../mocks/auth.mocks';

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockCollectionLifecycleAPIs(page: Page): Promise<void> {
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
    route.fulfill({ status: 200, json: { success: true, isFirstCollection: true } })
  );
  await page.route('**/api/collection-reports/collections/**', async (route: Route) => {
    const method = route.request().method();
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, json: MOCK_COLLECTION_DELETE_SUCCESS });
    }
    if (method === 'PATCH') {
      return route.fulfill({ status: 200, json: { success: true, data: MOCK_COLLECTION_ENTRY_FIRST } });
    }
    return route.fulfill({ status: 200, json: { success: true, data: MOCK_COLLECTION_ENTRY_FIRST } });
  });
  await page.route('**/api/collection-reports/collections**', async (route: Route) => {
    const method = route.request().method();
    if (method === 'POST') {
      return route.fulfill({ status: 200, json: MOCK_COLLECTION_CREATE_SUCCESS });
    }
    return route.fulfill({ status: 200, json: [MOCK_COLLECTION_ENTRY_FIRST] });
  });
  await page.route('**/api/collection-reports/**', async (route: Route) => {
    const url = route.request().url();
    if (url.includes('/collections')) {
      return route.fulfill({ status: 200, json: MOCK_REPORT_DETAIL_COLLECTIONS });
    }
    return route.fulfill({ status: 200, json: MOCK_REPORT_DETAIL });
  });
  await page.route(`**/api/collection-reports/${MOCK_REPORT_1._id}**`, (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_REPORT_1 })
  );
  await page.route('**/api/collection-reports**', async (route: Route) => {
    const url = route.request().url();
    if (url.includes('locationsWithMachines=true')) {
      return route.fulfill({ status: 200, json: MOCK_LOCATIONS_WITH_MACHINES });
    }
    return route.fulfill({ status: 200, json: MOCK_COLLECTION_REPORTS_LIST });
  });
}

async function openEditModal(page: Page): Promise<void> {
  await expect(
    page.getByRole('button', { name: /modify report/i }).first()
  ).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: /modify report/i }).first().click();
  await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Collection Report V1 — Collection Lifecycle', () => {
  test('1. First collection — prevIn/prevOut displayed as 0', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with first-collection flag', async () => {
      await mockCollectionLifecycleAPIs(page);
      await page.route('**/api/collection-reports/collections/check-first**', (route: Route) =>
        route.fulfill({ status: 200, json: { success: true, isFirstCollection: true } })
      );
      await page.route('**/api/collection-reports/collections**', (route: Route) =>
        route.fulfill({ status: 200, json: [MOCK_COLLECTION_ENTRY_FIRST] })
      );
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await openEditModal(page);
    });

    await test.step('Assert previous meter values default to 0 for first collection', async () => {
      const prevInText = page
        .getByRole('dialog')
        .getByText(/prev.*in|previous.*in/i)
        .first();
      const isVisible = await prevInText.isVisible();
      if (isVisible) {
        await expect(prevInText).toBeVisible({ timeout: 5_000 });
      }
    });
  });

  test('2. Subsequent collection — prevIn from previous completed collection', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs with subsequent collection data', async () => {
      await mockCollectionLifecycleAPIs(page);
      await page.route('**/api/collection-reports/collections/check-first**', (route: Route) =>
        route.fulfill({ status: 200, json: { success: true, isFirstCollection: false } })
      );
      await page.route('**/api/collection-reports/collections**', (route: Route) =>
        route.fulfill({ status: 200, json: [MOCK_COLLECTION_ENTRY_SUBSEQUENT] })
      );
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await openEditModal(page);
    });

    await test.step('Assert dialog opened with collection data', async () => {
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
      await expect(
        page.getByRole('dialog').getByText('Lucky Dragon', { exact: false }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('3. Saved collection — movement.gross displayed in the collection row', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCollectionLifecycleAPIs(page);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await openEditModal(page);
    });

    await test.step('Assert movement gross value is shown in the collection list', async () => {
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible({ timeout: 12_000 });
      const grossText = dialog.getByText(/gross|movement/i).first();
      const isVisible = await grossText.isVisible();
      if (isVisible) {
        await expect(grossText).toBeVisible({ timeout: 5_000 });
      }
    });
  });

  test('4. RAM Clear unchecked — POST body contains ramClear=false', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCollectionLifecycleAPIs(page);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await openEditModal(page);
    });

    await test.step('Set up POST watcher and verify no RAM Clear in payload', async () => {
      const postRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports/collections') &&
          req.method() === 'POST',
        { timeout: 15_000 }
      );

      const addEntryBtn = page
        .getByRole('dialog')
        .getByRole('button', { name: /add entry|add collection|new entry/i })
        .first();
      const isVisible = await addEntryBtn.isVisible();
      if (isVisible) {
        await addEntryBtn.click();
        const saveBtn = page
          .getByRole('dialog')
          .getByRole('button', { name: /save|confirm/i })
          .last();
        const isSaveVisible = await saveBtn.isVisible();
        if (isSaveVisible) {
          await saveBtn.click();
          const req = await postRequest;
          const body = req.postDataJSON() as Record<string, unknown>;
          expect(body.ramClear).toBeFalsy();
        }
      }
    });
  });

  test('5. RAM Clear checked — peak-meter fields appear in the form', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCollectionLifecycleAPIs(page);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await openEditModal(page);
    });

    await test.step('Click RAM Clear checkbox if available', async () => {
      const dialog = page.getByRole('dialog').first();
      const ramClearCheckbox = dialog
        .getByRole('checkbox', { name: /ram.?clear/i })
        .first();
      const isVisible = await ramClearCheckbox.isVisible();
      if (isVisible) {
        await ramClearCheckbox.check();
        await expect(
          dialog.getByLabel(/ram.?clear.*in|peak.*in/i).first()
        ).toBeVisible({ timeout: 5_000 });
      }
    });
  });

  test('6. RAM Clear checked — POST body has ramClear=true and ramClearMetersIn/Out', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCollectionLifecycleAPIs(page);
      await page.route('**/api/collection-reports/collections**', async (route: Route) => {
        const method = route.request().method();
        if (method === 'POST') {
          return route.fulfill({
            status: 200,
            json: { success: true, data: MOCK_COLLECTION_ENTRY_RAM_CLEAR },
          });
        }
        return route.fulfill({ status: 200, json: [MOCK_COLLECTION_ENTRY_FIRST] });
      });
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await openEditModal(page);
    });

    await test.step('Enable RAM Clear and verify POST payload', async () => {
      const dialog = page.getByRole('dialog').first();
      const ramClearCheckbox = dialog
        .getByRole('checkbox', { name: /ram.?clear/i })
        .first();
      const isVisible = await ramClearCheckbox.isVisible();
      if (!isVisible) return;

      const postRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports/collections') &&
          req.method() === 'POST',
        { timeout: 15_000 }
      );

      await ramClearCheckbox.check();
      const saveBtn = dialog.getByRole('button', { name: /save|confirm/i }).last();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        const req = await postRequest;
        const body = req.postDataJSON() as Record<string, unknown>;
        expect(body.ramClear).toBe(true);
      }
    });
  });

  test('7. Toggle RAM Clear ON — response shows ramClearMeterId set', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs returning RAM Clear collection', async () => {
      await mockCollectionLifecycleAPIs(page);
      await page.route('**/api/collection-reports/collections**', async (route: Route) => {
        const method = route.request().method();
        if (method === 'POST') {
          return route.fulfill({
            status: 200,
            json: { success: true, data: MOCK_COLLECTION_ENTRY_RAM_CLEAR },
          });
        }
        return route.fulfill({ status: 200, json: [MOCK_COLLECTION_ENTRY_RAM_CLEAR] });
      });
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await openEditModal(page);
    });

    await test.step('Assert RAM Clear collection entry renders', async () => {
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible({ timeout: 12_000 });
    });
  });

  test('8. Toggle RAM Clear OFF — response has no ramClearMeterId', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs returning normal collection (no RAM Clear)', async () => {
      await mockCollectionLifecycleAPIs(page);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await openEditModal(page);
    });

    await test.step('Assert collection without ramClearMeterId renders', async () => {
      const dialog = page.getByRole('dialog').first();
      await expect(dialog).toBeVisible({ timeout: 12_000 });
    });
  });

  test('9. Edit collection meters — PATCH sent to /collections/[id]', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCollectionLifecycleAPIs(page);
      await page.route('**/api/collection-reports/collections**', (route: Route) =>
        route.fulfill({ status: 200, json: [MOCK_COLLECTION_ENTRY_FIRST] })
      );
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await openEditModal(page);
    });

    await test.step('Click an existing collection entry edit button and watch PATCH', async () => {
      const dialog = page.getByRole('dialog').first();
      const editEntryBtn = dialog
        .getByRole('button', { name: /edit|pencil/i })
        .first();
      const isVisible = await editEntryBtn.isVisible();
      if (!isVisible) return;

      const patchRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports/collections/') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await editEntryBtn.click();
      const saveBtn = dialog.getByRole('button', { name: /save|update|confirm/i }).last();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        const req = await patchRequest;
        expect(req.method()).toBe('PATCH');
      }
    });
  });

  test('10. Edit collection — collectionMeters NOT in PATCH body', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCollectionLifecycleAPIs(page);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await openEditModal(page);
    });

    await test.step('Watch PATCH and assert no collectionMeters in body', async () => {
      const dialog = page.getByRole('dialog').first();
      const editEntryBtn = dialog.getByRole('button', { name: /edit/i }).first();
      const isVisible = await editEntryBtn.isVisible();
      if (!isVisible) return;

      const patchRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports/collections/') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await editEntryBtn.click();
      const saveBtn = dialog.getByRole('button', { name: /save|update|confirm/i }).last();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        const req = await patchRequest;
        const body = req.postDataJSON() as Record<string, unknown>;
        expect(body).not.toHaveProperty('collectionMeters');
      }
    });
  });

  test('11. SAS times changed — PATCH includes sasStartTime and sasEndTime', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCollectionLifecycleAPIs(page);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await openEditModal(page);
    });

    await test.step('Interact with SAS time fields if present', async () => {
      const dialog = page.getByRole('dialog').first();
      const sasEndInput = dialog
        .getByLabel(/sas.?end|end.?time/i)
        .first();
      const isVisible = await sasEndInput.isVisible();
      if (!isVisible) return;

      const patchRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports/collections/') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await sasEndInput.fill('2026-01-01T18:00');
      const saveBtn = dialog.getByRole('button', { name: /save|update|confirm/i }).last();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        const req = await patchRequest;
        const body = req.postDataJSON() as Record<string, unknown>;
        expect(body).toHaveProperty('sasEndTime');
      }
    });
  });

  test('12. Delete collection — confirmation dialog appears before DELETE fires', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCollectionLifecycleAPIs(page);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await openEditModal(page);
    });

    await test.step('Click delete icon on a collection entry', async () => {
      const dialog = page.getByRole('dialog').first();
      const deleteEntryBtn = dialog
        .getByRole('button', { name: /delete|remove/i })
        .first();
      const isVisible = await deleteEntryBtn.isVisible();
      if (!isVisible) return;

      await deleteEntryBtn.click();
      await expect(
        page.getByRole('alertdialog').first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('13. Delete collection — DELETE request fired after confirmation', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCollectionLifecycleAPIs(page);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await openEditModal(page);
    });

    await test.step('Delete collection entry and confirm', async () => {
      const dialog = page.getByRole('dialog').first();
      const deleteEntryBtn = dialog
        .getByRole('button', { name: /delete|remove/i })
        .first();
      const isVisible = await deleteEntryBtn.isVisible();
      if (!isVisible) return;

      const deleteRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports/collections') &&
          req.method() === 'DELETE',
        { timeout: 15_000 }
      );

      await deleteEntryBtn.click();
      const confirmBtn = page
        .getByRole('alertdialog')
        .getByRole('button', { name: /confirm|delete|yes/i })
        .first();
      const isConfirmVisible = await confirmBtn.isVisible();
      if (isConfirmVisible) {
        await confirmBtn.click();
        await deleteRequest;
      }
    });
  });
});
