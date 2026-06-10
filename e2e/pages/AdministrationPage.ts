import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Administration page (/administration).
 *
 * The page renders sections controlled by a query param (?section=users, etc.).
 * Default section is user management, which shows:
 *   - A user table with columns: Avatar, Name, Username, Email, Role(s), Status, Actions
 *   - An "Add User" button opening a multi-step creation modal
 *   - Edit / Delete action icons per row
 */
export class AdministrationPage {
  readonly page: Page;

  // ─── Navigation tabs / section switchers ───────────────────────────────────
  readonly usersSection: Locator;
  readonly licenceesSection: Locator;
  readonly activityLogsSection: Locator;

  // ─── User table ────────────────────────────────────────────────────────────
  readonly addUserButton: Locator;
  readonly tableBody: Locator;
  readonly tableRows: Locator;

  // ─── Licencee table / cards ────────────────────────────────────────────────
  readonly licenceeTableRows: Locator;
  readonly addLicenceeButton: Locator;

  // ─── Edit Licencee modal ───────────────────────────────────────────────────
  readonly editLicenceeModal: Locator;
  readonly includeJackpotCheckbox: Locator;
  readonly submitEditLicenceeButton: Locator;

  // ─── Add User modal ────────────────────────────────────────────────────────
  readonly addUserModal: Locator;

  // Account fields
  readonly usernameInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;

  // Profile fields
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly genderSelect: Locator;
  readonly phoneInput: Locator;

  // Roles & permissions
  readonly rolesDropdown: Locator;
  readonly licenceesDropdown: Locator;

  // Submit / cancel
  readonly submitCreateButton: Locator;
  readonly cancelCreateButton: Locator;

  // ─── Edit User modal ───────────────────────────────────────────────────────
  readonly editModal: Locator;
  readonly editEmailInput: Locator;
  readonly editFirstNameInput: Locator;
  readonly submitEditButton: Locator;
  readonly cancelEditButton: Locator;

  // ─── Enable / Disable toggle ───────────────────────────────────────────────
  // "isEnabled" switch rendered per-row or inside the edit modal
  readonly enabledToggle: Locator;

  // ─── Delete confirmation dialog ────────────────────────────────────────────
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  // ─── Validation / error feedback ──────────────────────────────────────────
  readonly usernameError: Locator;
  readonly emailError: Locator;
  readonly passwordError: Locator;
  readonly confirmPasswordError: Locator;

  // ─── Edit Licencee modal — additional fields ───────────────────────────────
  readonly licenceeNameInput: Locator;
  readonly licenceeCountrySelect: Locator;
  readonly licenceeStartDateInput: Locator;
  readonly licenceeExpiryDateInput: Locator;
  readonly licenceeDescriptionInput: Locator;

  constructor(page: Page) {
    this.page = page;

    // Section tabs (href or button)
    this.usersSection = page
      .getByRole('link', { name: /users/i })
      .or(page.getByRole('button', { name: /users/i }));
    this.licenceesSection = page
      .getByRole('link', { name: /licencees/i })
      .or(page.getByRole('button', { name: /licencees/i }));
    this.activityLogsSection = page
      .getByRole('link', { name: /activity log/i })
      .or(page.getByRole('button', { name: /activity log/i }));

    // Table
    this.addUserButton = page.getByRole('button', {
      name: /add user|invite user|new user|create user/i,
    });
    this.tableBody = page.locator('table tbody');
    this.tableRows = page.locator('table tbody tr');

    // ── Add User modal ──────────────────────────────────────────────────────────
    // AdministrationAddUserModal is a custom div.fixed (no role="dialog")
    this.addUserModal = page.locator('div').filter({
      has: page.getByRole('heading', { name: /create new user|add new user/i }),
    }).first();

    // Account fields — modals separate "Account" and "Profile" sections
    this.usernameInput = this.addUserModal.locator(
      'input[name="username"], #username'
    );
    this.emailInput = this.addUserModal.locator(
      'input[name="email"], input[name="emailAddress"], #email'
    );
    // id="new-password" in AdministrationAddUserModal
    this.passwordInput = this.addUserModal
      .locator('input[name="password"], #password, #new-password')
      .first();
    // id="confirm-password" in AdministrationAddUserModal
    this.confirmPasswordInput = this.addUserModal.locator(
      'input[name="confirmPassword"], #confirmPassword, #confirm-password'
    );

    // Profile fields
    this.firstNameInput = this.addUserModal.locator(
      'input[name="firstName"], #firstName'
    );
    this.lastNameInput = this.addUserModal.locator(
      'input[name="lastName"], #lastName'
    );
    this.genderSelect = this.addUserModal.locator(
      'select[name="gender"], #gender'
    );
    this.phoneInput = this.addUserModal.locator(
      'input[name="phoneNumber"], #phoneNumber'
    );

    // Roles — a MultiSelectDropdown component; clicking it opens a list of checkboxes
    this.rolesDropdown = this.addUserModal
      .locator(
        '[data-testid="roles-dropdown"], button:has-text("Role"), .multiselect__input'
      )
      .first();
    this.licenceesDropdown = this.addUserModal
      .locator(
        '[data-testid="licencees-dropdown"], button:has-text("Licencee")'
      )
      .first();

    this.submitCreateButton = this.addUserModal.getByRole('button', {
      name: /create user|add user|save|submit/i,
    }).last(); // Use last() since there may be multiple buttons; "Create User" is the primary CTA
    this.cancelCreateButton = this.addUserModal.getByRole('button', {
      name: /cancel/i,
    });

    // ── Edit modal ──────────────────────────────────────────────────────────────
    // AdministrationUserModal is a custom div.fixed.inset-0 (no role="dialog").
    // Scope to the fixed container so locators don't bleed into the table behind it
    // (e.g. row "Edit" buttons share the same accessible name as the header toggle).
    this.editModal = page
      .locator('div.fixed.inset-0')
      .filter({
        has: page.getByRole('heading', { name: /edit user|user profile/i }),
      })
      .first();
    this.editEmailInput = this.editModal.locator(
      'input[name="email"], input[name="emailAddress"], #email'
    );
    this.editFirstNameInput = this.editModal.locator(
      'input[name="firstName"], #firstName'
    );
    this.submitEditButton = this.editModal.getByRole('button', {
      name: /save|update/i,
    });
    this.cancelEditButton = this.editModal.getByRole('button', {
      name: /cancel/i,
    });

    // Enabled toggle — a shadcn Checkbox (id="isEnabled") rendered inside the
    // edit user modal once it is in edit mode.
    this.enabledToggle = page
      .locator('div')
      .filter({
        has: page.getByRole('heading', { name: /edit user|user profile/i }),
      })
      .first()
      .locator('#isEnabled');

    // ── Delete dialog ───────────────────────────────────────────────────────────
    // AdministrationDeleteUserModal is a custom div.fixed.inset-0 (no role="dialog").
    // Scope to the fixed container so the confirm button doesn't collide with the
    // table's per-row "Delete" buttons behind the overlay.
    this.deleteDialog = page
      .locator('div.fixed.inset-0')
      .filter({
        has: page.getByRole('heading', { name: /delete user/i }),
      })
      .first();
    this.confirmDeleteButton = this.deleteDialog.getByRole('button', {
      name: /delete/i,
    }).last();
    this.cancelDeleteButton = this.deleteDialog.getByRole('button', {
      name: /cancel/i,
    });

    // ── Validation error elements ───────────────────────────────────────────────
    this.usernameError = this.addUserModal.locator(
      '#username-error, [id*="username"][id*="error"]'
    );
    this.emailError = this.addUserModal.locator(
      '#email-error, [id*="email"][id*="error"]'
    );
    this.passwordError = this.addUserModal
      .locator('#password-error, [id*="password"][id*="error"]')
      .first();

    // ── Licencee table / cards ──────────────────────────────────────────────────
    // The licencee section may render a <table> or card grid depending on viewport
    this.licenceeTableRows = page.locator('table tbody tr');
    this.addLicenceeButton = page.getByRole('button', {
      name: /add licencee|new licencee|create licencee/i,
    });

    // ── Edit Licencee modal ─────────────────────────────────────────────────────
    // AdministrationEditLicenceeModal is a custom div.fixed (no role="dialog")
    this.editLicenceeModal = page.locator('div').filter({
      has: page.getByRole('heading', { name: /edit licencee/i }),
    }).first();
    // AdministrationEditLicenceeModal renders the checkbox as id="editIncludeJackpot"
    this.includeJackpotCheckbox = this.editLicenceeModal.locator(
      '#editIncludeJackpot, #includeJackpot, input[name="includeJackpot"]'
    );
    this.licenceeNameInput = this.editLicenceeModal.locator(
      'input[name="name"], #licencee-name'
    );
    this.licenceeCountrySelect = this.editLicenceeModal.locator(
      'select[name="country"], #licencee-country'
    );
    this.licenceeStartDateInput = this.editLicenceeModal.locator(
      'input[name="startDate"], input[placeholder*="start" i]'
    );
    this.licenceeExpiryDateInput = this.editLicenceeModal.locator(
      'input[name="expiryDate"], input[placeholder*="expir" i]'
    );
    this.licenceeDescriptionInput = this.editLicenceeModal.locator(
      'textarea[name="description"], #licencee-description'
    );
    this.submitEditLicenceeButton = this.editLicenceeModal.getByRole('button', {
      name: /save|update/i,
    });

    // ── Confirm password / extra validation locators ────────────────────────────
    this.confirmPasswordError = this.addUserModal.locator(
      '#confirmPassword-error, [id*="confirmPassword"][id*="error"], [id*="confirm"][id*="error"]'
    );
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/administration');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoUsersSection() {
    await this.page.goto('/administration?section=users');
    await this.page.waitForLoadState('networkidle');
  }

  async gotoLicenceesSection() {
    await this.page.goto('/administration?section=licencees');
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Row helpers ─────────────────────────────────────────────────────────────

  rowByUsername(username: string): Locator {
    return this.tableRows.filter({ hasText: username });
  }

  rowByEmail(email: string): Locator {
    return this.tableRows.filter({ hasText: email });
  }

  async clickEditUser(rowIndex: number) {
    const row = this.tableRows.nth(rowIndex);
    // The ghost Button takes its accessible name from the <Image alt="Edit">.
    await row.getByRole('button', { name: /^edit$/i }).first().click();
  }

  async clickDeleteUser(rowIndex: number) {
    const row = this.tableRows.nth(rowIndex);
    await row.getByRole('button', { name: /^delete$/i }).first().click();
  }

  // ─── Edit User modal — enter edit mode ───────────────────────────────────────

  /**
   * The user modal opens in read-only "User Profile" mode. Clicking the internal
   * "Edit" button switches it to "Edit User" mode where the form fields
   * (#email, #firstName, #isEnabled) become editable.
   */
  async enterUserEditMode() {
    await this.editModal
      .getByRole('button', { name: /^edit$/i })
      .first()
      .click();
    // The editable email field only renders once in edit mode
    await expect(this.editFirstNameInput).toBeVisible({ timeout: 10_000 });
  }

  // ─── Add User modal actions ──────────────────────────────────────────────────

  async openAddUserModal() {
    await this.addUserButton.click();
    await expect(this.addUserModal).toBeVisible();
  }

  async fillUserForm(data: {
    username: string;
    email: string;
    password: string;
    confirmPassword?: string;
    firstName?: string;
    lastName?: string;
    gender?: string;
    phone?: string;
    roles?: string[];
  }) {
    await this.usernameInput.fill(data.username);
    await this.emailInput.fill(data.email);
    await this.passwordInput.fill(data.password);
    if (data.confirmPassword)
      await this.confirmPasswordInput.fill(data.confirmPassword);
    if (data.firstName) await this.firstNameInput.fill(data.firstName);
    if (data.lastName) await this.lastNameInput.fill(data.lastName);
    if (data.gender) await this.genderSelect.selectOption(data.gender);
    if (data.phone) await this.phoneInput.fill(data.phone);

    if (data.roles && data.roles.length > 0) {
      // Roles are individual shadcn checkboxes; each sits inside a <label> whose
      // text is the role label (e.g. "Technician"). Clicking the label toggles it.
      for (const role of data.roles) {
        await this.addUserModal
          .locator('label')
          .filter({ hasText: new RegExp(`^\\s*${role}\\s*$`, 'i') })
          .first()
          .click();
      }
      // Selecting a role unlocks the licencee/location assignment section.
      // Assign all licencees so the "Create User" button becomes enabled
      // (it is disabled until at least one licencee is assigned).
      await this.selectAllLicencees();
    }
  }

  /**
   * Clicks the "All Licencees" checkbox in the Add User modal. Only effective
   * after a role has been selected (the section is gated behind role selection).
   */
  async selectAllLicencees() {
    await this.addUserModal
      .locator('label')
      .filter({ hasText: /^\s*All Licencees\s*$/i })
      .first()
      .click();
  }

  async submitUserForm() {
    await this.submitCreateButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async cancelCreate() {
    await this.cancelCreateButton.click();
    await expect(this.addUserModal).not.toBeVisible();
  }

  // ─── Edit modal actions ──────────────────────────────────────────────────────

  async fillEditUserForm(updates: { email?: string; firstName?: string }) {
    // fill() replaces the field value atomically — do NOT clear() first, as the
    // transient empty value trips inline validation (e.g. "First name must be at
    // least 3 characters") which then blocks the save.
    if (updates.email) {
      await this.editEmailInput.fill(updates.email);
    }
    if (updates.firstName) {
      await this.editFirstNameInput.fill(updates.firstName);
    }
  }

  async submitEditForm() {
    await this.submitEditButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Toggle enabled state ────────────────────────────────────────────────────

  async toggleUserEnabled() {
    await this.enabledToggle.click();
  }

  // ─── Delete dialog actions ────────────────────────────────────────────────────

  async confirmDeleteUser() {
    await this.confirmDeleteButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async cancelDelete() {
    await this.cancelDeleteButton.click();
    await expect(this.deleteDialog).not.toBeVisible();
  }

  // ─── Assertions ──────────────────────────────────────────────────────────────

  async expectUserInTable(username: string) {
    await expect(this.rowByUsername(username)).toBeVisible();
  }

  async expectUserNotInTable(username: string) {
    await expect(this.rowByUsername(username)).not.toBeVisible();
  }

  async expectTableRowCount(count: number) {
    await expect(this.tableRows).toHaveCount(count);
  }

  async expectAddModalVisible() {
    await expect(this.addUserModal).toBeVisible();
  }

  async expectDeleteDialogVisible() {
    await expect(this.deleteDialog).toBeVisible();
  }

  async expectUsernameError(message: string) {
    // Duplicate-username feedback renders as inline red text (no id) driven by
    // the /api/users/check-username availability check.
    const inline = this.addUserModal
      .getByText(new RegExp(message, 'i'))
      .or(this.usernameError);
    await expect(inline.first()).toBeVisible({ timeout: 8_000 });
  }

  async expectEmailError(message: string) {
    await expect(this.emailError).toBeVisible();
    await expect(this.emailError).toContainText(message);
  }

  async expectUserRowDisabled(username: string) {
    const row = this.rowByUsername(username);
    // The ENABLED column renders the literal text "False" for disabled users.
    await expect(row).toContainText(/False/);
  }

  async expectUserRowEnabled(username: string) {
    const row = this.rowByUsername(username);
    // The ENABLED column renders the literal text "True" for enabled users.
    await expect(row).toContainText(/True/);
  }

  /**
   * Asserts a specific password-strength requirement row shows the unmet marker
   * (✗ for length/case/number requirements, ! for the special-character one).
   * The inline strength checklist only renders while the password field is non-empty.
   */
  async expectPasswordRequirementUnmet(label: string) {
    const row = this.addUserModal
      .locator('div.flex.items-center.gap-2')
      .filter({ hasText: label })
      .first();
    await expect(row).toContainText(/[✗!]/, { timeout: 5_000 });
  }

  // ─── Licencee assertions ─────────────────────────────────────────────────────

  /**
   * Asserts that a licencee row/card displays the expected includeJackpot badge.
   * @param licenceeName - Name of the licencee to locate
   * @param expected - `true` expects "Yes", `false` expects "No"
   */
  async expectIncludeJackpot(licenceeName: string, expected: boolean) {
    // The includeJackpot badge is a <span> with text exactly "Yes" or "No"
    // inside the licencee's table row. We scope to the row first.
    const row = this.page
      .locator('tr')
      .filter({ hasText: licenceeName })
      .first();
    const badge = row
      .locator('span')
      .filter({ hasText: expected ? /^Yes$/i : /^No$/i })
      .first();
    await expect(badge).toBeVisible({ timeout: 8_000 });
  }

  /**
   * Opens the edit modal for the licencee at the given table row index.
   * The licencee table uses <Image alt="Edit"> (not a button with aria-label).
   */
  async clickEditLicencee(rowIndex: number) {
    const row = this.licenceeTableRows.nth(rowIndex);
    await row.locator('img[alt*="edit" i]').click();
  }

  /**
   * Checks or unchecks the Include Jackpot checkbox inside the edit licencee modal.
   */
  async setIncludeJackpot(checked: boolean) {
    const isChecked = await this.includeJackpotCheckbox.isChecked();
    if (isChecked !== checked) {
      await this.includeJackpotCheckbox.click();
    }
  }

  async submitEditLicenceeForm() {
    await this.submitEditLicenceeButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async fillEditLicenceeForm(data: {
    name?: string;
    country?: string;
    startDate?: string;
    expiryDate?: string;
    description?: string;
  }) {
    if (data.name) {
      await this.licenceeNameInput.clear();
      await this.licenceeNameInput.fill(data.name);
    }
    if (data.country) await this.licenceeCountrySelect.selectOption({ label: data.country });
    if (data.startDate) {
      await this.licenceeStartDateInput.clear();
      await this.licenceeStartDateInput.fill(data.startDate);
    }
    if (data.expiryDate) {
      await this.licenceeExpiryDateInput.clear();
      await this.licenceeExpiryDateInput.fill(data.expiryDate);
    }
    if (data.description) {
      await this.licenceeDescriptionInput.clear();
      await this.licenceeDescriptionInput.fill(data.description);
    }
  }

  async expectPasswordStrengthError() {
    // Password strength errors appear as inline text or toast — check both
    const inlineError = this.passwordError;
    const toastError = this.page.getByText(/password must|at least 8|uppercase|lowercase|number|special/i).first();
    await expect(inlineError.or(toastError)).toBeVisible({ timeout: 5_000 });
  }

  async expectConfirmPasswordError() {
    // Mismatch renders inline ("Passwords do not match") as soon as the confirm
    // field diverges from the password field — no submit required.
    const inlineError = this.addUserModal
      .getByText(/passwords do not match/i)
      .or(this.confirmPasswordError);
    await expect(inlineError.first()).toBeVisible({ timeout: 5_000 });
  }

  async expectEmailDuplicateError() {
    const inlineError = this.emailError;
    const toastError = this.page.getByText(/email.*already|duplicate.*email/i).first();
    await expect(inlineError.or(toastError)).toBeVisible({ timeout: 5_000 });
  }
}
