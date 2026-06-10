/**
 * Locations — Create modal field coverage (Phase 3)
 * ─────────────────────────────────────────────────
 * Exercises individual fields of the "Add New Location" modal and asserts they
 * are reflected in the POST /api/locations body or in the UI. Complements the
 * CRUD/access flows in locations.spec.ts. All network calls are mocked.
 *
 *  1. Membership Enabled checkbox reveals the membership settings section
 *  2. profitShare is sent in the POST body
 *  3. dayStartTime is converted to gameDayOffset in the POST body
 *  4. Bill Validator "Check All" sends all denominations enabled in the POST body
 *  5. Address and rel.licencee are sent in the POST body
 *
 * Edit modal field coverage:
 *  6. Edit modal pre-populates name, street, city, profit share
 *  7. Changing street sends address.street in the PUT body
 *  8. Changing profit share sends profitShare in the PUT body
 *  9. No-change submit shows "No changes detected"; no PUT fired
 *
 * List features:
 * 10. Search input filters the table to matching location rows
 *
 * NOTE: the locations list page exposes only a free-text search box — there is
 * no archived-status filter, restore action, pagination control, or column
 * sorting in this UI, so those planned cases are intentionally omitted.
 */

import { test, expect } from '../fixtures/test.fixture';
import type { Page } from '@playwright/test';
import {
  MOCK_LOCATIONS_LIST,
  MOCK_LOCATION_CREATE_SUCCESS,
} from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER } from '../mocks/auth.mocks';
import { MOCK_METRICS_DASHBOARD } from '../mocks/dashboard.mocks';

/**
 * Mirrors the working mock set from locations.spec.ts. The Locations page renders
 * its table from /api/reports/locations (not /api/locations) and also reads
 * dashboard/machine/membership/smib endpoints — all must be mocked or the page
 * never finishes loading. The licencee dropdown is fed `lic_1` / "Evolution1 Ltd".
 */
async function mockLocationsAPIs(page: Page) {
  await page.route('**/api/auth/current-user**', route =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token**', route =>
    route.fulfill({ status: 200, json: { userId: MOCK_CURRENT_USER.user.id } })
  );
  await page.route(`**/api/users/${MOCK_CURRENT_USER.user.id}**`, route =>
    route.fulfill({
      status: 200,
      json: { success: true, user: MOCK_CURRENT_USER.user },
    })
  );
  await page.route('**/api/metrics/dashboard**', route =>
    route.fulfill({ status: 200, json: MOCK_METRICS_DASHBOARD || {} })
  );
  await page.route('**/api/countries**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        countries: [{ _id: 'country_1', name: 'Trinidad and Tobago' }],
      },
    })
  );
  await page.route('**/api/licencees**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        licencees: [{ _id: 'lic_1', name: 'Evolution1 Ltd' }],
      },
    })
  );
  await page.route('**/api/reports/locations**', route => {
    const locationsArray = Array.isArray(MOCK_LOCATIONS_LIST.locations)
      ? MOCK_LOCATIONS_LIST.locations
      : [];
    const aggregatedData = locationsArray.map(loc => ({
      ...loc,
      location: loc._id || loc.id,
      locationName: loc.name,
    }));
    return route.fulfill({
      status: 200,
      json: {
        success: true,
        data: aggregatedData,
        pagination: {
          page: 1,
          limit: 50,
          totalCount: locationsArray.length,
          totalPages: 1,
        },
      },
    });
  });
  await page.route('**/api/reports/machine-stats**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        data: { totalLocations: 2, onlineLocations: 2, offlineLocations: 0 },
      },
    })
  );
  await page.route('**/api/reports/membership-stats**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, data: { membershipCount: 1 } },
    })
  );
  await page.route('**/api/admin/smib-sync**', route =>
    route.fulfill({
      status: 200,
      json: {
        lastSync: new Date().toISOString(),
        isStale: false,
        staleAfterHours: 24,
      },
    })
  );
  // GET-only fallback for /api/locations so the POST handler (registered earlier)
  // wins via LIFO ordering.
  await page.route('**/api/locations**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: MOCK_LOCATIONS_LIST });
    } else {
      await route.fallback();
    }
  });

  // Search-all endpoint: registered AFTER the generic /api/locations fallback so
  // it wins (LIFO - later routes take priority over earlier ones). The real API
  // accepts ?search= param and returns a bare array filtered server-side; our
  // mock must filter client-side to match.
  await page.route('**/api/locations/search-all**', route => {
    const url = new URL(route.request().url());
    const searchTerm = url.searchParams.get('search')?.trim().toLowerCase() || '';
    const locationsArray = Array.isArray(MOCK_LOCATIONS_LIST.locations)
      ? MOCK_LOCATIONS_LIST.locations
      : [];
    const filtered = searchTerm
      ? locationsArray.filter(loc => loc.name.toLowerCase().includes(searchTerm))
      : locationsArray;
    const aggregatedData = filtered.map(loc => ({
      ...loc,
      location: loc._id || loc.id,
      locationName: loc.name,
    }));
    return route.fulfill({ status: 200, json: aggregatedData });
  });
}

/**
 * Registers a POST interceptor that records the request body and returns success.
 */
async function interceptCreate(page: Page, sink: { body: Record<string, unknown> }) {
  await page.route('**/api/locations**', async route => {
    if (route.request().method() === 'POST') {
      sink.body = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({ status: 201, json: MOCK_LOCATION_CREATE_SUCCESS });
    } else {
      await route.fallback();
    }
  });
}

test.describe('Locations — Create modal field coverage', () => {
  test('1. Membership Enabled checkbox reveals the membership settings section', async ({
    page,
    locationsPage,
  }) => {
    await test.step('Mock APIs and open the create modal', async () => {
      await mockLocationsAPIs(page);
      await locationsPage.goto();
      await locationsPage.openCreateModal();
    });

    await test.step('Membership section is hidden by default', async () => {
      await locationsPage.expectMembershipSectionHidden();
    });

    await test.step('Enabling membership reveals the settings section', async () => {
      await locationsPage.setMembershipEnabled(true);
      await locationsPage.expectMembershipSectionVisible();
    });
  });

  test('2. profitShare is sent in the POST body', async ({
    page,
    locationsPage,
  }) => {
    const sink = { body: {} as Record<string, unknown> };

    await test.step('Mock APIs and intercept POST', async () => {
      await mockLocationsAPIs(page);
      await interceptCreate(page, sink);
    });

    await test.step('Fill the form with a custom profit share', async () => {
      await locationsPage.goto();
      await locationsPage.openCreateModal();
      await locationsPage.fillLocationForm({
        name: 'Profit Share Location',
        street: '1 Profit St',
        city: 'Arima',
      });
      await locationsPage.profitShareInput.fill('72');
      await locationsPage.selectLicencee('Evolution1 Ltd');
    });

    await test.step('Submit and assert profitShare is in the POST body', async () => {
      await locationsPage.submitCreateForm();
      expect(sink.body.profitShare).toBe(72);
    });
  });

  test('3. dayStartTime is converted to gameDayOffset in the POST body', async ({
    page,
    locationsPage,
  }) => {
    const sink = { body: {} as Record<string, unknown> };

    await test.step('Mock APIs and intercept POST', async () => {
      await mockLocationsAPIs(page);
      await interceptCreate(page, sink);
    });

    await test.step('Fill the minimum required fields (default day start 08:00)', async () => {
      await locationsPage.goto();
      await locationsPage.openCreateModal();
      await locationsPage.fillLocationForm({ name: 'Gaming Day Location' });
      await locationsPage.selectLicencee('Evolution1 Ltd');
    });

    await test.step('Submit and assert gameDayOffset is a number (default 8)', async () => {
      await locationsPage.submitCreateForm();
      expect(typeof sink.body.gameDayOffset).toBe('number');
      expect(sink.body.gameDayOffset).toBe(8);
    });
  });

  test('4. Bill Validator "Check All" sends all denominations enabled', async ({
    page,
    locationsPage,
  }) => {
    const sink = { body: {} as Record<string, unknown> };

    await test.step('Mock APIs and intercept POST', async () => {
      await mockLocationsAPIs(page);
      await interceptCreate(page, sink);
    });

    await test.step('Fill required fields and check all bill-validator denominations', async () => {
      await locationsPage.goto();
      await locationsPage.openCreateModal();
      await locationsPage.fillLocationForm({ name: 'Bill Validator Location' });
      await locationsPage.selectLicencee('Evolution1 Ltd');
      await locationsPage.toggleAllBillValidators();
    });

    await test.step('Submit and assert every billValidatorOptions value is true', async () => {
      await locationsPage.submitCreateForm();
      const options = sink.body.billValidatorOptions as
        | Record<string, boolean>
        | undefined;
      expect(options).toBeDefined();
      const values = Object.values(options ?? {});
      expect(values.length).toBeGreaterThan(0);
      expect(values.every(value => value === true)).toBe(true);
    });
  });

  test('5. Address and rel.licencee are sent in the POST body', async ({
    page,
    locationsPage,
  }) => {
    const sink = { body: {} as Record<string, unknown> };

    await test.step('Mock APIs and intercept POST', async () => {
      await mockLocationsAPIs(page);
      await interceptCreate(page, sink);
    });

    await test.step('Fill name, address and licencee', async () => {
      await locationsPage.goto();
      await locationsPage.openCreateModal();
      await locationsPage.fillLocationForm({
        name: 'Address Location',
        street: '500 Coast Road',
        city: 'San Fernando',
      });
      await locationsPage.selectLicencee('Evolution1 Ltd');
    });

    await test.step('Submit and assert address + rel.licencee in the POST body', async () => {
      await locationsPage.submitCreateForm();
      const address = sink.body.address as
        | { street?: string; city?: string }
        | undefined;
      const rel = sink.body.rel as { licencee?: string } | undefined;
      expect(address?.street).toBe('500 Coast Road');
      expect(address?.city).toBe('San Fernando');
      expect(rel?.licencee).toBe('lic_1');
    });
  });
});

// ─── Edit modal field coverage ────────────────────────────────────────────────

// The edit modal fetches GET /api/locations/{id} on open and pre-populates from
// `.location`. `rel.licencee` must match a dropdown option (`lic_1`) for the
// select to show a value. The detail also feeds the change-detection snapshot.
const EDIT_LOCATION_DETAIL = {
  success: true,
  location: {
    _id: 'loc_001',
    id: 'loc_001',
    name: 'Grand Casino North',
    country: 'country_1',
    address: { street: '1 Northern Blvd', city: 'Port of Spain' },
    rel: { licencee: 'lic_1' },
    licenceeId: 'lic_1',
    profitShare: 60,
    gameDayOffset: 8,
    geoCoords: { latitude: 10.6918, longitude: -61.2225 },
    membershipEnabled: false,
    aceEnabled: false,
    billValidatorOptions: {},
    locationMembershipSettings: {},
    includeJackpot: false,
  },
  timestamp: new Date().toISOString(),
};

/** Registers the single-location GET used to populate the edit modal. */
async function mockLocationDetail(page: Page) {
  await page.route('**/api/locations/loc_001**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: EDIT_LOCATION_DETAIL });
    } else {
      await route.fallback();
    }
  });
}

/** Records the PUT /api/locations body and returns success. */
async function interceptUpdate(
  page: Page,
  sink: { body: Record<string, unknown>; called: boolean }
) {
  await page.route('**/api/locations**', async route => {
    if (route.request().method() === 'PUT') {
      sink.called = true;
      sink.body = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        json: { success: true, data: EDIT_LOCATION_DETAIL.location },
      });
    } else {
      await route.fallback();
    }
  });
}

test.describe('Locations — Edit modal field coverage', () => {
  test('6. Edit modal pre-populates name, street, city, profit share', async ({
    page,
    locationsPage,
  }) => {
    await test.step('Mock APIs incl. the single-location detail', async () => {
      await mockLocationsAPIs(page);
      await mockLocationDetail(page);
    });

    await test.step('Open the edit modal for the first row', async () => {
      await locationsPage.goto();
      await locationsPage.clickEdit(0);
      await locationsPage.expectEditModalVisible();
    });

    await test.step('Assert fields are pre-populated from the detail payload', async () => {
      await expect(locationsPage.editNameInput).toHaveValue('Grand Casino North');
      await expect(locationsPage.editStreetInput).toHaveValue('1 Northern Blvd');
      await expect(locationsPage.editCityInput).toHaveValue('Port of Spain');
      await expect(locationsPage.editProfitShareInput).toHaveValue('60');
    });
  });

  test('7. Changing street sends address.street in the PUT body', async ({
    page,
    locationsPage,
  }) => {
    const sink = { body: {} as Record<string, unknown>, called: false };

    await test.step('Mock APIs, detail, and intercept PUT', async () => {
      await mockLocationsAPIs(page);
      await mockLocationDetail(page);
      await interceptUpdate(page, sink);
    });

    await test.step('Open edit modal and change the street', async () => {
      await locationsPage.goto();
      await locationsPage.clickEdit(0);
      await locationsPage.expectEditModalVisible();
      await locationsPage.fillEditForm({ street: '2 Updated Avenue' });
    });

    await test.step('Submit and assert address.street in the PUT body', async () => {
      await locationsPage.submitEditForm();
      const address = sink.body.address as { street?: string } | undefined;
      expect(sink.called).toBe(true);
      expect(address?.street).toBe('2 Updated Avenue');
    });
  });

  test('8. Changing profit share sends profitShare in the PUT body', async ({
    page,
    locationsPage,
  }) => {
    const sink = { body: {} as Record<string, unknown>, called: false };

    await test.step('Mock APIs, detail, and intercept PUT', async () => {
      await mockLocationsAPIs(page);
      await mockLocationDetail(page);
      await interceptUpdate(page, sink);
    });

    await test.step('Open edit modal and change the profit share', async () => {
      await locationsPage.goto();
      await locationsPage.clickEdit(0);
      await locationsPage.expectEditModalVisible();
      await locationsPage.fillEditForm({ profitShare: '85' });
    });

    await test.step('Submit and assert profitShare in the PUT body', async () => {
      await locationsPage.submitEditForm();
      expect(sink.called).toBe(true);
      expect(sink.body.profitShare).toBe(85);
    });
  });

  test('9. No-change submit shows "No changes detected" and fires no PUT', async ({
    page,
    locationsPage,
  }) => {
    const sink = { body: {} as Record<string, unknown>, called: false };

    await test.step('Mock APIs, detail, and intercept PUT', async () => {
      await mockLocationsAPIs(page);
      await mockLocationDetail(page);
      await interceptUpdate(page, sink);
    });

    await test.step('Open edit modal and submit without changes', async () => {
      await locationsPage.goto();
      await locationsPage.clickEdit(0);
      await locationsPage.expectEditModalVisible();
      await locationsPage.submitEditForm();
    });

    await test.step('Assert "No changes detected" toast and no PUT fired', async () => {
      await expect(
        page.getByText(/no changes detected/i).first()
      ).toBeVisible({ timeout: 5_000 });
      expect(sink.called).toBe(false);
    });
  });
});

// ─── List features ────────────────────────────────────────────────────────────

test.describe('Locations — list features', () => {
  test('10. Search input filters the list to matching locations', async ({
    page,
    locationsPage,
  }) => {
    await test.step('Mock APIs (two locations in the list)', async () => {
      await mockLocationsAPIs(page);
    });

    await test.step('Both locations appear in the table before searching', async () => {
      await locationsPage.goto();
      await locationsPage.expectTableHasRow('Grand Casino North');
      await locationsPage.expectTableHasRow('South Bay Gaming');
    });

    await test.step('Typing a query filters the table client-side', async () => {
      await page.getByPlaceholder(/search locations/i).fill('Grand');
      await locationsPage.expectTableHasRow('Grand Casino North');
      await locationsPage.expectTableNotHasRow('South Bay Gaming');
    });
  });
});
