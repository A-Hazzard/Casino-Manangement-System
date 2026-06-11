import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Cabinet / Machine detail page (/cabinets/[cabinetId]).
 *
 * The page renders:
 *   - Financial metric cards (Money In, Money Out, Jackpot, Gross, etc.)
 *   - Time-period filter buttons
 *   - SAS meter readings table / section
 *   - Bill validator data
 *   - Meter history entries
 */
export class CabinetDetailPage {
  readonly page: Page;

  // ─── Time-period filters ───────────────────────────────────────────────────
  readonly filterAllTime: Locator;
  readonly filterToday: Locator;
  readonly filterWeek: Locator;
  readonly filterMonth: Locator;
  readonly filterCustom: Locator;

  // ─── Custom range picker ───────────────────────────────────────────────────
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  readonly applyRangeButton: Locator;

  // ─── Metric cards ──────────────────────────────────────────────────────────
  readonly moneyInCard: Locator;
  readonly moneyOutCard: Locator;
  readonly jackpotCard: Locator;
  readonly grossCard: Locator;

  // ─── Meter data ────────────────────────────────────────────────────────────
  readonly meterDataSection: Locator;
  readonly meterHistorySection: Locator;
  readonly billValidatorSection: Locator;

  // ─── Accounting Details tabbed section ───────────────────────────────────────
  // "Accounting Details" card holds a left sidebar (desktop, lg+) of tab buttons:
  // Movements · Live Meters · Bill Validator · Activity Log · Collection History ·
  // Collection Settings · Configurations. Each switches the right-hand content.
  readonly accountingSection: Locator;
  readonly accountingSidebar: Locator;

  // ─── Navigation ────────────────────────────────────────────────────────────
  readonly backToCabinetsLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Filters — the detail page may use the same DateFilters component
    this.filterAllTime = page.getByRole('button', { name: /all time/i });
    this.filterToday = page.getByRole('button', { name: /^today$/i });
    this.filterWeek = page.getByRole('button', { name: /week|last 7/i });
    this.filterMonth = page.getByRole('button', { name: /month|last 30/i });
    this.filterCustom = page.getByRole('button', { name: /custom/i });

    // Custom range inputs
    this.startDateInput = page
      .locator('input[aria-label*="start date" i], input[name="startDate"]')
      .first();
    this.endDateInput = page
      .locator('input[aria-label*="end date" i], input[name="endDate"]')
      .first();
    this.applyRangeButton = page.getByRole('button', {
      name: /apply|go|search/i,
    });

    // Metric cards
    this.moneyInCard = page.locator('text=Money In').locator('..').first();
    this.moneyOutCard = page.locator('text=Money Out').locator('..').first();
    this.jackpotCard = page.locator('text=Jackpot').locator('..').first();
    this.grossCard = page.locator('text=Gross').locator('..').first();

    // Sections — the SMIB Configuration heading and the Collection History tab
    this.meterDataSection = page.locator('h2:has-text("SMIB Configuration")').first();
    this.meterHistorySection = page.getByRole('button', { name: 'Collection History' }).first();
    this.billValidatorSection = page.getByRole('button', { name: 'Bill Validator' }).first();

    // Accounting Details card + its desktop tab sidebar
    this.accountingSection = page
      .locator('h2:has-text("Accounting Details")')
      .locator('..');
    this.accountingSidebar = this.accountingSection.locator('aside');

    // Back link
    this.backToCabinetsLink = page.getByRole('link', {
      name: /back|cabinets/i,
    });
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  async goto(cabinetId: string) {
    await this.page.goto(`/cabinets/${cabinetId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  async selectTimePeriod(
    period: 'All Time' | 'Today' | 'Week' | 'Month' | 'Custom'
  ) {
    const map: Record<string, Locator> = {
      'All Time': this.filterAllTime,
      Today: this.filterToday,
      Week: this.filterWeek,
      Month: this.filterMonth,
      Custom: this.filterCustom,
    };
    await map[period].click();
    await this.page.waitForLoadState('networkidle');
  }

  async selectCustomRange(startDate: string, endDate: string) {
    await this.filterCustom.click();
    await this.startDateInput.fill(startDate);
    await this.endDateInput.fill(endDate);
    await this.applyRangeButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Accounting Details tabs ──────────────────────────────────────────────────

  /** A tab button in the Accounting Details sidebar, by exact label. */
  accountingTab(label: string): Locator {
    return this.accountingSidebar.getByRole('button', {
      name: label,
      exact: true,
    });
  }

  async clickAccountingTab(label: string) {
    await this.accountingTab(label).click();
    // Allow the framer-motion AnimatePresence tab swap to settle.
    await this.page.waitForTimeout(400);
  }

  // ─── Assertions ──────────────────────────────────────────────────────────────

  async expectFinancialMetricsVisible() {
    await expect(this.moneyInCard).toBeVisible();
    await expect(this.moneyOutCard).toBeVisible();
    await expect(this.grossCard).toBeVisible();
  }

  async expectMeterDataVisible() {
    await expect(this.meterDataSection).toBeVisible();
  }

  async expectMeterHistoryVisible() {
    await expect(this.meterHistorySection).toBeVisible();
  }

  async expectBillValidatorVisible() {
    await expect(this.billValidatorSection).toBeVisible();
  }

  async expectAccountingTabsVisible() {
    const tabs = [
      'Movements',
      'Live Meters',
      'Bill Validator',
      'Activity Log',
      'Collection History',
      'Collection Settings',
      'Configurations',
    ];
    for (const tab of tabs) {
      await expect(this.accountingTab(tab)).toBeVisible();
    }
  }

  /** Live Meters tab content — SAS meter cards unique to this tab. */
  async expectLiveMetersVisible() {
    await expect(
      this.accountingSection.getByText('Coin In', { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      this.accountingSection.getByText('Games Played', { exact: true }).first()
    ).toBeVisible({ timeout: 10_000 });
  }

  /** Movements (default) tab content — the financial movement cards. */
  async expectMovementsVisible() {
    await expect(
      this.accountingSection.getByText('Money In', { exact: true }).first()
    ).toBeVisible();
    await expect(
      this.accountingSection.getByText('Gross', { exact: true }).first()
    ).toBeVisible();
  }

  async expectMetricValue(
    metric: 'moneyIn' | 'moneyOut' | 'jackpot' | 'gross',
    value: string
  ) {
    const cardMap = {
      moneyIn: this.moneyInCard,
      moneyOut: this.moneyOutCard,
      jackpot: this.jackpotCard,
      gross: this.grossCard,
    };
    await expect(cardMap[metric]).toContainText(value);
  }
}
