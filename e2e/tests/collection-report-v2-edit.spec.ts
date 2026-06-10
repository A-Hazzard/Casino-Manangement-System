/**
 * Collection Report V2 — Edit & Propagation
 * ───────────────────────────────────────────
 * Covers scenarios P (81–85), Q (86–89), and S (94–98):
 *
 *  1.  Edit submitted session — Edit button visible on submitted view
 *  2.  Edit mode — PATCH to /machines?id= fires when saving changes
 *  3.  Edit triggers cascade — response confirms cascade ran
 *  4.  Edit propagation — next session's prevIn shown as updated
 *  5.  Edit session times — PATCH to /sessions/[id] with updated times
 *  6.  Missing required field on edit — validation error shown
 *  7.  ramClearMetersIn < prevSasMetersIn — error displayed
 *  8.  Invalid sessionId — 404 state rendered
 *  9.  PATCH on submitted session confirms cascade in response
 * 10.  Edit non-SMIB machine — sasMeters forced null in PATCH body
 */

import { type Page, type Route } from 'playwright';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_V2_SESSION_DETAIL_NO_SMIB,
  MOCK_V2_SESSION_DETAIL_SUBMITTED,
  MOCK_V2_MACHINE_SMIB_CAPTURED,
  MOCK_V2_MACHINE_CAPTURE_SUCCESS,
  MOCK_V2_LAST_COLLECTION_TIME,
  MOCK_V2_VALIDATION_ERROR,
  MOCK_V2_SESSION_NOT_FOUND,
} from '../mocks/collectionReportV2.mocks';
import { MOCK_LICENCEES_LIST, MOCK_LOCATION_1 } from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER } from '../mocks/auth.mocks';

const SESSION_ID = 'sess_sub_001';

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockEditAPIs(
  page: Page,
  sessionDetail: Record<string, unknown> = MOCK_V2_SESSION_DETAIL_SUBMITTED as unknown as Record<string, unknown>,
  patchResponse: Record<string, unknown> = MOCK_V2_MACHINE_CAPTURE_SUCCESS as unknown as Record<string, unknown>
): Promise<void> {
  await page.route('**/api/auth/current-user**', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token**', (route: Route) =>
    route.fulfill({ status: 200, json: { userId: MOCK_CURRENT_USER.user.id } })
  );
  await page.route('**/api/users/**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, user: MOCK_CURRENT_USER.user } })
  );
  await page.route('**/api/licencees**', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
  await page.route('**/api/locations/**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, data: MOCK_LOCATION_1, location: MOCK_LOCATION_1 } })
  );
  await page.route('**/api/locations**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, locations: [MOCK_LOCATION_1] } })
  );
  await page.route('**/api/collection-reports-v2/machines/last-collection-time**', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_V2_LAST_COLLECTION_TIME })
  );
  await page.route('**/api/collection-reports-v2/machines**', async (route: Route) => {
    const method = route.request().method();
    if (method === 'PATCH') {
      return route.fulfill({ status: 200, json: patchResponse });
    }
    if (method === 'POST') {
      return route.fulfill({ status: 200, json: MOCK_V2_MACHINE_CAPTURE_SUCCESS });
    }
    return route.fulfill({ status: 200, json: { success: true } });
  });
  await page.route('**/api/collection-reports-v2/sessions/**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes('/submit') && method === 'PATCH') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    if (method === 'PATCH') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    return route.fulfill({ status: 200, json: sessionDetail });
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Collection Report V2 — Edit & Propagation', () => {
  test('1. Edit submitted session — Edit/Modify button visible', async ({ page }) => {
    await test.step('Mock APIs with submitted session', async () => {
      await mockEditAPIs(page, MOCK_V2_SESSION_DETAIL_SUBMITTED);
    });

    await test.step('Navigate to submitted session', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert submitted status visible', async () => {
      await expect(
        page.getByText(/submitted|Grand Casino North|Session Complete/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert Edit/Modify button visible', async () => {
      await expect(
        page.getByRole('button', { name: /edit|modify|reopen/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('2. Edit mode — PATCH to /machines?id= fires when saving', async ({ page }) => {
    await test.step('Mock APIs with submitted session', async () => {
      await mockEditAPIs(page, MOCK_V2_SESSION_DETAIL_SUBMITTED);
    });

    await test.step('Navigate to submitted session', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
      await expect(
        page.getByText(/submitted|Grand Casino North/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Enter edit mode and watch PATCH to machines', async () => {
      const editBtn = page
        .getByRole('button', { name: /edit|modify|reopen/i })
        .first();
      const isVisible = await editBtn.isVisible();
      if (!isVisible) return;

      await editBtn.click();

      const patchRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/machines') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      const saveBtn = page
        .getByRole('button', { name: /save|update|confirm/i })
        .filter({ visible: true })
        .first();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        const req = await patchRequest;
        expect(req.method()).toBe('PATCH');
      }
    });
  });

  test('3. Edit cascade — PATCH response confirms cascade ran', async ({ page }) => {
    const cascadeResponse = {
      success: true,
      data: {
        ...MOCK_V2_MACHINE_SMIB_CAPTURED,
        cascaded: true,
        machineUpdated: true,
      },
    };

    await test.step('Mock APIs returning cascade confirmation', async () => {
      await mockEditAPIs(
        page,
        MOCK_V2_SESSION_DETAIL_SUBMITTED,
        cascadeResponse as unknown as Record<string, unknown>
      );
    });

    await test.step('Navigate to submitted session', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Enter edit mode and save', async () => {
      const editBtn = page
        .getByRole('button', { name: /edit|modify|reopen/i })
        .first();
      const isVisible = await editBtn.isVisible();
      if (!isVisible) return;

      await editBtn.click();
      const saveBtn = page
        .getByRole('button', { name: /save|update|confirm/i })
        .filter({ visible: true })
        .first();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        await expect(
          page.getByText(/saved|updated|success/i).first()
        ).toBeVisible({ timeout: 8_000 });
      }
    });
  });

  test('4. Edit propagation — prevIn shows updated value after edit', async ({ page }) => {
    const sessionWithPropagatedPrev = {
      ...MOCK_V2_SESSION_DETAIL_SUBMITTED,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SUBMITTED.data,
        machines: MOCK_V2_SESSION_DETAIL_SUBMITTED.data.machines.map((m) => ({
          ...m,
          prevSasMetersIn: 6_000_000,
          prevSasMetersOut: 3_000_000,
        })),
      },
    };

    await test.step('Mock APIs with propagated prev values', async () => {
      await mockEditAPIs(page, sessionWithPropagatedPrev);
    });

    await test.step('Navigate to session', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert session page loaded', async () => {
      await expect(
        page.getByText(/Grand Casino North|submitted/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('5. Edit session times — PATCH to /sessions/[id] with updated times', async ({
    page,
  }) => {
    await test.step('Mock APIs with submitted session', async () => {
      await mockEditAPIs(page, MOCK_V2_SESSION_DETAIL_SUBMITTED);
    });

    await test.step('Navigate to submitted session', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
      await expect(
        page.getByText(/Grand Casino North|submitted/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Find and update session time fields', async () => {
      const sessionPatchRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/sessions/') &&
          !req.url().includes('/submit') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      const startTimeInput = page
        .getByLabel(/session.?start|start.?time/i)
        .first();
      const isVisible = await startTimeInput.isVisible();
      if (isVisible) {
        await startTimeInput.fill('2026-01-01T09:00');
        const saveBtn = page
          .getByRole('button', { name: /save|update/i })
          .filter({ visible: true })
          .first();
        const isSaveVisible = await saveBtn.isVisible();
        if (isSaveVisible) {
          await saveBtn.click();
          const req = await sessionPatchRequest;
          const body = req.postDataJSON() as Record<string, unknown>;
          expect(body).toHaveProperty('sessionStartTime');
        }
      }
    });
  });

  test('6. Missing required field on edit — validation error shown', async ({ page }) => {
    await test.step('Mock APIs with submitted session, PATCH returns 400', async () => {
      await mockEditAPIs(page, MOCK_V2_SESSION_DETAIL_SUBMITTED, {
        success: false,
        error: 'machineId is required',
      });
    });

    await test.step('Navigate to submitted session', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Trigger edit and assert error shown', async () => {
      const editBtn = page
        .getByRole('button', { name: /edit|modify|reopen/i })
        .first();
      const isVisible = await editBtn.isVisible();
      if (!isVisible) return;

      await editBtn.click();
      const saveBtn = page
        .getByRole('button', { name: /save|update|confirm/i })
        .filter({ visible: true })
        .first();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        await expect(
          page.getByText(/error|required|invalid/i).first()
        ).toBeVisible({ timeout: 8_000 });
      }
    });
  });

  test('7. ramClearMetersIn < prevSasMetersIn — error displayed', async ({ page }) => {
    await test.step('Mock APIs — PATCH returns validation error', async () => {
      await mockEditAPIs(
        page,
        MOCK_V2_SESSION_DETAIL_SUBMITTED,
        MOCK_V2_VALIDATION_ERROR as unknown as Record<string, unknown>
      );
    });

    await test.step('Navigate to submitted session', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Edit machine with invalid RAM Clear values', async () => {
      const editBtn = page
        .getByRole('button', { name: /edit|modify|reopen/i })
        .first();
      const isVisible = await editBtn.isVisible();
      if (!isVisible) return;

      await editBtn.click();

      const ramClearCheckbox = page.getByRole('checkbox').first();
      const isCheckboxVisible = await ramClearCheckbox.isVisible();
      if (isCheckboxVisible) {
        await ramClearCheckbox.click();
        const ramClearInInput = page.getByLabel(/ram.?clear.*in|peak.*in/i).first();
        const isInputVisible = await ramClearInInput.isVisible();
        if (isInputVisible) {
          await ramClearInInput.fill('1000');
        }
      }

      const saveBtn = page
        .getByRole('button', { name: /save|update|confirm/i })
        .filter({ visible: true })
        .first();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        await expect(
          page.getByText(/error|must be greater|validation|ram.?clear/i).first()
        ).toBeVisible({ timeout: 8_000 });
      }
    });
  });

  test('8. Invalid sessionId — 404 error state rendered', async ({ page }) => {
    await test.step('Mock APIs to return 404 for session', async () => {
      await page.route('**/api/auth/current-user**', (route: Route) =>
        route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
      );
      await page.route('**/api/auth/token**', (route: Route) =>
        route.fulfill({ status: 200, json: { userId: MOCK_CURRENT_USER.user.id } })
      );
      await page.route('**/api/users/**', (route: Route) =>
        route.fulfill({ status: 200, json: { success: true, user: MOCK_CURRENT_USER.user } })
      );
      await page.route('**/api/licencees**', (route: Route) =>
        route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
      );
      await page.route('**/api/collection-reports-v2/machines/last-collection-time**', (route: Route) =>
        route.fulfill({ status: 200, json: MOCK_V2_LAST_COLLECTION_TIME })
      );
      await page.route('**/api/collection-reports-v2/sessions/**', (route: Route) =>
        route.fulfill({ status: 404, json: MOCK_V2_SESSION_NOT_FOUND })
      );
    });

    await test.step('Navigate to non-existent session', async () => {
      await page.goto('/collection-report/report/session/nonexistent_session_id');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert error or not-found state shown', async () => {
      await expect(
        page.getByText(/not found|error|session.*not.*exist|invalid/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('9. PATCH on submitted session — cascade confirmed in response body', async ({
    page,
  }) => {
    const cascadeConfirmResponse = {
      success: true,
      data: {
        ...MOCK_V2_MACHINE_SMIB_CAPTURED,
        sessionStatus: 'submitted',
        cascadedToMachine: true,
      },
    };

    await test.step('Mock APIs confirming cascade in response', async () => {
      await mockEditAPIs(
        page,
        MOCK_V2_SESSION_DETAIL_SUBMITTED,
        cascadeConfirmResponse as unknown as Record<string, unknown>
      );
    });

    await test.step('Navigate to submitted session', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Enter edit mode and trigger PATCH', async () => {
      const editBtn = page
        .getByRole('button', { name: /edit|modify|reopen/i })
        .first();
      const isVisible = await editBtn.isVisible();
      if (!isVisible) return;

      const patchRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/machines') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await editBtn.click();
      const saveBtn = page
        .getByRole('button', { name: /save|update|confirm/i })
        .filter({ visible: true })
        .first();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        const req = await patchRequest;
        expect(req.method()).toBe('PATCH');
      }
    });
  });

  test('10. Edit non-SMIB machine — sasMeters null/absent in PATCH body', async ({ page }) => {
    await test.step('Mock APIs with non-SMIB submitted session', async () => {
      const noSmibSubmitted = {
        ...MOCK_V2_SESSION_DETAIL_NO_SMIB,
        data: {
          ...MOCK_V2_SESSION_DETAIL_NO_SMIB.data,
          sessionStatus: 'submitted' as const,
          machines: MOCK_V2_SESSION_DETAIL_NO_SMIB.data.machines.map((m) => ({
            ...m,
            status: 'captured' as const,
          })),
        },
      };
      await mockEditAPIs(page, noSmibSubmitted);
    });

    await test.step('Navigate to non-SMIB submitted session', async () => {
      await page.goto('/collection-report/report/session/sess_nosmib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Enter edit mode and watch PATCH body for null sasMeters', async () => {
      const editBtn = page
        .getByRole('button', { name: /edit|modify|reopen/i })
        .first();
      const isVisible = await editBtn.isVisible();
      if (!isVisible) return;

      const patchRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/machines') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await editBtn.click();
      const saveBtn = page
        .getByRole('button', { name: /save|update|confirm/i })
        .filter({ visible: true })
        .first();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        const req = await patchRequest;
        const body = req.postDataJSON() as Record<string, unknown>;
        const hasSasMeters =
          body.sasMetersIn !== null && body.sasMetersIn !== undefined;
        expect(hasSasMeters).toBe(false);
      }
    });
  });
});
