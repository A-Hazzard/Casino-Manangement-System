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
  private cabinetId: string = '';

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
    this.startDateInput = page.locator('input[aria-label*="start date" i], input[name="startDate"]').first();
    this.endDateInput = page.locator('input[aria-label*="end date" i], input[name="endDate"]').first();
    this.applyRangeButton = page.getByRole('button', { name: /apply|go|search/i });

    // Metric cards
    this.moneyInCard = page.locator('text=Money In').locator('..').first();
    this.moneyOutCard = page.locator('text=Money Out').locator('..').first();
    this.jackpotCard = page.locator('text=Jackpot').locator('..').first();
    this.grossCard = page.locator('text=Gross').locator('..').first();

    // Sections
    this.meterDataSection = page.locator('[data-testid="meter-data"], text=SAS Meters, text=Meter Data').first().locator('..');
    this.meterHistorySection = page.locator('[data-testid="meter-history"], text=Meter History').first().locator('..');
    this.billValidatorSection = page.locator('[data-testid="bill-validator"], text=Bill Validator').first().locator('..');

    // Back link
    this.backToCabinetsLink = page.getByRole('link', { name: /back|cabinets/i });
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  async goto(cabinetId: string) {
    this.cabinetId = cabinetId;
    await this.page.goto(`/cabinets/${cabinetId}`);
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Actions ────────────────────────────────────────────────────────────────

  async selectTimePeriod(period: 'All Time' | 'Today' | 'Week' | 'Month' | 'Custom') {
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

  async expectMetricValue(metric: 'moneyIn' | 'moneyOut' | 'jackpot' | 'gross', value: string) {
    const cardMap = {
      moneyIn: this.moneyInCard,
      moneyOut: this.moneyOutCard,
      jackpot: this.jackpotCard,
      gross: this.grossCard,
    };
    await expect(cardMap[metric]).toContainText(value);
  }
}
