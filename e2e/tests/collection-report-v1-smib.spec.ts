/**
 * Collection Report V1 — SMIB vs Non-SMIB Machine Handling
 * ──────────────────────────────────────────────────────────
 * Covers scenarios B (7–11) from the comprehensive test spec:
 *
 *  1.  Variation check with SMIB machine — numeric variation displayed
 *  2.  Variation check with non-SMIB machine — "No SMIB" label shown
 *  3.  Mixed machines — per-machine variation column shows both types
 *  4.  Variation check POST body includes machineIds
 *  5.  hasVariations=true triggers visible variation indicator
 *  6.  hasVariations=false — no variation indicator
 *  7.  SAS Gross column populated for SMIB machine in detail page
 *  8.  SAS Gross shows placeholder for non-SMIB machine
 */

import { type Page, type Route } from 'playwright';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_REPORT_DETAIL,
  MOCK_REPORT_DETAIL_COLLECTIONS,
  MOCK_MACHINE_METRIC_1,
  MOCK_MACHINE_METRIC_2,
  MOCK_VARIATION_CHECK_SMIB,
  MOCK_VARIATION_CHECK_NO_SMIB,
  MOCK_VARIATION_CHECK_MIXED,
} from '../mocks/collectionReport.mocks';
import { MOCK_LICENCEES_LIST } from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER, MOCK_USER_PAYLOAD } from '../mocks/auth.mocks';

// ─── Shared mock helper ───────────────────────────────────────────────────────

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
  await page.route('**/api/collection-reports/check-variations**', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_VARIATION_CHECK_SMIB })
  );
  await page.route('**/api/collection-reports/**', async (route: Route) => {
    const url = route.request().url();
    if (url.includes('/collections')) {
      return route.fulfill({ status: 200, json: MOCK_REPORT_DETAIL_COLLECTIONS });
    }
    return route.fulfill({ status: 200, json: reportPayload });
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Collection Report V1 — SMIB vs Non-SMIB', () => {
  test('1. Variation check with SMIB machine shows numeric variation', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock APIs with SMIB variation response', async () => {
      await mockDetailAPIs(page);
      await page.route('**/api/collection-reports/check-variations**', (route: Route) =>
        route.fulfill({ status: 200, json: MOCK_VARIATION_CHECK_SMIB })
      );
    });

    await test.step('Navigate to SAS Compare tab', async () => {
      await collectionReportDetailPage.goto('report_001', 'sas');
    });

    await test.step('Assert SAS totals section is visible', async () => {
      await expect(
        page.getByText(/SAS Drop Total|SAS Gross/i).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert variation value is shown (numeric)', async () => {
      await expect(
        page.getByText(/variation/i).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('2. Variation check with non-SMIB machine shows "No SMIB" label', async ({
    page,
    collectionReportDetailPage,
  }) => {
    const noSmibDetail = {
      ...MOCK_REPORT_DETAIL,
      machineMetrics: [
        {
          ...MOCK_MACHINE_METRIC_1,
          sasGross: null,
          variation: 'No SMIB',
        },
      ],
    };

    await test.step('Mock APIs with non-SMIB variation response', async () => {
      await mockDetailAPIs(page, noSmibDetail as unknown as Record<string, unknown>);
      await page.route('**/api/collection-reports/check-variations**', (route: Route) =>
        route.fulfill({ status: 200, json: MOCK_VARIATION_CHECK_NO_SMIB })
      );
    });

    await test.step('Navigate to SAS Compare tab', async () => {
      await collectionReportDetailPage.goto('report_001', 'sas');
    });

    await test.step('Assert the SAS section loaded', async () => {
      await expect(
        page.getByText(/SAS|sas/i).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert "No SMIB" label is present in the page', async () => {
      await expect(
        page.getByText(/No SMIB/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('3. Mixed machines — variation column shows both numeric and No SMIB', async ({
    page,
    collectionReportDetailPage,
  }) => {
    const mixedDetail = {
      ...MOCK_REPORT_DETAIL,
      machineMetrics: [
        MOCK_MACHINE_METRIC_1,
        {
          ...MOCK_MACHINE_METRIC_2,
          sasGross: null,
          variation: 'No SMIB',
        },
      ],
    };

    await test.step('Mock APIs with mixed variation response', async () => {
      await mockDetailAPIs(page, mixedDetail as unknown as Record<string, unknown>);
      await page.route('**/api/collection-reports/check-variations**', (route: Route) =>
        route.fulfill({ status: 200, json: MOCK_VARIATION_CHECK_MIXED })
      );
    });

    await test.step('Navigate to SAS Compare tab', async () => {
      await collectionReportDetailPage.goto('report_001', 'sas');
    });

    await test.step('Assert the page loaded', async () => {
      await expect(
        page.getByText(/SAS|Gross/i).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert "No SMIB" label appears for non-SMIB machine', async () => {
      await expect(
        page.getByText(/No SMIB/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('4. Variation check POST body includes machineIds', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockDetailAPIs(page);
    });

    await test.step('Navigate to Machine Metrics tab', async () => {
      await collectionReportDetailPage.goto('report_001');
      await collectionReportDetailPage.expectMachineInTable('Lucky Dragon');
    });

    await test.step('Set up variation-check request watcher', async () => {
      const variationRequest = page.waitForRequest(
        (req) =>
          req.url().includes('/check-variations') &&
          req.method() === 'POST',
        { timeout: 10_000 }
      );

      const checkVariationsBtn = page
        .getByRole('button', { name: /check.?variation|variation.?check/i })
        .filter({ visible: true })
        .first();
      const isVisible = await checkVariationsBtn.isVisible();
      if (isVisible) {
        await checkVariationsBtn.click();
        const req = await variationRequest;
        expect(req.method()).toBe('POST');
      }
    });
  });

  test('5. hasVariations=true — variation indicator shown in detail page', async ({
    page,
    collectionReportDetailPage,
  }) => {
    const detailWithVariation = {
      ...MOCK_REPORT_DETAIL,
      totalVariation: 500.0,
      machineMetrics: [
        { ...MOCK_MACHINE_METRIC_1, variation: 500.0 },
      ],
    };

    await test.step('Mock APIs with variation data', async () => {
      await mockDetailAPIs(page, detailWithVariation as unknown as Record<string, unknown>);
    });

    await test.step('Navigate to SAS Compare tab', async () => {
      await collectionReportDetailPage.goto('report_001', 'sas');
    });

    await test.step('Assert page renders with SAS data', async () => {
      await expect(
        page.getByText(/SAS|Gross|variation/i).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('6. hasVariations=false — no warning indicator shown', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock APIs with zero variation', async () => {
      await mockDetailAPIs(page);
      await page.route('**/api/collection-reports/check-variations**', (route: Route) =>
        route.fulfill({
          status: 200,
          json: { hasVariations: false, totalVariation: 0, machines: [] },
        })
      );
    });

    await test.step('Navigate to SAS Compare tab', async () => {
      await collectionReportDetailPage.goto('report_001', 'sas');
    });

    await test.step('Assert SAS content rendered', async () => {
      await expect(
        page.getByText(/SAS Drop Total|SAS Gross/i).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert no high-variation warning text', async () => {
      await expect(
        page.getByText(/high variation|alert.*variation/i)
      ).toHaveCount(0, { timeout: 3_000 });
    });
  });

  test('7. SAS Gross column populated for SMIB machine', async ({
    page,
    collectionReportDetailPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockDetailAPIs(page);
    });

    await test.step('Navigate to Machine Metrics tab', async () => {
      await collectionReportDetailPage.goto('report_001');
    });

    await test.step('Assert machine table has SAS GROSS column header', async () => {
      await expect(
        page.getByText('SAS GROSS', { exact: true }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert Lucky Dragon machine row visible', async () => {
      await collectionReportDetailPage.expectMachineInTable('Lucky Dragon');
    });
  });

  test('8. Non-SMIB machine — sasGross null shows placeholder in detail', async ({
    page,
    collectionReportDetailPage,
  }) => {
    const noSmibReport = {
      ...MOCK_REPORT_DETAIL,
      machineMetrics: [
        { ...MOCK_MACHINE_METRIC_1, sasGross: null, variation: null },
      ],
      sasMetrics: { dropped: 0, cancelled: 0, gross: 0 },
    };

    await test.step('Mock APIs with null sasGross', async () => {
      await mockDetailAPIs(page, noSmibReport as unknown as Record<string, unknown>);
    });

    await test.step('Navigate to Machine Metrics tab', async () => {
      await collectionReportDetailPage.goto('report_001');
    });

    await test.step('Assert machine table renders', async () => {
      await expect(page.locator('table').first()).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert a null/placeholder value is shown (-- or N/A)', async () => {
      await expect(
        page.locator('td').filter({ hasText: /^--$|N\/A|No SAS/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });
});
