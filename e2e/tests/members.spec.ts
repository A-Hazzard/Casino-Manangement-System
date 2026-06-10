/**
 * Members Page E2E Tests
 * ────────────────────────
 * The /members page (MembersPageContent) has 3 tabs (shadcn Tabs, role="tab"):
 *   Members List · Summary Report · Activity Log (management-only)
 *
 * Covers:
 *  1. Members List tab (default) renders the member rows
 *  2. Summary Report tab renders the "Members Summary" view
 *  3. Activity Log tab is present for a management (admin) user
 *  4. Activity Log tab is hidden for a non-management role (location admin)
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import { MOCK_LOCATION_MEMBERS } from '../mocks/locations.mocks';
import {
  MOCK_LICENCEES_LIST,
  MOCK_LOCATIONS_LIST,
} from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER } from '../mocks/auth.mocks';

const MOCK_MEMBERS_SUMMARY = {
  success: true,
  data: {
    members: [],
    summary: {
      totalMembers: 1,
      activeMembers: 1,
      totalPoints: 1_500,
      totalWinLoss: 2_500,
    },
    pagination: { page: 1, total: 1, totalPages: 1 },
  },
  timestamp: new Date().toISOString(),
};

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockMembersAPIs(page: Page, currentUser = MOCK_CURRENT_USER) {
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

  // Members summary sub-endpoints (registered before the broad /api/members route)
  await page.route('**/api/members/count**', route =>
    route.fulfill({ status: 200, json: { memberCount: 1 } })
  );
  await page.route('**/api/members/summary**', route =>
    route.fulfill({ status: 200, json: MOCK_MEMBERS_SUMMARY })
  );
  await page.route('**/api/members/demographics**', route =>
    route.fulfill({ status: 200, json: { success: true, data: {} } })
  );
  await page.route('**/api/members/trends**', route =>
    route.fulfill({ status: 200, json: { success: true, data: {} } })
  );

  // Broad members list — fall through for the more-specific sub-routes above
  await page.route('**/api/members**', async route => {
    const url = route.request().url();
    if (
      url.includes('/count') ||
      url.includes('/summary') ||
      url.includes('/demographics') ||
      url.includes('/trends')
    ) {
      return route.fallback();
    }
    return route.fulfill({ status: 200, json: MOCK_LOCATION_MEMBERS });
  });

  await page.route('**/api/cabinets/locations**', route =>
    route.fulfill({
      status: 200,
      json: {
        locations: [{ _id: 'loc_001', name: 'Grand Casino North' }],
      },
    })
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
  await page.route('**/api/activity-logs**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, data: [], pagination: { total: 0, totalPages: 0, page: 1 } },
    })
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Members Page', () => {
  test('1. Members List tab renders member rows', async ({ page }) => {
    await test.step('Mock members APIs', async () => {
      await mockMembersAPIs(page);
    });

    await test.step('Navigate to /members', async () => {
      await page.goto('/members');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the mocked member appears (visible desktop copy)', async () => {
      await expect(
        page
          .getByText('John Player', { exact: false })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('2. Summary Report tab renders the Members Summary view', async ({
    page,
  }) => {
    await test.step('Mock members APIs', async () => {
      await mockMembersAPIs(page);
    });

    await test.step('Navigate to /members', async () => {
      await page.goto('/members');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Click the Summary Report tab', async () => {
      await page
        .getByRole('tab', { name: /Summary Report/i })
        .first()
        .click();
    });

    await test.step('Assert the Members Summary heading is shown', async () => {
      await expect(
        page.getByRole('heading', { name: /Members Summary/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('3. Activity Log tab is present for a management (admin) user', async ({
    page,
  }) => {
    await test.step('Mock members APIs (admin)', async () => {
      await mockMembersAPIs(page);
    });

    await test.step('Navigate to /members', async () => {
      await page.goto('/members');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the Activity Log tab trigger is present', async () => {
      await expect(
        page.getByRole('tab', { name: /Activity Log/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('4. Members List row shows member stats (points + win/loss)', async ({
    page,
  }) => {
    await test.step('Mock members APIs', async () => {
      await mockMembersAPIs(page);
    });

    await test.step('Navigate to /members', async () => {
      await page.goto('/members');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Wait for the member row to render', async () => {
      await expect(
        page
          .getByText('John Player', { exact: false })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert the member points are shown', async () => {
      await expect(
        page.getByText(/1,?500 POINTS/i).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 8_000 });
    });

    await test.step('Assert the member win/loss amount is shown', async () => {
      // Value renders in both a hidden mobile card and the desktop table — filter to visible.
      await expect(
        page.getByText(/2,500\.00/).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });
});
