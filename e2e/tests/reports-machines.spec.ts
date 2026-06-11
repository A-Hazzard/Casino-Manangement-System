/**
 * Reports Cabinets (Machines) Tab E2E Tests
 * ──────────────────────────────────────────
 * Tests the machines report tab under /reports?section=machines.
 *
 * Covers:
 *  1. Navigation to /reports?section=machines.
 *  2. Swapping sub-tabs (Overview, Offline, Evaluation).
 *  3. Overview sub-tab:
 *     - Stats cards display (Total, Online, Offline, Total Revenue).
 *     - Table columns structure.
 *     - Search query filtering.
 *     - Pagination controls.
 *  4. Offline sub-tab:
 *     - Selecting different duration thresholds (1h, 4h, 24h, 7d, all, never).
 *     - Display of offline-specific columns (Last Online, Offline Duration).
 *  5. Evaluation sub-tab:
 *     - Display of evaluation metrics and Pareto summary.
 *     - Display of Top and Least Performing machines tables.
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_LICENCEES_LIST,
  MOCK_LOCATIONS_LIST,
} from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER, MOCK_USER_PAYLOAD } from '../mocks/auth.mocks';

// ─── Shared Mock Helper ───────────────────────────────────────────────────────

async function mockReportsMachinesAPIs(page: Page) {
  // Authentication mocks
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

  // Locations & Licencees mocks
  await page.route('**/api/locations**', route =>
    route.fulfill({
      status: 200,
      json: MOCK_LOCATIONS_LIST,
    })
  );
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );

  // Fallbacks for other tabs
  await page.route('**/api/reports/locations**', route =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );
  await page.route('**/api/reports/meters**', route =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );
  await page.route('**/api/analytics/**', route =>
    route.fulfill({ status: 200, json: { success: true, data: [] } })
  );

  // Cabinets/Status API used by useLocationMachineStats
  await page.route('**/api/cabinets/status**', route =>
    route.fulfill({
      status: 200,
      json: {
        totalMachines: 3,
        onlineMachines: 2,
        offlineMachines: 1,
        criticalOffline: 1,
        recentOffline: 0,
        totalLocations: 2,
        onlineLocations: 2,
        offlineLocations: 0,
      },
    })
  );

  // Reports Machines API
  await page.route('**/api/reports/machines**', route => {
    const url = new URL(route.request().url());
    const type = url.searchParams.get('type');

    if (type === 'stats') {
      return route.fulfill({
        status: 200,
        json: {
          onlineCount: 2,
          offlineCount: 1,
          totalCount: 3,
          totalGross: 15000,
          totalDrop: 20000,
          totalCancelledCredits: 5000,
        },
      });
    } else if (type === 'offline') {
      return route.fulfill({
        status: 200,
        json: {
          success: true,
          data: [
            {
              machineId: 'mach_002',
              serialNumber: 'SN-10002',
              customName: 'Golden Pharaoh',
              machineName: 'Golden Pharaoh',
              locationName: 'South Bay Gaming',
              locationId: 'loc_002',
              gameTitle: 'Pharaoh Riches',
              manufacturer: 'Aristocrat',
              machineType: 'slot',
              isOnline: false,
              isSasEnabled: true,
              drop: 8000,
              totalCancelledCredits: 1500,
              jackpot: 300,
              coinIn: 8000,
              coinOut: 6200,
              gamesPlayed: 120,
              theoreticalHold: 0.07,
              netWin: 1500,
              gross: 1800,
              lastActivity: new Date(Date.now() - 5400 * 1000).toISOString(), // 1.5 hours ago
              avgBet: 2.0,
              includeJackpot: true,
              actualHold: 0.075,
              offlineDurationHours: 1.5,
              offlineTimeLabel: '1h 30m ago',
              actualOfflineTime: '1h 30m',
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            totalCount: 1,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });
    } else if (type === 'all') {
      return route.fulfill({
        status: 200,
        json: {
          success: true,
          data: [
            {
              machineId: 'mach_001',
              serialNumber: 'SN-10001',
              customName: 'Lucky Dragon',
              machineName: 'Lucky Dragon',
              locationName: 'Grand Casino North',
              locationId: 'loc_001',
              gameTitle: 'Dragon Fortune',
              manufacturer: 'IGT',
              machineType: 'slot',
              isOnline: true,
              isSasEnabled: true,
              drop: 10000,
              totalCancelledCredits: 2000,
              jackpot: 500,
              coinIn: 10000,
              coinOut: 7500,
              gamesPlayed: 150,
              theoreticalHold: 0.08,
              netWin: 2000,
              gross: 2500,
              lastActivity: new Date().toISOString(),
              avgBet: 1.5,
              includeJackpot: true,
              actualHold: 0.085,
            },
            {
              machineId: 'mach_002',
              serialNumber: 'SN-10002',
              customName: 'Golden Pharaoh',
              machineName: 'Golden Pharaoh',
              locationName: 'South Bay Gaming',
              locationId: 'loc_002',
              gameTitle: 'Pharaoh Riches',
              manufacturer: 'Aristocrat',
              machineType: 'slot',
              isOnline: false,
              isSasEnabled: true,
              drop: 8000,
              totalCancelledCredits: 1500,
              jackpot: 300,
              coinIn: 8000,
              coinOut: 6200,
              gamesPlayed: 120,
              theoreticalHold: 0.07,
              netWin: 1500,
              gross: 1800,
              lastActivity: new Date(Date.now() - 5400 * 1000).toISOString(),
              avgBet: 2.0,
              includeJackpot: true,
              actualHold: 0.075,
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            totalCount: 2,
            totalPages: 1,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });
    } else {
      // Default/overview
      return route.fulfill({
        status: 200,
        json: {
          success: true,
          data: [
            {
              machineId: 'mach_001',
              serialNumber: 'SN-10001',
              customName: 'Lucky Dragon',
              machineName: 'Lucky Dragon',
              locationName: 'Grand Casino North',
              locationId: 'loc_001',
              gameTitle: 'Dragon Fortune',
              manufacturer: 'IGT',
              machineType: 'slot',
              isOnline: true,
              isSasEnabled: true,
              drop: 10000,
              totalCancelledCredits: 2000,
              jackpot: 500,
              coinIn: 10000,
              coinOut: 7500,
              gamesPlayed: 150,
              theoreticalHold: 0.08,
              netWin: 2000,
              gross: 2500,
              lastActivity: new Date().toISOString(),
              avgBet: 1.5,
              includeJackpot: true,
              actualHold: 0.085,
            },
            {
              machineId: 'mach_002',
              serialNumber: 'SN-10002',
              customName: 'Golden Pharaoh',
              machineName: 'Golden Pharaoh',
              locationName: 'South Bay Gaming',
              locationId: 'loc_002',
              gameTitle: 'Pharaoh Riches',
              manufacturer: 'Aristocrat',
              machineType: 'slot',
              isOnline: false,
              isSasEnabled: true,
              drop: 8000,
              totalCancelledCredits: 1500,
              jackpot: 300,
              coinIn: 8000,
              coinOut: 6200,
              gamesPlayed: 120,
              theoreticalHold: 0.07,
              netWin: 1500,
              gross: 1800,
              lastActivity: new Date(Date.now() - 5400 * 1000).toISOString(),
              avgBet: 2.0,
              includeJackpot: true,
              actualHold: 0.075,
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            totalCount: 25,
            totalPages: 3,
            hasNextPage: true,
            hasPrevPage: false,
          },
        },
      });
    }
  });
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('Reports Cabinets (Machines) Tab', () => {
  test.beforeEach(async ({ page }) => {
    test.setTimeout(90_000);
    page.setDefaultNavigationTimeout(60_000);
    await mockReportsMachinesAPIs(page);
  });

  test('1. Navigation directly to /reports?section=machines and swapping sub-tabs', async ({ page }) => {
    await test.step('Navigate directly to machines section', async () => {
      await page.goto('/reports?section=machines');
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Assert the title is shown', async () => {
      await expect(
        page.getByRole('heading', { name: /^Reports$/i }).first()
      ).toBeVisible({ timeout: 10_000 });
    });

    await test.step('Assert sub-tabs are visible', async () => {
      const overviewTab = page.getByRole('tab', { name: /^Overview$/i }).first();
      const offlineTab = page.getByRole('tab', { name: /^Offline$/i }).first();
      const evaluationTab = page.getByRole('tab', { name: /^Evaluation$/i }).first();

      await expect(overviewTab).toBeVisible();
      await expect(offlineTab).toBeVisible();
      await expect(evaluationTab).toBeVisible();
    });

    await test.step('Swapping between sub-tabs works', async () => {
      const offlineTab = page.getByRole('tab', { name: /^Offline$/i }).first();
      const evaluationTab = page.getByRole('tab', { name: /^Evaluation$/i }).first();
      const overviewTab = page.getByRole('tab', { name: /^Overview$/i }).first();

      // Switch to Offline
      await offlineTab.click({ timeout: 25_000 });
      await expect(offlineTab).toHaveAttribute('aria-selected', 'true');

      // Switch to Evaluation
      await evaluationTab.click({ timeout: 25_000 });
      await expect(evaluationTab).toHaveAttribute('aria-selected', 'true');

      // Switch back to Overview
      await overviewTab.click({ timeout: 25_000 });
      await expect(overviewTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  test('2. Overview sub-tab displays statistics cards, table columns, search filtering, and pagination', async ({ page }) => {
    await test.step('Navigate directly to machines section', async () => {
      await page.goto('/reports?section=machines');
      await page.waitForLoadState('domcontentloaded');
    });

    await test.step('Assert statistics cards are correctly loaded', async () => {
      await expect(page.getByText('Total Machines').first()).toBeVisible({ timeout: 25_000 });
      await expect(page.getByText('Online Machines').first()).toBeVisible();
      await expect(page.getByText('Offline Machines').first()).toBeVisible();
      await expect(page.getByText('Total Revenue').first()).toBeVisible();

      // Check values match mock stats data
      const totalMachinesCard = page.locator('div.grid > div:has-text("Total Machines")');
      const onlineMachinesCard = page.locator('div.grid > div:has-text("Online Machines")');
      const offlineMachinesCard = page.locator('div.grid > div:has-text("Offline Machines")');

      await expect(totalMachinesCard.locator('.text-2xl').first()).toHaveText('3');
      await expect(onlineMachinesCard.locator('.text-2xl').first()).toHaveText('2');
      await expect(offlineMachinesCard.locator('.text-2xl').first()).toHaveText('1');
    });

    await test.step('Assert overview table columns are visible', async () => {
      const headers = ['Machine ID', 'Game', 'Location', 'Manufacturer', 'Handle', 'Money Out', 'Net Win', 'Gross', 'Status', 'Actions'];
      for (const header of headers) {
        await expect(page.getByRole('columnheader', { name: header }).first()).toBeVisible();
      }
    });

    await test.step('Assert row data displays correct details', async () => {
      // "Lucky Dragon" machine check
      await expect(page.getByText('Lucky Dragon').first()).toBeVisible();
      await expect(page.getByText('Grand Casino North').first()).toBeVisible();
      await expect(page.getByText('Dragon Fortune').first()).toBeVisible();
      await expect(page.getByText('IGT').first()).toBeVisible();

      // "Golden Pharaoh" machine check
      await expect(page.getByText('Golden Pharaoh').first()).toBeVisible();
      await expect(page.getByText('South Bay Gaming').first()).toBeVisible();
      await expect(page.getByText('Pharaoh Riches').first()).toBeVisible();
      await expect(page.getByText('Aristocrat').first()).toBeVisible();
    });

    await test.step('Verify search query filtering field', async () => {
      const searchInput = page.getByPlaceholder('Search machines...');
      await expect(searchInput).toBeVisible();
      await searchInput.fill('Lucky');
      await expect(searchInput).toHaveValue('Lucky');
    });

    await test.step('Verify pagination controls exist', async () => {
      // Pagination controls have "Page 1 of 1" or similar and previous/next page buttons
      await expect(page.getByText(/Page 1 of/i).first()).toBeVisible();
    });
  });

  test('3. Offline sub-tab displays offline-specific columns and supports duration threshold selection', async ({ page }) => {
    await test.step('Navigate directly to machines section and switch to Offline sub-tab', async () => {
      await page.goto('/reports?section=machines');
      await page.waitForLoadState('domcontentloaded');
      await page.getByRole('tab', { name: /^Offline$/i }).first().click({ timeout: 25_000 });

      // Since offlineSelectedLocations may start empty, select Grand Casino North to view offline machines
      const locationTrigger = page.getByRole('button', { name: 'Select locations...' });
      await expect(locationTrigger).toBeVisible({ timeout: 25_000 });
      await locationTrigger.click();

      const locationOption = page.getByText('Grand Casino North').first();
      await expect(locationOption).toBeVisible();
      await locationOption.click();

      // Close the popover
      await page.keyboard.press('Escape');
    });

    await test.step('Assert offline-specific columns exist', async () => {
      const offlineHeaders = ['Machine ID', 'Game', 'Location', 'Last Online', 'Offline Duration', 'Handle', 'Net Win', 'Actions'];
      for (const header of offlineHeaders) {
        await expect(page.getByRole('columnheader', { name: header }).first()).toBeVisible({ timeout: 25_000 });
      }
    });

    await test.step('Assert offline details row renders duration details', async () => {
      await expect(page.getByText('Golden Pharaoh').first()).toBeVisible();
      await expect(page.getByText('1h 30m ago').first()).toBeVisible();
    });

    await test.step('Verify selecting different duration thresholds', async () => {
      // Find duration threshold trigger select
      const durationTrigger = page.locator('button:has-text("All Durations"), button:has-text("Duration")').first();
      await expect(durationTrigger).toBeVisible();
      await durationTrigger.click();

      // Verify dropdown options are present
      await expect(page.getByRole('option', { name: 'All Durations' }).first()).toBeVisible();
      await expect(page.getByRole('option', { name: 'Never Online' }).first()).toBeVisible();
      await expect(page.getByRole('option', { name: '1+ Hours' }).first()).toBeVisible();
      await expect(page.getByRole('option', { name: '4+ Hours' }).first()).toBeVisible();
      await expect(page.getByRole('option', { name: '24+ Hours' }).first()).toBeVisible();
      await expect(page.getByRole('option', { name: '7+ Days' }).first()).toBeVisible();

      // Click "1+ Hours" to choose threshold
      await page.getByRole('option', { name: '1+ Hours' }).first().click();
    });
  });

  test('4. Evaluation sub-tab displays evaluation metrics, charts, top & bottom performance tables', async ({ page }) => {
    await test.step('Navigate directly to machines section and switch to Evaluation sub-tab', async () => {
      await page.goto('/reports?section=machines');
      await page.waitForLoadState('domcontentloaded');
      await page.getByRole('tab', { name: /^Evaluation$/i }).first().click({ timeout: 25_000 });
    });

    await test.step('Assert Summary section exists', async () => {
      await expect(page.getByText('Summary').first()).toBeVisible();
    });

    await test.step('Assert Pareto statements are calculated and displayed', async () => {
      // Pareto statements are displayed based on mock calculation results
      // E.g. "50.0% of the machines contribute to 55.6% of the Total Handle"
      // or check the presence of "Total Handle", "Total Win", "Total Games Played" statements.
      await expect(page.getByText(/contribute to .* Total/i).first()).toBeVisible();
    });

    await test.step('Assert Top & Bottom performing tables are rendered with columns', async () => {
      await expect(page.getByText('Top Machines').first()).toBeVisible();
      await expect(page.getByText('Least Performing Machines').first()).toBeVisible();

      // Assert table columns for Top Machines
      const tableHeaders = ['Location', 'Machine', 'Handle', 'Net Win', 'Gross', 'Hold %'];
      for (const header of tableHeaders) {
        await expect(page.getByRole('columnheader', { name: header }).first()).toBeVisible();
      }
    });

    await test.step('Assert specific evaluation details inside rows', async () => {
      // Row detail check
      await expect(page.getByText('Lucky Dragon').first()).toBeVisible();
      await expect(page.getByText('Golden Pharaoh').first()).toBeVisible();
    });
  });
});
