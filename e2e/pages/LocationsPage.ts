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
  readonly submitCreateButton: Locator;
  readonly cancelCreateButton: Locator;

  // ─── Edit modal ───────────────────────────────────────────────────────────
  readonly editModal: Locator;
  readonly editNameInput: Locator;
  readonly submitEditButton: Locator;
  readonly cancelEditButton: Locator;

  // ─── Delete confirmation dialog ───────────────────────────────────────────
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page header button — label varies ("Add Location" / "+ Location")
    this.addLocationButton = page.getByRole('button', { name: /add.*location|new.*location|\+ location/i });

    // Table
    this.tableBody = page.locator('table tbody');
    this.tableRows = page.locator('table tbody tr');

    // ── Create modal ──────────────────────────────────────────────────────────
    // The modal is identified by the dialog role; its title is "Add New Location"
    this.createModal = page.locator('[role="dialog"]').filter({ hasText: /add new location/i });

    this.nameInput = this.createModal.locator('input[name="name"], #name');
    this.streetInput = this.createModal.locator('input[name="street"], #street');
    this.cityInput = this.createModal.locator('input[name="city"], #city');
    this.countrySelect = this.createModal.locator('select[name="country"], #country');
    this.profitShareInput = this.createModal.locator('input[name="profitShare"], #profitShare');
    this.licenceeSelect = this.createModal.locator('select[name="licencee"], #licencee');
    this.membershipCheckbox = this.createModal.locator('input[name="membershipEnabled"], #membershipEnabled');

    this.submitCreateButton = this.createModal.getByRole('button', { name: /add location|create|save/i });
    this.cancelCreateButton = this.createModal.getByRole('button', { name: /cancel/i });

    // ── Edit modal ─────────────────────────────────────────────────────────────
    this.editModal = page.locator('[role="dialog"]').filter({ hasText: /edit.*location|update.*location/i });
    this.editNameInput = this.editModal.locator('input[name="name"], #name');
    this.submitEditButton = this.editModal.getByRole('button', { name: /save|update/i });
    this.cancelEditButton = this.editModal.getByRole('button', { name: /cancel/i });

    // ── Delete dialog ──────────────────────────────────────────────────────────
    this.deleteDialog = page.locator('[role="dialog"]').filter({ hasText: /are you absolutely sure/i });
    this.confirmDeleteButton = this.deleteDialog.getByRole('button', { name: /delete/i });
    this.cancelDeleteButton = this.deleteDialog.getByRole('button', { name: /cancel/i });
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
    // Edit button identified by aria-label or title attribute
    await row.locator('button[aria-label*="edit" i], img[alt*="edit" i], [title*="edit" i]').click();
  }

  /**
   * Click the Delete (bin) icon for the row at the given zero-based index.
   */
  async clickDelete(rowIndex: number) {
    const row = this.tableRows.nth(rowIndex);
    await row.locator('button[aria-label*="delete" i], img[alt*="delete" i], [title*="delete" i]').click();
  }

  /**
   * Click the View (eye) icon for the row at the given zero-based index.
   */
  async clickView(rowIndex: number) {
    const row = this.tableRows.nth(rowIndex);
    await row.locator('button[aria-label*="view" i], [aria-label*="eye" i]').click();
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
    if (data.country) await this.countrySelect.selectOption({ label: data.country });
    if (data.profitShare) await this.profitShareInput.fill(data.profitShare);
    if (data.licencee) await this.licenceeSelect.selectOption({ label: data.licencee });
    if (data.membershipEnabled !== undefined) {
      if (data.membershipEnabled) await this.membershipCheckbox.check();
      else await this.membershipCheckbox.uncheck();
    }
  }

  async submitCreateForm() {
    await this.submitCreateButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async cancelCreate() {
    await this.cancelCreateButton.click();
    await expect(this.createModal).not.toBeVisible();
  }

  // ─── Edit modal actions ────────────────────────────────────────────────────

  async fillEditForm(updates: { name?: string }) {
    if (updates.name) {
      await this.editNameInput.clear();
      await this.editNameInput.fill(updates.name);
    }
  }

  async submitEditForm() {
    await this.submitEditButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Delete dialog actions ─────────────────────────────────────────────────

  async confirmDelete() {
    await this.confirmDeleteButton.click();
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
  }

  async expectDeleteDialogVisible() {
    await expect(this.deleteDialog).toBeVisible();
  }

  async expectMetricInRow(locationName: string, column: 'moneyIn' | 'moneyOut' | 'gross', value: string) {
    const row = this.rowByName(locationName);
    const cells = row.locator('td');
    // column indices: 0=name, 1=moneyIn, 2=moneyOut, 3=gross
    const colIndex = { moneyIn: 1, moneyOut: 2, gross: 3 }[column];
    await expect(cells.nth(colIndex)).toContainText(value);
  }
}
