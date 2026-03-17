/**
 * Composed Test Fixture
 * ─────────────────────
 * Extends Playwright's base `test` object with pre-instantiated Page Object
 * Model instances.  Every test spec imports `{ test, expect }` from this file
 * instead of directly from `@playwright/test`.
 *
 * Available fixtures (passed as destructured params to test callbacks):
 *
 *   loginPage         — LoginPage POM
 *   dashboardPage     — DashboardPage POM
 *   locationsPage     — LocationsPage POM
 *   locationDetailPage — LocationDetailPage POM
 *   cabinetsPage      — CabinetsPage POM
 *   cabinetDetailPage — CabinetDetailPage POM
 *   administrationPage — AdministrationPage POM
 *
 * Usage:
 *   import { test, expect } from '../fixtures/test.fixture';
 *
 *   test('my test', async ({ locationsPage }) => {
 *     await locationsPage.goto();
 *     ...
 *   });
 */

import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { LocationsPage } from '../pages/LocationsPage';
import { LocationDetailPage } from '../pages/LocationDetailPage';
import { CabinetsPage } from '../pages/CabinetsPage';
import { CabinetDetailPage } from '../pages/CabinetDetailPage';
import { AdministrationPage } from '../pages/AdministrationPage';

// ─── Fixture type definitions ─────────────────────────────────────────────────

type PageObjectFixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  locationsPage: LocationsPage;
  locationDetailPage: LocationDetailPage;
  cabinetsPage: CabinetsPage;
  cabinetDetailPage: CabinetDetailPage;
  administrationPage: AdministrationPage;
};

// ─── Extended test object ────────────────────────────────────────────────────

export const test = base.extend<PageObjectFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  locationsPage: async ({ page }, use) => {
    await use(new LocationsPage(page));
  },

  locationDetailPage: async ({ page }, use) => {
    await use(new LocationDetailPage(page));
  },

  cabinetsPage: async ({ page }, use) => {
    await use(new CabinetsPage(page));
  },

  cabinetDetailPage: async ({ page }, use) => {
    await use(new CabinetDetailPage(page));
  },

  administrationPage: async ({ page }, use) => {
    await use(new AdministrationPage(page));
  },
});

// Re-export expect so specs only need one import
export { expect };
