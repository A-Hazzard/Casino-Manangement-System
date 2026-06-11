import { test, expect } from '../fixtures/test.fixture';
import { type Page, type Route } from 'playwright';
import { MOCK_CURRENT_USER } from '../mocks/auth.mocks';
import { MOCK_LICENCEES_LIST, MOCK_LOCATION_1 } from '../mocks/locations.mocks';

const SESSION_ID = 'sess_001';
const MACHINE_ID = 'mach_001';

const MOCK_SESSION_DETAIL = {
  success: true,
  data: {
    _id: SESSION_ID,
    memberId: 'member_001',
    memberFirstName: 'John',
    memberLastName: 'Player',
    machineId: MACHINE_ID,
    startTime: '2026-01-01T10:00:00.000Z',
    endTime: '2026-01-01T11:00:00.000Z',
    status: 'completed',
    locationMembershipSettings: {
      locationLimit: 5000,
      freePlayAmount: 100,
      enablePoints: true,
      enableFreePlays: true,
      pointsRatioMethod: 'games',
      pointMethodValue: 10,
      gamesPlayedRatio: 100,
      pointsMethodGameTypes: ['slot', 'poker'],
      freePlayGameTypes: ['slot'],
      freePlayCreditsTimeout: 300,
    },
  },
};

const MOCK_EVENTS_RESPONSE = {
  success: true,
  data: {
    events: [
      {
        _id: 'evt_001',
        machine: MACHINE_ID,
        currentSession: SESSION_ID,
        eventType: 'general',
        description: 'Player card inserted',
        command: '0x1A',
        gameName: 'Dragon Fortune',
        date: '2026-01-01T10:05:00.000Z',
        sequence: [
          { description: 'Card read successfully', logLevel: 'INFO', success: true },
          { description: 'Member lookup failed', logLevel: 'ERROR', success: false },
        ],
      },
      {
        _id: 'evt_002',
        machine: MACHINE_ID,
        currentSession: SESSION_ID,
        eventType: 'priority',
        description: 'Game door opened',
        command: '0x3B',
        gameName: null,
        date: '2026-01-01T10:10:00.000Z',
        sequence: [],
      },
    ],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalEvents: 2,
      hasNextPage: false,
      hasPrevPage: false,
    },
    filters: {
      eventTypes: ['general', 'priority'],
      events: ['Player card inserted', 'Game door opened'],
      games: ['Dragon Fortune'],
    },
  },
};

async function mockSessionEventsAPIs(page: Page, eventsResponse: Record<string, unknown> | null = MOCK_EVENTS_RESPONSE as unknown as Record<string, unknown>, sessionStatus = 200) {
  // Auth mock
  await page.route('**/api/auth/current-user', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token', (route: Route) =>
    route.fulfill({ status: 200, json: { userId: MOCK_CURRENT_USER.user.id } })
  );
  await page.route('**/api/users/**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, user: MOCK_CURRENT_USER.user } })
  );
  await page.route('**/api/licencees', (route: Route) =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
  await page.route('**/api/locations/**', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, data: MOCK_LOCATION_1, location: MOCK_LOCATION_1 } })
  );
  await page.route('**/api/locations', (route: Route) =>
    route.fulfill({ status: 200, json: { success: true, locations: [MOCK_LOCATION_1] } })
  );

  // Specific events endpoint (registered first in Playwright to match)
  await page.route(`**/api/sessions/${SESSION_ID}/${MACHINE_ID}/events**`, (route: Route) => {
    if (sessionStatus !== 200) {
      return route.fulfill({ status: sessionStatus, json: { success: false, error: 'Internal Server Error' } });
    }
    return route.fulfill({ status: 200, json: eventsResponse });
  });

  // Specific session detail endpoint
  await page.route(`**/api/sessions/${SESSION_ID}`, (route: Route) => {
    if (sessionStatus !== 200) {
      return route.fulfill({ status: sessionStatus, json: { success: false, error: 'Internal Server Error' } });
    }
    return route.fulfill({ status: 200, json: MOCK_SESSION_DETAIL });
  });
}

test.describe('Session Events Page', () => {
  test('1. Page heading and subtitle render properly', async ({ page }) => {
    await mockSessionEventsAPIs(page);
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: 'Session Events' })).toBeVisible({ timeout: 10_000 });
    // The subtitle may use member name or IDs — verify it mentions the session
    await expect(page.getByText(/session.*sess_001|sess_001.*machine.*mach_001/i).first()).toBeVisible();
  });

  test('2. Member Location Settings card renders Points and Free Play sections', async ({ page }) => {
    await mockSessionEventsAPIs(page);
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Member Location Settings')).toBeVisible({ timeout: 10_000 });
    // The settings section may start expanded or collapsed; if collapsed, expand it
    const toggleBtn = page.getByRole('button', { name: /show settings|hide settings/i });
    if (await toggleBtn.isVisible()) {
      const text = await toggleBtn.textContent();
      if (text?.toLowerCase().includes('show')) {
        await toggleBtn.click();
      }
    }

    await expect(page.getByRole('heading', { name: 'Points System' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Free Play System' })).toBeVisible();
  });

  test('3. Member Location Settings card toggle collapses and expands', async ({ page }) => {
    await mockSessionEventsAPIs(page);
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    const toggleBtn = page.getByRole('button', { name: /show settings|hide settings/i });
    await expect(toggleBtn).toBeVisible({ timeout: 10_000 });

    // Determine initial state — if it says "Show", click to expand first
    const initialText = (await toggleBtn.textContent())?.toLowerCase() ?? '';
    const startsExpanded = initialText.includes('hide');

    if (!startsExpanded) {
      // Expand
      await toggleBtn.click();
      await expect(toggleBtn).toHaveText(/hide settings/i);
      await expect(page.getByRole('heading', { name: 'Points System' })).toBeVisible();

      // Collapse
      await toggleBtn.click();
      await expect(toggleBtn).toHaveText(/show settings/i);
    } else {
      // Already expanded — collapse first
      await toggleBtn.click();
      await expect(toggleBtn).toHaveText(/show settings/i);

      // Expand again
      await toggleBtn.click();
      await expect(toggleBtn).toHaveText(/hide settings/i);
      await expect(page.getByRole('heading', { name: 'Points System' })).toBeVisible();
    }
  });

  test('4. Events table columns are visible on desktop', async ({ page }) => {
    await mockSessionEventsAPIs(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('columnheader', { name: 'Type' }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('columnheader', { name: 'Event' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Code' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Game' }).first()).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Date' }).first()).toBeVisible();
  });

  test('5. GENERAL event displays correct data row details', async ({ page }) => {
    await mockSessionEventsAPIs(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    const row = page.locator('tr').filter({ hasText: 'Player card inserted' });
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(row.getByText('GENERAL')).toBeVisible();
    await expect(row.getByText('0x1A')).toBeVisible();
    await expect(row.getByText('Dragon Fortune')).toBeVisible();
  });

  test('6. PRIORITY event type displays badge styling', async ({ page }) => {
    await mockSessionEventsAPIs(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    // The badge may be in a responsive container — verify it exists in the DOM
    const badge = page.getByText('PRIORITY').first();
    await expect(badge).toBeAttached({ timeout: 10_000 });
  });

  test('7. Event with sequence has expand button and reveals sequence process details', async ({ page }) => {
    await mockSessionEventsAPIs(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    const row = page.locator('tr').filter({ hasText: 'Player card inserted' });
    const expandBtn = row.locator('button');
    await expect(expandBtn).toBeVisible({ timeout: 10_000 });

    // Expand details
    await expandBtn.click();
    const sequenceSection = page.getByText('Sequence Process').locator('..');
    await expect(sequenceSection).toBeVisible();
    // Wait for animation/rendering to complete
    await page.waitForTimeout(300);
    await expect(sequenceSection.getByText('Card read successfully')).toBeVisible();
    await expect(sequenceSection.getByText('Member lookup failed')).toBeVisible();
  });

  test('8. Event with empty sequence has no details expand button rendered', async ({ page }) => {
    await mockSessionEventsAPIs(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    const row = page.locator('tr').filter({ hasText: 'Game door opened' });
    const expandBtn = row.locator('button');
    await expect(expandBtn).toHaveCount(0);
  });

  test('9. Empty state shows No events found when response is empty', async ({ page }) => {
    await mockSessionEventsAPIs(page, {
      success: true,
      data: {
        events: [],
        pagination: { currentPage: 1, totalPages: 0, totalEvents: 0, hasNextPage: false, hasPrevPage: false },
        filters: { eventTypes: [], events: [], games: [] }
      }
    });

    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('No events found')).toBeVisible({ timeout: 10_000 });
  });

  test('10. 500 server error shows Fetch Error message banner', async ({ page }) => {
    await mockSessionEventsAPIs(page, null, 500);

    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Fetch Error')).toBeVisible({ timeout: 10_000 });
  });

  test('11. Filters panel renders Quick Filters row with Critical, Warning, INFO, SAS Event buttons', async ({ page }) => {
    await mockSessionEventsAPIs(page);
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Quick Filters:')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Critical' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Warning' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'INFO' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'SAS Event' })).toBeVisible();
  });

  test('12. Clicking a quick filter activates it and shows Clear All button', async ({ page }) => {
    await mockSessionEventsAPIs(page);
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    // Clear All should not be visible before any filter is applied
    await expect(page.getByRole('button', { name: /Clear All/i })).toHaveCount(0, { timeout: 10_000 });

    // Click Critical quick filter
    await page.getByRole('button', { name: 'Critical' }).click();

    // Clear All should now appear because hasActiveFilters = true
    await expect(page.getByRole('button', { name: /Clear All/i })).toBeVisible({ timeout: 5_000 });
  });

  test('13. Clicking Clear All after a quick filter is active removes the filter and hides Clear All', async ({ page }) => {
    await mockSessionEventsAPIs(page);
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    // Activate a filter
    await page.getByRole('button', { name: 'INFO' }).click();
    await expect(page.getByRole('button', { name: /Clear All/i })).toBeVisible({ timeout: 5_000 });

    // Clear it
    await page.getByRole('button', { name: /Clear All/i }).click();

    // Clear All should disappear once all filters are cleared
    await expect(page.getByRole('button', { name: /Clear All/i })).toHaveCount(0, { timeout: 5_000 });
  });

  test('14. Jump to Code input is visible; Jump to Code button is disabled when input is empty', async ({ page }) => {
    await mockSessionEventsAPIs(page);
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    const input = page.getByPlaceholder(/Jump to event code/i);
    const jumpBtn = page.getByRole('button', { name: 'Jump to Code' });

    await expect(input).toBeVisible({ timeout: 10_000 });
    await expect(jumpBtn).toBeVisible();
    await expect(jumpBtn).toBeDisabled();
  });

  test('15. Typing a code enables the Jump to Code button', async ({ page }) => {
    await mockSessionEventsAPIs(page);
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    const input = page.getByPlaceholder(/Jump to event code/i);
    const jumpBtn = page.getByRole('button', { name: 'Jump to Code' });

    await input.fill('1A');
    await expect(jumpBtn).toBeEnabled({ timeout: 5_000 });
  });

  test('16. Jump to Code resolves and shows "Jumped to page" banner when API returns cursorResolved', async ({ page }) => {
    // Override events mock to return cursorResolved: true when command param is present
    await page.route('**/api/auth/current-user', (route: Route) =>
      route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
    );
    await page.route('**/api/auth/token', (route: Route) =>
      route.fulfill({ status: 200, json: { userId: MOCK_CURRENT_USER.user.id } })
    );
    await page.route('**/api/users/**', (route: Route) =>
      route.fulfill({ status: 200, json: { success: true, user: MOCK_CURRENT_USER.user } })
    );
    await page.route('**/api/licencees', (route: Route) =>
      route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
    );
    await page.route('**/api/locations/**', (route: Route) =>
      route.fulfill({ status: 200, json: { success: true, data: MOCK_LOCATION_1, location: MOCK_LOCATION_1 } })
    );
    await page.route('**/api/locations', (route: Route) =>
      route.fulfill({ status: 200, json: { success: true, locations: [MOCK_LOCATION_1] } })
    );
    await page.route(`**/api/sessions/${SESSION_ID}`, (route: Route) =>
      route.fulfill({ status: 200, json: MOCK_SESSION_DETAIL })
    );
    await page.route(`**/api/sessions/${SESSION_ID}/${MACHINE_ID}/events**`, (route: Route) => {
      const url = new URL(route.request().url());
      const command = url.searchParams.get('command');
      if (command) {
        return route.fulfill({
          status: 200,
          json: {
            success: true,
            data: {
              events: MOCK_EVENTS_RESPONSE.data.events.filter(
                ev => ev.command?.toLowerCase() === command.toLowerCase()
              ),
              pagination: {
                currentPage: 1,
                totalPages: 1,
                totalEvents: 1,
                hasNextPage: false,
                hasPrevPage: false,
                cursorResolved: true,
              },
              filters: MOCK_EVENTS_RESPONSE.data.filters,
            },
          },
        });
      }
      return route.fulfill({ status: 200, json: MOCK_EVENTS_RESPONSE });
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/sessions/${SESSION_ID}/${MACHINE_ID}/events`);
    await page.waitForLoadState('networkidle');

    // Type a code that matches an existing event
    const input = page.getByPlaceholder(/Jump to event code/i);
    await input.fill('0x1A');
    await page.getByRole('button', { name: 'Jump to Code' }).click();

    // Banner should appear once the API returns cursorResolved: true
    await expect(
      page.getByText(/Jumped to page.*first occurrence of code/i)
    ).toBeVisible({ timeout: 10_000 });
  });
});
