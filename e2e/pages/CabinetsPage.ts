import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Cabinets list page (/cabinets).
 *
 * The page renders:
 *   - A table with columns: Asset Number, Money In, Money Out, Jackpot, Gross, Net Gross, Actions
 *   - A "New Cabinet" button opening a creation modal
 *   - Sortable column headers
 *   - Edit / Delete action icons per row
 */
export class CabinetsPage {
  readonly page: Page;

  // ─── Page-level ────────────────────────────────────────────────────────────
  readonly newCabinetButton: Locator;
  readonly tableBody: Locator;
  readonly tableRows: Locator;
  readonly grossColumnHeader: Locator;
  readonly moneyInColumnHeader: Locator;

  // ─── Search & filter bar ─────────────────────────────────────────────────────
  // Both a mobile and desktop search input exist in the DOM; :visible picks the
  // one rendered for the active breakpoint (Desktop Chrome → desktop bar).
  readonly searchInput: Locator;

  // ─── Create modal ──────────────────────────────────────────────────────────
  readonly createModal: Locator;
  readonly serialNumberInput: Locator;
  readonly gameInput: Locator;
  readonly gameTypeSelect: Locator;
  readonly relayIdInput: Locator;
  readonly locationSelect: Locator;
  readonly manufacturerSelect: Locator;
  readonly customNameInput: Locator;
  readonly smibBoardInput: Locator;
  readonly submitCreateButton: Locator;
  readonly cancelCreateButton: Locator;

  // ─── Validation error elements ──────────────────────────────────────────────
  readonly serialNumberError: Locator;
  readonly smibBoardError: Locator;

  // ─── Edit modal ────────────────────────────────────────────────────────────
  readonly editModal: Locator;
  readonly editCustomNameInput: Locator;
  readonly submitEditButton: Locator;
  readonly cancelEditButton: Locator;

  // ─── Delete confirmation dialog ─────────────────────────────────────────────
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  // ── Select helpers for shadcn comboboxes ───────────────────────────────
  private labelCombobox(labelText: string): Locator {
    return this.page.locator(`div:has(> label:has-text("${labelText}"))`).locator('button[role="combobox"]');
  }

  private placeholderCombobox(placeholderText: string): Locator {
    return this.page.locator('button[role="combobox"]').filter({ hasText: new RegExp(placeholderText, 'i') });
  }

  constructor(page: Page) {
    this.page = page;

    // Page controls
    this.newCabinetButton = page.getByRole('button', {
      name: /new cabinet|add cabinet|create machine/i,
    });
    this.tableBody = page.locator('table tbody');
    this.tableRows = page.locator('table tbody tr');

    // Column header buttons for sorting
    this.grossColumnHeader = page.getByRole('columnheader', { name: /gross/i });
    this.moneyInColumnHeader = page.getByRole('columnheader', {
      name: /money in/i,
    });

    // Search input — visible variant only (mobile bar is hidden at md+)
    this.searchInput = page.locator(
      'input[placeholder="Search machines..."]:visible'
    );

    // ── Create modal ────────────────────────────────────────────────────────────
    this.createModal = page.locator('h2:has-text("New Cabinet")').locator('..');

    this.serialNumberInput = page.locator('input[name="serialNumber"], #serialNumber');
    this.gameInput = page.locator('input[name="game"], #game');
    this.gameTypeSelect = this.labelCombobox('Game Type');
    this.relayIdInput = page.locator('input[name="relayId"], #relayId');
    this.locationSelect = this.placeholderCombobox('Select Location');
    this.manufacturerSelect = this.placeholderCombobox('Select Manufacturer');
    this.customNameInput = page.locator('input[name="custom.name"], #customName, input[placeholder*="custom name" i]');
    this.smibBoardInput = page.locator('#relayId');

    this.submitCreateButton = page.getByRole('button', {
      name: /^save$/i,
    });
    this.cancelCreateButton = page.getByRole('button', {
      name: /^cancel$/i,
    });

    // Validation errors — rendered as <p className="... text-red-500"> without IDs
    // Use direct-child selector to avoid matching ancestor containers
    this.serialNumberError = page.locator('div:has(> #serialNumber) p.text-red-500');
    this.smibBoardError = page.locator('div:has(> #relayId) p.text-red-500');

    // ── Edit modal ──────────────────────────────────────────────────────────────
    // h2 is inside the header div; go up 2 levels to reach the full modal container
    this.editModal = page.locator('h2:has-text("Edit"):has-text("Details")').locator('..').locator('..');
    this.editCustomNameInput = page.locator('#customName');
    this.submitEditButton = this.editModal.getByRole('button', {
      name: /save|update/i,
    });
    this.cancelEditButton = this.editModal.getByRole('button', {
      name: /cancel/i,
    });

    // ── Delete dialog — custom modal with 2-step flow ───────────────────────────
    // h2 is inside: header flex → header border container → modal container (3 levels up)
    this.deleteDialog = page.locator('h2:has-text("Remove Cabinet")').locator('..').locator('..').locator('..');
    this.confirmDeleteButton = page.getByRole('button', {
      name: /^archive$/i,
    });
    this.cancelDeleteButton = this.deleteDialog.getByRole('button', {
      name: /cancel/i,
    });
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/cabinets');
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Row helpers ─────────────────────────────────────────────────────────────

  rowByText(text: string): Locator {
    return this.tableRows.filter({ hasText: text });
  }

  async clickEdit(rowIndex: number) {
    const row = this.tableRows.nth(rowIndex);
    await row
      .locator('button[aria-label*="edit" i], img[alt*="edit" i]')
      .click();
  }

  async clickDelete(rowIndex: number) {
    const row = this.tableRows.nth(rowIndex);
    await row
      .locator('button[aria-label*="delete" i], img[alt*="delete" i]')
      .click();
  }

  async clickView(rowIndex: number) {
    const row = this.tableRows.nth(rowIndex);
    await row
      .locator('button[aria-label*="view" i], [aria-label*="eye" i]')
      .click();
  }

  // ─── Create modal actions ───────────────────────────────────────────────────

  async openNewCabinetModal() {
    await this.newCabinetButton.click();
    await expect(this.createModal).toBeVisible();
    await this.page.waitForTimeout(500);
  }

  async selectShadcnOption(triggerLocator: Locator, optionText: string) {
    await triggerLocator.click();
    const option = this.page.getByRole('option', { name: new RegExp(optionText, 'i') });
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
  }

  async fillCabinetForm(data: {
    serialNumber: string;
    game?: string;
    gameType?: string;
    relayId?: string;
    location?: string;
    manufacturer?: string;
    customName?: string;
    smibBoard?: string;
  }) {
    await this.serialNumberInput.fill(data.serialNumber);
    if (data.game) await this.gameInput.fill(data.game);
    if (data.gameType) await this.selectShadcnOption(this.gameTypeSelect, data.gameType);
    if (data.relayId) await this.relayIdInput.fill(data.relayId);
    if (data.location) {
      await this.page.waitForTimeout(300);
      await this.selectShadcnOption(this.locationSelect, data.location);
    }
    if (data.manufacturer)
      await this.selectShadcnOption(this.manufacturerSelect, data.manufacturer);
    if (data.customName) await this.customNameInput.fill(data.customName);
    if (data.smibBoard) await this.smibBoardInput.fill(data.smibBoard);
  }

  async submitCabinetForm() {
    await this.submitCreateButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async cancelCreate() {
    await this.cancelCreateButton.click();
    await expect(this.createModal).not.toBeVisible();
  }

  // ─── Edit modal actions ─────────────────────────────────────────────────────

  async fillEditCabinetForm(updates: { customName?: string }) {
    if (updates.customName) {
      await this.editCustomNameInput.clear();
      await this.editCustomNameInput.fill(updates.customName);
    }
  }

  async submitEditForm() {
    await this.submitEditButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Delete dialog actions ──────────────────────────────────────────────────

  async confirmDelete() {
    // Step 1: click "Archive" option in the choose screen
    // The option button has subtext, so use a partial match
    await this.page.getByRole('button', { name: /archive/i }).first().click();
    // Step 2: wait for confirm heading then click "Archive" to submit
    await this.page.locator('h2:has-text("Archive Cabinet")').waitFor();
    await this.page.getByRole('button', { name: /^archive$/i }).click();
    await this.page.waitForLoadState('networkidle');
  }

  async cancelDelete() {
    await this.cancelDeleteButton.click();
    await expect(this.deleteDialog).not.toBeVisible();
  }

  // ─── Sort ───────────────────────────────────────────────────────────────────

  async sortByGross() {
    await this.grossColumnHeader.click();
    await this.page.waitForTimeout(300); // allow re-render
  }

  // ─── Search & filter ──────────────────────────────────────────────────────────

  /**
   * Type into the search box. Search is server-side and debounced (~500ms ×2),
   * so callers should await the resulting /api/cabinets/aggregation request.
   */
  async search(term: string) {
    await this.searchInput.fill(term);
  }

  async clearSearch() {
    await this.searchInput.fill('');
  }

  /**
   * Open the desktop Status filter (a portal-rendered CustomSelect) and pick an
   * option by its exact label, e.g. "Online". Triggers a fresh server fetch with
   * onlineStatus=<value>.
   */
  async filterByStatus(optionLabel: string) {
    const trigger = this.page
      .locator('button[role="combobox"]:visible')
      .filter({ hasText: /all status/i })
      .first();
    await trigger.click();
    const option = this.page.getByRole('option', {
      name: optionLabel,
      exact: true,
    });
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
  }

  // ─── Assertions ─────────────────────────────────────────────────────────────

  async expectCabinetInTable(text: string) {
    await expect(this.rowByText(text)).toBeVisible();
  }

  async expectCabinetNotInTable(text: string) {
    await expect(this.rowByText(text)).not.toBeVisible();
  }

  async expectTableRowCount(count: number) {
    await expect(this.tableRows).toHaveCount(count);
  }

  async expectSerialNumberValidationError() {
    await expect(this.serialNumberError).toBeVisible();
    await expect(this.serialNumberError).toContainText(
      /3 characters|required/i
    );
  }

  async expectSmibValidationError() {
    await expect(this.smibBoardError).toBeVisible();
    await expect(this.smibBoardError).toContainText(
      /12 characters|hexadecimal/i
    );
  }

  async expectCreateModalVisible() {
    await expect(this.createModal).toBeVisible();
  }

  async expectDeleteDialogVisible() {
    await expect(this.deleteDialog).toBeVisible();
  }
}
