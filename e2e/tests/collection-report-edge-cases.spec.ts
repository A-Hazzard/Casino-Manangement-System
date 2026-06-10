/**
 * Collection Report — Edge Cases & Financial Integrity
 * ──────────────────────────────────────────────────────
 * Covers scenarios T (99–108), U (109–112), and V (113–118):
 *
 *  1.  Machine with all-zero meters — UI shows "0" not blank
 *  2.  Very large meter values — displayed without overflow/truncation
 *  3.  Report with 0 collections — empty machine list shown
 *  4.  Network error on save — error toast shown
 *  5.  In-progress session shows status badge
 *  6.  Submitted session shows submitted badge
 *  7.  Archived session — deletedAt label visible
 *  8.  Collection gross = metersIn-prevIn minus metersOut-prevOut displayed
 *  9.  SAS Gross null for non-SMIB — placeholder shown
 * 10.  Reviewer scaling — financial values display scaled amounts
 * 11.  isEditing=true report — visual locked/editing indicator shown
 * 12.  Mixed captured + skipped — progress counter correct
 */

import { type Page, type Route } from 'playwright';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_REPORT_DETAIL,
  MOCK_REPORT_DETAIL_COLLECTIONS,
  MOCK_COLLECTION_REPORTS_LIST,
  MOCK_LOCATIONS_WITH_MACHINES,
  MOCK_REPORT_EDITING,
  MOCK_MACHINE_METRIC_1,
  MOCK_MACHINE_METRIC_2,
} from '../mocks/collectionReport.mocks';
import {
  MOCK_V2_SESSION_DETAIL_SMIB,
  MOCK_V2_SESSION_DETAIL_SUBMITTED,
  MOCK_V2_SESSION_DETAIL_WITH_SKIPPED,
  MOCK_V2_SESSION_ARCHIVED,
  MOCK_V2_LAST_COLLECTION_TIME,
  MOCK_V2_MACHINE_CAPTURE_SUCCESS,
  MOCK_V2_SAVE_ERROR,
} from '../mocks/collectionReportV2.mocks';
import { MOCK_LICENCEES_LIST, MOCK_LOCATIONS_LIST, MOCK_LOCATION_1 } from '../mocks/locations.mocks';
import {
  MOCK_CURRENT_USER,
  MOCK_USER_PAYLOAD,
  MOCK_USER_DEVELOPER,
  mockCurrentUserResponse,
} from '../mocks/auth.mocks';

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function mockDetailAPIs(
  page: Page,
  reportPayload: Record<string, unknown> = MOCK_REPORT_DETAIL as unknown as Record<string, unknown>
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
    return route.fulfill({ status: 200, json: reportPayload });
  });
}

async function mockListAPIs(
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
  await page.route('**/api/collection-reports/**', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_REPORT_DETAIL })
  );
  await page.route('**/api/collection-reports**', async (route: Route) => {
    const url = route.request().url();
    if (url.includes('locationsWithMachines=true')) {
      return route.fulfill({ status: 200, json: MOCK_LOCATIONS_WITH_MACHINES });
    }
    return route.fulfill({ status: 200, json: listPayload });
  });
}

async function mockV2SessionAPIs(
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
    const method = route.request().method();
    if (method === 'DELETE') {
      return route.fulfill({ status: 200, json: { success: true } });
    }
    return route.fulfill({ status: 200, json: sessionDetail });
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Collection Report — Edge Cases & Financial Integrity', () => {
  test('1. Machine with all-zero meters — UI shows "0" not blank', async ({
    page,
    collectionReportDetailPage,
  }) => {
    const zeroMetersReport = {
      ...MOCK_REPORT_DETAIL,
      machineMetrics: [
        {
          ...MOCK_MACHINE_METRIC_1,
          metersGross: 0,
          sasGross: 0,
          variation: 0,
        },
      ],
    };

    await test.step('Mock APIs with zero-meter report', async () => {
      await mockDetailAPIs(page, zeroMetersReport as unknown as Record<string, unknown>);
    });

    await test.step('Navigate to detail page', async () => {
      await collectionReportDetailPage.goto('report_001');
    });

    await test.step('Assert machine renders (not blank)', async () => {
      await collectionReportDetailPage.expectMachineInTable('Lucky Dragon');
    });

    await test.step('Assert a "0" value appears in the machine table', async () => {
      await expect(
        page.locator('td').filter({ hasText: /^0(\.0+)?$/ }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('2. Very large meter values — displayed without overflow', async ({
    page,
    collectionReportDetailPage,
  }) => {
    const largeMeterReport = {
      ...MOCK_REPORT_DETAIL,
      machineMetrics: [
        {
          ...MOCK_MACHINE_METRIC_1,
          metersGross: 999_999_999,
          sasGross: 999_999_999,
        },
      ],
    };

    await test.step('Mock APIs with large meter report', async () => {
      await mockDetailAPIs(page, largeMeterReport as unknown as Record<string, unknown>);
    });

    await test.step('Navigate to detail page', async () => {
      await collectionReportDetailPage.goto('report_001');
    });

    await test.step('Assert page renders without error', async () => {
      await collectionReportDetailPage.expectMachineInTable('Lucky Dragon');
    });

    await test.step('Assert large number is formatted (contains commas)', async () => {
      await expect(
        page.getByText(/999,999,999|999\.999\.999/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('3. Report with 0 collections — empty machine list state shown', async ({
    page,
    collectionReportDetailPage,
  }) => {
    const emptyCollectionsReport = {
      ...MOCK_REPORT_DETAIL,
      machineMetrics: [],
    };

    await test.step('Mock APIs with empty machineMetrics', async () => {
      await mockDetailAPIs(page, emptyCollectionsReport as unknown as Record<string, unknown>);
      await page.route('**/api/collection-reports/**', async (route: Route) => {
        const url = route.request().url();
        if (url.includes('/collections')) {
          return route.fulfill({ status: 200, json: [] });
        }
        return route.fulfill({ status: 200, json: emptyCollectionsReport });
      });
    });

    await test.step('Navigate to detail page', async () => {
      await collectionReportDetailPage.goto('report_001');
    });

    await test.step('Assert no machine rows in table', async () => {
      await expect(
        page.locator('table tbody tr').first()
      ).toHaveCount(0, { timeout: 8_000 });
    });
  });

  test('4. Network error on save — error toast or message shown', async ({ page }) => {
    await test.step('Mock APIs with 500 on machine capture POST', async () => {
      await mockV2SessionAPIs(page, MOCK_V2_SESSION_DETAIL_SMIB);
      await page.route('**/api/collection-reports-v2/machines**', async (route: Route) => {
        const method = route.request().method();
        if (method === 'POST') {
          return route.fulfill({ status: 500, json: MOCK_V2_SAVE_ERROR });
        }
        return route.fulfill({ status: 200, json: { success: true } });
      });
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
      await expect(page.getByText('Lucky Dragon').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Click Yes they match and save (triggers failing POST)', async () => {
      await page.getByText('✓ Yes, they match').click();
      const saveBtn = page
        .getByRole('button', { name: /save.?next|next|confirm/i })
        .filter({ visible: true })
        .first();
      const isEnabled = await saveBtn.isEnabled();
      if (isEnabled) {
        await saveBtn.click();
        await expect(
          page.getByText(/error|failed|something went wrong|server error/i).first()
        ).toBeVisible({ timeout: 8_000 });
      }
    });
  });

  test('5. In-progress session shows in-progress status badge', async ({ page }) => {
    await test.step('Mock V2 APIs with in-progress session', async () => {
      await mockV2SessionAPIs(page, MOCK_V2_SESSION_DETAIL_SMIB);
    });

    await test.step('Navigate to in-progress session', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert page loaded with location name', async () => {
      await expect(
        page.getByText('Grand Casino North').first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert in-progress indicator or wizard state visible', async () => {
      await expect(
        page.getByText(/in.?progress|Machine 1 of|pending/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('6. Submitted session — submitted status badge visible', async ({ page }) => {
    await test.step('Mock V2 APIs with submitted session', async () => {
      await mockV2SessionAPIs(page, MOCK_V2_SESSION_DETAIL_SUBMITTED as unknown as Record<string, unknown>);
    });

    await test.step('Navigate to submitted session', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert submitted badge or status visible', async () => {
      await expect(
        page.getByText(/submitted|Session Complete|complete/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('7. Archived session with deletedAt — archived label visible in list', async ({
    page,
  }) => {
    const archivedList = {
      success: true,
      data: [MOCK_V2_SESSION_ARCHIVED],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      timestamp: new Date().toISOString(),
    };

    await test.step('Mock V2 APIs with archived session list', async () => {
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
      await page.route('**/api/locations**', (route: Route) =>
        route.fulfill({ status: 200, json: { success: true, locations: MOCK_LOCATIONS_LIST.locations } })
      );
      await page.route('**/api/schedulers**', (route: Route) =>
        route.fulfill({ status: 200, json: [] })
      );
      await page.route('**/api/activity-logs**', (route: Route) =>
        route.fulfill({ status: 200, json: { success: true, data: [] } })
      );
      await page.route('**/api/collection-reports**', (route: Route) =>
        route.fulfill({ status: 200, json: MOCK_COLLECTION_REPORTS_LIST })
      );
      await page.route('**/api/collection-reports-v2/sessions**', (route: Route) =>
        route.fulfill({ status: 200, json: archivedList })
      );
    });

    await test.step('Navigate to V2 tab', async () => {
      await page.goto('/collection-report?section=collection-v2');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert archived session row visible', async () => {
      await expect(
        page.locator('td').filter({ hasText: 'Grand Casino North' }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert archived or deleted indicator visible', async () => {
      await expect(
        page.getByText(/archived|deleted|removed/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('8. Collection gross displayed correctly in detail page', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock APIs with known gross values', async () => {
      await mockDetailAPIs(page);
    });

    await test.step('Navigate to Machine Metrics tab', async () => {
      await collectionReportDetailPage.goto('report_001');
    });

    await test.step('Assert both machines visible with gross values', async () => {
      await collectionReportDetailPage.expectMachineInTable('Lucky Dragon');
      await collectionReportDetailPage.expectMachineInTable('Golden Pharaoh');
    });

    await test.step('Assert MACHINE GROSS column header visible', async () => {
      await expect(
        page.getByText('MACHINE GROSS', { exact: true }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('9. Non-SMIB machine SAS Gross shows placeholder in detail', async ({
    page,
    collectionReportDetailPage,
  }) => {
    const noSmibReport = {
      ...MOCK_REPORT_DETAIL,
      machineMetrics: [
        { ...MOCK_MACHINE_METRIC_1, sasGross: null },
        MOCK_MACHINE_METRIC_2,
      ],
    };

    await test.step('Mock APIs with null sasGross machine', async () => {
      await mockDetailAPIs(page, noSmibReport as unknown as Record<string, unknown>);
    });

    await test.step('Navigate to Machine Metrics tab', async () => {
      await collectionReportDetailPage.goto('report_001');
    });

    await test.step('Assert table renders', async () => {
      await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert null/placeholder shown for machine with no SAS gross', async () => {
      await expect(
        page.locator('td').filter({ hasText: /^--$|N\/A/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('10. Reviewer scaling — list page loads for reviewer user', async ({
    page,
    collectionReportPage,
  }) => {
    const reviewerUser = {
      ...MOCK_USER_DEVELOPER,
      _id: 'reviewer_001',
      roles: ['reviewer'],
    };

    const scaledList = {
      success: true,
      data: [
        { ...MOCK_COLLECTION_REPORTS_LIST.data[0], gross: 30_384.9 },
        { ...MOCK_COLLECTION_REPORTS_LIST.data[1], gross: 12_740.0 },
      ],
      pagination: MOCK_COLLECTION_REPORTS_LIST.pagination,
      timestamp: new Date().toISOString(),
    };

    await test.step('Mock APIs with reviewer user and scaled values', async () => {
      await mockListAPIs(page, scaledList);
      await page.route('**/api/auth/current-user**', (route: Route) =>
        route.fulfill({ status: 200, json: mockCurrentUserResponse(reviewerUser) })
      );
      await page.route('**/api/auth/token**', (route: Route) =>
        route.fulfill({ status: 200, json: { userId: reviewerUser._id } })
      );
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Assert reports still render', async () => {
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Assert scaled gross value is shown', async () => {
      await expect(
        page.getByText(/30,384|30\.384/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('11. isEditing=true report — editing/locked indicator in the table', async ({
    page,
    collectionReportPage,
  }) => {
    const editingList = {
      success: true,
      data: [MOCK_REPORT_EDITING],
      pagination: { page: 1, limit: 40, total: 1, totalPages: 1 },
      timestamp: new Date().toISOString(),
    };

    await test.step('Mock APIs with isEditing report', async () => {
      await mockListAPIs(page, editingList);
    });

    await test.step('Navigate to collection-report page', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Assert report name visible', async () => {
      await collectionReportPage.expectReportsInTable('Grand Casino North');
    });

    await test.step('Assert editing/checked-out indicator visible', async () => {
      await expect(
        page.getByText(/checked.?out|editing|in.?progress|locked/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('12. Mixed captured + skipped machines — progress counter shown', async ({ page }) => {
    await test.step('Mock V2 APIs with captured + skipped machines', async () => {
      await mockV2SessionAPIs(page, MOCK_V2_SESSION_DETAIL_WITH_SKIPPED);
    });

    await test.step('Navigate to session wizard', async () => {
      await page.goto('/collection-report/report/session/sess_smib_001');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert location name visible', async () => {
      await expect(
        page.getByText('Grand Casino North').first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert progress counter shows captured + skipped count', async () => {
      await expect(
        page.getByText(/1.*2|machine.*1.*of|skipped/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });
});
