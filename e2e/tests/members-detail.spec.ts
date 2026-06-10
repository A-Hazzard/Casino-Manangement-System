/**
 * Members Detail Page E2E Tests
 * ──────────────────────────────
 * Tests for the /members/[id] page (MembersDetailsPageContent).
 *
 * Covers:
 *  1. Member name renders in h1 as "John Doe"
 *  2. Back to Members link has href '/members'
 *  3. Player's Totals card is collapsed by default; clicking 'See More' expands it
 *  4. Sessions table renders with correct column headers (desktop)
 *  5. Session row 'View Events' link points to correct URL
 *  6. Export button visible and 'Export as CSV' option exists in dropdown
 *  7. Pagination 'Next' button is enabled when totalPages > 1
 *  8. Member not found — mock 404 → shows 'Member Not Found' error state
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import { MOCK_CURRENT_USER } from '../mocks/auth.mocks';
import {
  MOCK_LICENCEES_LIST,
  MOCK_LOCATIONS_LIST,
} from '../mocks/locations.mocks';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_MEMBER_ID = 'member123';

const MOCK_MEMBER_PROFILE = {
  _id: MOCK_MEMBER_ID,
  memberId: 'M001',
  username: 'jdoe',
  gamingLocation: 'loc456',
  locationName: 'Casino Royal',
  points: 1500,
  uaccount: 250.0,
  accountLocked: false,
  loggedIn: false,
  status: 'active',
  profile: {
    firstName: 'John',
    lastName: 'Doe',
    occupation: 'Engineer',
    email: 'john@example.com',
    gender: 'male',
    dob: '1985-04-12',
    address: '123 Main St',
  },
  phoneNumber: '868-555-0001',
  createdAt: '2024-01-01T00:00:00Z',
};

const MOCK_SESSIONS_RESPONSE = {
  success: true,
  data: {
    sessions: [
      {
        _id: 'sess001',
        sessionId: 'sess001',
        machineId: 'mach789',
        time: 'Jun 1, 2026, 10:30 AM',
        sessionLength: '02:15:30',
        handle: 500,
        moneyIn: 100,
        moneyOut: 80,
        jackpot: 0,
        won: 450,
        bet: 500,
        wonLess: -50,
        points: 200,
        gamesPlayed: 150,
        gamesWon: 60,
        coinIn: 500,
        coinOut: 450,
        duration: 135,
      },
      {
        _id: 'sess002',
        sessionId: 'sess002',
        machineId: 'mach789',
        time: 'May 31, 2026, 3:00 PM',
        sessionLength: '01:30:00',
        handle: 300,
        moneyIn: 200,
        moneyOut: 150,
        jackpot: 50,
        won: 250,
        bet: 300,
        wonLess: 50,
        points: 100,
        gamesPlayed: 80,
        gamesWon: 40,
        coinIn: 300,
        coinOut: 250,
        duration: 90,
      },
    ],
    pagination: {
      currentPage: 1,
      totalPages: 3,
      totalSessions: 55,
      hasNextPage: true,
      hasPrevPage: false,
    },
  },
};

// ─── Shared mock helper ────────────────────────────────────────────────────────

async function mockMemberDetailAPIs(
  page: Page,
  currentUser = MOCK_CURRENT_USER,
  memberStatus: number = 200
) {
  // Seed Zustand stores so ProtectedRoute has the user immediately
  const userStoreJSON = JSON.stringify({
    state: {
      user: {
        _id: currentUser.user._id,
        username: currentUser.user.username,
        emailAddress: currentUser.user.emailAddress,
        profile: currentUser.user.profile,
        roles: currentUser.user.roles,
        isEnabled: currentUser.user.isEnabled,
        assignedLocations: currentUser.user.assignedLocations,
        assignedLicencees: currentUser.user.assignedLicencees,
      },
      isInitialized: true,
      hasActiveVaultShift: false,
      isVaultReconciled: false,
      isStaleShift: false,
    },
    version: 0,
  });
  const activeLicencee = currentUser.user.assignedLicencees[0] ?? '';
  const dashboardStoreJSON = JSON.stringify({
    state: {
      selectedLicencee: activeLicencee,
      activeMetricsFilter: 'Today',
      displayCurrency: 'TTD',
      gameDayOffset: 8,
      customDateRange: {
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      },
    },
    version: 0,
  });
  await page.addInitScript(`
    localStorage.setItem('user-auth-store', ${JSON.stringify(userStoreJSON)});
    localStorage.setItem('dashboard-store', ${JSON.stringify(dashboardStoreJSON)});
  `);

  // Auth endpoints
  await page.route('**/api/auth/current-user**', route =>
    route.fulfill({ status: 200, json: currentUser })
  );
  await page.route('**/api/auth/token**', route =>
    route.fulfill({ status: 200, json: { userId: currentUser.user._id } })
  );
  await page.route(`**/api/users/${currentUser.user._id}**`, route =>
    route.fulfill({
      status: 200,
      json: { success: true, user: currentUser.user },
    })
  );

  // Install status (checked on app init)
  await page.route('**/api/install/status**', route =>
    route.fulfill({ status: 200, json: { success: true, data: { installed: true } } })
  );

  // Locations & licencees (required by PageLayout / header)
  await page.route('**/api/locations**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, locations: MOCK_LOCATIONS_LIST.locations },
    })
  );
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );

  // Member profile — registered FIRST so the broader pattern is in place.
  await page.route(`**/api/members/${MOCK_MEMBER_ID}**`, route => {
    if (memberStatus !== 200) {
      return route.fulfill({
        status: memberStatus,
        json: { success: false, error: 'Member not found' },
      });
    }
    return route.fulfill({ status: 200, json: MOCK_MEMBER_PROFILE });
  });

  // Member sessions — registered AFTER the broader member route so it takes
  // priority via LIFO ordering. Without this, the sessions request would be
  // caught by the /api/members/{id}** route and return the wrong payload.
  await page.route(`**/api/members/${MOCK_MEMBER_ID}/sessions**`, route =>
    route.fulfill({ status: 200, json: MOCK_SESSIONS_RESPONSE })
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Members Detail Page', () => {
  test('1. Member name renders in h1 as "John Doe"', async ({ page }) => {
    await test.step('Mock member detail APIs', async () => {
      await mockMemberDetailAPIs(page);
    });

    await test.step('Navigate to /members/member123', async () => {
      await page.goto(`/members/${MOCK_MEMBER_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the h1 shows the member full name', async () => {
      await expect(
        page.getByRole('heading', { name: 'John Doe' })
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('2. Back to Members link has href "/members"', async ({ page }) => {
    await test.step('Mock member detail APIs', async () => {
      await mockMemberDetailAPIs(page);
    });

    await test.step('Navigate to /members/member123', async () => {
      await page.goto(`/members/${MOCK_MEMBER_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Wait for back link to be visible', async () => {
      await expect(
        page.getByRole('link', { name: /back to members/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert back link href is /members', async () => {
      const backLink = page
        .getByRole('link', { name: /back to members/i })
        .first();
      await expect(backLink).toHaveAttribute('href', '/members');
    });
  });

  test("3. Player's Totals card is collapsed by default; clicking 'See More' expands stat cards", async ({
    page,
  }) => {
    await test.step('Mock member detail APIs', async () => {
      await mockMemberDetailAPIs(page);
    });

    await test.step('Navigate to /members/member123', async () => {
      await page.goto(`/members/${MOCK_MEMBER_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step("Assert Player's Totals heading is visible", async () => {
      await expect(
        page.getByRole('heading', { name: /player's totals/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert stat cards are NOT visible before expanding', async () => {
      // "Account Balance" only appears when the totals section is expanded
      await expect(
        page.getByText(/Account Balance/i).first()
      ).not.toBeVisible();
    });

    await test.step("Click 'See More' to expand the totals section", async () => {
      await page.getByText(/see more/i).first().click();
    });

    await test.step('Assert stat cards are NOW visible after expanding', async () => {
      await expect(
        page.getByText(/Account Balance/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('4. Sessions table renders with correct column headers', async ({
    page,
  }) => {
    await test.step('Mock member detail APIs', async () => {
      await mockMemberDetailAPIs(page);
    });

    await test.step('Navigate to /members/member123 at desktop viewport', async () => {
      // The desktop table is only shown at xl (1280px+)
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/members/${MOCK_MEMBER_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the sessions table is visible', async () => {
      await expect(page.getByRole('table').first()).toBeVisible({
        timeout: 10_000,
      });
    });

    await test.step('Assert "Login Time" column header exists', async () => {
      await expect(
        page.getByRole('columnheader', { name: /login time/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });

    await test.step('Assert additional column headers exist', async () => {
      await expect(
        page.getByRole('columnheader', { name: /session length/i }).first()
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: /money in/i }).first()
      ).toBeVisible();
      await expect(
        page.getByRole('columnheader', { name: /money out/i }).first()
      ).toBeVisible();
    });
  });

  test('5. Session row "View Events" link points to correct URL', async ({
    page,
  }) => {
    await test.step('Mock member detail APIs', async () => {
      await mockMemberDetailAPIs(page);
    });

    await test.step('Navigate to /members/member123 at desktop viewport', async () => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/members/${MOCK_MEMBER_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the first "View Events" link has a correct href', async () => {
      const viewEventsLink = page
        .getByRole('link', { name: /view events/i })
        .first();
      await expect(viewEventsLink).toBeVisible({ timeout: 10_000 });

      // Verify the link points to a valid events URL pattern (sorted by time desc
      // puts sess002 before sess001 since sess002 has a later time-of-day)
      await expect(viewEventsLink).toHaveAttribute(
        'href',
        /\/sessions\/sess\d+\/mach789\/events/
      );
    });
  });

  test('6. Export button is visible and "Export as CSV" option exists in dropdown', async ({
    page,
  }) => {
    await test.step('Mock member detail APIs', async () => {
      await mockMemberDetailAPIs(page);
    });

    await test.step('Navigate to /members/member123', async () => {
      await page.goto(`/members/${MOCK_MEMBER_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the Export button is visible', async () => {
      await expect(
        page.getByRole('button', { name: /export/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Click the Export button to open the dropdown', async () => {
      await page.getByRole('button', { name: /export/i }).first().click();
    });

    await test.step('Assert "Export as CSV" option is visible in the dropdown', async () => {
      await expect(
        page.getByText(/export as csv/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('7. Pagination "Next" button is enabled when totalPages > 1', async ({
    page,
  }) => {
    await test.step('Mock member detail APIs', async () => {
      await mockMemberDetailAPIs(page);
    });

    await test.step('Navigate to /members/member123 at desktop viewport', async () => {
      // The desktop pagination (with text buttons) is visible at sm+ (640px+)
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(`/members/${MOCK_MEMBER_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert the "Next" pagination button is enabled', async () => {
      // totalPages=3 so Next should be enabled on page 1
      const nextButton = page.getByRole('button', { name: 'Next' }).first();
      await expect(nextButton).toBeVisible({ timeout: 10_000 });
      await expect(nextButton).toBeEnabled();
    });
  });

  test('8. Member not found — mock 404 → shows "Member Not Found" error state', async ({
    page,
  }) => {
    await test.step('Mock member detail APIs with 404 for member profile', async () => {
      await mockMemberDetailAPIs(page, MOCK_CURRENT_USER, 404);
    });

    await test.step('Navigate to /members/member123', async () => {
      await page.goto(`/members/${MOCK_MEMBER_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert "Member Not Found" error heading is shown', async () => {
      await expect(
        page.getByText(/member not found/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('9. Occupation renders below the member name', async ({ page }) => {
    await test.step('Mock member detail APIs', async () => {
      await mockMemberDetailAPIs(page);
    });

    await test.step('Navigate to /members/member123', async () => {
      await page.goto(`/members/${MOCK_MEMBER_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert occupation text is visible below the name', async () => {
      await expect(
        page.getByRole('heading', { name: 'John Doe' })
      ).toBeVisible({ timeout: 10_000 });
      // MembersPlayerHeader renders occupation in a <p> tag beneath the h1
      await expect(page.getByText('Engineer')).toBeVisible({ timeout: 8_000 });
    });
  });

  test('10. Expanding Player\'s Totals shows all six stat card titles', async ({ page }) => {
    await test.step('Mock member detail APIs', async () => {
      await mockMemberDetailAPIs(page);
    });

    await test.step('Navigate to /members/member123', async () => {
      await page.goto(`/members/${MOCK_MEMBER_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Click See More to expand totals', async () => {
      await page.getByText(/see more/i).first().click();
    });

    await test.step('Assert all six stat card titles are visible', async () => {
      await expect(page.getByText('Account Balance')).toBeVisible({ timeout: 8_000 });
      await expect(page.getByText('Points Balance')).toBeVisible();
      await expect(page.getByText('Total Balance')).toBeVisible();
      await expect(page.getByText('Won/Loss')).toBeVisible();
      await expect(page.getByText('Total Bet')).toBeVisible();
      await expect(page.getByText('Total Games Played')).toBeVisible();
    });
  });

  test('11. Date filter buttons (Today, Yesterday, All Time) are visible in filter controls', async ({
    page,
  }) => {
    await test.step('Mock member detail APIs', async () => {
      await mockMemberDetailAPIs(page);
    });

    await test.step('Navigate to /members/member123', async () => {
      await page.goto(`/members/${MOCK_MEMBER_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Assert date filter buttons are visible', async () => {
      // DateFilters component renders time-period buttons
      await expect(page.getByRole('button', { name: /Today/i }).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('button', { name: /Yesterday/i }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /All Time/i }).first()).toBeVisible();
    });
  });

  test('12. Export dropdown also contains "Export as PDF" option', async ({ page }) => {
    await test.step('Mock member detail APIs', async () => {
      await mockMemberDetailAPIs(page);
    });

    await test.step('Navigate to /members/member123', async () => {
      await page.goto(`/members/${MOCK_MEMBER_ID}`);
      await page.waitForLoadState('networkidle');
    });

    await test.step('Open the Export dropdown', async () => {
      await page.getByRole('button', { name: /export/i }).first().click();
    });

    await test.step('Assert both CSV and PDF options are present', async () => {
      await expect(page.getByText(/export as csv/i).first()).toBeVisible({ timeout: 8_000 });
      await expect(page.getByText(/export as pdf/i).first()).toBeVisible();
    });
  });
});
