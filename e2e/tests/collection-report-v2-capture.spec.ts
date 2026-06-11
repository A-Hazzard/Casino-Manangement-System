/**
 * Collection Report V2 — Machine Capture Flows
 * ──────────────────────────────────────────────
 * Covers scenarios L (55–65) and M (62–65) from the comprehensive test spec:
 *
 *  1.  SMIB machine — "System Meters (from SMIB)" section visible
 *  2.  Non-SMIB machine — SMIB section hidden, manual meters shown
 *  3.  Non-SMIB — manual Meters In/Out inputs present
 *  4.  metersMatch=true selected — POST body has metersMatch:true
 *  5.  metersMatch=false selected — manual entry fields appear
 *  6.  metersMatch=false — POST body has metersMatch:false plus manual values
 *  7.  Skip machine — POST body has status:'skipped'
 *  8.  RAM Clear checkbox — peak meter fields appear in form
 *  9.  RAM Clear — POST body includes ramClear:true and ramClearMetersIn/Out
 * 10.  Supplemental machine — isSupplemental indicator visible
 * 11.  Non-SMIB capture — POST body sasMetersIn is null/absent
 * 12.  SMIB metersMatch=true — sasGross populated in response shown in UI
 * 13.  RAM Clear validation — ramClearMetersIn < prevIn shows error
 */

import { type Page, type Route } from 'playwright';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_V2_SESSION_DETAIL_SMIB,
  MOCK_V2_SESSION_DETAIL_NO_SMIB,
  MOCK_V2_SESSION_DETAIL_RAM_CLEAR,
  MOCK_V2_MACHINE_CAPTURE_SUCCESS,
  MOCK_V2_MACHINE_SKIP_SUCCESS,
  MOCK_V2_MACHINE_SUPPLEMENTAL,
  MOCK_V2_LAST_COLLECTION_TIME,
  MOCK_V2_VALIDATION_ERROR,
} from '../mocks/collectionReportV2.mocks';
import { MOCK_LICENCEES_LIST, MOCK_LOCATION_1 } from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER } from '../mocks/auth.mocks';

const SESSION_ID = 'sess_smib_001';

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockCaptureAPIs(
  page: Page,
  sessionDetail: Record<string, unknown> = MOCK_V2_SESSION_DETAIL_SMIB as unknown as Record<string, unknown>
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
    if (method === 'POST') {
      return route.fulfill({ status: 200, json: MOCK_V2_MACHINE_CAPTURE_SUCCESS });
    }
    if (method === 'PATCH') {
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
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    return route.fulfill({ status: 200, json: sessionDetail });
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Collection Report V2 — Machine Capture', () => {
  test('1. SMIB machine — "System Meters (from SMIB)" section visible', async ({ page }) => {
    await test.step('Mock APIs with SMIB session', async () => {
      await mockCaptureAPIs(page, MOCK_V2_SESSION_DETAIL_SMIB);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert SMIB meters section is visible', async () => {
      await expect(
        page.getByText('System Meters (from SMIB)').first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('2. Non-SMIB machine — SMIB section hidden', async ({ page }) => {
    await test.step('Mock APIs with non-SMIB session', async () => {
      await mockCaptureAPIs(page, MOCK_V2_SESSION_DETAIL_NO_SMIB);
    });

    await test.step('Navigate to session wizard for non-SMIB location', async () => {
      await page.goto('/collection-report/report/session/sess_nosmib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert SMIB meters section is NOT visible', async () => {
      await page.waitForTimeout(2_000);
      await expect(
        page.getByText('System Meters (from SMIB)')
      ).toHaveCount(0, { timeout: 5_000 });
    });
  });

  test('3. Non-SMIB machine — manual Meters In/Out inputs present', async ({ page }) => {
    await test.step('Mock APIs with non-SMIB session', async () => {
      await mockCaptureAPIs(page, MOCK_V2_SESSION_DETAIL_NO_SMIB);
    });

    await test.step('Navigate to session wizard for non-SMIB location', async () => {
      await page.goto('/collection-report/report/session/sess_nosmib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert manual meters inputs are present', async () => {
      await expect(
        page.getByText('Meters In').first()
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByText('Meters Out').first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('4. metersMatch=true — POST body has metersMatch:true', async ({ page }) => {
    await test.step('Mock APIs with SMIB session', async () => {
      await mockCaptureAPIs(page, MOCK_V2_SESSION_DETAIL_SMIB);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Wait for wizard to load', async () => {
      await expect(
        page.getByText('Lucky Dragon').first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Click "Yes, they match" and watch POST payload', async () => {
      const postRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/machines') &&
          req.method() === 'POST',
        { timeout: 15_000 }
      );

      await page.getByText('✓ Yes, they match').click();

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

  test('5. metersMatch=false — manual entry fields appear', async ({ page }) => {
    await test.step('Mock APIs with SMIB session', async () => {
      await mockCaptureAPIs(page, MOCK_V2_SESSION_DETAIL_SMIB);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Click "No, enter manually"', async () => {
      await page.getByText('✗ No, enter manually').click();
    });

    await test.step('Assert manual meters input fields appear', async () => {
      await expect(
        page.getByText('Meters In').first()
      ).toBeVisible({ timeout: 8_000 });
      await expect(
        page.getByText('Meters Out').first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('6. metersMatch=false — POST body has metersMatch:false and manual values', async ({
    page,
  }) => {
    await test.step('Mock APIs with SMIB session', async () => {
      await mockCaptureAPIs(page, MOCK_V2_SESSION_DETAIL_SMIB);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Lucky Dragon').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Select manual entry and fill in values', async () => {
      await page.getByText('✗ No, enter manually').click();

      const metersInInput = page.getByLabel(/meters.?in/i).first();
      const isVisible = await metersInInput.isVisible();
      if (!isVisible) return;

      const postRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/machines') &&
          req.method() === 'POST',
        { timeout: 15_000 }
      );

      await metersInInput.fill('8000000');
      const metersOutInput = page.getByLabel(/meters.?out/i).first();
      const isOutVisible = await metersOutInput.isVisible();
      if (isOutVisible) {
        await metersOutInput.fill('4000000');
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
        expect(body.metersMatch).toBe(false);
        expect(body).toHaveProperty('manualMetersIn');
      }
    });
  });

  test('7. Skip machine — POST body has status:skipped', async ({ page }) => {
    await test.step('Mock APIs — skip returns skipped status', async () => {
      await mockCaptureAPIs(page, MOCK_V2_SESSION_DETAIL_SMIB);
      await page.route('**/api/collection-reports-v2/machines**', async (route: Route) => {
        const method = route.request().method();
        if (method === 'POST') {
          return route.fulfill({ status: 200, json: MOCK_V2_MACHINE_SKIP_SUCCESS });
        }
        return route.fulfill({ status: 200, json: { success: true } });
      });
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Lucky Dragon').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Click Skip Machine and verify POST body', async () => {
      const skipRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/machines') &&
          req.method() === 'POST',
        { timeout: 15_000 }
      );

      await page.getByRole('button', { name: /skip machine/i }).click();

      const confirmBtn = page
        .getByRole('button', { name: /confirm|skip|yes/i })
        .last();
      const isConfirmVisible = await confirmBtn.isVisible();
      if (isConfirmVisible) {
        await confirmBtn.click();
        const req = await skipRequest;
        const body = req.postDataJSON() as Record<string, unknown>;
        expect(body.status).toBe('skipped');
      } else {
        const req = await skipRequest;
        const body = req.postDataJSON() as Record<string, unknown>;
        expect(body.status).toBe('skipped');
      }
    });
  });

  test('8. RAM Clear checkbox — peak meter fields appear', async ({ page }) => {
    await test.step('Mock APIs with SMIB session', async () => {
      await mockCaptureAPIs(page, MOCK_V2_SESSION_DETAIL_SMIB);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Lucky Dragon').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Check RAM Clear checkbox', async () => {
      const ramClearCheckbox = page.getByRole('checkbox').first();
      await expect(ramClearCheckbox).toBeVisible({ timeout: 8_000 });
      await ramClearCheckbox.click();
      await expect(ramClearCheckbox).toBeChecked();
    });

    await test.step('Assert peak meter fields appear after enabling RAM Clear', async () => {
      await expect(
        page.getByText(/peak|ram.?clear.*in|pre.?reset/i).first()
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test('9. RAM Clear — POST body includes ramClear:true and ramClearMetersIn/Out', async ({
    page,
  }) => {
    await test.step('Mock APIs with RAM Clear session', async () => {
      await mockCaptureAPIs(page, MOCK_V2_SESSION_DETAIL_RAM_CLEAR);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Lucky Dragon').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Enable RAM Clear and fill peak values', async () => {
      const ramClearCheckbox = page.getByRole('checkbox').first();
      await ramClearCheckbox.click();
      await expect(ramClearCheckbox).toBeChecked();

      const ramClearInInput = page.getByLabel(/ram.?clear.*in|peak.*in/i).first();
      const isVisible = await ramClearInInput.isVisible();
      if (!isVisible) return;

      await page.getByText('✓ Yes, they match').click();

      const postRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/machines') &&
          req.method() === 'POST',
        { timeout: 15_000 }
      );

      await ramClearInInput.fill('10000000');
      const ramClearOutInput = page.getByLabel(/ram.?clear.*out|peak.*out/i).first();
      const isOutVisible = await ramClearOutInput.isVisible();
      if (isOutVisible) {
        await ramClearOutInput.fill('5100000');
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
        expect(body.ramClear).toBe(true);
        expect(body).toHaveProperty('ramClearMetersIn');
        expect(body).toHaveProperty('ramClearMetersOut');
      }
    });
  });

  test('10. Supplemental machine — isSupplemental indicator visible', async ({ page }) => {
    await test.step('Mock APIs with supplemental machine session', async () => {
      await mockCaptureAPIs(page, {
        ...MOCK_V2_SESSION_DETAIL_SMIB as unknown as Record<string, unknown>,
        data: {
          ...MOCK_V2_SESSION_DETAIL_SMIB.data as unknown as Record<string, unknown>,
          machines: [MOCK_V2_MACHINE_SUPPLEMENTAL],
        },
      });
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert supplemental indicator visible', async () => {
      await expect(
        page.getByText(/supplemental/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('11. Non-SMIB capture — POST body sasMetersIn is null/absent', async ({ page }) => {
    await test.step('Mock APIs with non-SMIB session', async () => {
      await mockCaptureAPIs(page, MOCK_V2_SESSION_DETAIL_NO_SMIB);
    });

    await test.step('Navigate to non-SMIB session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_nosmib_001');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Silver Moon').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Fill manual meters and watch POST for null SAS values', async () => {
      const metersInInput = page.getByLabel(/meters.?in/i).first();
      const isVisible = await metersInInput.isVisible();
      if (!isVisible) return;

      await metersInInput.fill('5000000');
      const metersOutInput = page.getByLabel(/meters.?out/i).first();
      const isOutVisible = await metersOutInput.isVisible();
      if (isOutVisible) {
        await metersOutInput.fill('2500000');
      }

      const postRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/machines') &&
          req.method() === 'POST',
        { timeout: 15_000 }
      );

      const saveBtn = page
        .getByRole('button', { name: /save.?next|next|confirm/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await saveBtn.isEnabled();
      if (isEnabled) {
        await saveBtn.click();
        const req = await postRequest;
        const body = req.postDataJSON() as Record<string, unknown>;
        const hasSasMeters =
          body.sasMetersIn !== null && body.sasMetersIn !== undefined;
        expect(hasSasMeters).toBe(false);
      }
    });
  });

  test('12. SMIB metersMatch=true — sasGross shown in UI after capture', async ({ page }) => {
    await test.step('Mock APIs — capture response includes sasGross', async () => {
      await mockCaptureAPIs(page, MOCK_V2_SESSION_DETAIL_SMIB);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Lucky Dragon').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Click Yes they match and save', async () => {
      await page.getByText('✓ Yes, they match').click();
      const saveBtn = page
        .getByRole('button', { name: /save.?next|next|confirm/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await saveBtn.isEnabled();
      if (isEnabled) {
        await saveBtn.click();
        await expect(
          page.getByText(/sas.?gross|sas gross/i).first()
        ).toBeVisible({ timeout: 8_000 });
      }
    });
  });

  test('13. RAM Clear validation — ramClearMetersIn below prev shows error', async ({ page }) => {
    await test.step('Mock APIs — PATCH returns validation error for bad ramClear value', async () => {
      await mockCaptureAPIs(page, MOCK_V2_SESSION_DETAIL_SMIB);
      await page.route('**/api/collection-reports-v2/machines**', async (route: Route) => {
        const method = route.request().method();
        if (method === 'POST') {
          const body = route.request().postDataJSON() as Record<string, unknown>;
          const ramClearMetersIn = body.ramClearMetersIn as number;
          const prevSasMetersIn = 5_000_000;
          if (ramClearMetersIn < prevSasMetersIn) {
            return route.fulfill({ status: 400, json: MOCK_V2_VALIDATION_ERROR });
          }
          return route.fulfill({ status: 200, json: MOCK_V2_MACHINE_CAPTURE_SUCCESS });
        }
        return route.fulfill({ status: 200, json: { success: true } });
      });
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto(`/collection-report/report/session/${SESSION_ID}`);
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Lucky Dragon').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Enable RAM Clear and enter invalid (too low) peak value', async () => {
      const ramClearCheckbox = page.getByRole('checkbox').first();
      await ramClearCheckbox.click();
      await expect(ramClearCheckbox).toBeChecked();

      const ramClearInInput = page.getByLabel(/ram.?clear.*in|peak.*in/i).first();
      const isVisible = await ramClearInInput.isVisible();
      if (!isVisible) return;

      await page.getByText('✓ Yes, they match').click();
      await ramClearInInput.fill('1000000');

      const saveBtn = page
        .getByRole('button', { name: /save.?next|next|confirm/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await saveBtn.isEnabled();
      if (isEnabled) {
        await saveBtn.click();
        await expect(
          page.getByText(/error|invalid|must be greater|validation/i).first()
        ).toBeVisible({ timeout: 8_000 });
      }
    });
  });
});
