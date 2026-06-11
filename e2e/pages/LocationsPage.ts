import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Locations list page (/locations).
 *
 * The page renders:
 *   - A table with columns: Location Name, Money In, Money Out, Gross, Actions
 *   - An "Add Location" button that opens a modal form
 *   - Edit / Delete action icons per row
 */
export class LocationsPage {
  readonly page: Page;

  // ─── Page-level locators ───────────────────────────────────────────────────
  readonly addLocationButton: Locator;
  readonly tableBody: Locator;
  readonly tableRows: Locator;

  // ─── Create modal ─────────────────────────────────────────────────────────
  readonly createModal: Locator;
  readonly nameInput: Locator;
  readonly streetInput: Locator;
  readonly cityInput: Locator;
  readonly countrySelect: Locator;
  readonly profitShareInput: Locator;
  readonly licenceeSelect: Locator;
  readonly membershipCheckbox: Locator;
  readonly dayStartTimeSelect: Locator;
  readonly billValidatorAllCheckbox: Locator;
  readonly membershipSection: Locator;
  readonly submitCreateButton: Locator;
  readonly cancelCreateButton: Locator;

  // ─── Edit modal ───────────────────────────────────────────────────────────
  readonly editModal: Locator;
  readonly editNameInput: Locator;
  readonly editStreetInput: Locator;
  readonly editCityInput: Locator;
  readonly editProfitShareInput: Locator;
  readonly editLicenceeSelect: Locator;
  readonly editDayStartTimeSelect: Locator;
  readonly submitEditButton: Locator;
  readonly cancelEditButton: Locator;

  // ─── Delete confirmation dialog ───────────────────────────────────────────
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page header button — label varies ("Add Location" / "+ Location")
    this.addLocationButton = page.getByRole('button', {
      name: /add.*location|new.*location|\+ location/i,
    });

    // Table
    this.tableBody = page.locator('table tbody');
    this.tableRows = page.locator('table tbody tr');

    // ── Create modal ──────────────────────────────────────────────────────────
    // The modal is identified by the dialog role; its title is "Add New Location"
    this.createModal = page
      .locator('[role="dialog"]')
      .filter({ hasText: /add new location/i });

    this.nameInput = this.createModal.locator('input[name="name"], #name');
    this.streetInput = this.createModal.locator(
      'input[name="street"], #street'
    );
    this.cityInput = this.createModal.locator('input[name="city"], #city');
    this.countrySelect = this.createModal.locator(
      'select[name="country"], #country'
    );
    this.profitShareInput = this.createModal.locator(
      'input[name="profitShare"], #profitShare'
    );
    this.licenceeSelect = this.createModal.locator(
      'select[name="licencee"], #licencee'
    );
    this.membershipCheckbox = this.createModal.locator(
      'input[name="membershipEnabled"], #membershipEnabled'
    );
    // dayStartTime select maps to gameDayOffset in the POST body
    this.dayStartTimeSelect = this.createModal.locator(
      'select[name="dayStartTime"], #dayStartTime'
    );
    // "Check All" toggle for the 13 bill-validator denominations
    this.billValidatorAllCheckbox = this.createModal.locator(
      '#billValidatorOptionsAll, input[name="billValidatorOptionsAll"]'
    );
    // The membership settings block only renders when membershipEnabled is ticked
    this.membershipSection = this.createModal.locator('#enablePoints');

    this.submitCreateButton = this.createModal.getByRole('button', {
      name: /add location|create|save/i,
    });
    this.cancelCreateButton = this.createModal.getByRole('button', {
      name: /cancel/i,
    });

    // ── Edit modal ─────────────────────────────────────────────────────────────
    this.editModal = page
      .locator('.edit-location-modal');
    this.editNameInput = this.editModal.locator('input[name="name"], #name, #edit-location-name');
    this.editStreetInput = this.editModal.locator(
      '#edit-location-street, input[name="street"]'
    );
    this.editCityInput = this.editModal.locator(
      '#edit-location-city, input[name="city"]'
    );
    this.editProfitShareInput = this.editModal.locator(
      '#edit-profit-share, input[name="profitShare"]'
    );
    this.editLicenceeSelect = this.editModal.locator(
      '#edit-licencee, select[name="licencee"]'
    );
    this.editDayStartTimeSelect = this.editModal.locator(
      '#edit-dayStartTime, select[name="dayStartTime"]'
    );
    this.submitEditButton = this.editModal.getByRole('button', {
      name: /save|update/i,
    });
    this.cancelEditButton = this.editModal.getByRole('button', {
      name: /cancel/i,
    });

    // ── Delete dialog ──────────────────────────────────────────────────────────
    // The delete modal renders a custom div (not role="dialog"). We locate it by
    // finding the outermost div that contains the step heading.
    this.deleteDialog = page
      .locator('div')
      .filter({
        has: page.getByRole('heading', {
          name: /Remove Location|Archive Location|Permanently Delete Location/i,
        }),
      })
      .first();

    this.confirmDeleteButton = this.deleteDialog.getByRole('button', {
      name: /archive|permanently delete/i,
    });
    this.cancelDeleteButton = this.deleteDialog.getByRole('button', {
      name: /cancel/i,
    });
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/locations');
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Row helpers ───────────────────────────────────────────────────────────

  /**
   * Returns the table row that contains the given location name.
   */
  rowByName(name: string): Locator {
    return this.tableRows.filter({ hasText: name });
  }

  /**
   * Click the Edit (pencil) icon for the row at the given zero-based index.
   */
  async clickEdit(rowIndex: number) {
    const row = this.tableRows.nth(rowIndex);
    await row.getByRole('button', { name: /edit/i }).click();
  }

  /**
   * Click the Delete (bin) icon for the row at the given zero-based index.
   */
  async clickDelete(rowIndex: number) {
    const row = this.tableRows.nth(rowIndex);
    await row.getByRole('button', { name: /delete/i }).click();
  }

  /**
   * Click the View (eye) icon for the row at the given zero-based index.
   */
  async clickView(rowIndex: number) {
    const row = this.tableRows.nth(rowIndex);
    await row
      .locator('button[aria-label*="view" i], [aria-label*="eye" i]')
      .click();
  }

  // ─── Create modal actions ──────────────────────────────────────────────────

  async openCreateModal() {
    await this.addLocationButton.click();
    await expect(this.createModal).toBeVisible();
  }

  async fillLocationForm(data: {
    name: string;
    street?: string;
    city?: string;
    country?: string;
    profitShare?: string;
    licencee?: string;
    membershipEnabled?: boolean;
  }) {
    await this.nameInput.fill(data.name);
    if (data.street) await this.streetInput.fill(data.street);
    if (data.city) await this.cityInput.fill(data.city);
    if (data.country)
      await this.countrySelect.selectOption({ label: data.country });
    if (data.profitShare) await this.profitShareInput.fill(data.profitShare);
    if (data.licencee)
      await this.licenceeSelect.selectOption({ label: data.licencee });
    if (data.membershipEnabled !== undefined) {
      if (data.membershipEnabled) await this.membershipCheckbox.check();
      else await this.membershipCheckbox.uncheck();
    }
  }

  async submitCreateForm() {
    await this.submitCreateButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Create modal — field-coverage helpers ──────────────────────────────────

  /** Selects the licencee by visible label (required for the POST to fire). */
  async selectLicencee(label: string) {
    await this.licenceeSelect.selectOption({ label });
  }

  /** Selects a Day Start Time option by its visible label (e.g. "8:00 AM"). */
  async selectDayStartTime(label: string) {
    await this.dayStartTimeSelect.selectOption({ label });
  }

  /**
   * Toggles the membership-enabled checkbox. It is a shadcn Checkbox (button with
   * role="checkbox"), so we click and read aria-checked rather than using check().
   */
  async setMembershipEnabled(enabled: boolean) {
    const isChecked =
      (await this.membershipCheckbox.getAttribute('aria-checked')) === 'true' ||
      (await this.membershipCheckbox.getAttribute('data-state')) === 'checked';
    if (isChecked !== enabled) {
      await this.membershipCheckbox.click();
    }
  }

  async expectMembershipSectionVisible() {
    await expect(this.membershipSection).toBeVisible({ timeout: 5_000 });
  }

  async expectMembershipSectionHidden() {
    await expect(this.membershipSection).toHaveCount(0);
  }

  /** Clicks the bill-validator "Check All" toggle. */
  async toggleAllBillValidators() {
    await this.billValidatorAllCheckbox.click();
  }

  async cancelCreate() {
    await this.cancelCreateButton.click();
    await expect(this.createModal).not.toBeVisible();
  }

  // ─── Edit modal actions ────────────────────────────────────────────────────

  async fillEditForm(updates: {
    name?: string;
    street?: string;
    city?: string;
    profitShare?: string;
  }) {
    // fill() replaces atomically; avoid clear()+fill() which can trip transient
    // validation in some modals. Edit-location has no per-field required-min check,
    // but we keep the atomic pattern for consistency.
    if (updates.name) await this.editNameInput.fill(updates.name);
    if (updates.street) await this.editStreetInput.fill(updates.street);
    if (updates.city) await this.editCityInput.fill(updates.city);
    if (updates.profitShare)
      await this.editProfitShareInput.fill(updates.profitShare);
  }

  async submitEditForm() {
    await this.submitEditButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Delete dialog actions ─────────────────────────────────────────────────

  async confirmDelete() {
    // The delete modal has a 'choose' step (for admin/developer) before the
    // confirmation step. Click Archive to advance to the confirmation step.
    await this.confirmDeleteButton.first().click();
    // Wait for the confirmation step heading so we know the transition completed.
    const confirmHeading = this.deleteDialog.getByRole('heading', {
      name: /Archive Location|Permanently Delete Location/i,
    });
    await expect(confirmHeading).toBeVisible();
    // Click the confirm button (Archive / Permanently Delete).
    await this.confirmDeleteButton.first().click();
    await this.page.waitForLoadState('networkidle');
  }

  async cancelDelete() {
    await this.cancelDeleteButton.click();
    await expect(this.deleteDialog).not.toBeVisible();
  }

  // ─── Assertions ────────────────────────────────────────────────────────────

  async expectTableHasRow(name: string) {
    await expect(this.rowByName(name)).toBeVisible();
  }

  async expectTableNotHasRow(name: string) {
    await expect(this.rowByName(name)).not.toBeVisible();
  }

  async expectTableRowCount(count: number) {
    await expect(this.tableRows).toHaveCount(count);
  }

  async expectCreateModalVisible() {
    await expect(this.createModal).toBeVisible();
  }

  async expectEditModalVisible() {
    await expect(this.editModal).toBeVisible();
    // Wait for async location details to finish loading — the street input
    // replaces its skeleton only after locationDetails is fetched and
    // originalFormData is set (required for handleSubmit to proceed).
    await expect(this.editModal.locator('input[name="street"]')).toBeVisible({
      timeout: 10_000,
    });
  }

  async expectDeleteDialogVisible() {
    await expect(this.deleteDialog).toBeVisible();
  }

  async expectMetricInRow(
    locationName: string,
    column: 'moneyIn' | 'moneyOut' | 'gross',
    value: string
  ) {
    const row = this.rowByName(locationName);
    const cells = row.locator('td');
    // column indices: 0=name, 1=moneyIn, 2=moneyOut, 3=gross
    const colIndex = { moneyIn: 1, moneyOut: 2, gross: 3 }[column];
    await expect(cells.nth(colIndex)).toContainText(value);
  }
}
