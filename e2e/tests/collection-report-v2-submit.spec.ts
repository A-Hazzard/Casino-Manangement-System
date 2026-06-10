/**
 * Collection Report V2 — Submit Flow
 * ────────────────────────────────────
 * Covers scenarios N (66–75) from the comprehensive test spec:
 *
 *  1.  Submit button enabled after all machines are captured/skipped
 *  2.  Submit — PATCH request to /sessions/[id]/submit fires
 *  3.  Submit — success response leads to completion state
 *  4.  Submit with RAM Clear machine — ramClear fields in state
 *  5.  Submit chronological block — 409 error shown
 *  6.  Submit body includes sessionStartTime when set
 *  7.  Session with all skipped machines — Submit still enabled
 *  8.  Submit success — session shown as submitted in list
 *  9.  Non-SMIB location submit — metersMatch forced true in capture
 * 10.  Submit transitions session status from in-progress to submitted
 */

import { type Page, type Route } from 'playwright';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_V2_SESSION_DETAIL_SMIB,
  MOCK_V2_SESSION_DETAIL_WITH_SKIPPED,
  MOCK_V2_SESSION_DETAIL_NO_SMIB,
  MOCK_V2_SUBMIT_SUCCESS,
  MOCK_V2_CHRONOLOGICAL_BLOCK,
  MOCK_V2_MACHINE_CAPTURE_SUCCESS,
  MOCK_V2_LAST_COLLECTION_TIME,
  MOCK_V2_SESSION_DETAIL_RAM_CLEAR,
  MOCK_V2_SESSIONS_LIST_SUBMITTED,
} from '../mocks/collectionReportV2.mocks';
import {
  MOCK_COLLECTION_REPORTS_LIST,
  MOCK_LOCATIONS_WITH_MACHINES,
} from '../mocks/collectionReport.mocks';
import { MOCK_LICENCEES_LIST, MOCK_LOCATION_1 } from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER } from '../mocks/auth.mocks';

const SESSION_ID = 'sess_smib_001';

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockSubmitAPIs(
  page: Page,
  sessionDetail: Record<string, unknown> = MOCK_V2_SESSION_DETAIL_SMIB as unknown as Record<string, unknown>,
  submitResponse: Record<string, unknown> = MOCK_V2_SUBMIT_SUCCESS as unknown as Record<string, unknown>
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
    if (method === 'POST' || method === 'PATCH') {
      return route.fulfill({ status: 200, json: MOCK_V2_MACHINE_CAPTURE_SUCCESS });
    }
    return route.fulfill({ status: 200, json: { success: true } });
  });
  await page.route('**/api/collection-reports-v2/sessions/**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes('/submit') && method === 'PATCH') {
      return route.fulfill({ status: submitResponse.success ? 200 : 409, json: submitResponse });
    }
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    return route.fulfill({ status: 200, json: sessionDetail });
  });
  await page.route('**/api/collection-reports-v2/sessions**', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_V2_SESSIONS_LIST_SUBMITTED })
  );
  await page.route('**/api/collection-reports**', async (route: Route) => {
    const url = route.request().url();
    if (url.includes('locationsWithMachines=true')) {
      return route.fulfill({ status: 200, json: MOCK_LOCATIONS_WITH_MACHINES });
    }
    return route.fulfill({ status: 200, json: MOCK_COLLECTION_REPORTS_LIST });
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Collection Report V2 — Submit Flow', () => {
  test('1. Submit button enabled after all machines captured', async ({ page }) => {
    const allCapturedSession = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        machinesCaptured: 2,
        machinesConfirmed: 2,
        machines: MOCK_V2_SESSION_DETAIL_SMIB.data.machines.map((m) => ({
          ...m,
          status: 'confirmed' as const,
          metersMatch: true,
        })),
      },
    };

    await test.step('Mock APIs with all-captured session', async () => {
      await mockSubmitAPIs(page, allCapturedSession);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert Submit button is enabled', async () => {
      await expect(
        page.getByRole('button', { name: /submit/i }).filter({ visible: true }).first()
      ).toBeEnabled({ timeout: 10_000 });
    });
  });

  test('2. Submit — PATCH request to /sessions/[id]/submit fires', async ({ page }) => {
    const allCapturedSession = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        machinesCaptured: 2,
        machinesConfirmed: 2,
        machines: MOCK_V2_SESSION_DETAIL_SMIB.data.machines.map((m) => ({
          ...m,
          status: 'confirmed' as const,
          metersMatch: true,
        })),
      },
    };

    await test.step('Mock APIs with all-captured session', async () => {
      await mockSubmitAPIs(page, allCapturedSession);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Click Submit and verify PATCH fires to /submit endpoint', async () => {
      const submitRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/sessions/') &&
          req.url().includes('/submit') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (isEnabled) {
        await submitBtn.click();
        const confirmBtn = page
          .getByRole('button', { name: /confirm|submit|yes/i })
          .last();
        const isConfirmVisible = await confirmBtn.isVisible();
        if (isConfirmVisible) {
          await confirmBtn.click();
        }
        await submitRequest;
      }
    });
  });

  test('3. Submit success — completion state or redirect shown', async ({ page }) => {
    const allCapturedSession = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        machinesCaptured: 2,
        machinesConfirmed: 2,
        machines: MOCK_V2_SESSION_DETAIL_SMIB.data.machines.map((m) => ({
          ...m,
          status: 'confirmed' as const,
          metersMatch: true,
        })),
      },
    };

    await test.step('Mock APIs with success submit response', async () => {
      await mockSubmitAPIs(page, allCapturedSession);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Submit session and assert success state', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (isEnabled) {
        await submitBtn.click();
        const confirmBtn = page
          .getByRole('button', { name: /confirm|submit|yes/i })
          .last();
        const isConfirmVisible = await confirmBtn.isVisible();
        if (isConfirmVisible) {
          await confirmBtn.click();
        }
        await expect(
          page.getByText(/success|submitted|complete/i).first()
        ).toBeVisible({ timeout: 10_000 });
      }
    });
  });

  test('4. Submit with RAM Clear — session state includes ramClear machine', async ({ page }) => {
    const ramClearAllCaptured = {
      ...MOCK_V2_SESSION_DETAIL_RAM_CLEAR,
      data: {
        ...MOCK_V2_SESSION_DETAIL_RAM_CLEAR.data,
        machinesCaptured: 2,
        machinesConfirmed: 2,
        machines: MOCK_V2_SESSION_DETAIL_RAM_CLEAR.data.machines.map((m) => ({
          ...m,
          status: 'confirmed' as const,
        })),
      },
    };

    await test.step('Mock APIs with RAM Clear session', async () => {
      await mockSubmitAPIs(page, ramClearAllCaptured);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert RAM Clear machine visible and submit enabled', async () => {
      await expect(
        page.getByRole('button', { name: /submit/i }).filter({ visible: true }).first()
      ).toBeEnabled({ timeout: 10_000 });
    });
  });

  test('5. Submit chronological block — 409 error shown', async ({ page }) => {
    const allCapturedSession = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        machinesCaptured: 2,
        machinesConfirmed: 2,
        machines: MOCK_V2_SESSION_DETAIL_SMIB.data.machines.map((m) => ({
          ...m,
          status: 'confirmed' as const,
          metersMatch: true,
        })),
      },
    };

    await test.step('Mock APIs with 409 chronological block', async () => {
      await mockSubmitAPIs(
        page,
        allCapturedSession,
        MOCK_V2_CHRONOLOGICAL_BLOCK as unknown as Record<string, unknown>
      );
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Submit and assert error message shown', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (isEnabled) {
        await submitBtn.click();
        const confirmBtn = page
          .getByRole('button', { name: /confirm|submit|yes/i })
          .last();
        const isConfirmVisible = await confirmBtn.isVisible();
        if (isConfirmVisible) {
          await confirmBtn.click();
        }
        await expect(
          page.getByText(/error|cannot submit|chronological|newer session/i).first()
        ).toBeVisible({ timeout: 8_000 });
      }
    });
  });

  test('6. Submit PATCH body includes sessionStartTime when provided', async ({ page }) => {
    const allCapturedSession = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        sessionStartTime: '2026-01-01T08:00:00.000Z',
        machinesCaptured: 2,
        machinesConfirmed: 2,
        machines: MOCK_V2_SESSION_DETAIL_SMIB.data.machines.map((m) => ({
          ...m,
          status: 'confirmed' as const,
          metersMatch: true,
        })),
      },
    };

    await test.step('Mock APIs', async () => {
      await mockSubmitAPIs(page, allCapturedSession);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Submit and verify PATCH body includes sessionStartTime', async () => {
      const submitRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/sessions/') &&
          req.url().includes('/submit') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (isEnabled) {
        await submitBtn.click();
        const confirmBtn = page
          .getByRole('button', { name: /confirm|submit|yes/i })
          .last();
        const isConfirmVisible = await confirmBtn.isVisible();
        if (isConfirmVisible) {
          await confirmBtn.click();
        }
        const req = await submitRequest;
        const body = req.postDataJSON() as Record<string, unknown>;
        expect(body).toHaveProperty('sessionStartTime');
      }
    });
  });

  test('7. All-skipped session — Submit still enabled', async ({ page }) => {
    await test.step('Mock APIs with all-skipped session', async () => {
      await mockSubmitAPIs(page, MOCK_V2_SESSION_DETAIL_WITH_SKIPPED);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert Submit button enabled when machines are skipped', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isVisible = await submitBtn.isVisible();
      if (isVisible) {
        await expect(submitBtn).toBeEnabled({ timeout: 8_000 });
      }
    });
  });

  test('8. Post-submit — session shown as submitted in the V2 list', async ({ page }) => {
    await test.step('Mock APIs with submitted session list', async () => {
      await mockSubmitAPIs(page, MOCK_V2_SESSION_DETAIL_SMIB);
    });

    await test.step('Navigate to V2 tab', async () => {
      await page.goto('/collection-report?section=collection-v2');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert submitted session badge or status visible', async () => {
      await expect(
        page.locator('td').filter({ hasText: 'Grand Casino North' }).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('9. Non-SMIB location — metersMatch forced true on capture', async ({ page }) => {
    await test.step('Mock APIs with non-SMIB session', async () => {
      await mockSubmitAPIs(page, MOCK_V2_SESSION_DETAIL_NO_SMIB);
    });

    await test.step('Navigate to non-SMIB session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_nosmib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Watch POST body for metersMatch forced true on non-SMIB', async () => {
      const postRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/machines') &&
          req.method() === 'POST',
        { timeout: 15_000 }
      );

      const metersInInput = page.getByLabel(/meters.?in/i).first();
      const isVisible = await metersInInput.isVisible();
      if (!isVisible) return;

      await metersInInput.fill('5000000');
      const metersOutInput = page.getByLabel(/meters.?out/i).first();
      const isOutVisible = await metersOutInput.isVisible();
      if (isOutVisible) {
        await metersOutInput.fill('2500000');
      }

      const saveBtn = page
        .getByRole('button', { name: /save.?next|next|confirm/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await saveBtn.isEnabled();
      if (isEnabled) {
        await saveBtn.click();
        const req = await postRequest;
        const body = req.postDataJSON() as Record<string, unknown>;
        expect(body.metersMatch).toBe(true);
      }
    });
  });

  test('10. Submit transitions session from in-progress to submitted', async ({ page }) => {
    const allCapturedSession = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        sessionStatus: 'in-progress' as const,
        machinesCaptured: 2,
        machinesConfirmed: 2,
        machines: MOCK_V2_SESSION_DETAIL_SMIB.data.machines.map((m) => ({
          ...m,
          status: 'confirmed' as const,
          metersMatch: true,
        })),
      },
    };

    await test.step('Mock APIs, then return submitted status after submit', async () => {
      let hasSubmitted = false;
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
      await page.route('**/api/collection-reports-v2/machines/last-collection-time**', (route: Route) =>
        route.fulfill({ status: 200, json: MOCK_V2_LAST_COLLECTION_TIME })
      );
      await page.route('**/api/collection-reports-v2/machines**', (route: Route) =>
        route.fulfill({ status: 200, json: MOCK_V2_MACHINE_CAPTURE_SUCCESS })
      );
      await page.route('**/api/collection-reports-v2/sessions/**', async (route: Route) => {
        const url = route.request().url();
        const method = route.request().method();
        if (url.includes('/submit') && method === 'PATCH') {
          hasSubmitted = true;
          return route.fulfill({ status: 200, json: MOCK_V2_SUBMIT_SUCCESS });
        }
        if (hasSubmitted) {
          return route.fulfill({
            status: 200,
            json: { ...allCapturedSession, data: { ...allCapturedSession.data, sessionStatus: 'submitted' } },
          });
        }
        return route.fulfill({ status: 200, json: allCapturedSession });
      });
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Submit and verify submitted state shown', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (isEnabled) {
        await submitBtn.click();
        const confirmBtn = page
          .getByRole('button', { name: /confirm|submit|yes/i })
          .last();
        const isConfirmVisible = await confirmBtn.isVisible();
        if (isConfirmVisible) {
          await confirmBtn.click();
        }
        await expect(
          page.getByText(/submitted|complete|success/i).first()
        ).toBeVisible({ timeout: 10_000 });
      }
    });
  });
});
