/**
 * Administration — User Management & Licencee Management E2E Tests
 * ──────────────────────────────────────────────────────────────────
 * Covers:
 *  User Management:
 *  1. Users table renders with data from the API
 *  2. Create user — happy path (username, email, password, role)
 *  3. Create user — duplicate username triggers an inline error
 *  4. Create user — role assignment is included in the POST request
 *  5. Edit user — form is pre-populated; updating email reflects in table
 *  6. Disable user — toggling isEnabled marks the user as Inactive
 *  7. Delete user — confirmation dialog → user removed from table
 *
 *  Licencee Management (includeJackpot):
 *  8.  Licencees section renders with includeJackpot displayed per licencee
 *  9.  Licencee with includeJackpot=true shows "Yes" badge
 *  10. Licencee with includeJackpot=false shows "No" badge
 *  11. Edit licencee — toggling includeJackpot checkbox updates the display
 */

import { type Page } from '@playwright/test';
import { test, expect } from '../fixtures/test.fixture';
import {
  MOCK_USERS_LIST,
  MOCK_USERS_LIST_AFTER_CREATE,
  MOCK_USERS_LIST_AFTER_EDIT,
  MOCK_USERS_LIST_AFTER_DELETE,
  MOCK_USER_CREATE_SUCCESS,
  MOCK_USER_UPDATE_SUCCESS,
  MOCK_USER_DELETE_SUCCESS,
  MOCK_USER_DUPLICATE_USERNAME,
} from '../mocks/users.mocks';
import {
  MOCK_LICENCEES_LIST,
  MOCK_LICENCEES_LIST_AFTER_EDIT,
  MOCK_LICENCEE_1,
  MOCK_LICENCEE_2,
} from '../mocks/locations.mocks';
import {
  MOCK_CURRENT_USER,
  MOCK_USER_MANAGER,
  MOCK_USER_LOCATION_ADMIN,
  MOCK_USER_VAULT_MANAGER,
  MOCK_USER_CASHIER,
  MOCK_USER_TECHNICIAN,
  MOCK_USER_COLLECTOR,
} from '../mocks/auth.mocks';
import { setRoleAuthCookie } from '../fixtures/auth.fixture';

// ─── Shared mock helper ───────────────────────────────────────────────────────

async function mockUsersAPIs(
  page: Page,
  listPayload = MOCK_USERS_LIST
) {
  await page.route('**/api/auth/current-user**', (route) =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/users**', (route) =>
    route.fulfill({ status: 200, json: listPayload })
  );
  await page.route('**/api/licencees**', (route) =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
  await page.route('**/api/gaming-locations**', (route) =>
    route.fulfill({
      status: 200,
      json: { success: true, data: [], timestamp: new Date().toISOString() },
    })
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

test.describe('Administration — User Management', () => {
  test('1. Users table renders with all users from the API', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock users list API', async () => {
      await mockUsersAPIs(page);
    });

    await test.step('Navigate to /administration', async () => {
      await administrationPage.goto();
    });

    await test.step('Assert "jdoe_admin" is in the table', async () => {
      await administrationPage.expectUserInTable('jdoe_admin');
    });

    await test.step('Assert "msmith_cashier" is in the table', async () => {
      await administrationPage.expectUserInTable('msmith_cashier');
    });

    await test.step('Assert "rjones_mgr" is in the table', async () => {
      await administrationPage.expectUserInTable('rjones_mgr');
    });

    await test.step('Assert the table has exactly 3 rows', async () => {
      await administrationPage.expectTableRowCount(3);
    });
  });

  test('2. Create user — happy path (all required fields filled)', async ({
    page,
    administrationPage,
  }) => {
    let createRequestBody: Record<string, unknown> = {};

    await test.step('Mock list and support APIs', async () => {
      await mockUsersAPIs(page);
    });

    await test.step('Intercept POST /api/users and return created user', async () => {
      await page.route('**/api/users', async (route) => {
        if (route.request().method() === 'POST') {
          createRequestBody = route.request().postDataJSON() as Record<string, unknown>;
          await route.fulfill({ status: 201, json: MOCK_USER_CREATE_SUCCESS });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('After creation, return updated user list', async () => {
      await page.route('**/api/users**', (route) =>
        route.fulfill({ status: 200, json: MOCK_USERS_LIST_AFTER_CREATE })
      );
    });

    await test.step('Navigate to administration page', async () => {
      await administrationPage.goto();
    });

    await test.step('Open the Add User modal', async () => {
      await administrationPage.openAddUserModal();
    });

    await test.step('Fill all required user fields', async () => {
      await administrationPage.fillUserForm({
        username: 'newuser_test',
        email: 'newuser@evolution1.com',
        password: 'SecurePass@123',
        confirmPassword: 'SecurePass@123',
        firstName: 'New',
        lastName: 'User',
        gender: 'other',
        roles: ['Technician'],
      });
    });

    await test.step('Submit the form', async () => {
      await administrationPage.submitUserForm();
    });

    await test.step('Assert POST body includes username and email', async () => {
      expect(createRequestBody).toMatchObject({
        username: 'newuser_test',
      });
    });

    await test.step('Assert the new user now appears in the table', async () => {
      await administrationPage.expectUserInTable('newuser_test');
    });
  });

  test('3. Create user — duplicate username triggers an inline validation error', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock users list API', async () => {
      await mockUsersAPIs(page);
    });

    await test.step('Intercept POST /api/users and return a 409 duplicate-username error', async () => {
      await page.route('**/api/users', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 409,
            json: MOCK_USER_DUPLICATE_USERNAME,
          });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('Navigate to administration page', async () => {
      await administrationPage.goto();
    });

    await test.step('Open the Add User modal', async () => {
      await administrationPage.openAddUserModal();
    });

    await test.step('Fill in the form using an existing username', async () => {
      await administrationPage.fillUserForm({
        username: 'jdoe_admin', // already exists in the mock
        email: 'another@evolution1.com',
        password: 'SecurePass@123',
        confirmPassword: 'SecurePass@123',
      });
    });

    await test.step('Submit the form', async () => {
      await administrationPage.submitUserForm();
    });

    await test.step('Assert the username error message is shown', async () => {
      await administrationPage.expectUsernameError('already exists');
    });

    await test.step('Assert the modal remains open', async () => {
      await administrationPage.expectAddModalVisible();
    });
  });

  test('4. Create user — role is correctly passed in the POST request', async ({
    page,
    administrationPage,
  }) => {
    let createRequestBody: Record<string, unknown> = {};

    await test.step('Mock APIs', async () => {
      await mockUsersAPIs(page);
    });

    await test.step('Intercept POST to capture request body', async () => {
      await page.route('**/api/users', async (route) => {
        if (route.request().method() === 'POST') {
          createRequestBody = route.request().postDataJSON() as Record<string, unknown>;
          await route.fulfill({ status: 201, json: MOCK_USER_CREATE_SUCCESS });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('After creation, list returns updated users', async () => {
      await page.route('**/api/users**', (route) =>
        route.fulfill({ status: 200, json: MOCK_USERS_LIST_AFTER_CREATE })
      );
    });

    await test.step('Navigate to administration page', async () => {
      await administrationPage.goto();
    });

    await test.step('Open Add User modal and assign the Technician role', async () => {
      await administrationPage.openAddUserModal();
      await administrationPage.fillUserForm({
        username: 'roletest_user',
        email: 'roletest@evolution1.com',
        password: 'SecurePass@123',
        confirmPassword: 'SecurePass@123',
        roles: ['Technician'],
      });
    });

    await test.step('Submit the form', async () => {
      await administrationPage.submitUserForm();
    });

    await test.step('Assert the POST body includes the Technician role', async () => {
      const roles = createRequestBody.roles as string[] | undefined;
      expect(roles).toBeDefined();
      expect(
        roles?.some((r) => r.toLowerCase().includes('technician'))
      ).toBe(true);
    });
  });

  test('5. Edit user — updating email is reflected in the table', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock users list API', async () => {
      await mockUsersAPIs(page);
    });

    await test.step('Intercept PUT /api/users and return updated user', async () => {
      await page.route('**/api/users', async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({ status: 200, json: MOCK_USER_UPDATE_SUCCESS });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('After edit, list returns updated email', async () => {
      await page.route('**/api/users**', (route) =>
        route.fulfill({ status: 200, json: MOCK_USERS_LIST_AFTER_EDIT })
      );
    });

    await test.step('Navigate to administration page', async () => {
      await administrationPage.goto();
    });

    await test.step('Click the Edit icon on the first user row (jdoe_admin)', async () => {
      await administrationPage.clickEditUser(0);
    });

    await test.step('Assert the edit modal opens', async () => {
      await expect(administrationPage.editModal).toBeVisible();
    });

    await test.step('Assert the email field is pre-populated', async () => {
      await expect(administrationPage.editEmailInput).toHaveValue(
        'john.doe@evolution1.com'
      );
    });

    await test.step('Clear and update the email address', async () => {
      await administrationPage.fillEditUserForm({
        email: 'john.doe.updated@evolution1.com',
      });
    });

    await test.step('Submit the edit form', async () => {
      await administrationPage.submitEditForm();
    });

    await test.step('Assert the updated email appears in the table', async () => {
      await expect(
        administrationPage.rowByEmail('john.doe.updated@evolution1.com')
      ).toBeVisible();
    });
  });

  test('6. Disable user — toggling isEnabled marks the user Inactive', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock users list API', async () => {
      await mockUsersAPIs(page);
    });

    await test.step('Intercept PUT to toggle enabled state', async () => {
      await page.route('**/api/users', async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            json: {
              success: true,
              data: { ...MOCK_USERS_LIST.data.users[0], isEnabled: false },
              timestamp: new Date().toISOString(),
            },
          });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('After disable, list returns the user as inactive', async () => {
      await page.route('**/api/users**', (route) =>
        route.fulfill({
          status: 200,
          json: {
            ...MOCK_USERS_LIST,
            data: {
              users: [
                { ...MOCK_USERS_LIST.data.users[0], isEnabled: false },
                ...MOCK_USERS_LIST.data.users.slice(1),
              ],
              pagination: MOCK_USERS_LIST.data.pagination,
            },
          },
        })
      );
    });

    await test.step('Navigate to administration page', async () => {
      await administrationPage.goto();
    });

    await test.step('Open the edit modal for the first user', async () => {
      await administrationPage.clickEditUser(0);
      await expect(administrationPage.editModal).toBeVisible();
    });

    await test.step('Toggle the isEnabled switch to disabled', async () => {
      await administrationPage.toggleUserEnabled();
    });

    await test.step('Save the changes', async () => {
      await administrationPage.submitEditForm();
    });

    await test.step('Assert the user row now shows an Inactive status', async () => {
      await administrationPage.expectUserRowDisabled('jdoe_admin');
    });
  });

  test('7. Delete user — confirmation dialog removes the user from the table', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock users list API', async () => {
      await mockUsersAPIs(page);
    });

    await test.step('Intercept DELETE /api/users and respond with success', async () => {
      await page.route('**/api/users/**', async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ status: 200, json: MOCK_USER_DELETE_SUCCESS });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('Navigate to administration page', async () => {
      await administrationPage.goto();
    });

    await test.step('Click the Delete icon on the last row (rjones_mgr)', async () => {
      await administrationPage.clickDeleteUser(2);
    });

    await test.step('Assert the delete confirmation dialog appears', async () => {
      await administrationPage.expectDeleteDialogVisible();
      await expect(administrationPage.deleteDialog).toContainText(/rjones_mgr|Robert Jones/i);
    });

    await test.step('Swap the list mock to the post-delete payload then confirm', async () => {
      await page.route('**/api/users**', (route) =>
        route.fulfill({ status: 200, json: MOCK_USERS_LIST_AFTER_DELETE })
      );
      await administrationPage.confirmDeleteUser();
    });

    await test.step('Assert "rjones_mgr" is no longer in the table', async () => {
      await administrationPage.expectUserNotInTable('rjones_mgr');
    });

    await test.step('Assert the remaining users are still present', async () => {
      await administrationPage.expectUserInTable('jdoe_admin');
      await administrationPage.expectUserInTable('msmith_cashier');
    });

    await test.step('Assert the table now has 2 rows', async () => {
      await administrationPage.expectTableRowCount(2);
    });
  });
});

// ─── Licencee Management Tests ────────────────────────────────────────────────

/**
 * Mocks all APIs needed for the licencees section of the Administration page.
 */
async function mockLicenceesAPIs(
  page: Page,
  licenceesPayload = MOCK_LICENCEES_LIST
) {
  await page.route('**/api/auth/current-user**', (route) =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/licencees**', (route) =>
    route.fulfill({ status: 200, json: licenceesPayload })
  );
  await page.route('**/api/users**', (route) =>
    route.fulfill({
      status: 200,
      json: { success: true, data: { users: [], pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 } }, timestamp: new Date().toISOString() },
    })
  );
  await page.route('**/api/gaming-locations**', (route) =>
    route.fulfill({
      status: 200,
      json: { success: true, data: [], timestamp: new Date().toISOString() },
    })
  );
}

test.describe('Administration — Licencee Management (includeJackpot)', () => {
  test('8. Licencees section renders both licencees from the API', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock licencees API', async () => {
      await mockLicenceesAPIs(page);
    });

    await test.step('Navigate to the licencees section', async () => {
      await administrationPage.gotoLicenceesSection();
    });

    await test.step('Assert "Evolution1 Ltd" is present on the page', async () => {
      await expect(page.getByText('Evolution1 Ltd')).toBeVisible();
    });

    await test.step('Assert "Caribbean Gaming Corp" is present on the page', async () => {
      await expect(page.getByText('Caribbean Gaming Corp')).toBeVisible();
    });
  });

  test('9. Licencee with includeJackpot=false displays "No" badge', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock licencees API — lic_001 has includeJackpot=false', async () => {
      await mockLicenceesAPIs(page);
    });

    await test.step('Navigate to the licencees section', async () => {
      await administrationPage.gotoLicenceesSection();
    });

    await test.step(`Assert "${MOCK_LICENCEE_1.name}" shows includeJackpot "No"`, async () => {
      await administrationPage.expectIncludeJackpot(MOCK_LICENCEE_1.name, false);
    });
  });

  test('10. Licencee with includeJackpot=true displays "Yes" badge', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock licencees API — lic_002 has includeJackpot=true', async () => {
      await mockLicenceesAPIs(page);
    });

    await test.step('Navigate to the licencees section', async () => {
      await administrationPage.gotoLicenceesSection();
    });

    await test.step(`Assert "${MOCK_LICENCEE_2.name}" shows includeJackpot "Yes"`, async () => {
      await administrationPage.expectIncludeJackpot(MOCK_LICENCEE_2.name, true);
    });
  });

  test('11. Edit licencee — enabling includeJackpot updates the badge to "Yes"', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock licencees API — lic_001 starts with includeJackpot=false', async () => {
      await mockLicenceesAPIs(page);
    });

    await test.step('Intercept PUT /api/licencees and respond with success', async () => {
      await page.route('**/api/licencees/**', async (route) => {
        if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 200,
            json: {
              success: true,
              data: { ...MOCK_LICENCEE_1, includeJackpot: true },
              message: 'Licencee updated successfully',
              timestamp: new Date().toISOString(),
            },
          });
        } else {
          await route.continue();
        }
      });
    });

    await test.step('Navigate to the licencees section', async () => {
      await administrationPage.gotoLicenceesSection();
    });

    await test.step('Verify initial includeJackpot badge is "No" for lic_001', async () => {
      await administrationPage.expectIncludeJackpot(MOCK_LICENCEE_1.name, false);
    });

    await test.step('Click edit on the first licencee row', async () => {
      await administrationPage.clickEditLicencee(0);
      await expect(administrationPage.editLicenceeModal).toBeVisible();
    });

    await test.step('Enable the Include Jackpot checkbox', async () => {
      await administrationPage.setIncludeJackpot(true);
    });

    await test.step('Submit the edit form', async () => {
      // Swap the licencees mock to return includeJackpot=true for lic_001
      await page.route('**/api/licencees**', (route) =>
        route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST_AFTER_EDIT })
      );
      await administrationPage.submitEditLicenceeForm();
    });

    await test.step('Assert the badge now shows "Yes" for lic_001', async () => {
      await administrationPage.expectIncludeJackpot(MOCK_LICENCEE_1.name, true);
    });
  });
});

// ─── Role-based access restriction tests ─────────────────────────────────────
//
// Administration page accessible to: developer, admin, manager, location admin
// Blocked: cashier (→ /vault/cashier/payouts), vault-manager (→ /vault/management),
//          technician (→ /unauthorized), collector (→ /collection-report)

test.describe('Administration — Role-based access', () => {
  for (const [label, userPayload] of [
    ['manager', MOCK_USER_MANAGER],
    ['location admin', MOCK_USER_LOCATION_ADMIN],
  ] as const) {
    test(`${label} can access /administration`, async ({ page, administrationPage }) => {
      await test.step(`Inject ${label} auth cookie and mock APIs`, async () => {
        await setRoleAuthCookie(page, userPayload);
        await mockUsersAPIs(page);
      });

      await test.step('Navigate to /administration', async () => {
        await administrationPage.goto();
        await page.waitForLoadState('networkidle');
      });

      await test.step('Assert no redirect away from /administration', async () => {
        expect(page.url()).not.toMatch(/\/login|\/unauthorized|\/vault/);
      });
    });
  }

  test('cashier is redirected from /administration', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_CASHIER);
    await page.goto('/administration');
    await page.waitForURL(/vault\/cashier\/payouts/, { timeout: 10_000 });
    await expect(page).toHaveURL(/vault\/cashier\/payouts/);
  });

  test('vault-manager is redirected from /administration', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_VAULT_MANAGER);
    await page.goto('/administration');
    await page.waitForURL(/vault\/management/, { timeout: 10_000 });
    await expect(page).toHaveURL(/vault\/management/);
  });

  test('technician is redirected from /administration to /unauthorized', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_TECHNICIAN);
    await page.goto('/administration');
    await page.waitForURL(/unauthorized/, { timeout: 10_000 });
    await expect(page).toHaveURL(/unauthorized/);
  });

  test('collector is redirected from /administration', async ({ page }) => {
    await setRoleAuthCookie(page, MOCK_USER_COLLECTOR);
    await page.goto('/administration');
    await page.waitForURL(/collection-report/, { timeout: 10_000 });
    await expect(page).toHaveURL(/collection-report/);
  });
});
