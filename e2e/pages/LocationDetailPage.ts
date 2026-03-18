import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Location Detail page (/locations/[locationId]).
 *
 * The page renders:
 *   - A tab bar: Machines (default), Members (if membershipEnabled)
 *   - A table of machines (cabinets) assigned to the location
 *   - Action buttons: Add Machine, Edit, Delete per row
 *   - Date filters above the table
 */
export class LocationDetailPage {
  readonly page: Page;

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  readonly machinesTab: Locator;
  readonly membersTab: Locator;

  // ─── Machine table ─────────────────────────────────────────────────────────
  readonly machineTableBody: Locator;
  readonly machineRows: Locator;

  // ─── Header actions ────────────────────────────────────────────────────────
  readonly addMachineButton: Locator;
  readonly settingsButton: Locator;
  readonly backButton: Locator;

  // ─── Add/Edit machine modal ────────────────────────────────────────────────
  readonly machineModal: Locator;
  readonly serialNumberInput: Locator;
  readonly gameInput: Locator;
  readonly gameTypeSelect: Locator;
  readonly relayIdInput: Locator;
  readonly manufacturerSelect: Locator;
  readonly customNameInput: Locator;
  readonly cabinetTypeSelect: Locator;
  readonly assetStatusSelect: Locator;
  readonly submitMachineButton: Locator;
  readonly cancelMachineButton: Locator;

  // ─── Validation errors ─────────────────────────────────────────────────────
  readonly serialNumberError: Locator;

  // ─── Delete confirmation dialog ────────────────────────────────────────────
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  // ─── Meter data section ────────────────────────────────────────────────────
  readonly meterDataSection: Locator;

  constructor(page: Page) {
    this.page = page;

    // Tabs
    this.machinesTab = page.getByRole('tab', { name: /machines/i });
    this.membersTab = page.getByRole('tab', { name: /members/i });

    // Machine table
    this.machineTableBody = page.locator('table tbody');
    this.machineRows = page.locator('table tbody tr');

    // Header buttons
    this.addMachineButton = page.getByRole('button', { name: /add machine|create machine|new machine/i });
    this.settingsButton = page.getByRole('button', { name: /settings/i });
    this.backButton = page.getByRole('link', { name: /back|locations/i });

    // Machine modal — identified by "Add" or "Edit" in its title
    this.machineModal = page.locator('[role="dialog"]').filter({ hasText: /add.*machine|create.*machine|edit.*machine|new.*cabinet|add.*cabinet/i });

    this.serialNumberInput = this.machineModal.locator('input[name="serialNumber"], #serialNumber');
    this.gameInput = this.machineModal.locator('input[name="game"], #game');
    this.gameTypeSelect = this.machineModal.locator('select[name="gameType"], #gameType');
    this.relayIdInput = this.machineModal.locator('input[name="relayId"], #relayId');
    this.manufacturerSelect = this.machineModal.locator('select[name="manufacturer"], #manufacturer');
    this.customNameInput = this.machineModal.locator('input[name="custom.name"], input[name="customName"], #customName');
    this.cabinetTypeSelect = this.machineModal.locator('select[name="cabinetType"], #cabinetType');
    this.assetStatusSelect = this.machineModal.locator('select[name="assetStatus"], #assetStatus');

    this.submitMachineButton = this.machineModal.getByRole('button', {
      name: /create cabinet|add machine|save|update/i,
    });
    this.cancelMachineButton = this.machineModal.getByRole('button', { name: /cancel/i });

    this.serialNumberError = this.machineModal.locator('#serialNumber-error, [id*="serialNumber"][id*="error"]');

    // Delete dialog
    this.deleteDialog = page.locator('[role="dialog"]').filter({ hasText: /are you absolutely sure/i });
    this.confirmDeleteButton = this.deleteDialog.getByRole('button', { name: /delete/i });
    this.cancelDeleteButton = this.deleteDialog.getByRole('button', { name: /cancel/i });

    // Meter data section
    this.meterDataSection = page.locator('[data-testid="meter-data"], text=Meter Data, text=SAS Meters').locator('..');
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  async goto(locationId: string) {
    await this.page.goto(`/locations/${locationId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Tab actions ────────────────────────────────────────────────────────────

  async switchTab(tab: 'Machines' | 'Members') {
    if (tab === 'Machines') await this.machinesTab.click();
    else await this.membersTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Row helpers ────────────────────────────────────────────────────────────

  rowBySerial(serialNumber: string): Locator {
    return this.machineRows.filter({ hasText: serialNumber });
  }

  async clickMachineEdit(rowIndex: number) {
    const row = this.machineRows.nth(rowIndex);
    await row.locator('button[aria-label*="edit" i], img[alt*="edit" i], [title*="edit" i]').click();
  }

  async clickMachineDelete(rowIndex: number) {
    const row = this.machineRows.nth(rowIndex);
    await row.locator('button[aria-label*="delete" i], img[alt*="delete" i], [title*="delete" i]').click();
  }

  // ─── Add machine modal actions ──────────────────────────────────────────────

  async openAddMachineModal() {
    await this.addMachineButton.click();
    await expect(this.machineModal).toBeVisible();
  }

  async fillMachineForm(data: {
    serialNumber: string;
    game?: string;
    gameType?: string;
    relayId?: string;
    manufacturer?: string;
    customName?: string;
    cabinetType?: string;
    assetStatus?: string;
  }) {
    await this.serialNumberInput.fill(data.serialNumber);
    if (data.game) await this.gameInput.fill(data.game);
    if (data.gameType) await this.gameTypeSelect.selectOption(data.gameType);
    if (data.relayId) await this.relayIdInput.fill(data.relayId);
    if (data.manufacturer) await this.manufacturerSelect.selectOption({ label: data.manufacturer });
    if (data.customName) await this.customNameInput.fill(data.customName);
    if (data.cabinetType) await this.cabinetTypeSelect.selectOption(data.cabinetType);
    if (data.assetStatus) await this.assetStatusSelect.selectOption(data.assetStatus);
  }

  async submitMachineForm() {
    await this.submitMachineButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  async cancelMachineForm() {
    await this.cancelMachineButton.click();
    await expect(this.machineModal).not.toBeVisible();
  }

  // ─── Delete actions ─────────────────────────────────────────────────────────

  async confirmDeleteMachine() {
    await this.confirmDeleteButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Assertions ─────────────────────────────────────────────────────────────

  async expectMachineInTable(serialNumber: string) {
    await expect(this.rowBySerial(serialNumber)).toBeVisible();
  }

  async expectMachineNotInTable(serialNumber: string) {
    await expect(this.rowBySerial(serialNumber)).not.toBeVisible();
  }

  async expectMachineRowCount(count: number) {
    await expect(this.machineRows).toHaveCount(count);
  }

  async expectMachinesTabActive() {
    await expect(this.machinesTab).toHaveAttribute('data-state', 'active').catch(async () => {
      await expect(this.machinesTab).toHaveClass(/active|selected/);
    });
  }

  async expectMembersTabVisible() {
    await expect(this.membersTab).toBeVisible();
  }

  async expectSerialNumberValidationError() {
    await expect(this.serialNumberError).toBeVisible();
    await expect(this.serialNumberError).toContainText(/3 characters|required/i);
  }

  async expectMeterDataVisible() {
    await expect(this.meterDataSection).toBeVisible();
  }
}
