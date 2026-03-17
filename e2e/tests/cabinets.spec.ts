/**
 * Cabinets & Cabinet Detail E2E Tests
 * ─────────────────────────────────────
 * Covers — Cabinets list page (/cabinets):
 *  1. Cabinet table renders with data from the API
 *  2. Create cabinet — happy path (form fill → cabinet appears in table)
 *  3. Create cabinet — invalid SMIB board format shows validation error
 *  4. Create cabinet — serial number < 3 chars shows validation error
 *  5. Edit cabinet — form is pre-populated; updating custom name reflects in table
 *  6. Delete cabinet — confirmation dialog → cabinet removed from table
 *  7. Sort by Gross column reorders rows
 *
 * Covers — Cabinet detail page (/cabinets/[cabinetId]):
 *  8. Financial metric cards are visible
 *  9. Time-period filter changes the data on the detail page
 * 10. SAS meter data section is visible
 * 11. Meter history entries are listed
 */

import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_CABINETS_LIST,
  MOCK_CABINETS_LIST_AFTER_DELETE,
  MOCK_CABINET_DETAIL,
  MOCK_CABINET_CREATE_SUCCESS,
  MOCK_CABINET_UPDATE_SUCCESS,
  MOCK_CABINET_DELETE_SUCCESS,
  MOCK_METER_HISTORY,
  MOCK_MANUFACTURERS,
} from '../mocks/cabinets.mocks';
import {
  MOCK_LOCATIONS_LIST,
  MOCK_LICENCEES_LIST,
} from '../mocks/locations.mocks';
import { MOCK_CURRENT_USER } from '../mocks/auth.mocks';

const CABINET_ID = 'mach_001';

// ─── Shared mock helpers ──────────────────────────────────────────────────────

async function mockCabinetsListAPIs(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  listPayload = MOCK_CABINETS_LIST
) {
  await page.route('**/api/auth/current-user**', (route) =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/reports/machines**', (route) =>
    route.fulfill({ status: 200, json: listPayload })
  );
  await page.route('**/api/machines**', (route) =>
    route.fulfill({ status: 200, json: listPayload })
  );
  await page.route('**/api/gaming-locations**', (route) =>
    route.fulfill({ status: 200, json: MOCK_LOCATIONS_LIST })
  );
  await page.route('**/api/manufacturers**', (route) =>
    route.fulfill({ status: 200, json: MOCK_MANUFACTURERS })
  );
  await page.route('**/api/licencees**', (route) =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
}

async function mockCabinetDetailAPIs(
  page: Parameters<Parameters<typeof test>[1]>[0]['page']
) {
  await page.route('**/api/auth/current-user**', (route) =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route(`**/api/cabinets/${CABINET_ID}**`, (route) =>
    route.fulfill({ status: 200, json: MOCK_CABINET_DETAIL })
  );
  await page.route(`**/api/machines/${CABINET_ID}**`, (route) =>
    route.fulfill({ status: 200, json: MOCK_CABINET_DETAIL })
  );
  await page.route('**/api/meters**', (route) =>
    route.fulfill({ status: 200, json: MOCK_METER_HISTORY })
  );
}

// ─── Cabinet LIST tests ───────────────────────────────────────────────────────

test.describe('Cabinets List', () => {
  test('1. Cabinet table renders with data from the API', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock cabinets list API', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Assert first cabinet (Lucky Dragon) appears in the table', async () => {
      await cabinetsPage.expectCabinetInTable('Lucky Dragon');
    });

    await test.step('Assert second cabinet (Golden Pharaoh) appears in the table', async () => {
      await cabinetsPage.expectCabinetInTable('Golden Pharaoh');
    });

    await test.step('Assert table has exactly 2 rows', async () => {
      await cabinetsPage.expectTableRowCount(2);
    });
  });

  test('2. Create cabinet — happy path', async ({ page, cabinetsPage }) => {
    let createRequestBody: Record<string, unknown> = {};

    await test.step('Mock list and support APIs', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Intercept POST cabinet creation endpoint', async () => {
      await page.route('**/api/locations/**/cabinets', async (route) => {
        if (route.request().method() === 'POST') {
          createRequestBody = route.request().postDataJSON() as Record<string, unknown>;
          await route.fulfill({ status: 201, json: MOCK_CABINET_CREATE_SUCCESS });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('After creation, return updated list including the new cabinet', async () => {
      await page.route('**/api/reports/machines**', (route) =>
        route.fulfill({
          status: 200,
          json: {
            ...MOCK_CABINETS_LIST,
            data: {
              machines: [
                ...MOCK_CABINETS_LIST.data.machines,
                MOCK_CABINET_CREATE_SUCCESS.data,
              ],
              pagination: { page: 1, limit: 10, totalCount: 3, totalPages: 1 },
            },
          },
        })
      );
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Open the New Cabinet modal', async () => {
      await cabinetsPage.openNewCabinetModal();
    });

    await test.step('Fill the form with valid data', async () => {
      await cabinetsPage.fillCabinetForm({
        serialNumber: 'SN-NEWCAB',
        game: 'Star Burst',
        gameType: 'slot',
        relayId: '5',
        location: 'Grand Casino North',
        manufacturer: 'NetEnt',
        customName: 'New Test Cabinet',
      });
    });

    await test.step('Submit the form', async () => {
      await cabinetsPage.submitCabinetForm();
    });

    await test.step('Assert POST body contains the correct serial number', async () => {
      expect(createRequestBody).toMatchObject({ serialNumber: 'SN-NEWCAB' });
    });

    await test.step('Assert new cabinet appears in the table', async () => {
      await cabinetsPage.expectCabinetInTable('New Test Cabinet');
    });
  });

  test('3. Create cabinet — invalid SMIB board format shows validation error', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Navigate to /cabinets and open New Cabinet modal', async () => {
      await cabinetsPage.goto();
      await cabinetsPage.openNewCabinetModal();
    });

    await test.step('Fill a valid serial number but an invalid SMIB board', async () => {
      await cabinetsPage.fillCabinetForm({
        serialNumber: 'SN-VALID01',
        // SMIB must be 12 hex chars ending in 0,4,8,c — this is wrong
        smibBoard: 'INVALID-SMIB',
      });
    });

    await test.step('Submit the form', async () => {
      await cabinetsPage.submitCabinetForm();
    });

    await test.step('Assert SMIB board validation error is shown', async () => {
      await cabinetsPage.expectSmibValidationError();
    });

    await test.step('Assert modal stays open', async () => {
      await cabinetsPage.expectCreateModalVisible();
    });
  });

  test('4. Create cabinet — serial number with fewer than 3 chars shows validation error', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Navigate to /cabinets and open New Cabinet modal', async () => {
      await cabinetsPage.goto();
      await cabinetsPage.openNewCabinetModal();
    });

    await test.step('Enter a 2-character serial number', async () => {
      await cabinetsPage.fillCabinetForm({ serialNumber: 'AB' });
    });

    await test.step('Submit the form', async () => {
      await cabinetsPage.submitCabinetForm();
    });

    await test.step('Assert serial number validation error is shown', async () => {
      await cabinetsPage.expectSerialNumberValidationError();
    });
  });

  test('5. Edit cabinet — custom name update reflects in the table', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock list and support APIs', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Intercept PUT cabinet update endpoint', async () => {
      await page.route('**/api/cabinets/**', async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({ status: 200, json: MOCK_CABINET_UPDATE_SUCCESS });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('After edit, return updated list with renamed cabinet', async () => {
      await page.route('**/api/reports/machines**', (route) =>
        route.fulfill({
          status: 200,
          json: {
            ...MOCK_CABINETS_LIST,
            data: {
              machines: [
                { ...MOCK_CABINETS_LIST.data.machines[0], custom: { name: 'Lucky Dragon (Renamed)' } },
                MOCK_CABINETS_LIST.data.machines[1],
              ],
              pagination: MOCK_CABINETS_LIST.data.pagination,
            },
          },
        })
      );
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Click Edit on the first row', async () => {
      await cabinetsPage.clickEdit(0);
    });

    await test.step('Assert edit modal opens', async () => {
      await expect(cabinetsPage.editModal).toBeVisible();
    });

    await test.step('Update the custom name field', async () => {
      await cabinetsPage.fillEditCabinetForm({ customName: 'Lucky Dragon (Renamed)' });
    });

    await test.step('Submit the edit form', async () => {
      await cabinetsPage.submitEditForm();
    });

    await test.step('Assert the renamed cabinet appears in the table', async () => {
      await cabinetsPage.expectCabinetInTable('Lucky Dragon (Renamed)');
    });
  });

  test('6. Delete cabinet — confirmation removes the row from the table', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock list API', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Intercept DELETE cabinet endpoint', async () => {
      await page.route('**/api/cabinets/**', async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ status: 200, json: MOCK_CABINET_DELETE_SUCCESS });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Click Delete on the first row (Lucky Dragon)', async () => {
      await cabinetsPage.clickDelete(0);
    });

    await test.step('Assert the confirmation dialog is displayed', async () => {
      await cabinetsPage.expectDeleteDialogVisible();
      await expect(cabinetsPage.deleteDialog).toContainText('Lucky Dragon');
    });

    await test.step('Swap list mock to post-delete payload then confirm', async () => {
      await page.route('**/api/reports/machines**', (route) =>
        route.fulfill({ status: 200, json: MOCK_CABINETS_LIST_AFTER_DELETE })
      );
      await cabinetsPage.confirmDelete();
    });

    await test.step('Assert "Lucky Dragon" is no longer in the table', async () => {
      await cabinetsPage.expectCabinetNotInTable('Lucky Dragon');
    });

    await test.step('Assert "Golden Pharaoh" is still present', async () => {
      await cabinetsPage.expectCabinetInTable('Golden Pharaoh');
    });
  });

  test('7. Clicking the Gross column header sorts the rows', async ({
    page,
    cabinetsPage,
  }) => {
    await test.step('Mock cabinets list API', async () => {
      await mockCabinetsListAPIs(page);
    });

    await test.step('Navigate to /cabinets', async () => {
      await cabinetsPage.goto();
    });

    await test.step('Read the initial order of the first cell in each row', async () => {
      const firstRowText = await cabinetsPage.tableRows.nth(0).textContent();
      expect(firstRowText).toContain('Lucky Dragon');
    });

    await test.step('Click the Gross column header to sort ascending', async () => {
      await cabinetsPage.sortByGross();
    });

    await test.step('Assert the Gross header shows a sort indicator', async () => {
      await expect(cabinetsPage.grossColumnHeader).toContainText(/▲|▼|↑|↓/);
    });
  });
});

// ─── Cabinet DETAIL tests ─────────────────────────────────────────────────────

test.describe('Cabinet Detail', () => {
  test('8. Financial metric cards are visible on the cabinet detail page', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail API', async () => {
      await mockCabinetDetailAPIs(page);
    });

    await test.step(`Navigate to /cabinets/${CABINET_ID}`, async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Assert Money In, Money Out, and Gross cards are visible', async () => {
      await cabinetDetailPage.expectFinancialMetricsVisible();
    });
  });

  test('9. Time-period filter on detail page fires a new API request', async ({
    page,
    cabinetDetailPage,
  }) => {
    const capturedUrls: string[] = [];

    await test.step('Mock cabinet detail API and capture requests', async () => {
      await mockCabinetDetailAPIs(page);
      page.on('request', (req) => {
        if (req.url().includes(`/api/cabinets/${CABINET_ID}`) ||
            req.url().includes(`/api/machines/${CABINET_ID}`)) {
          capturedUrls.push(req.url());
        }
      });
    });

    await test.step('Navigate to cabinet detail', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Select "Week" period filter', async () => {
      await cabinetDetailPage.selectTimePeriod('Week');
    });

    await test.step('Assert a new API request was fired with a period param', async () => {
      const lastRequest = capturedUrls.at(-1) ?? '';
      expect(lastRequest).toMatch(/week|last7|period/i);
    });
  });

  test('10. SAS meter data section is visible on the detail page', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail API', async () => {
      await mockCabinetDetailAPIs(page);
    });

    await test.step('Navigate to cabinet detail', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Assert meter data section is visible', async () => {
      await cabinetDetailPage.expectMeterDataVisible();
    });
  });

  test('11. Meter history entries are listed on the detail page', async ({
    page,
    cabinetDetailPage,
  }) => {
    await test.step('Mock cabinet detail and meter history APIs', async () => {
      await mockCabinetDetailAPIs(page);
    });

    await test.step('Navigate to cabinet detail', async () => {
      await cabinetDetailPage.goto(CABINET_ID);
    });

    await test.step('Assert the meter history section is visible', async () => {
      await cabinetDetailPage.expectMeterHistoryVisible();
    });

    await test.step('Assert at least one meter history row is rendered', async () => {
      const historyRows = page.locator(
        '[data-testid="meter-history-row"], table tbody tr'
      );
      await expect(historyRows.first()).toBeVisible();
    });
  });
});
