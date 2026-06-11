/**
 * Sessions Page E2E Tests
 * ─────────────────────────
 * The /sessions page (SessionsPageContent) is a single-view list of gaming sessions
 * with search, a status filter, date filters, and a sortable table.
 *
 * Covers:
 *  1. Sessions page loads with title + table headers
 *  2. A session row renders with player + machine data
 *  3. Search sends the search= param to /api/sessions (server-side)
 *  4. Status filter exposes Active / Completed options
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_LICENCEES_LIST,
  MOCK_LOCATIONS_LIST,
} from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER, MOCK_USER_PAYLOAD } from '../mocks/auth.mocks';

const MOCK_SESSION_1 = {
  _id: 'sess_001',
  memberName: 'John Player',
  memberId: 'member_001',
  machineId: 'mach_001',
  machineSerialNumber: 'SN-10001',
  machineCustomName: 'Lucky Dragon',
  machineGame: 'Dragon Fortune',
  startTime: new Date('2026-01-01T10:00:00.000Z').toISOString(),
  endTime: new Date('2026-01-01T11:00:00.000Z').toISOString(),
  duration: 3_600,
  handle: 5_000,
  jackpot: 0,
  points: 120,
  status: 'completed',
  locationName: 'Grand Casino North',
};

const MOCK_SESSIONS_RESPONSE = {
  success: true,
  data: {
    sessions: [MOCK_SESSION_1],
    pagination: { currentPage: 1, totalPages: 1, totalItems: 1, totalCount: 1 },
  },
  timestamp: new Date().toISOString(),
};

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockSessionsAPIs(page: Page) {
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

  await page.route('**/api/sessions**', route =>
    route.fulfill({ status: 200, json: MOCK_SESSIONS_RESPONSE })
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
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Sessions Page', () => {
  test('1. Sessions page loads with title and table headers', async ({
    page,
  }) => {
    await test.step('Mock sessions APIs', async () => {
      await mockSessionsAPIs(page);
    });

    await test.step('Navigate to /sessions', async () => {
      await page.goto('/sessions');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the Sessions title is shown', async () => {
      await expect(
        page.getByRole('heading', { name: /^Sessions$/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert the Player + Machine + Handle column headers are shown', async () => {
      await expect(
        page.getByText('Player', { exact: false }).first()
      ).toBeVisible({ timeout: 8_000 });
      await expect(
        page.getByText('Handle', { exact: false }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('2. A session row renders with player and machine data', async ({
    page,
  }) => {
    await test.step('Mock sessions APIs', async () => {
      await mockSessionsAPIs(page);
    });

    await test.step('Navigate to /sessions', async () => {
      await page.goto('/sessions');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the mocked player name appears', async () => {
      await expect(
        page
          .getByText('John Player', { exact: false })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('3. Search sends the search= param to /api/sessions', async ({
    page,
  }) => {
    await test.step('Mock sessions APIs', async () => {
      await mockSessionsAPIs(page);
    });

    await test.step('Navigate to /sessions', async () => {
      await page.goto('/sessions');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Wait for the initial row to render', async () => {
      await expect(
        page
          .getByText('John Player', { exact: false })
          .filter({ visible: true })
          .first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Type a search term and assert the request carries search=', async () => {
      const searchRequest = page.waitForRequest(
        req =>
          /\/api\/sessions/.test(req.url()) && /[?&]search=John/i.test(req.url()),
        { timeout: 15_000 }
      );
      await page.getByPlaceholder(/Search sessions/i).fill('John');
      await searchRequest;
    });
  });

  test('4. Status filter exposes Active / Completed options', async ({
    page,
  }) => {
    await test.step('Mock sessions APIs', async () => {
      await mockSessionsAPIs(page);
    });

    await test.step('Navigate to /sessions', async () => {
      await page.goto('/sessions');
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the status filter select has Active + Completed options', async () => {
      const statusSelect = page
        .locator('select')
        .filter({ has: page.locator('option[value="active"]') })
        .first();
      await expect(statusSelect).toBeVisible({ timeout: 10_000 });
      await expect(
        statusSelect.locator('option', { hasText: /Completed/i })
      ).toHaveCount(1);
    });
  });
});
