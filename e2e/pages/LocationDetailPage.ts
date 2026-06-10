import { type Page, type Locator, expect } from '@playwright/test';

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

  // ── Select helpers for shadcn comboboxes ───────────────────────────────
  private placeholderCombobox(placeholderText: string): Locator {
    return this.page.locator('button[role="combobox"]').filter({ hasText: new RegExp(placeholderText, 'i') });
  }

  private async selectShadcnOption(triggerLocator: Locator, optionText: string) {
    await triggerLocator.click();
    const option = this.page.getByRole('option', { name: new RegExp(optionText, 'i') });
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
  }

  constructor(page: Page) {
    this.page = page;

    // Tabs — rendered as <button> elements with icon + text
    this.machinesTab = page.getByRole('button', { name: /machines/i });
    this.membersTab = page.getByRole('button', { name: /members/i });

    // Machine table
    this.machineTableBody = page.locator('table tbody');
    this.machineRows = page.locator('table tbody tr');

    // Header buttons
    this.addMachineButton = page.getByRole('button', {
      name: /add machine|create machine|new machine/i,
    });
    this.settingsButton = page.getByRole('button', { name: /settings/i });
    this.backButton = page.locator('a[href="/locations"]');

    // Machine modal — scoped to fixed overlay so page-level headings can't match.
    // "New Cabinet" heading is exact; Edit heading is "Edit <serial> Details".
    // Only one modal is in the DOM at a time (both return null when closed).
    this.machineModal = page
      .locator('div.fixed.inset-0')
      .filter({ has: page.locator('h2').filter({ hasText: /new cabinet|edit .+ details/i }) })
      .locator('h2')
      .filter({ hasText: /new cabinet|edit .+ details/i })
      .first()
      .locator('..')
      .locator('..');

    // New Cabinet uses #serialNumber; Edit Cabinet uses #assetNumber (same concept)
    this.serialNumberInput = this.machineModal.locator(
      'input[name="serialNumber"], #serialNumber, input[name="assetNumber"], #assetNumber'
    );
    // New Cabinet uses #game; Edit Cabinet uses #installedGame
    this.gameInput = this.machineModal.locator(
      'input[name="game"], #game, input[name="installedGame"], #installedGame'
    );
    // Game type: form initialises to 'slot', so button shows "Slot" not the placeholder.
    // Match both the placeholder and the possible selected values.
    this.gameTypeSelect = this.machineModal
      .locator('button[role="combobox"]')
      .filter({ hasText: /select game type|^slot$|^roulette$|^pulse$|^other$/i })
      .first();
    this.relayIdInput = this.machineModal.locator('input[name="relayId"], #relayId');
    this.manufacturerSelect = this.placeholderCombobox('Select Manufacturer');
    // Scope to the Basic Information section to avoid the fallback #customName in
    // EditCabinetLocationConfig (which only renders when assetNumber is missing).
    this.customNameInput = this.machineModal.locator(
      'input[placeholder="Enter Custom Name (Optional)"], input[placeholder="Enter custom machine name"]'
    );
    // Cabinet type initialises to 'Standing'; status to 'functional' → handle both states.
    this.cabinetTypeSelect = this.machineModal
      .locator('button[role="combobox"]')
      .filter({ hasText: /select cabinet type|^standing$|^slant top$|^bar top$/i })
      .first();
    this.assetStatusSelect = this.machineModal
      .locator('button[role="combobox"]')
      .filter({ hasText: /select status|^functional$|^non.functional$/i })
      .first();

    this.submitMachineButton = page.getByRole('button', {
      name: /create cabinet|add machine|save|update/i,
    });
    this.cancelMachineButton = page.getByRole('button', {
      name: /cancel/i,
    });

    this.serialNumberError = page.locator(
      'div:has(> #serialNumber) p.text-red-500'
    );

    // Delete dialog — heading is "Remove Cabinet" (choose step) or "Archive Cabinet" (confirm step)
    this.deleteDialog = page
      .locator('h2')
      .filter({ hasText: /remove cabinet|archive cabinet/i })
      .first()
      .locator('..')
      .locator('..')
      .locator('..');
    this.confirmDeleteButton = page.getByRole('button', {
      name: /archive/i,
    });
    this.cancelDeleteButton = page.getByRole('button', {
      name: /cancel/i,
    });
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
    await row.locator('button[title="Edit"]').click();
  }

  async clickMachineDelete(rowIndex: number) {
    const row = this.machineRows.nth(rowIndex);
    await row.locator('button[title="Delete"]').click();
  }

  // ─── Add machine modal actions ──────────────────────────────────────────────

  async openAddMachineModal() {
    await this.addMachineButton.click();
    await expect(this.machineModal).toBeVisible();
    // Wait for the form to be ready — Select comboboxes need time to render
    await this.page.waitForTimeout(500);
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
    if (data.gameType) await this.selectShadcnOption(this.gameTypeSelect, data.gameType);
    if (data.relayId) await this.relayIdInput.fill(data.relayId);
    if (data.manufacturer) await this.selectShadcnOption(this.manufacturerSelect, data.manufacturer);
    if (data.customName) await this.customNameInput.fill(data.customName);
    if (data.cabinetType) await this.selectShadcnOption(this.cabinetTypeSelect, data.cabinetType);
    if (data.assetStatus) await this.selectShadcnOption(this.assetStatusSelect, data.assetStatus);
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
    // Step 1: click "Archive" option button in the choose screen
    await this.page.getByRole('button', { name: /archive/i }).first().click();
    // Step 2: wait for confirm heading then click "Archive" to submit
    await this.page.locator('h2:has-text("Archive Cabinet")').waitFor();
    await this.page.getByRole('button', { name: /^archive$/i }).click();
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
    await expect(this.machinesTab).toHaveClass(/border-blue-600/);
  }

  async expectMembersTabVisible() {
    await expect(this.membersTab).toBeVisible();
  }

  async expectSerialNumberValidationError() {
    await expect(this.serialNumberError).toBeVisible();
    await expect(this.serialNumberError).toContainText(
      /3 characters|required/i
    );
  }
}
