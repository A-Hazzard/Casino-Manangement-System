/**
 * Collection Report V2 Tab E2E Tests
 * ────────────────────────────────────
 * The "Collection Reports - V2" tab is developer-only (isDeveloper gate) and
 * available by default (NEXT_PUBLIC_COLLECTION_REPORT_COLLECTION_V2 !== 'false').
 *
 * Covers:
 *  1. V2 tab renders the capture-sessions table with a session row (developer)
 *  2. V2 tab shows the empty state when there are no sessions
 *  3. The header create button opens the "Start Collection Report" dialog
 *  4. V2 tab is NOT shown for a non-developer (manager/admin) role
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_V2_SESSIONS_LIST,
  MOCK_V2_SESSIONS_EMPTY,
  MOCK_COLLECTION_REPORTS_LIST,
  MOCK_LOCATIONS_WITH_MACHINES,
} from '../mocks/collectionReport.mocks';
import {
  MOCK_LOCATIONS_LIST,
  MOCK_LICENCEES_LIST,
} from '../mocks/locations.mocks';
import {
  MOCK_CURRENT_USER,
  MOCK_USER_MANAGER,
  mockCurrentUserResponse,
} from '../mocks/auth.mocks';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockV2APIs(
  page: Page,
  sessionsPayload = MOCK_V2_SESSIONS_LIST,
  currentUser = MOCK_CURRENT_USER
) {
  await page.route('**/api/auth/current-user**', route =>
    route.fulfill({ status: 200, json: currentUser })
  );
  await page.route('**/api/auth/token**', route =>
    route.fulfill({ status: 200, json: { userId: currentUser.user._id } })
  );
  await page.route('**/api/users/**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, user: currentUser.user },
    })
  );

  // The page also mounts the V1 collection hook. Register the BROAD route FIRST so
  // the more-specific V2 route below wins (Playwright = LIFO). Note: the glob
  // **/api/collection-reports** also matches /api/collection-reports-v2/sessions,
  // which is exactly why the V2 route must be registered AFTER this one.
  await page.route('**/api/collection-reports**', async route => {
    const url = route.request().url();
    if (url.includes('locationsWithMachines=true')) {
      return route.fulfill({ status: 200, json: MOCK_LOCATIONS_WITH_MACHINES });
    }
    return route.fulfill({ status: 200, json: MOCK_COLLECTION_REPORTS_LIST });
  });

  // V2 sessions list — registered LAST so it takes priority for the v2 URL.
  await page.route('**/api/collection-reports-v2/sessions**', route =>
    route.fulfill({ status: 200, json: sessionsPayload })
  );

  await page.route('**/api/locations**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, locations: MOCK_LOCATIONS_LIST.locations },
    })
  );
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
  await page.route('**/api/schedulers**', route =>
    route.fulfill({ status: 200, json: [] })
  );
  await page.route('**/api/activity-logs**', route =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Collection Report — V2 tab', () => {
  test('1. V2 tab renders the capture-sessions table for a developer', async ({
    page,
  }) => {
    await test.step('Mock V2 APIs', async () => {
      await mockV2APIs(page);
    });

    await test.step('Navigate directly to the collection-v2 tab', async () => {
      await page.goto('/collection-report?section=collection-v2');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the session table headers are shown', async () => {
      await expect(
        page.getByRole('columnheader', { name: /LOCATION/i }).first()
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByRole('columnheader', { name: /MACHINE GROSS/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });

    await test.step('Assert the mocked session row is rendered', async () => {
      await expect(
        page.locator('td').filter({ hasText: 'Grand Casino North' }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('2. V2 tab shows the empty state when there are no sessions', async ({
    page,
  }) => {
    await test.step('Mock V2 APIs with an empty session list', async () => {
      await mockV2APIs(page, MOCK_V2_SESSIONS_EMPTY);
    });

    await test.step('Navigate to the collection-v2 tab', async () => {
      await page.goto('/collection-report?section=collection-v2');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the empty state is shown', async () => {
      await expect(
        page.getByText(/No capture sessions found/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('3. Create button opens the Start Collection Report dialog', async ({
    page,
  }) => {
    await test.step('Mock V2 APIs', async () => {
      await mockV2APIs(page);
    });

    await test.step('Navigate to the collection-v2 tab', async () => {
      await page.goto('/collection-report?section=collection-v2');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Wait for the V2 table to load', async () => {
      await expect(
        page.getByRole('columnheader', { name: /LOCATION/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Click the create button (Start Session)', async () => {
      await page
        .getByRole('button', { name: /create collection report|new collection|start/i })
        .filter({ visible: true })
        .first()
        .click();
    });

    await test.step('Assert the Start Collection Report dialog opens', async () => {
      await expect(
        page.getByRole('heading', { name: /Start Collection Report/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('4. V2 tab is NOT shown for a non-developer role', async ({ page }) => {
    await test.step('Set manager (non-developer) auth cookie', async () => {
      await setRoleAuthCookie(page, MOCK_USER_MANAGER);
    });

    await test.step('Mock V2 APIs with the manager current-user', async () => {
      await mockV2APIs(
        page,
        MOCK_V2_SESSIONS_LIST,
        mockCurrentUserResponse(MOCK_USER_MANAGER)
      );
    });

    await test.step('Navigate to the collection report page', async () => {
      await page.goto('/collection-report');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the V2 tab is not present in the nav', async () => {
      await expect(
        page.getByRole('button', { name: /Collection Reports - V2/i })
      ).toHaveCount(0, { timeout: 8_000 });
    });
  });
});
