/**
 * Collection Report — Create Flow E2E Tests
 * Covers:
 *   1. Clicking "Create Collection Report" opens a dialog
 *   2. Submitting when POST /api/collection-reports returns 400 shows an error message
 *   3. The collector role cannot see the "Create Collection Report" button
 */

import { type Page, type Route } from 'playwright';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_COLLECTION_REPORTS_LIST,
  MOCK_LOCATIONS_WITH_MACHINES,
  MOCK_REPORT_CREATE_SUCCESS,
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
import { MOCK_COLLECTOR_SCHEDULES } from '../mocks/collectionReport.mocks';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';

// ─── Mock helper ──────────────────────────────────────────────────────────────

async function mockCollectionReportCreateAPIs(
  page: Page,
  listPayload: Record<string, unknown> = MOCK_COLLECTION_REPORTS_LIST as unknown as Record<string, unknown>
): Promise<void> {
  // Auth — always first
  await page.route('**/api/auth/current-user**', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token**', (route: Route) =>
    route.fulfill({ status: 200, json: { userId: MOCK_USER_PAYLOAD._id } })
  );
  await page.route('**/api/users/**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, user: MOCK_CURRENT_USER.user } })
  );

  // Collection reports list + locationsWithMachines — broad first (LIFO)
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

  // Locations for filter dropdown
  await page.route('**/api/locations**', (route: Route) =>
    route.fulfill({
      status: 200,
      json: { success: true, locations: MOCK_LOCATIONS_LIST.locations },
    })
  );

  // Licencees
  await page.route('**/api/licencees**', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );

  // Schedulers (collector + manager schedule tabs)
  await page.route('**/api/schedulers**', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_COLLECTOR_SCHEDULES })
  );

  // Activity logs
  await page.route('**/api/activity-logs**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );

  // Countries (some modals use this)
  await page.route('**/api/countries**', (route: Route) =>
    route.fulfill({
      status: 200,
      json: { success: true, data: [{ _id: 'tt', name: 'Trinidad and Tobago' }] },
    })
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Collection Report — Create Flow', () => {
  test('1. Clicking "Create Collection Report" opens a dialog', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCollectionReportCreateAPIs(page);
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Wait for table to render', async () => {
      await expect(
        page.getByText('Grand Casino North', { exact: false }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Click the Create Collection Report button', async () => {
      await collectionReportPage.createButton.click();
    });

    await test.step('Assert a dialog opens', async () => {
      await expect(
        page.getByRole('dialog').first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('2. Submitting the dialog when POST /api/collection-reports returns 400 shows an error message', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Mock APIs — POST collection-reports returns 400', async () => {
      await mockCollectionReportCreateAPIs(page);

      // Override collection-reports so POST returns 400 (registered last = wins)
      await page.route('**/api/collection-reports**', async (route: Route) => {
        const url = route.request().url();
        const method = route.request().method();
        if (url.includes('locationsWithMachines=true')) {
          return route.fulfill({ status: 200, json: MOCK_LOCATIONS_WITH_MACHINES });
        }
        if (method === 'POST') {
          return route.fulfill({
            status: 400,
            json: { success: false, message: 'A report already exists for this location.' },
          });
        }
        return route.fulfill({
          status: 200,
          json: MOCK_COLLECTION_REPORTS_LIST,
        });
      });
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Wait for table to render', async () => {
      await expect(
        page.getByText('Grand Casino North', { exact: false }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Open the create dialog', async () => {
      await collectionReportPage.createButton.click();
      await expect(
        page.getByRole('dialog').first()
      ).toBeVisible({ timeout: 8_000 });
    });

    await test.step('Select a location inside the dialog', async () => {
      // The New Collection modal renders a location selector — pick the first option
      const locationSelect = page
        .getByRole('dialog')
        .getByRole('combobox')
        .first();
      const isVisible = await locationSelect.isVisible();
      if (isVisible) {
        await locationSelect.selectOption({ index: 1 });
      } else {
        // Popover-based selector: click the trigger and pick a location
        const locationTrigger = page
          .getByRole('dialog')
          .getByRole('button', { name: /select location/i })
          .first();
        if (await locationTrigger.isVisible()) {
          await locationTrigger.click();
          await page
            .getByRole('option', { name: /Grand Casino North/i })
            .first()
            .click();
        }
      }
    });

    await test.step('Submit the dialog form', async () => {
      const submitBtn = page
        .getByRole('dialog')
        .getByRole('button', { name: /create|submit|save/i })
        .last();
      await submitBtn.click();
    });

    await test.step('Assert an error message is shown', async () => {
      // Error can appear as a toast notification or inside the dialog
      const errorToast = page.getByRole('alert').filter({ hasText: /error|failed|already exists/i }).first();
      const inlineError = page.getByRole('dialog').getByText(/error|failed|already exists/i).first();

      await expect(errorToast.or(inlineError)).toBeVisible({ timeout: 8_000 });
    });
  });

  test('3. Collector role cannot see the "Create Collection Report" button', async ({
    page,
    collectionReportPage,
  }) => {
    await test.step('Set collector auth cookie', async () => {
      await setRoleAuthCookie(page, MOCK_USER_COLLECTOR);
    });

    await test.step('Mock APIs', async () => {
      await mockCollectionReportCreateAPIs(page);
      // Override current-user to confirm the collector role
      await page.route('**/api/auth/current-user**', (route: Route) =>
        route.fulfill({
          status: 200,
          json: mockCurrentUserResponse(MOCK_USER_COLLECTOR),
        })
      );
    });

    await test.step('Navigate to /collection-report', async () => {
      await collectionReportPage.goto();
    });

    await test.step('Wait for the collection tab to render', async () => {
      await expect(collectionReportPage.collectionTab).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert the Create Collection Report button is NOT visible', async () => {
      await expect(collectionReportPage.createButton).toHaveCount(0, { timeout: 5_000 });
    });
  });
});
