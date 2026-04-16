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

  constructor(page: Page) {
    this.page = page;

    // Page controls
    this.newCabinetButton = page.getByRole('button', { name: /new cabinet|add cabinet|create machine/i });
    this.tableBody = page.locator('table tbody');
    this.tableRows = page.locator('table tbody tr');

    // Column header buttons for sorting
    this.grossColumnHeader = page.getByRole('columnheader', { name: /gross/i });
    this.moneyInColumnHeader = page.getByRole('columnheader', { name: /money in/i });

    // ── Create modal ────────────────────────────────────────────────────────────
    this.createModal = page.locator('[role="dialog"]').filter({
      hasText: /new cabinet|create cabinet|add machine/i,
    });

    this.serialNumberInput = this.createModal.locator('input[name="serialNumber"], #serialNumber');
    this.gameInput = this.createModal.locator('input[name="game"], #game');
    this.gameTypeSelect = this.createModal.locator('select[name="gameType"], #gameType');
    this.relayIdInput = this.createModal.locator('input[name="relayId"], #relayId');
    this.locationSelect = this.createModal.locator('select[name="gamingLocation"], #gamingLocation');
    this.manufacturerSelect = this.createModal.locator('select[name="manufacturer"], #manufacturer');
    this.customNameInput = this.createModal.locator('input[name="custom.name"], #customName, input[placeholder*="custom name" i]');
    this.smibBoardInput = this.createModal.locator('input[name="smibBoard"], #smibBoard');

    this.submitCreateButton = this.createModal.getByRole('button', { name: /create cabinet|add|save/i });
    this.cancelCreateButton = this.createModal.getByRole('button', { name: /cancel/i });

    // Validation errors
    this.serialNumberError = this.createModal.locator('#serialNumber-error, [id*="serial"][id*="error"]');
    this.smibBoardError = this.createModal.locator('#smibBoard-error, [id*="smib"][id*="error"]');

    // ── Edit modal ──────────────────────────────────────────────────────────────
    this.editModal = page.locator('[role="dialog"]').filter({ hasText: /edit.*cabinet|edit.*machine/i });
    this.editCustomNameInput = this.editModal.locator('input[name="custom.name"], #customName');
    this.submitEditButton = this.editModal.getByRole('button', { name: /save|update/i });
    this.cancelEditButton = this.editModal.getByRole('button', { name: /cancel/i });

    // ── Delete dialog ───────────────────────────────────────────────────────────
    this.deleteDialog = page.locator('[role="dialog"]').filter({ hasText: /are you absolutely sure/i });
    this.confirmDeleteButton = this.deleteDialog.getByRole('button', { name: /delete/i });
    this.cancelDeleteButton = this.deleteDialog.getByRole('button', { name: /cancel/i });
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
    await row.locator('button[aria-label*="edit" i], img[alt*="edit" i]').click();
  }

  async clickDelete(rowIndex: number) {
    const row = this.tableRows.nth(rowIndex);
    await row.locator('button[aria-label*="delete" i], img[alt*="delete" i]').click();
  }

  async clickView(rowIndex: number) {
    const row = this.tableRows.nth(rowIndex);
    await row.locator('button[aria-label*="view" i], [aria-label*="eye" i]').click();
  }

  // ─── Create modal actions ───────────────────────────────────────────────────

  async openNewCabinetModal() {
    await this.newCabinetButton.click();
    await expect(this.createModal).toBeVisible();
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
    if (data.gameType) await this.gameTypeSelect.selectOption(data.gameType);
    if (data.relayId) await this.relayIdInput.fill(data.relayId);
    if (data.location) await this.locationSelect.selectOption({ label: data.location });
    if (data.manufacturer) await this.manufacturerSelect.selectOption({ label: data.manufacturer });
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
    await this.confirmDeleteButton.click();
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
    await expect(this.serialNumberError).toContainText(/3 characters|required/i);
  }

  async expectSmibValidationError() {
    await expect(this.smibBoardError).toBeVisible();
    await expect(this.smibBoardError).toContainText(/12 characters|hexadecimal/i);
  }

  async expectCreateModalVisible() {
    await expect(this.createModal).toBeVisible();
  }

  async expectDeleteDialogVisible() {
    await expect(this.deleteDialog).toBeVisible();
  }
}
