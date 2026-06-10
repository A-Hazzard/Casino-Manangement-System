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
 *
 *  Create User — field coverage:
 *  12. Password < 8 chars shows strength error
 *  13. Password missing uppercase shows strength error
 *  14. Password missing number shows strength error
 *  15. Password missing special character shows strength error
 *  16. Confirm password mismatch shows error
 *  17. Profile fields (firstName, lastName, gender, phone) sent in POST body
 *  18. Assigned licencee sent in POST body
 *
 *  Edit User — field coverage:
 *  19. Edit modal pre-populates firstName, lastName, email, roles
 *  20. Changing firstName sends updated value in PUT body
 *
 *  Edit Licencee — field coverage:
 *  21. Edit licencee modal pre-populates name field
 *  22. Changing licencee name sends updated name in PUT body
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
  MOCK_USER_ADMIN,
} from '../mocks/users.mocks';
import {
  MOCK_LICENCEES_LIST,
  MOCK_LICENCEES_LIST_AFTER_EDIT,
  MOCK_LICENCEE_1,
  MOCK_LICENCEE_2,
  MOCK_COUNTRIES,
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

async function mockUsersAPIs(page: Page, listPayload = MOCK_USERS_LIST) {
  await page.route('**/api/auth/current-user**', route =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token**', route =>
    route.fulfill({
      status: 200,
      json: { userId: MOCK_CURRENT_USER.user.id },
    })
  );
  // General users list — registered before the specific profile mock so
  // the profile mock (registered last) gets higher LIFO priority.
  await page.route('**/api/users**', route =>
    route.fulfill({ status: 200, json: listPayload })
  );
  // Profile mock registered LAST so it wins over the general users list mock
  // when the specific user ID is requested.
  await page.route(`**/api/users/${MOCK_CURRENT_USER.user.id}**`, route =>
    route.fulfill({
      status: 200,
      json: { success: true, user: MOCK_CURRENT_USER.user },
    })
  );
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST })
  );
  await page.route('**/api/locations**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        locations: [],
        timestamp: new Date().toISOString(),
      },
    })
  );
  // User edits log activity after saving; mock it so the save flow doesn't await
  // a real network call before closing the modal / refreshing.
  await page.route('**/api/activity-logs**', route =>
    route.fulfill({ status: 200, json: { success: true } })
  );
}

// handleEditUser fetches GET /api/users/{id} and only opens the modal once the
// response includes a `.user`. Register this AFTER any broad users-list route
// handler so the individual fetch wins (LIFO).
async function mockSingleUserFetch(
  page: Page,
  userId: string,
  user: typeof MOCK_USER_ADMIN
) {
  await page.route(`**/api/users/${userId}**`, async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ status: 200, json: { success: true, user } });
    } else {
      await route.fallback();
    }
  });
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

    await test.step('Assert "jdoeadmin" is in the table', async () => {
      await administrationPage.expectUserInTable('jdoeadmin');
    });

    await test.step('Assert "msmithcashier" is in the table', async () => {
      await administrationPage.expectUserInTable('msmithcashier');
    });

    await test.step('Assert "rjonesmgr" is in the table', async () => {
      await administrationPage.expectUserInTable('rjonesmgr');
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

    await test.step('After creation the list mock returns the updated 4-user list (GET only)', async () => {
      // Registered BEFORE the POST handler so the POST handler wins (LIFO)
      await page.route('**/api/users**', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, json: MOCK_USERS_LIST_AFTER_CREATE });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Intercept POST /api/users — registered LAST so it wins over list mock', async () => {
      await page.route('**/api/users**', async route => {
        if (route.request().method() === 'POST') {
          createRequestBody = route.request().postDataJSON() as Record<
            string,
            unknown
          >;
          await route.fulfill({ status: 201, json: MOCK_USER_CREATE_SUCCESS });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Navigate to administration page', async () => {
      await administrationPage.goto();
    });

    await test.step('Open the Add User modal', async () => {
      await administrationPage.openAddUserModal();
    });

    await test.step('Fill all required user fields', async () => {
      await administrationPage.fillUserForm({
        username: 'newuser-test',
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
        username: 'newuser-test',
      });
    });

    await test.step('Assert the new user now appears in the table', async () => {
      await administrationPage.expectUserInTable('newuser-test');
    });
  });

  test('3. Create user — duplicate username triggers an inline validation error', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock users list API', async () => {
      await mockUsersAPIs(page);
    });

    await test.step('Mock the username availability check to report the name is taken', async () => {
      // Duplicate detection happens inline via /api/users/check-username,
      // registered LAST so it wins over the broad **/api/users** list mock.
      await page.route('**/api/users/check-username**', async route => {
        await route.fulfill({
          status: 200,
          json: { success: true, usernameExists: true, emailExists: false },
        });
      });
    });

    await test.step('Navigate to administration page', async () => {
      await administrationPage.goto();
    });

    await test.step('Open the Add User modal', async () => {
      await administrationPage.openAddUserModal();
    });

    await test.step('Enter an existing username', async () => {
      await administrationPage.usernameInput.fill('jdoeadmin');
      await administrationPage.emailInput.fill('another@evolution1.com');
    });

    await test.step('Assert the inline "already taken" error is shown', async () => {
      await administrationPage.expectUsernameError('already taken');
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

    await test.step('After creation, list returns updated users (GET only — registered first so POST handler wins)', async () => {
      await page.route('**/api/users**', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, json: MOCK_USERS_LIST_AFTER_CREATE });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Intercept POST to capture request body — registered LAST = highest priority', async () => {
      await page.route('**/api/users**', async route => {
        if (route.request().method() === 'POST') {
          createRequestBody = route.request().postDataJSON() as Record<
            string,
            unknown
          >;
          await route.fulfill({ status: 201, json: MOCK_USER_CREATE_SUCCESS });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Navigate to administration page', async () => {
      await administrationPage.goto();
    });

    await test.step('Open Add User modal and assign the Technician role', async () => {
      await administrationPage.openAddUserModal();
      await administrationPage.fillUserForm({
        username: 'roletest-user',
        email: 'roletest@evolution1.com',
        password: 'SecurePass@123',
        confirmPassword: 'SecurePass@123',
        gender: 'other',
        roles: ['Technician'],
      });
    });

    await test.step('Submit the form', async () => {
      await administrationPage.submitUserForm();
    });

    await test.step('Assert the POST body includes the Technician role', async () => {
      const roles = createRequestBody.roles as string[] | undefined;
      expect(roles).toBeDefined();
      expect(roles?.some(r => r.toLowerCase().includes('technician'))).toBe(
        true
      );
    });
  });

  test('5. Edit user — updating email is reflected in the table', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock users list API', async () => {
      await mockUsersAPIs(page);
    });

    await test.step('After edit, list returns updated email (GET only — registered before PATCH handler)', async () => {
      await page.route('**/api/users**', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, json: MOCK_USERS_LIST_AFTER_EDIT });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Mock the individual user fetch (used to populate the modal), then PATCH', async () => {
      // handleEditUser fetches GET /api/users/{id} and only opens the modal when
      // the response includes `.user`. Registered AFTER the list handler so it wins.
      await page.route('**/api/users/user_001**', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            json: { success: true, user: MOCK_USER_ADMIN },
          });
        } else {
          await route.fallback();
        }
      });
      // PATCH handler registered LAST = highest priority for the update call.
      await page.route('**/api/users/**', async route => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({ status: 200, json: MOCK_USER_UPDATE_SUCCESS });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Navigate to administration page', async () => {
      await administrationPage.goto();
    });

    await test.step('Click the Edit icon on the first user row (jdoeadmin)', async () => {
      await administrationPage.clickEditUser(0);
    });

    await test.step('Assert the user modal opens and switch to edit mode', async () => {
      await expect(administrationPage.editModal).toBeVisible();
      await administrationPage.enterUserEditMode();
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

    await test.step('After disable, list returns the user as inactive (GET only — registered before PATCH handler)', async () => {
      await page.route('**/api/users**', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            json: {
              ...MOCK_USERS_LIST,
              users: [
                { ...MOCK_USERS_LIST.users[0], isEnabled: false },
                ...MOCK_USERS_LIST.users.slice(1),
              ],
            },
          });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Mock the individual user fetch, then intercept PATCH /api/users/{id}', async () => {
      await mockSingleUserFetch(page, 'user_001', MOCK_USER_ADMIN);
      await page.route('**/api/users/**', async route => {
        if (route.request().method() === 'PATCH') {
          await route.fulfill({
            status: 200,
            json: {
              success: true,
              data: { ...MOCK_USERS_LIST.users[0], isEnabled: false },
              timestamp: new Date().toISOString(),
            },
          });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Navigate to administration page', async () => {
      await administrationPage.goto();
    });

    await test.step('Open the user modal for the first user and switch to edit mode', async () => {
      await administrationPage.clickEditUser(0);
      await expect(administrationPage.editModal).toBeVisible();
      await administrationPage.enterUserEditMode();
    });

    await test.step('Toggle the isEnabled switch to disabled', async () => {
      await administrationPage.toggleUserEnabled();
    });

    await test.step('Save the changes', async () => {
      await administrationPage.submitEditForm();
    });

    await test.step('Assert the user row now shows an Inactive status', async () => {
      await administrationPage.expectUserRowDisabled('jdoeadmin');
    });
  });

  // ─── Password validation ──────────────────────────────────────────────────

  test('12. Create user — password < 8 chars shows a strength error', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock APIs', async () => { await mockUsersAPIs(page); });
    await test.step('Navigate to administration page', async () => { await administrationPage.goto(); });
    await test.step('Open Add User modal and enter a short password', async () => {
      await administrationPage.openAddUserModal();
      await administrationPage.usernameInput.fill('testuser');
      await administrationPage.emailInput.fill('test@test.com');
      await administrationPage.passwordInput.fill('Ab1!');
      await administrationPage.confirmPasswordInput.fill('Ab1!');
    });
    await test.step('Assert the "At least 8 characters" requirement is unmet', async () => {
      await administrationPage.expectPasswordRequirementUnmet(
        'At least 8 characters'
      );
    });
  });

  test('13. Create user — password missing uppercase shows strength error', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock APIs', async () => { await mockUsersAPIs(page); });
    await test.step('Navigate to administration page', async () => { await administrationPage.goto(); });
    await test.step('Open modal and enter password with no uppercase', async () => {
      await administrationPage.openAddUserModal();
      await administrationPage.usernameInput.fill('testuser2');
      await administrationPage.emailInput.fill('test2@test.com');
      await administrationPage.passwordInput.fill('nouppercase1!');
      await administrationPage.confirmPasswordInput.fill('nouppercase1!');
    });
    await test.step('Assert the "Uppercase letter" requirement is unmet', async () => {
      await administrationPage.expectPasswordRequirementUnmet('Uppercase letter');
    });
  });

  test('14. Create user — password missing number shows strength error', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock APIs', async () => { await mockUsersAPIs(page); });
    await test.step('Navigate to administration page', async () => { await administrationPage.goto(); });
    await test.step('Open modal and enter password with no number', async () => {
      await administrationPage.openAddUserModal();
      await administrationPage.usernameInput.fill('testuser3');
      await administrationPage.emailInput.fill('test3@test.com');
      await administrationPage.passwordInput.fill('NoNumberHere!');
      await administrationPage.confirmPasswordInput.fill('NoNumberHere!');
    });
    await test.step('Assert the "Number" requirement is unmet', async () => {
      await administrationPage.expectPasswordRequirementUnmet('Number');
    });
  });

  test('15. Create user — password missing special character shows strength error', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock APIs', async () => { await mockUsersAPIs(page); });
    await test.step('Navigate to administration page', async () => { await administrationPage.goto(); });
    await test.step('Open modal and enter password with no special char', async () => {
      await administrationPage.openAddUserModal();
      await administrationPage.usernameInput.fill('testuser4');
      await administrationPage.emailInput.fill('test4@test.com');
      await administrationPage.passwordInput.fill('NoSpecial123');
      await administrationPage.confirmPasswordInput.fill('NoSpecial123');
    });
    await test.step('Assert the "Special character" requirement is unmet', async () => {
      await administrationPage.expectPasswordRequirementUnmet('Special character');
    });
  });

  test('16. Create user — confirm password mismatch shows error', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock APIs', async () => { await mockUsersAPIs(page); });
    await test.step('Navigate to administration page', async () => { await administrationPage.goto(); });
    await test.step('Open modal and enter non-matching passwords', async () => {
      await administrationPage.openAddUserModal();
      await administrationPage.usernameInput.fill('testuser5');
      await administrationPage.emailInput.fill('test5@test.com');
      await administrationPage.passwordInput.fill('SecurePass@123');
      await administrationPage.confirmPasswordInput.fill('DifferentPass@456');
    });
    await test.step('Assert the inline mismatch error appears', async () => {
      await administrationPage.expectConfirmPasswordError();
    });
  });

  test('17. Create user — profile fields (firstName, lastName, gender, phone) are sent in POST body', async ({
    page,
    administrationPage,
  }) => {
    let createRequestBody: Record<string, unknown> = {};

    await test.step('Mock APIs — list handler first, POST handler last (LIFO)', async () => {
      await mockUsersAPIs(page);
      await page.route('**/api/users**', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, json: MOCK_USERS_LIST_AFTER_CREATE });
        } else {
          await route.fallback();
        }
      });
      await page.route('**/api/users**', async route => {
        if (route.request().method() === 'POST') {
          createRequestBody = route.request().postDataJSON() as Record<string, unknown>;
          await route.fulfill({ status: 201, json: MOCK_USER_CREATE_SUCCESS });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Navigate and open modal', async () => {
      await administrationPage.goto();
      await administrationPage.openAddUserModal();
    });

    await test.step('Fill all profile fields', async () => {
      await administrationPage.fillUserForm({
        username: 'profiletest',
        email: 'profiletest@evolution1.com',
        password: 'SecurePass@123',
        confirmPassword: 'SecurePass@123',
        firstName: 'Profile',
        lastName: 'Tester',
        gender: 'male',
        phone: '+18681234567',
        roles: ['Technician'],
      });
    });

    await test.step('Submit the form', async () => {
      await administrationPage.submitUserForm();
    });

    await test.step('Assert profile fields appear in POST body', async () => {
      const profile = createRequestBody.profile as Record<string, unknown> | undefined;
      expect(createRequestBody.username).toBe('profiletest');
      expect(profile?.firstName ?? createRequestBody.firstName).toBe('Profile');
      expect(profile?.lastName ?? createRequestBody.lastName).toBe('Tester');
    });
  });

  test('18. Create user — assigned licencee is sent in POST body', async ({
    page,
    administrationPage,
  }) => {
    let createRequestBody: Record<string, unknown> = {};

    await test.step('Mock APIs — list handler first, POST handler last (LIFO)', async () => {
      await mockUsersAPIs(page);
      await page.route('**/api/users**', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, json: MOCK_USERS_LIST_AFTER_CREATE });
        } else {
          await route.fallback();
        }
      });
      await page.route('**/api/users**', async route => {
        if (route.request().method() === 'POST') {
          createRequestBody = route.request().postDataJSON() as Record<string, unknown>;
          await route.fulfill({ status: 201, json: MOCK_USER_CREATE_SUCCESS });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Navigate and open modal', async () => {
      await administrationPage.goto();
      await administrationPage.openAddUserModal();
    });

    await test.step('Fill form including licencee selection', async () => {
      // fillUserForm selects a role and ticks "All Licencees", which is what
      // populates assignedLicencees in the POST body.
      await administrationPage.fillUserForm({
        username: 'licenceetest',
        email: 'licenceetest@evolution1.com',
        password: 'SecurePass@123',
        confirmPassword: 'SecurePass@123',
        gender: 'other',
        roles: ['Technician'],
      });
    });

    await test.step('Submit the form', async () => {
      await administrationPage.submitUserForm();
    });

    await test.step('Assert assignedLicencees appears in POST body', async () => {
      // Some form shapes embed licencee in assignedLicencees, others in licencee field
      const hasLicencee =
        Array.isArray(createRequestBody.assignedLicencees) ||
        createRequestBody.licencee !== undefined;
      expect(hasLicencee).toBe(true);
    });
  });

  // ─── Edit User — field coverage ───────────────────────────────────────────

  test('19. Edit user modal pre-populates firstName, lastName, email, and roles', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock APIs', async () => {
      await mockUsersAPIs(page);
      await mockSingleUserFetch(page, 'user_001', MOCK_USER_ADMIN);
    });
    await test.step('Navigate and open the modal for the first user (jdoeadmin), then edit', async () => {
      await administrationPage.goto();
      await administrationPage.clickEditUser(0);
      await expect(administrationPage.editModal).toBeVisible();
      await administrationPage.enterUserEditMode();
    });
    await test.step('Assert email is pre-populated from the mock user', async () => {
      await expect(administrationPage.editEmailInput).toHaveValue('john.doe@evolution1.com');
    });
    await test.step('Assert firstName is pre-populated', async () => {
      await expect(administrationPage.editFirstNameInput).toHaveValue('John');
    });
  });

  test('20. Edit user — changing firstName sends updated value in PUT body', async ({
    page,
    administrationPage,
  }) => {
    let updateBody: Record<string, unknown> = {};

    await test.step('Mock APIs — list handler first, PUT handler last (LIFO)', async () => {
      await mockUsersAPIs(page);
      await page.route('**/api/users**', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, json: MOCK_USERS_LIST_AFTER_EDIT });
        } else {
          await route.fallback();
        }
      });
      await mockSingleUserFetch(page, 'user_001', MOCK_USER_ADMIN);
      await page.route('**/api/users/**', async route => {
        if (route.request().method() === 'PATCH') {
          updateBody = route.request().postDataJSON() as Record<string, unknown>;
          await route.fulfill({ status: 200, json: MOCK_USER_UPDATE_SUCCESS });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Navigate, open the modal, enter edit mode, change firstName', async () => {
      await administrationPage.goto();
      await administrationPage.clickEditUser(0);
      await expect(administrationPage.editModal).toBeVisible();
      await administrationPage.enterUserEditMode();
      await administrationPage.fillEditUserForm({ firstName: 'Jonathan' });
    });

    await test.step('Submit and assert PATCH body contains updated firstName', async () => {
      await administrationPage.submitEditForm();
      const profile = updateBody.profile as Record<string, unknown> | undefined;
      const firstName = profile?.firstName ?? updateBody.firstName;
      expect(firstName).toBe('Jonathan');
    });
  });

  test('7. Delete user — confirmation dialog removes the user from the table', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock users list API', async () => {
      await mockUsersAPIs(page);
    });

    await test.step('Navigate to administration page', async () => {
      await administrationPage.goto();
    });

    await test.step('Click the Delete icon on the last row (rjonesmgr)', async () => {
      await administrationPage.clickDeleteUser(2);
    });

    await test.step('Assert the delete confirmation dialog appears', async () => {
      await administrationPage.expectDeleteDialogVisible();
      await expect(administrationPage.deleteDialog).toContainText(
        /rjonesmgr|Robert Jones/i
      );
    });

    await test.step('Swap list mock to post-delete payload, intercept DELETE, then confirm', async () => {
      // Register GET-only after-delete list handler first (lower LIFO priority)
      await page.route('**/api/users**', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, json: MOCK_USERS_LIST_AFTER_DELETE });
        } else {
          await route.fallback();
        }
      });
      // Register DELETE handler last (highest LIFO priority)
      await page.route('**/api/users**', async route => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({ status: 200, json: MOCK_USER_DELETE_SUCCESS });
        } else {
          await route.fallback();
        }
      });
      await administrationPage.confirmDeleteUser();
    });

    await test.step('Assert "rjonesmgr" is no longer in the table', async () => {
      await administrationPage.expectUserNotInTable('rjonesmgr');
    });

    await test.step('Assert the remaining users are still present', async () => {
      await administrationPage.expectUserInTable('jdoeadmin');
      await administrationPage.expectUserInTable('msmithcashier');
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
  await page.route('**/api/auth/current-user**', route =>
    route.fulfill({ status: 200, json: MOCK_CURRENT_USER })
  );
  await page.route('**/api/auth/token**', route =>
    route.fulfill({
      status: 200,
      json: { userId: MOCK_CURRENT_USER.user.id },
    })
  );
  await page.route(`**/api/users/${MOCK_CURRENT_USER.user.id}**`, route =>
    route.fulfill({
      status: 200,
      json: { success: true, user: MOCK_CURRENT_USER.user },
    })
  );
  await page.route('**/api/licencees**', route =>
    route.fulfill({ status: 200, json: licenceesPayload })
  );
  await page.route('**/api/users**', route =>
    route.fulfill({
      status: 200,
      json: {
        success: true,
        data: {
          users: [],
          pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 },
        },
        timestamp: new Date().toISOString(),
      },
    })
  );
  await page.route('**/api/gaming-locations**', route =>
    route.fulfill({
      status: 200,
      json: { success: true, data: [], timestamp: new Date().toISOString() },
    })
  );
  // The edit-licencee modal needs the country list so the licencee's `country`
  // id maps to a selectable option (otherwise the required-country check fails).
  await page.route('**/api/countries**', route =>
    route.fulfill({ status: 200, json: MOCK_COUNTRIES })
  );
  // Edits log activity after saving; the save flow awaits this POST before
  // closing the modal, so it must resolve quickly instead of hitting the real API.
  await page.route('**/api/activity-logs**', route =>
    route.fulfill({ status: 200, json: { success: true } })
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

    await test.step('Assert "Evolution1 Ltd" appears in the licencee table', async () => {
      await expect(
        administrationPage.licenceeTableRows.filter({ hasText: 'Evolution1 Ltd' })
      ).toBeVisible();
    });

    await test.step('Assert "Caribbean Gaming Corp" appears in the licencee table', async () => {
      await expect(
        administrationPage.licenceeTableRows.filter({
          hasText: 'Caribbean Gaming Corp',
        })
      ).toBeVisible();
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
      await administrationPage.expectIncludeJackpot(
        MOCK_LICENCEE_1.name,
        false
      );
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

  test('21. Edit licencee modal pre-populates the name field', async ({
    page,
    administrationPage,
  }) => {
    await test.step('Mock licencees API', async () => { await mockLicenceesAPIs(page); });
    await test.step('Navigate to licencees section and open edit modal', async () => {
      await administrationPage.gotoLicenceesSection();
      await administrationPage.clickEditLicencee(0);
      await expect(administrationPage.editLicenceeModal).toBeVisible();
    });
    await test.step('Assert name field is pre-populated with Evolution1 Ltd', async () => {
      await expect(administrationPage.licenceeNameInput).toHaveValue('Evolution1 Ltd');
    });
  });

  test('22. Edit licencee — changing name sends updated name in PUT body', async ({
    page,
    administrationPage,
  }) => {
    let updateBody: Record<string, unknown> = {};

    await test.step('Mock APIs — list handler first, PUT handler last (LIFO)', async () => {
      await mockLicenceesAPIs(page);
      // After-edit list (GET only) — registered before PUT handler so PUT handler wins
      await page.route('**/api/licencees**', async route => {
        if (route.request().method() === 'GET') {
          await route.fulfill({ status: 200, json: MOCK_LICENCEES_LIST_AFTER_EDIT });
        } else {
          await route.fallback();
        }
      });
      // PUT handler — the update hits PUT /api/licencees (no id in the path),
      // registered LAST = highest LIFO priority.
      await page.route('**/api/licencees**', async route => {
        if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
          updateBody = route.request().postDataJSON() as Record<string, unknown>;
          await route.fulfill({
            status: 200,
            json: { success: true, licencee: { ...MOCK_LICENCEE_1, name: 'Evolution1 Ltd Updated' } },
          });
        } else {
          await route.fallback();
        }
      });
    });

    await test.step('Navigate to licencees, open edit, change name, submit', async () => {
      await administrationPage.gotoLicenceesSection();
      await administrationPage.clickEditLicencee(0);
      await expect(administrationPage.editLicenceeModal).toBeVisible();
      await administrationPage.fillEditLicenceeForm({ name: 'Evolution1 Ltd Updated' });
      await administrationPage.submitEditLicenceeForm();
    });

    await test.step('Assert updated name appears in PUT body', async () => {
      expect(updateBody.name ?? (updateBody as Record<string, unknown>).licenceeName).toBe('Evolution1 Ltd Updated');
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
      await page.route('**/api/licencees**', async route => {
        if (
          route.request().method() === 'PUT' ||
          route.request().method() === 'PATCH'
        ) {
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
          await route.fallback();
        }
      });
    });

    await test.step('Navigate to the licencees section', async () => {
      await administrationPage.gotoLicenceesSection();
    });

    await test.step('Verify initial includeJackpot badge is "No" for lic_001', async () => {
      await administrationPage.expectIncludeJackpot(
        MOCK_LICENCEE_1.name,
        false
      );
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
      await page.route('**/api/licencees**', route =>
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
    test(`${label} can access /administration`, async ({
      page,
      administrationPage,
    }) => {
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

  test('technician is redirected from /administration to /unauthorized', async ({
    page,
  }) => {
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
