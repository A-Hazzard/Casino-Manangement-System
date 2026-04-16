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

  constructor(page: Page) {
    this.page = page;

    // Section tabs (href or button)
    this.usersSection = page.getByRole('link', { name: /users/i }).or(
      page.getByRole('button', { name: /users/i })
    );
    this.licenceesSection = page.getByRole('link', { name: /licencees/i }).or(
      page.getByRole('button', { name: /licencees/i })
    );
    this.activityLogsSection = page.getByRole('link', { name: /activity log/i }).or(
      page.getByRole('button', { name: /activity log/i })
    );

    // Table
    this.addUserButton = page.getByRole('button', { name: /add user|invite user|new user|create user/i });
    this.tableBody = page.locator('table tbody');
    this.tableRows = page.locator('table tbody tr');

    // ── Add User modal ──────────────────────────────────────────────────────────
    this.addUserModal = page.locator('[role="dialog"]').filter({
      hasText: /add.*user|create.*user|invite.*user/i,
    });

    // Account fields — modals separate "Account" and "Profile" sections
    this.usernameInput = this.addUserModal.locator('input[name="username"], #username');
    this.emailInput = this.addUserModal.locator('input[name="email"], input[name="emailAddress"], #email');
    this.passwordInput = this.addUserModal.locator('input[name="password"], #password').first();
    this.confirmPasswordInput = this.addUserModal.locator(
      'input[name="confirmPassword"], #confirmPassword'
    );

    // Profile fields
    this.firstNameInput = this.addUserModal.locator('input[name="firstName"], #firstName');
    this.lastNameInput = this.addUserModal.locator('input[name="lastName"], #lastName');
    this.genderSelect = this.addUserModal.locator('select[name="gender"], #gender');
    this.phoneInput = this.addUserModal.locator('input[name="phoneNumber"], #phoneNumber');

    // Roles — a MultiSelectDropdown component; clicking it opens a list of checkboxes
    this.rolesDropdown = this.addUserModal.locator('[data-testid="roles-dropdown"], button:has-text("Role"), .multiselect__input').first();
    this.licenceesDropdown = this.addUserModal.locator('[data-testid="licencees-dropdown"], button:has-text("Licencee")').first();

    this.submitCreateButton = this.addUserModal.getByRole('button', {
      name: /create user|add user|save|submit/i,
    });
    this.cancelCreateButton = this.addUserModal.getByRole('button', { name: /cancel/i });

    // ── Edit modal ──────────────────────────────────────────────────────────────
    // The edit modal reuses AdministrationUserModal — distinguish by its open state
    this.editModal = page.locator('[role="dialog"]').filter({ hasText: /edit.*user|update.*user/i });
    this.editEmailInput = this.editModal.locator('input[name="email"], input[name="emailAddress"]');
    this.editFirstNameInput = this.editModal.locator('input[name="firstName"], #firstName');
    this.submitEditButton = this.editModal.getByRole('button', { name: /save|update/i });
    this.cancelEditButton = this.editModal.getByRole('button', { name: /cancel/i });

    // Enabled toggle — may appear inside edit modal or in the table row
    this.enabledToggle = page.locator('[role="switch"][aria-label*="enabled" i], input[name="isEnabled"]').first();

    // ── Delete dialog ───────────────────────────────────────────────────────────
    this.deleteDialog = page.locator('[role="dialog"]').filter({ hasText: /are you absolutely sure/i });
    this.confirmDeleteButton = this.deleteDialog.getByRole('button', { name: /delete/i });
    this.cancelDeleteButton = this.deleteDialog.getByRole('button', { name: /cancel/i });

    // ── Validation error elements ───────────────────────────────────────────────
    this.usernameError = this.addUserModal.locator('#username-error, [id*="username"][id*="error"]');
    this.emailError = this.addUserModal.locator('#email-error, [id*="email"][id*="error"]');
    this.passwordError = this.addUserModal.locator('#password-error, [id*="password"][id*="error"]').first();

    // ── Licencee table / cards ──────────────────────────────────────────────────
    // The licencee section may render a <table> or card grid depending on viewport
    this.licenceeTableRows = page.locator('table tbody tr');
    this.addLicenceeButton = page.getByRole('button', {
      name: /add licencee|new licencee|create licencee/i,
    });

    // ── Edit Licencee modal ─────────────────────────────────────────────────────
    this.editLicenceeModal = page.locator('[role="dialog"]').filter({
      hasText: /edit.*licencee|update.*licencee/i,
    });
    this.includeJackpotCheckbox = this.editLicenceeModal.locator(
      '#includeJackpot, input[name="includeJackpot"]'
    );
    this.submitEditLicenceeButton = this.editLicenceeModal.getByRole('button', {
      name: /save|update/i,
    });
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
    await row.locator('button[aria-label*="edit" i], img[alt*="edit" i]').click();
  }

  async clickDeleteUser(rowIndex: number) {
    const row = this.tableRows.nth(rowIndex);
    await row.locator('button[aria-label*="delete" i], img[alt*="delete" i]').click();
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
    if (data.confirmPassword) await this.confirmPasswordInput.fill(data.confirmPassword);
    if (data.firstName) await this.firstNameInput.fill(data.firstName);
    if (data.lastName) await this.lastNameInput.fill(data.lastName);
    if (data.gender) await this.genderSelect.selectOption(data.gender);
    if (data.phone) await this.phoneInput.fill(data.phone);

    if (data.roles && data.roles.length > 0) {
      await this.rolesDropdown.click();
      for (const role of data.roles) {
        // Each role is a labelled checkbox inside the dropdown list
        await this.page.getByRole('option', { name: new RegExp(role, 'i') })
          .or(this.page.locator(`label:has-text("${role}")`))
          .click();
      }
      // Close the dropdown by pressing Escape or clicking outside
      await this.page.keyboard.press('Escape');
    }
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
    if (updates.email) {
      await this.editEmailInput.clear();
      await this.editEmailInput.fill(updates.email);
    }
    if (updates.firstName) {
      await this.editFirstNameInput.clear();
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
    await expect(this.usernameError).toBeVisible();
    await expect(this.usernameError).toContainText(message);
  }

  async expectEmailError(message: string) {
    await expect(this.emailError).toBeVisible();
    await expect(this.emailError).toContainText(message);
  }

  async expectUserRowDisabled(username: string) {
    const row = this.rowByUsername(username);
    // Disabled users typically have a visual indicator — a badge or text "Inactive"
    await expect(row).toContainText(/inactive|disabled/i);
  }

  async expectUserRowEnabled(username: string) {
    const row = this.rowByUsername(username);
    await expect(row).toContainText(/active/i);
  }

  // ─── Licencee assertions ─────────────────────────────────────────────────────

  /**
   * Asserts that a licencee row/card displays the expected includeJackpot badge.
   * @param licenceeName - Name of the licencee to locate
   * @param expected - `true` expects "Yes", `false` expects "No"
   */
  async expectIncludeJackpot(licenceeName: string, expected: boolean) {
    // The licencee may be rendered as a table row or a mobile card — look for either
    const licenceeContainer = this.page
      .locator('tr, [class*="card"]')
      .filter({ hasText: licenceeName })
      .first();
    await expect(licenceeContainer).toContainText(
      expected ? /\bYes\b/i : /\bNo\b/i
    );
  }

  /**
   * Opens the edit modal for the licencee at the given table row index.
   */
  async clickEditLicencee(rowIndex: number) {
    const row = this.licenceeTableRows.nth(rowIndex);
    await row.locator('button[aria-label*="edit" i]').click();
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
}
