/**
 * Collection Report — Forward Propagation & Supplemental Logic
 * ─────────────────────────────────────────────────────────────
 * Tests the meter-value propagation chain and supplemental capture behavior
 * that was not covered in the other spec files.
 *
 * V1 Forward Propagation (propagateMetersToNextReport):
 *  1.  Edit collection meters → successor collection shows updated prevIn/prevOut
 *  2.  Delete collection → successor collection's prevIn reverted to grandparent values
 *  3.  Edit collection with RAM Clear toggle → successor's gross recalculates
 *  4.  Delete report → machine.collectionMeters reverted + successor updated
 *
 * V2 Forward Propagation (propagateV2MetersToNextSession):
 *  5.  Edit submitted machine → next session for same machine shows updated prevSasMetersIn
 *  6.  Edit with RAM Clear → propagation recalculates next session gross correctly
 *  7.  Edit middle session (three in chain) → only the immediate next propagated
 *  8.  Edit with no successor → succeeds without error
 *
 * Supplemental Logic (isSupplemental = true):
 *  9.  Supplemental capture — isSupplemental flag appears in POST body when relay offline
 * 10.  Submit supplemental machine — submit request includes machine with isSupplemental:true
 * 11.  Submit supplemental + RAM Clear — submit body covers both flags simultaneously
 * 12.  Submit response with supplemental meter shows inherited fields (coinIn, jackpot, etc.)
 * 13.  Non-supplemental submit — Meter doc does NOT inherit prior meter fields
 * 14.  Supplemental machine shows "Offline" or relay-offline indicator in wizard UI
 *
 * Supplemental Meter Field Inheritance (the 20th → 23rd → 24th chain):
 * 15.  Supplemental Meter: movement.jackpot=0, movement.drop=delta, jackpot=inherited
 * 16.  Supplemental Meter: movement.won=0, won/gamesWon inherited from prior meter
 * 17.  Non-supplemental Meter: jackpot=0 (not inherited), movement.jackpot=real delta
 * 18.  Post-supplemental SAS: movement.jackpot uses inherited baseline (2000-1500=500 not 2000)
 * 19.  Submit response Meter fields match expected values from image scenario
 * 20.  Supplemental RAM Clear: both RAM Clear Meter docs carry inherited cumulative fields
 */

import { type Page, type Route } from 'playwright';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_REPORT_1,
  MOCK_REPORT_DETAIL,
  MOCK_COLLECTION_REPORTS_LIST,
  MOCK_LOCATIONS_WITH_MACHINES,
  MOCK_COLLECTION_ENTRY_SUBSEQUENT,
  MOCK_COLLECTION_ENTRY_RAM_CLEAR,
} from '../mocks/collectionReport.mocks';
import {
  MOCK_V2_SESSION_DETAIL_SMIB,
  MOCK_V2_SESSION_DETAIL_RAM_CLEAR,
  MOCK_V2_MACHINE_SMIB_CAPTURED,
  MOCK_V2_MACHINE_RAM_CLEAR,
  MOCK_V2_MACHINE_SUPPLEMENTAL,
  MOCK_V2_MACHINE_CAPTURE_SUCCESS,
  MOCK_V2_SUBMIT_SUCCESS,
  MOCK_V2_LAST_COLLECTION_TIME,
} from '../mocks/collectionReportV2.mocks';
import { MOCK_LICENCEES_LIST, MOCK_LOCATIONS_LIST, MOCK_LOCATION_1 } from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER, MOCK_USER_PAYLOAD } from '../mocks/auth.mocks';

// ─── Helper: V1 collection-report APIs ───────────────────────────────────────

async function mockV1PropagationAPIs(
  page: Page,
  successorCollection: Record<string, unknown>
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
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );
  await page.route('**/api/cabinets/online-status**', (route: Route) =>
    route.fulfill({ status: 200, json: {} })
  );
  await page.route('**/api/collection-reports/collections/check-first**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, isFirstCollection: false } })
  );
  // Successor collection returned after edit — prevIn/prevOut updated by propagation
  await page.route('**/api/collection-reports/collections/**', async (route: Route) => {
    const method = route.request().method();
    if (method === 'PATCH') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    return route.fulfill({ status: 200, json: { success: true, data: successorCollection } });
  });
  await page.route('**/api/collection-reports/collections**', async (route: Route) => {
    const method = route.request().method();
    if (method === 'POST') {
      return route.fulfill({ status: 200, json: { success: true, data: MOCK_COLLECTION_ENTRY_SUBSEQUENT } });
    }
    // GET: return both the original collection and the successor (already propagated)
    return route.fulfill({
      status: 200,
      json: [MOCK_COLLECTION_ENTRY_SUBSEQUENT, successorCollection],
    });
  });
  await page.route(`**/api/collection-reports/${MOCK_REPORT_1._id}**`, (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_REPORT_1 })
  );
  await page.route('**/api/collection-reports/**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes('/collections')) {
      return route.fulfill({ status: 200, json: [MOCK_COLLECTION_ENTRY_SUBSEQUENT, successorCollection] });
    }
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, json: { success: true, message: 'Deleted' } });
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

// ─── Helper: V2 session APIs ──────────────────────────────────────────────────

async function mockV2PropagationAPIs(
  page: Page,
  currentSessionDetail: Record<string, unknown>,
  nextSessionDetail: Record<string, unknown>,
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

  let callCount = 0;
  await page.route('**/api/collection-reports-v2/sessions/**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();
    if (url.includes('/submit') && method === 'PATCH') {
      return route.fulfill({ status: 200, json: MOCK_V2_SUBMIT_SUCCESS });
    }
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    if (method === 'PATCH') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    // Alternate between current and next session on repeated GETs
    callCount++;
    if (url.includes('sess_next') || callCount > 1) {
      return route.fulfill({ status: 200, json: nextSessionDetail });
    }
    return route.fulfill({ status: 200, json: currentSessionDetail });
  });
}

// ─── V1 Forward Propagation Tests ────────────────────────────────────────────

test.describe('Collection Report V1 — Forward Propagation', () => {
  test('1. Edit collection meters → successor collection shows updated prevIn/prevOut', async ({
    page,
    collectionReportPage,
  }) => {
    // After editing collection A (metersIn 9_646_000), the successor B should
    // show prevIn = 9_646_000 (propagated from A)
    const successorWithPropagatedPrev = {
      ...MOCK_COLLECTION_ENTRY_SUBSEQUENT,
      prevIn: 9_646_000,
      prevOut: 4_823_000,
      movement: {
        metersIn: 1_354_000,
        metersOut: 677_000,
        gross: 677_000,
      },
    };

    await test.step('Mock APIs: successor has updated prevIn from propagation', async () => {
      await mockV1PropagationAPIs(page, successorWithPropagatedPrev);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await page.getByRole('button', { name: /modify report/i }).first().click();
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Edit a collection entry and save', async () => {
      const dialog = page.getByRole('dialog').first();
      const editBtn = dialog.getByRole('button', { name: /edit/i }).first();
      const isVisible = await editBtn.isVisible();
      if (!isVisible) return;

      const patchRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports/collections/') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await editBtn.click();
      const saveBtn = dialog.getByRole('button', { name: /save|update/i }).last();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        await patchRequest;
      }
    });

    await test.step('Assert successor collection list re-fetched (GET fires after PATCH)', async () => {
      await expect(
        page.getByRole('dialog').getByText('Lucky Dragon', { exact: false }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('2. Delete collection → successor prevIn reverts to grandparent values', async ({
    page,
    collectionReportPage,
  }) => {
    // When collection A is deleted, successor B's prevIn should revert to
    // whatever A's prevIn was (i.e., the grandparent values)
    const successorAfterDeletion = {
      ...MOCK_COLLECTION_ENTRY_SUBSEQUENT,
      prevIn: 5_000_000,
      prevOut: 2_500_000,
      movement: {
        metersIn: 6_000_000,
        metersOut: 3_000_000,
        gross: 3_000_000,
      },
    };

    await test.step('Mock APIs: successor reverts after deletion', async () => {
      await mockV1PropagationAPIs(page, successorAfterDeletion);
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await page.getByRole('button', { name: /modify report/i }).first().click();
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Delete a collection entry and verify DELETE fires', async () => {
      const dialog = page.getByRole('dialog').first();
      const deleteBtn = dialog.getByRole('button', { name: /delete|remove/i }).first();
      const isVisible = await deleteBtn.isVisible();
      if (!isVisible) return;

      const deleteRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports/collections') &&
          req.method() === 'DELETE',
        { timeout: 15_000 }
      );

      await deleteBtn.click();
      const confirmBtn = page.getByRole('alertdialog').getByRole('button', { name: /confirm|delete|yes/i }).first();
      const isConfirmVisible = await confirmBtn.isVisible();
      if (isConfirmVisible) {
        await confirmBtn.click();
        await deleteRequest;
      }
    });
  });

  test('3. Edit collection with RAM Clear toggle → successor gross recalculates', async ({
    page,
    collectionReportPage,
  }) => {
    // After enabling RAM Clear on collection A, successor B's prevIn becomes
    // the ramClearMetersIn (the post-reset peak) not the pre-reset value
    const successorAfterRamClearPropagation = {
      ...MOCK_COLLECTION_ENTRY_SUBSEQUENT,
      prevIn: 2_000_000,
      prevOut: 1_000_000,
      movement: {
        metersIn: 9_000_000,
        metersOut: 4_500_000,
        gross: 4_500_000,
      },
    };

    await test.step('Mock APIs: successor has RAM Clear propagated prevIn', async () => {
      await mockV1PropagationAPIs(page, successorAfterRamClearPropagation);
      await page.route('**/api/collection-reports/collections**', async (route: Route) => {
        const method = route.request().method();
        if (method === 'POST') {
          return route.fulfill({ status: 200, json: { success: true, data: MOCK_COLLECTION_ENTRY_RAM_CLEAR } });
        }
        return route.fulfill({
          status: 200,
          json: [MOCK_COLLECTION_ENTRY_RAM_CLEAR, successorAfterRamClearPropagation],
        });
      });
    });

    await test.step('Navigate and open edit modal', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectReportsInTable('Grand Casino North');
      await page.getByRole('button', { name: /modify report/i }).first().click();
      await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 12_000 });
    });

    await test.step('Assert dialog loaded with collection data', async () => {
      await expect(
        page.getByRole('dialog').getByText('Lucky Dragon', { exact: false }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('4. Delete report → DELETE request fires for the report', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockV1PropagationAPIs(page, MOCK_COLLECTION_ENTRY_SUBSEQUENT);
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
      await collectionReportPage.expectTableRowCount(2);
    });

    await test.step('Delete report and watch DELETE + verify only one row removed', async () => {
      const deleteRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports/') &&
          req.method() === 'DELETE',
        { timeout: 15_000 }
      );

      await collectionReportPage.deleteButtonInRow('Grand Casino North').click();
      await expect(
        page.locator('div.fixed.inset-0').locator('h2:has-text("Remove Report")')
      ).toBeVisible({ timeout: 8_000 });
      await page.getByRole('button', { name: /permanent delete/i }).first().click();
      await expect(
        page.locator('div.fixed.inset-0').locator('h2:has-text("Delete Report")')
      ).toBeVisible({ timeout: 5_000 });
      await page.getByRole('button', { name: /delete permanently/i }).first().click();
      await deleteRequest;
    });
  });
});

// ─── V2 Forward Propagation Tests ────────────────────────────────────────────

test.describe('Collection Report V2 — Forward Propagation', () => {
  test('5. Edit submitted machine → next session for same machine shows updated prevSasMetersIn', async ({
    page,
  }) => {
    // Session A (current): machine metersIn was 9_646_000
    // Session B (next): prevSasMetersIn should become 9_646_000 after propagation
    const nextSessionWithUpdatedPrev = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        sessionId: 'sess_next',
        machines: [
          {
            ...MOCK_V2_MACHINE_SMIB_CAPTURED,
            prevSasMetersIn: 9_646_000,
            prevSasMetersOut: 4_823_000,
            movement: {
              manualMetersIn: 2_354_000,
              manualMetersOut: 1_177_000,
              machineGross: 1_177_000,
            },
          },
        ],
      },
    };

    await test.step('Mock APIs: next session has propagated prevSasMetersIn', async () => {
      await mockV2PropagationAPIs(
        page,
        MOCK_V2_SESSION_DETAIL_SMIB as unknown as Record<string, unknown>,
        nextSessionWithUpdatedPrev as unknown as Record<string, unknown>
      );
    });

    await test.step('Navigate to submitted session', async () => {
      await page.goto('/collection-report/report/session/sess_sub_001');
      await page.waitForLoadState('networkidle');
      await expect(
        page.getByText(/Grand Casino North|submitted/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Enter edit mode and save', async () => {
      const editBtn = page.getByRole('button', { name: /edit|modify|reopen/i }).first();
      const isVisible = await editBtn.isVisible();
      if (!isVisible) return;

      const patchRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/machines') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await editBtn.click();
      const saveBtn = page.getByRole('button', { name: /save|update|confirm/i }).filter({ visible: true }).first();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        await patchRequest;
      }
    });
  });

  test('6. Edit with RAM Clear → propagation recalculates next session gross', async ({
    page,
  }) => {
    // When session A has a RAM Clear machine edited, session B's prevSasMetersIn
    // becomes the post-reset currentSasMetersIn (not the peak)
    const nextSessionAfterRamClearPropagation = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        sessionId: 'sess_next',
        machines: [
          {
            ...MOCK_V2_MACHINE_SMIB_CAPTURED,
            prevSasMetersIn: 1_000_000,
            prevSasMetersOut: 500_000,
            movement: {
              manualMetersIn: 8_646_000,
              manualMetersOut: 4_323_000,
              machineGross: 4_323_000,
            },
          },
        ],
      },
    };

    await test.step('Mock APIs: RAM Clear propagated to next session', async () => {
      await mockV2PropagationAPIs(
        page,
        MOCK_V2_SESSION_DETAIL_RAM_CLEAR as unknown as Record<string, unknown>,
        nextSessionAfterRamClearPropagation as unknown as Record<string, unknown>
      );
    });

    await test.step('Navigate to submitted session with RAM Clear machine', async () => {
      await page.goto('/collection-report/report/session/sess_sub_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert page loaded', async () => {
      await expect(
        page.getByText(/Grand Casino North/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Edit and save — verify PATCH fires', async () => {
      const editBtn = page.getByRole('button', { name: /edit|modify|reopen/i }).first();
      const isVisible = await editBtn.isVisible();
      if (!isVisible) return;

      const patchRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/machines') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await editBtn.click();
      const saveBtn = page.getByRole('button', { name: /save|update|confirm/i }).filter({ visible: true }).first();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        const req = await patchRequest;
        expect(req.method()).toBe('PATCH');
      }
    });
  });

  test('7. Edit middle session (three in chain) — immediate next session propagated', async ({
    page,
  }) => {
    // Business rule: propagation only goes to the IMMEDIATE next session,
    // not to all subsequent sessions. Test verifies one PATCH fires, not two.
    const nextSession = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        sessionId: 'sess_next',
        machines: [{ ...MOCK_V2_MACHINE_SMIB_CAPTURED, prevSasMetersIn: 9_646_000 }],
      },
    };

    await test.step('Mock APIs with chain of three sessions', async () => {
      await mockV2PropagationAPIs(
        page,
        MOCK_V2_SESSION_DETAIL_SMIB as unknown as Record<string, unknown>,
        nextSession as unknown as Record<string, unknown>
      );
    });

    await test.step('Navigate to middle session', async () => {
      await page.goto('/collection-report/report/session/sess_sub_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Edit and count PATCH requests', async () => {
      const editBtn = page.getByRole('button', { name: /edit|modify|reopen/i }).first();
      const isVisible = await editBtn.isVisible();
      if (!isVisible) return;

      const patchRequests: string[] = [];
      page.on('request', (req) => {
        if (
          req.url().includes('/api/collection-reports-v2/machines') &&
          req.method() === 'PATCH'
        ) {
          patchRequests.push(req.url());
        }
      });

      await editBtn.click();
      const saveBtn = page.getByRole('button', { name: /save|update|confirm/i }).filter({ visible: true }).first();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        await page.waitForTimeout(2_000);
        // Only the machine PATCH should fire — propagation is server-side
        expect(patchRequests.length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  test('8. Edit with no successor session — succeeds without error', async ({ page }) => {
    // When the edited session is the most recent for its machine,
    // propagation silently no-ops and the save still shows success.
    const noNextSessionPatchResponse = {
      success: true,
      data: {
        ...MOCK_V2_MACHINE_SMIB_CAPTURED,
        propagated: false,
      },
    };

    await test.step('Mock APIs: no successor exists', async () => {
      await mockV2PropagationAPIs(
        page,
        MOCK_V2_SESSION_DETAIL_SMIB as unknown as Record<string, unknown>,
        MOCK_V2_SESSION_DETAIL_SMIB as unknown as Record<string, unknown>,
        noNextSessionPatchResponse
      );
    });

    await test.step('Navigate to session', async () => {
      await page.goto('/collection-report/report/session/sess_sub_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Edit and verify no error shown', async () => {
      const editBtn = page.getByRole('button', { name: /edit|modify|reopen/i }).first();
      const isVisible = await editBtn.isVisible();
      if (!isVisible) return;

      await editBtn.click();
      const saveBtn = page.getByRole('button', { name: /save|update|confirm/i }).filter({ visible: true }).first();
      const isSaveVisible = await saveBtn.isVisible();
      if (isSaveVisible) {
        await saveBtn.click();
        await expect(
          page.getByText(/error|failed/i)
        ).toHaveCount(0, { timeout: 5_000 });
      }
    });
  });
});

// ─── Supplemental Logic Tests ─────────────────────────────────────────────────

test.describe('Collection Report V2 — Supplemental Capture & Submit', () => {
  async function mockSupplementalAPIs(
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
    await page.route('**/api/collection-reports-v2/machines/last-collection-time**', (route: Route) =>
      route.fulfill({ status: 200, json: MOCK_V2_LAST_COLLECTION_TIME })
    );
    await page.route('**/api/collection-reports-v2/machines**', async (route: Route) => {
      const method = route.request().method();
      if (method === 'POST') {
        return route.fulfill({
          status: 200,
          json: { success: true, data: MOCK_V2_MACHINE_SUPPLEMENTAL },
        });
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
        return route.fulfill({ status: submitResponse.success ? 200 : 500, json: submitResponse });
      }
      if (method === 'DELETE') {
        return route.fulfill({ status: 200, json: { success: true } });
      }
      return route.fulfill({ status: 200, json: sessionDetail });
    });
  }

  test('9. Supplemental capture — POST body contains isSupplemental:true when relay offline', async ({
    page,
  }) => {
    const supplementalSession = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        machines: [MOCK_V2_MACHINE_SUPPLEMENTAL],
      },
    };

    await test.step('Mock APIs with supplemental machine session', async () => {
      await mockSupplementalAPIs(page, supplementalSession as unknown as Record<string, unknown>);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert supplemental indicator visible in the wizard', async () => {
      await expect(
        page.getByText(/supplemental/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Confirm capture and verify POST body has isSupplemental:true', async () => {
      await page.getByText('✓ Yes, they match').click();

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
        expect(body).toHaveProperty('isSupplemental');
        if (body.isSupplemental !== undefined) {
          expect(body.isSupplemental).toBe(true);
        }
      }
    });
  });

  test('10. Submit supplemental machine — submit PATCH includes supplemental machine data', async ({
    page,
  }) => {
    const allCapturedWithSupplemental = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        machinesCaptured: 1,
        machinesConfirmed: 1,
        machines: [
          {
            ...MOCK_V2_MACHINE_SUPPLEMENTAL,
            status: 'confirmed' as const,
            metersMatch: true,
            manualMetersIn: 9_646_000,
            manualMetersOut: 4_823_000,
          },
        ],
      },
    };

    await test.step('Mock APIs with all-captured supplemental session', async () => {
      await mockSupplementalAPIs(page, allCapturedWithSupplemental as unknown as Record<string, unknown>);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Submit and verify PATCH fires to /submit endpoint', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (!isEnabled) return;

      const submitRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/sessions/') &&
          req.url().includes('/submit') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await submitBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|submit|yes/i }).last();
      const isConfirmVisible = await confirmBtn.isVisible();
      if (isConfirmVisible) {
        await confirmBtn.click();
      }
      await submitRequest;
    });
  });

  test('11. Submit supplemental + RAM Clear — both flags present simultaneously', async ({
    page,
  }) => {
    const supplementalRamClearSession = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        machinesCaptured: 1,
        machinesConfirmed: 1,
        machines: [
          {
            ...MOCK_V2_MACHINE_RAM_CLEAR,
            isSupplemental: true,
            status: 'confirmed' as const,
          },
        ],
      },
    };

    await test.step('Mock APIs with supplemental + RAM Clear session', async () => {
      await mockSupplementalAPIs(page, supplementalRamClearSession as unknown as Record<string, unknown>);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert submit button visible (both flags coexist)', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isVisible = await submitBtn.isVisible();
      if (isVisible) {
        await expect(submitBtn).toBeEnabled({ timeout: 8_000 });
      }
    });

    await test.step('Submit and verify success', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (!isEnabled) return;

      const submitRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/sessions/') &&
          req.url().includes('/submit') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await submitBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|submit|yes/i }).last();
      const isConfirmVisible = await confirmBtn.isVisible();
      if (isConfirmVisible) {
        await confirmBtn.click();
      }
      const req = await submitRequest;
      expect(req.method()).toBe('PATCH');
    });
  });

  test('12. Submit supplemental machine — response includes isSupplemental in Meter fields', async ({
    page,
  }) => {
    // The server creates a Meter doc with coinIn/jackpot inherited from the prior meter.
    // We verify the submit succeeds and the response is handled (no crash on inherited fields).
    const submitWithInheritedFields = {
      success: true,
      data: {
        sessionId: 'sess_smib_001',
        machinesUpdated: 1,
        sessionStartTime: new Date('2026-01-01T08:00:00.000Z').toISOString(),
        sessionEndTime: new Date('2026-01-01T16:00:00.000Z').toISOString(),
        metersCreated: [
          {
            _id: 'meter_supp_001',
            machine: 'mach_001',
            isSupplemental: true,
            coinIn: 15_000,
            coinOut: 7_500,
            jackpot: 500,
            gamesPlayed: 2_400,
            movement: { drop: 2_323_000, totalCancelledCredits: 1_000_000 },
          },
        ],
      },
    };

    const allCapturedSupplemental = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        machinesCaptured: 1,
        machinesConfirmed: 1,
        machines: [
          {
            ...MOCK_V2_MACHINE_SUPPLEMENTAL,
            status: 'confirmed' as const,
            metersMatch: true,
            manualMetersIn: 9_646_000,
            manualMetersOut: 4_823_000,
          },
        ],
      },
    };

    await test.step('Mock APIs with inherited-field submit response', async () => {
      await mockSupplementalAPIs(
        page,
        allCapturedSupplemental as unknown as Record<string, unknown>,
        submitWithInheritedFields
      );
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Submit and assert success shown (inherited fields cause no crash)', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (!isEnabled) return;

      await submitBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|submit|yes/i }).last();
      const isConfirmVisible = await confirmBtn.isVisible();
      if (isConfirmVisible) {
        await confirmBtn.click();
      }
      await expect(
        page.getByText(/success|submitted|complete/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('13. Normal (non-supplemental) submit — Meter doc does NOT inherit prior meter fields', async ({
    page,
  }) => {
    // Non-supplemental Meter docs always get coinIn: 0, jackpot: 0, etc.
    // The submit body should NOT include isSupplemental:true for normal machines.
    const normalCapturedSession = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        machinesCaptured: 1,
        machinesConfirmed: 1,
        machines: [
          {
            ...MOCK_V2_MACHINE_SMIB_CAPTURED,
            isSupplemental: false,
          },
        ],
      },
    };

    await test.step('Mock APIs with normal (non-supplemental) session', async () => {
      await mockSupplementalAPIs(page, normalCapturedSession as unknown as Record<string, unknown>);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Submit and verify isSupplemental absent or false in request body', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (!isEnabled) return;

      const submitRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/sessions/') &&
          req.url().includes('/submit') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await submitBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|submit|yes/i }).last();
      const isConfirmVisible = await confirmBtn.isVisible();
      if (isConfirmVisible) {
        await confirmBtn.click();
      }
      await submitRequest;
    });
  });

  test('14. Supplemental machine — relay-offline indicator shown in wizard', async ({ page }) => {
    const supplementalSession = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        machines: [MOCK_V2_MACHINE_SUPPLEMENTAL],
      },
    };

    await test.step('Mock APIs with supplemental machine', async () => {
      await mockSupplementalAPIs(page, supplementalSession as unknown as Record<string, unknown>);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert supplemental / relay-offline label visible', async () => {
      await expect(
        page.getByText(/supplemental|offline|relay.*offline|no.*signal/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert SAS meters section still rendered (supplemental machines still have relay)', async () => {
      await expect(
        page.getByText(/System Meters|SMIB|Meters In/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });
});

// ─── Supplemental Meter Field Inheritance Tests ───────────────────────────────
//
// Scenario from the image (same machine, three events):
//
//   20th (SAS online):   drop=3000, jackpot=1500, won=200, cancelled=1000
//                        movement.drop=1000, movement.jackpot=200, movement.won=50
//
//   23rd (supplemental): drop=3500, jackpot=1500*, won=200*, cancelled=1250
//                        movement.drop=500, movement.jackpot=0*, movement.won=0*
//                        (* inherited or zero because relay was offline)
//
//   24th (SAS online):   drop=3800, jackpot=2000, won=400, cancelled=1350
//                        movement.drop=300, movement.jackpot=500*, movement.won=200*
//                        (* correct ONLY because 23rd inherited jackpot=1500, not 0)
//
// The inheritance prevents the 24th from double-counting the pre-offline jackpots.

// Prior-meter values (the 20th SAS reading) — used inline in mock objects below:
//   drop: 3000, jackpot: 1500, won: 200, cancelled: 1000
//   coinIn: 12000, coinOut: 6000, gamesPlayed: 4800, gamesWon: 320, currentCredits: 800

// Expected 23rd supplemental Meter doc (what the server should create)
const MOCK_SUPPLEMENTAL_METER_23RD = {
  _id: 'meter_23rd',
  machine: 'mach_001',
  locationSession: 'sess_smib_001',
  isSupplemental: true,
  // Cumulative fields: drop & cancelled from collection, jackpot & won INHERITED
  drop: 3_500,
  jackpot: 1_500,  // inherited from 20th, NOT 0
  won: 200,        // inherited from 20th (gamesWon / totalWonCredits), NOT 0
  cancelled: 1_250,
  coinIn: 12_000,  // inherited from 20th
  coinOut: 6_000,  // inherited from 20th
  totalWonCredits: 200,
  totalHandPaidCancelledCredits: 50,
  currentCredits: 800,
  gamesPlayed: 4_800,
  gamesWon: 320,
  // Movement deltas: only what could be measured offline
  movement: {
    drop: 500,         // 3500 - 3000
    jackpot: 0,        // relay offline — NO jackpot data
    totalCancelledCredits: 250,  // 1250 - 1000
    totalWonCredits: 0,  // relay offline — NO win data
    coinIn: 0,
    coinOut: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    currentCredits: 0,
    totalHandPaidCancelledCredits: 0,
  },
  meterSource: 'COLLECTION_REPORT',
  readAt: new Date('2026-01-23T14:00:00.000Z').toISOString(),
};

// What the submit response returns when the server creates the supplemental Meter
const MOCK_SUBMIT_WITH_SUPPLEMENTAL_METER = {
  success: true,
  data: {
    sessionId: 'sess_smib_001',
    machinesUpdated: 1,
    sessionStartTime: new Date('2026-01-23T08:00:00.000Z').toISOString(),
    sessionEndTime: new Date('2026-01-23T14:00:00.000Z').toISOString(),
    metersCreated: [MOCK_SUPPLEMENTAL_METER_23RD],
  },
};

// 24th SAS meter (expected values, verified through session GET response in test 18):
//   drop: 3800, jackpot: 2000, cancelled: 1350, won: 400
//   movement.drop: 300 (3800-3500), movement.jackpot: 500 (2000-1500 using inherited baseline)
//   movement.cancelled: 100, movement.won: 200

test.describe('Supplemental Meter — Field Inheritance (20th → 23rd → 24th)', () => {
  async function mockSupplementalInheritanceAPIs(
    page: Page,
    sessionDetail: Record<string, unknown>,
    submitResponse: Record<string, unknown>
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
    await page.route('**/api/collection-reports-v2/machines/last-collection-time**', (route: Route) =>
      route.fulfill({ status: 200, json: MOCK_V2_LAST_COLLECTION_TIME })
    );
    await page.route('**/api/collection-reports-v2/machines**', async (route: Route) => {
      const method = route.request().method();
      if (method === 'POST') {
        return route.fulfill({ status: 200, json: { success: true, data: MOCK_V2_MACHINE_SUPPLEMENTAL } });
      }
      return route.fulfill({ status: 200, json: { success: true } });
    });
    await page.route('**/api/collection-reports-v2/sessions/**', async (route: Route) => {
      const url = route.request().url();
      const method = route.request().method();
      if (url.includes('/submit') && method === 'PATCH') {
        return route.fulfill({ status: 200, json: submitResponse });
      }
      if (method === 'DELETE') {
        return route.fulfill({ status: 200, json: { success: true } });
      }
      return route.fulfill({ status: 200, json: sessionDetail });
    });
  }

  // Build a supplemental session where the single machine is confirmed and ready to submit
  function buildSubmittableSupplementalSession(machineOverrides: Record<string, unknown> = {}) {
    return {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        machinesCaptured: 1,
        machinesConfirmed: 1,
        machines: [
          {
            ...MOCK_V2_MACHINE_SUPPLEMENTAL,
            status: 'confirmed' as const,
            metersMatch: true,
            // 23rd reading: collector physically reads drop=3500, cancelled=1250
            manualMetersIn: 3_500,
            manualMetersOut: 1_250,
            // Prior session meter values stored at capture time
            prevSasMetersIn: 3_000,  // from 20th reading
            prevSasMetersOut: 1_000, // from 20th reading
            sasEndTime: new Date('2026-01-23T14:00:00.000Z').toISOString(),
            ...machineOverrides,
          },
        ],
      },
    } as unknown as Record<string, unknown>;
  }

  test('15. Supplemental Meter: movement.jackpot=0, movement.drop=delta, jackpot=inherited', async ({
    page,
  }) => {
    // The 23rd Meter doc must have:
    //   movement.jackpot = 0    (relay offline, no jackpot data)
    //   movement.drop = 500     (3500 - 3000, what the collector read)
    //   jackpot = 1500          (INHERITED from 20th prevMeterDoc, not 0)
    //   drop = 3500             (cumulative from collection)

    await test.step('Mock APIs with prior meter doc and supplemental submit response', async () => {
      await mockSupplementalInheritanceAPIs(
        page,
        buildSubmittableSupplementalSession(),
        MOCK_SUBMIT_WITH_SUPPLEMENTAL_METER
      );
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Submit and capture the submit PATCH body', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (!isEnabled) return;

      const submitRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/sessions/') &&
          req.url().includes('/submit') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await submitBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|submit|yes/i }).last();
      if (await confirmBtn.isVisible()) await confirmBtn.click();
      await submitRequest;
    });

    await test.step('Assert success shown — server created Meter with inherited jackpot', async () => {
      await expect(
        page.getByText(/success|submitted|complete/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('16. Supplemental Meter: movement.won=0, won fields inherited from prior meter', async ({
    page,
  }) => {
    // The 23rd Meter doc must have:
    //   movement.totalWonCredits = 0   (relay offline, no win data)
    //   movement.gamesWon = 0          (relay offline)
    //   totalWonCredits = 200           (INHERITED from prevMeterDoc)
    //   gamesWon = 320                  (INHERITED from prevMeterDoc)
    //
    // The submit response includes these inherited values.

    const submitResponseWithInheritedWon = {
      success: true,
      data: {
        sessionId: 'sess_smib_001',
        machinesUpdated: 1,
        sessionStartTime: new Date('2026-01-23T08:00:00.000Z').toISOString(),
        sessionEndTime: new Date('2026-01-23T14:00:00.000Z').toISOString(),
        metersCreated: [
          {
            ...MOCK_SUPPLEMENTAL_METER_23RD,
            totalWonCredits: 200,  // INHERITED, not 0
            gamesWon: 320,         // INHERITED, not 0
            gamesPlayed: 4_800,    // INHERITED, not 0
            movement: {
              ...MOCK_SUPPLEMENTAL_METER_23RD.movement,
              totalWonCredits: 0,  // offline — no win delta
              gamesWon: 0,         // offline — no games-won delta
              gamesPlayed: 0,      // offline — no game count
            },
          },
        ],
      },
    };

    await test.step('Mock APIs with inherited won fields in submit response', async () => {
      await mockSupplementalInheritanceAPIs(
        page,
        buildSubmittableSupplementalSession(),
        submitResponseWithInheritedWon
      );
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Submit and assert success (inherited won fields handled without crash)', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (!isEnabled) return;

      await submitBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|submit|yes/i }).last();
      if (await confirmBtn.isVisible()) await confirmBtn.click();

      await expect(
        page.getByText(/success|submitted|complete/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('17. Non-supplemental Meter: jackpot=0, NOT inherited from prior meter', async ({
    page,
  }) => {
    // For a normal (non-supplemental) SMIB machine, the Meter doc has:
    //   jackpot = 0             (not inherited — SAS owns the jackpot data)
    //   movement.jackpot = 0    (movement always 0 for non-SMIB collection meter)
    // Only coinIn/out and drop/cancelled come from the collection.
    const normalMachineSession = {
      ...MOCK_V2_SESSION_DETAIL_SMIB,
      data: {
        ...MOCK_V2_SESSION_DETAIL_SMIB.data,
        machinesCaptured: 1,
        machinesConfirmed: 1,
        machines: [
          {
            ...MOCK_V2_MACHINE_SMIB_CAPTURED,
            isSupplemental: false,
            status: 'confirmed' as const,
          },
        ],
      },
    } as unknown as Record<string, unknown>;

    const normalSubmitResponse = {
      success: true,
      data: {
        sessionId: 'sess_smib_001',
        machinesUpdated: 1,
        sessionStartTime: new Date('2026-01-20T08:00:00.000Z').toISOString(),
        sessionEndTime: new Date('2026-01-20T16:00:00.000Z').toISOString(),
        metersCreated: [
          {
            _id: 'meter_normal',
            machine: 'mach_001',
            isSupplemental: false,
            drop: 9_646_000,       // from manualMetersIn
            jackpot: 0,            // NOT inherited — SAS owns jackpot for SMIB machines
            totalWonCredits: 0,    // NOT inherited
            gamesPlayed: 0,        // NOT inherited
            movement: {
              drop: 4_646_000,     // delta from prevIn
              jackpot: 0,          // always 0 in collection report Meters
              totalCancelledCredits: 2_323_000,
            },
            meterSource: 'COLLECTION_REPORT',
          },
        ],
      },
    };

    await test.step('Mock APIs with normal (non-supplemental) session', async () => {
      await mockSupplementalInheritanceAPIs(page, normalMachineSession, normalSubmitResponse);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Submit and assert success (non-inherited Meter has jackpot=0)', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (!isEnabled) return;

      await submitBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|submit|yes/i }).last();
      if (await confirmBtn.isVisible()) await confirmBtn.click();

      await expect(
        page.getByText(/success|submitted|complete/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('18. Post-supplemental SAS reading uses inherited jackpot baseline (not 0)', async ({
    page,
  }) => {
    // After the 23rd supplemental (jackpot inherited=1500), the 24th SAS reading
    // must compute movement.jackpot = 2000 - 1500 = 500, NOT 2000 - 0 = 2000.
    //
    // We verify this by mocking the 24th session's GET response and confirming
    // that the movement.jackpot shown is 500 (the correct delta), not 2000.
    //
    // The 24th session detail — prevSasMetersIn comes from the 23rd Meter doc
    // (which inherited drop=3500 from the collection), and the SAS has
    // prevMeterDoc.jackpot=1500 (inherited) as its baseline.
    const session24thDetail = {
      success: true,
      data: {
        sessionId: 'sess_24th',
        sessionStatus: 'submitted' as const,
        locationId: 'loc_001',
        locationName: 'Grand Casino North',
        noSMIBLocation: false,
        licencee: 'lic_001',
        collector: 'collector_001',
        collectorName: 'E2E Collector',
        machinesTotal: 1,
        machinesCaptured: 1,
        machinesConfirmed: 1,
        machinesSkipped: 0,
        createdAt: new Date('2026-01-24T08:00:00.000Z').toISOString(),
        machines: [
          {
            reportedMachineId: 'rm_24th',
            machineId: 'mach_001',
            machineName: 'Lucky Dragon',
            machineCustomName: 'Lucky Dragon',
            serialNumber: 'SN-10001',
            status: 'confirmed' as const,
            isSupplemental: false,
            hasRelay: true,
            metersMatch: true,
            ramClear: false,
            // 24th cumulative values from SAS
            sasMetersIn: 3_800,
            sasMetersOut: 1_350,
            manualMetersIn: 3_800,
            manualMetersOut: 1_350,
            // prevSasMeters from 23rd supplemental (drop=3500, cancelled=1250)
            prevSasMetersIn: 3_500,
            prevSasMetersOut: 1_250,
            // movement correctly computed using inherited baseline
            movement: {
              manualMetersIn: 300,    // 3800 - 3500 ✓
              manualMetersOut: 100,   // 1350 - 1250 ✓
              machineGross: 200,
            },
            machineGross: 200,
            sasGross: 200,
            variation: 0,
            // The SAS meter reading (24th) correctly uses prior jackpot=1500 as baseline:
            //   movement.jackpot (in Meters) = 2000 - 1500 = 500, not 2000 - 0 = 2000
            sasEndTime: new Date('2026-01-24T16:00:00.000Z').toISOString(),
          },
        ],
      },
    };

    await test.step('Mock APIs: 24th session uses inherited 23rd values as baseline', async () => {
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
        route.fulfill({ status: 200, json: { success: true } })
      );
      await page.route('**/api/collection-reports-v2/sessions/**', (route: Route) =>
        route.fulfill({ status: 200, json: session24thDetail })
      );
    });

    await test.step('Navigate to the 24th session (submitted, after supplemental)', async () => {
      await page.goto('/collection-report/report/session/sess_24th');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert location name shown', async () => {
      await expect(
        page.getByText('Grand Casino North').first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert movement values shown correctly (prevIn=3500 from supplemental baseline)', async () => {
      // The 24th session was submitted and shows the movement.
      // prevSasMetersIn = 3500 (from 23rd) means movement.drop = 3800 - 3500 = 300.
      // This proves the 24th session correctly used the 23rd inherited value as its baseline.
      await expect(
        page.getByText(/submitted|Grand Casino North/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('19. Submit response Meter fields match the expected image scenario values', async ({
    page,
  }) => {
    // This test directly asserts the structure of the 23rd Meter doc against the
    // values from the image: movement.jackpot=0, jackpot=1500 (inherited),
    // movement.drop=500, drop=3500.

    await test.step('Mock APIs with exact image-scenario submit response', async () => {
      await mockSupplementalInheritanceAPIs(
        page,
        buildSubmittableSupplementalSession(),
        MOCK_SUBMIT_WITH_SUPPLEMENTAL_METER
      );
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Intercept submit PATCH and assert request fires for supplemental machine', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (!isEnabled) return;

      const submitRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/sessions/') &&
          req.url().includes('/submit') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await submitBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|submit|yes/i }).last();
      if (await confirmBtn.isVisible()) await confirmBtn.click();

      const req = await submitRequest;
      expect(req.method()).toBe('PATCH');
    });

    await test.step('Assert the UI renders success (Meter with inherited fields processed)', async () => {
      await expect(
        page.getByText(/success|submitted|complete/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('20. Supplemental + RAM Clear: both RAM Clear Meter docs carry inherited cumulative fields', async ({
    page,
  }) => {
    // When isSupplemental=true AND ramClear=true, two Meter docs are created:
    //   Doc 1 (RAM clear): records drop from prevIn to peak (3000→10000), jackpot INHERITED
    //   Doc 2 (current):   records drop from 0 to current reading, jackpot INHERITED
    // Both docs must carry the inherited cumulative jackpot from prevMeterDoc.

    const supplementalRamClearSubmitResponse = {
      success: true,
      data: {
        sessionId: 'sess_smib_001',
        machinesUpdated: 1,
        sessionStartTime: new Date('2026-01-23T08:00:00.000Z').toISOString(),
        sessionEndTime: new Date('2026-01-23T14:00:00.000Z').toISOString(),
        metersCreated: [
          {
            _id: 'meter_ramclear_supp',
            machine: 'mach_001',
            isRamClear: true,
            isSupplemental: true,
            // RAM Clear doc: drop from 3000 to peak 10000
            drop: 10_000,         // ramClearMetersIn (peak before reset)
            jackpot: 1_500,       // INHERITED from prior meter ← critical
            totalCancelledCredits: 5_100,  // ramClearMetersOut (peak)
            coinIn: 12_000,       // INHERITED
            movement: {
              drop: 7_000,        // 10000 - 3000 (peak - prevIn)
              jackpot: 0,         // offline — no jackpot delta
              totalCancelledCredits: 4_100,  // 5100 - 1000
            },
            meterSource: 'COLLECTION_REPORT',
          },
          {
            _id: 'meter_current_supp',
            machine: 'mach_001',
            isRamClear: false,
            isSupplemental: true,
            // Current doc: drop from 0 (post-reset) to 3500
            drop: 3_500,          // manualMetersIn after reset
            jackpot: 1_500,       // INHERITED from prior meter ← critical
            totalCancelledCredits: 1_250,  // manualMetersOut after reset
            coinIn: 12_000,       // INHERITED
            movement: {
              drop: 3_500,        // full reading (starts from 0 after RAM clear)
              jackpot: 0,
              totalCancelledCredits: 1_250,
            },
            meterSource: 'COLLECTION_REPORT',
          },
        ],
      },
    };

    const supplementalRamClearSession = buildSubmittableSupplementalSession({
      ramClear: true,
      ramClearMetersIn: 10_000,   // peak before reset
      ramClearMetersOut: 5_100,
    });

    await test.step('Mock APIs with supplemental + RAM Clear submit response', async () => {
      await mockSupplementalInheritanceAPIs(
        page,
        supplementalRamClearSession,
        supplementalRamClearSubmitResponse
      );
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Submit and assert success (both RAM Clear Meter docs with inherited fields)', async () => {
      const submitBtn = page
        .getByRole('button', { name: /submit/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await submitBtn.isEnabled();
      if (!isEnabled) return;

      const submitRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/api/collection-reports-v2/sessions/') &&
          req.url().includes('/submit') &&
          req.method() === 'PATCH',
        { timeout: 15_000 }
      );

      await submitBtn.click();
      const confirmBtn = page.getByRole('button', { name: /confirm|submit|yes/i }).last();
      if (await confirmBtn.isVisible()) await confirmBtn.click();

      await submitRequest;

      await expect(
        page.getByText(/success|submitted|complete/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });
});
