/**
 * Administration — Countries / Activity Logs / Feedback Tabs E2E Tests
 * ──────────────────────────────────────────────────────────────────────
 * administration.spec.ts already covers the Users + Licencees tabs in depth.
 * This spec covers the 3 remaining tabs (deep-linked via ?section=):
 *   Countries · Activity Logs · Feedback
 *
 * Covers:
 *  1. Countries tab renders the country list
 *  2. Activity Logs tab renders (empty-state is deterministic)
 *  3. Feedback tab renders the feedback management view
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import { MOCK_LICENCEES_LIST } from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER, MOCK_USER_PAYLOAD } from '../mocks/auth.mocks';

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockAdminTabAPIs(page: Page) {
  await page.route('**/api/auth/current-user**', route =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token**', route =>
    route.fulfill({ status: 200, json: { userId: MOCK_USER_PAYLOAD._id } })
  );
  await page.route('**/api/users/**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, user: MOCK_CURRENT_USER.user },
    })
  );
  await page.route('**/api/users**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, users: [], pagination: { total: 0, totalPages: 0, page: 1 } },
    })
  );
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
  await page.route('**/api/locations**', route =>
    route.fulfill({ status: 200, json: { success: true, locations: [] } })
  );

  // Countries — GET /api/countries → { success, countries: [...] }
  await page.route('**/api/countries**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        countries: [
          { _id: 'tt', name: 'Trinidad and Tobago' },
          { _id: 'bb', name: 'Barbados' },
        ],
      },
    })
  );

  // Activity logs — GET /api/activity-logs → { success, data: { activities, pagination } }
  await page.route('**/api/activity-logs**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          activities: [],
          pagination: { totalCount: 0, totalPages: 1, page: 1 },
        },
      },
    })
  );

  // Feedback — GET /api/feedback → { success, data: [...], pagination }
  await page.route('**/api/feedback**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        data: [],
        pagination: { totalCount: 0, totalPages: 1, page: 1 },
      },
    })
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Administration — extra tabs', () => {
  test('1. Countries tab renders the country list', async ({ page }) => {
    await test.step('Mock admin tab APIs', async () => {
      await mockAdminTabAPIs(page);
    });

    await test.step('Navigate to the countries section', async () => {
      await page.goto('/administration?section=countries');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert a mocked country appears in the list (visible copy)', async () => {
      // Country name may render in both a hidden mobile card and the desktop table.
      await expect(
        page
          .getByText('Trinidad and Tobago', { exact: false })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert the second mocked country also appears', async () => {
      await expect(
        page
          .getByText('Barbados', { exact: false })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('2. Activity Logs tab renders (empty-state deterministic)', async ({
    page,
  }) => {
    await test.step('Mock admin tab APIs', async () => {
      await mockAdminTabAPIs(page);
    });

    await test.step('Navigate to the activity-logs section', async () => {
      await page.goto('/administration?section=activity-logs');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the "No activity logs found" empty state is shown', async () => {
      await expect(
        page.getByText(/No activity logs found/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('3. Feedback tab renders the feedback management view', async ({
    page,
  }) => {
    await test.step('Mock admin tab APIs', async () => {
      await mockAdminTabAPIs(page);
    });

    await test.step('Navigate to the feedback section', async () => {
      await page.goto('/administration?section=feedback');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the feedback search filter is shown', async () => {
      await expect(
        page.getByPlaceholder(/Search by email/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert the "No feedback found" empty state is shown', async () => {
      await expect(
        page.getByText(/No feedback found/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });
});
