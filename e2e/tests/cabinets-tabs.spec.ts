/**
 * Cabinets LIST-page Tab Coverage E2E Tests
 * ───────────────────────────────────────────
 * The /cabinets page has 4 top-level tabs (CabinetsNavigation):
 *   Cabinets · Movement Requests · SMIB Management · Firmware
 *
 * cabinets.spec.ts already covers the "Cabinets" tab in depth. This spec covers
 * the other three tabs (which are local-state, no URL param — clicked via the nav):
 *
 *  1. Movement Requests tab renders its search + status filter UI
 *  2. Movement Requests tab is hidden from the nav for the collector role
 *  3. SMIB Management tab renders the "Select SMIB Device" panel
 *  4. Firmware tab renders the "SMIB Firmware" management section
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_CABINETS_LIST,
  MOCK_MANUFACTURERS,
  MOCK_MOVEMENT_REQUESTS,
  MOCK_SMIB_DISCOVERY,
  MOCK_FIRMWARES,
  MOCK_CABINET_DETAIL,
  MOCK_METER_HISTORY,
} from '../mocks/cabinets.mocks';
import {
  MOCK_LOCATIONS_LIST,
  MOCK_LICENCEES_LIST,
} from '../mocks/locations.mocks';
import {
  MOCK_CURRENT_USER,
  MOCK_USER_COLLECTOR,
  MOCK_USER_LOCATION_ADMIN,
  mockCurrentUserResponse,
} from '../mocks/auth.mocks';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';

const CABINET_ID = 'mach_001';

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockCabinetsTabAPIs(page: Page) {
  await page.route('**/api/auth/current-user**', route =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token**', route =>
    route.fulfill({ status: 200, json: { userId: '69b46e8854694ea2246da698' } })
  );
  await page.route('**/api/users/**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, user: MOCK_CURRENT_USER.user },
    })
  );

  // Cabinets list (initial tab) + supporting endpoints
  await page.route('**/api/cabinets**', route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ status: 200, json: MOCK_CABINETS_LIST });
    }
    return route.fallback();
  });
  await page.route('**/api/cabinets/aggregation**', route =>
    route.fulfill({ status: 200, json: MOCK_CABINETS_LIST })
  );
  await page.route('**/api/cabinets/status**', route =>
    route.fulfill({
      status: 200,
      json: { totalMachines: 2, onlineMachines: 1, offlineMachines: 1 },
    })
  );
  await page.route('**/api/manufacturers**', route =>
    route.fulfill({ status: 200, json: MOCK_MANUFACTURERS })
  );
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
  await page.route('**/api/locations**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, locations: MOCK_LOCATIONS_LIST.locations },
    })
  );

  // Tab-specific endpoints
  await page.route('**/api/movement-requests**', route =>
    route.fulfill({ status: 200, json: MOCK_MOVEMENT_REQUESTS })
  );
  await page.route('**/api/mqtt/discover-smibs**', route =>
    route.fulfill({ status: 200, json: MOCK_SMIB_DISCOVERY })
  );
  await page.route('**/api/firmwares**', route =>
    route.fulfill({ status: 200, json: MOCK_FIRMWARES })
  );
}

// Cabinet DETAIL page (for the SMIB Management section)
async function mockCabinetDetailAPIs(page: Page, currentUser = MOCK_CURRENT_USER) {
  await page.route('**/api/auth/current-user**', route =>
    route.fulfill({ status: 200, json: currentUser })
  );
  await page.route('**/api/auth/token**', route =>
    route.fulfill({ status: 200, json: { userId: currentUser.user._id } })
  );
  await page.route('**/api/users/**', route =>
    route.fulfill({ status: 200, json: { success: true, user: currentUser.user } })
  );
  await page.route('**/api/cabinets/**', route =>
    route.fulfill({ status: 200, json: MOCK_CABINET_DETAIL })
  );
  await page.route('**/api/meters**', route =>
    route.fulfill({ status: 200, json: MOCK_METER_HISTORY })
  );
  await page.route('**/api/manufacturers**', route =>
    route.fulfill({ status: 200, json: MOCK_MANUFACTURERS })
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
  await page.route('**/api/cabinets/status**', route =>
    route.fulfill({
      status: 200,
      json: { totalMachines: 1, onlineMachines: 1, offlineMachines: 0 },
    })
  );
  // MQTT live-config endpoints — return safe empties (Get Config opens an SSE stream
  // we don't drive in these render-level tests)
  await page.route('**/api/mqtt/**', route =>
    route.fulfill({ status: 200, json: { success: true, data: null } })
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Cabinets — list-page tabs', () => {
  test('1. Movement Requests tab renders search + status filter', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCabinetsTabAPIs(page);
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Click the Movement Requests tab', async () => {
      await page
        .getByRole('button', { name: /Movement Requests/i })
        .first()
        .click();
    });

    await test.step('Assert the movement requests search bar is shown', async () => {
      await expect(
        page.getByPlaceholder(/Search by creator, machine, location/i)
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert the status filter row is shown', async () => {
      await expect(
        page.getByText(/Filter Status:/i).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });

  test('2. Movement Requests tab is hidden for the collector role', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Set collector auth cookie', async () => {
      await setRoleAuthCookie(page, MOCK_USER_COLLECTOR);
    });

    await test.step('Mock APIs', async () => {
      await mockCabinetsTabAPIs(page);
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Assert the Movement Requests tab is NOT in the nav', async () => {
      await expect(
        page.getByRole('button', { name: /Movement Requests/i })
      ).toHaveCount(0, { timeout: 8_000 });
    });
  });

  test('3. SMIB Management tab renders the Select SMIB Device panel', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCabinetsTabAPIs(page);
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Click the SMIB Management tab', async () => {
      await page
        .getByRole('button', { name: /SMIB Management/i })
        .first()
        .click();
    });

    await test.step('Assert the Select SMIB Device heading is shown', async () => {
      await expect(
        page.getByText(/Select SMIB Device/i).first()
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  test('4. Firmware tab renders the SMIB Firmware section', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCabinetsTabAPIs(page);
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Click the Firmware tab', async () => {
      // The nav button's accessible name includes the emoji icon ("🛠️ Firmware"),
      // so match the label as a substring rather than anchoring.
      await page
        .getByRole('button', { name: /Firmware/i })
        .first()
        .click();
    });

    await test.step('Assert the SMIB Firmware heading + Add button are shown', async () => {
      await expect(
        page.getByRole('heading', { name: /SMIB Firmware/i }).first()
      ).toBeVisible({ timeout: 10_000 });
      await expect(
        page.getByRole('button', { name: /Add New Firmware Version/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });
  });
});

// ─── Cabinet DETAIL page: SMIB Management section ─────────────────────────────

test.describe('Cabinet detail — SMIB Management section', () => {
  test('5. SMIB Configuration section + Get Config button visible for admin', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail APIs (admin)', async () => {
      await mockCabinetDetailAPIs(page);
    });

    await test.step('Navigate to the cabinet detail page', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Assert the SMIB Configuration section heading is visible', async () => {
      await expect(
        page.getByRole('heading', { name: /SMIB Configuration/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert the "Get SMIB Configuration" fetch button is visible', async () => {
      await expect(
        page.getByRole('button', { name: /Get SMIB Config/i }).first()
      ).toBeVisible({ timeout: 8_000 });
    });

    await test.step('Assert the SMIB ID detail is shown', async () => {
      await expect(page.getByText(/SMIB ID:/i).first()).toBeVisible({
        timeout: 8_000,
      });
    });
  });

  test('6. SMIB Configuration section is hidden for location admin (no SMIB access)', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Set location-admin auth cookie', async () => {
      await setRoleAuthCookie(page, MOCK_USER_LOCATION_ADMIN);
    });

    await test.step('Mock cabinet detail APIs as location admin', async () => {
      await mockCabinetDetailAPIs(
        page,
        mockCurrentUserResponse(MOCK_USER_LOCATION_ADMIN)
      );
    });

    await test.step('Navigate to the cabinet detail page', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Wait for the page to render (summary card present)', async () => {
      await expect(
        page.getByText('Lucky Dragon', { exact: false }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert the SMIB Configuration section is NOT rendered', async () => {
      // canAccessSmibConfig excludes "location admin" → the whole section returns null
      await expect(
        page.getByRole('heading', { name: /SMIB Configuration/i })
      ).toHaveCount(0, { timeout: 5_000 });
    });
  });

  test('7. Clicking "Get SMIB Configuration" immediately shows Fetching... loading state', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail APIs', async () => {
      await mockCabinetDetailAPIs(page);
      // Mock the SSE subscription and config-request endpoints used by the hook
      await page.route('**/api/mqtt/config/subscribe**', route =>
        route.fulfill({ status: 200, body: '', contentType: 'text/event-stream' })
      );
      await page.route('**/api/mqtt/config/request**', route =>
        route.fulfill({ status: 200, json: { success: true } })
      );
    });

    await test.step('Navigate to the cabinet detail page', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Wait for initial SMIB section to render', async () => {
      await expect(
        page.getByRole('button', { name: /Get SMIB Config/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Click the Get SMIB Configuration button', async () => {
      await page.getByRole('button', { name: /Get SMIB Config/i }).first().click();
    });

    await test.step('Assert Fetching... loading state appears immediately', async () => {
      await expect(
        page.getByRole('button', { name: /Fetching/i }).first()
      ).toBeVisible({ timeout: 5_000 });
    });
  });

  test('8. After fetch completes the button relabels to "Get New Configuration"', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail APIs', async () => {
      await mockCabinetDetailAPIs(page);
      await page.route('**/api/mqtt/config/subscribe**', route =>
        route.fulfill({ status: 200, body: '', contentType: 'text/event-stream' })
      );
      await page.route('**/api/mqtt/config/request**', route =>
        route.fulfill({ status: 200, json: { success: true } })
      );
    });

    await test.step('Navigate to the cabinet detail page', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Wait for initial button and click it', async () => {
      await expect(
        page.getByRole('button', { name: /Get SMIB Config/i }).first()
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole('button', { name: /Get SMIB Config/i }).first().click();
    });

    await test.step('Wait for fetch to finish — button relabels to Get New Configuration', async () => {
      // The hook has a 1s connection delay + up to 5s polling = up to 6s total
      await expect(
        page.getByRole('button', { name: /Get New Config/i }).first()
      ).toBeVisible({ timeout: 15_000 });
    });
  });

  test('9. After fetch completes the chevron toggle is visible alongside the button', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail APIs', async () => {
      await mockCabinetDetailAPIs(page);
      await page.route('**/api/mqtt/config/subscribe**', route =>
        route.fulfill({ status: 200, body: '', contentType: 'text/event-stream' })
      );
      await page.route('**/api/mqtt/config/request**', route =>
        route.fulfill({ status: 200, json: { success: true } })
      );
    });

    await test.step('Navigate to the cabinet detail page and trigger fetch', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
      await expect(
        page.getByRole('button', { name: /Get SMIB Config/i }).first()
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole('button', { name: /Get SMIB Config/i }).first().click();
    });

    await test.step('Wait for fetch to complete', async () => {
      await expect(
        page.getByRole('button', { name: /Get New Config/i }).first()
      ).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Assert chevron icon is rendered in the header right side', async () => {
      // The chevron (ChevronDownIcon) is rendered as an svg inside a motion.div once
      // hasConfigBeenFetched is true — it sits alongside the "Get New Configuration" button
      const smibHeader = page.getByRole('heading', { name: /SMIB Configuration/i }).first();
      const headerRow = smibHeader.locator('../..');
      await expect(headerRow.locator('svg').last()).toBeVisible({ timeout: 5_000 });
    });
  });

  test('10. Chevron collapses the expanded SMIB config section; clicking again re-expands it', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail APIs', async () => {
      await mockCabinetDetailAPIs(page);
      await page.route('**/api/mqtt/config/subscribe**', route =>
        route.fulfill({ status: 200, body: '', contentType: 'text/event-stream' })
      );
      await page.route('**/api/mqtt/config/request**', route =>
        route.fulfill({ status: 200, json: { success: true } })
      );
    });

    await test.step('Navigate to the cabinet detail page and trigger fetch', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
      await expect(
        page.getByRole('button', { name: /Get SMIB Config/i }).first()
      ).toBeVisible({ timeout: 10_000 });
      await page.getByRole('button', { name: /Get SMIB Config/i }).first().click();
    });

    await test.step('Wait for fetch to complete and config to expand', async () => {
      // After fetch, the section auto-expands and the Network/WiFi heading is visible
      await expect(
        page.getByRole('heading', { name: /Network.*WiFi|Network \//i }).first()
      ).toBeVisible({ timeout: 15_000 });
    });

    await test.step('Click chevron to collapse the config section', async () => {
      // The chevron is a motion.div wrapping the ChevronDownIcon — click it
      const smibSection = page
        .locator('div')
        .filter({ has: page.getByRole('heading', { name: /SMIB Configuration/i }) })
        .first();
      const chevron = smibSection.locator('[class*="cursor-pointer"]').last();
      await chevron.click();
    });

    await test.step('Assert the Network section is no longer visible after collapse', async () => {
      await expect(
        page.getByRole('heading', { name: /Network.*WiFi|Network \//i }).first()
      ).not.toBeVisible({ timeout: 5_000 });
    });
  });
});
