import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Dashboard / root page (/).
 *
 * The dashboard renders:
 *   - Time-period filter buttons (Today, Yesterday, Last 7 Days, Last 30 Days, Custom)
 *   - Financial metric cards (Money In, Money Out, Gross, etc.)
 *   - Location analytics section
 *   - Chart containers
 */
export class DashboardPage {
  readonly page: Page;

  // ─── Time-period filter locators ───────────────────────────────────────────
  readonly filterToday: Locator;
  readonly filterYesterday: Locator;
  readonly filterLast7Days: Locator;
  readonly filterLast30Days: Locator;
  readonly filterCustom: Locator;

  // ─── Date range picker (shown when Custom is selected) ────────────────────
  readonly dateRangeStartInput: Locator;
  readonly dateRangeEndInput: Locator;
  readonly applyCustomRangeBtn: Locator;

  // ─── Metric cards ─────────────────────────────────────────────────────────
  readonly metricCards: Locator;
  readonly moneyInCard: Locator;
  readonly moneyOutCard: Locator;
  readonly grossCard: Locator;

  // ─── Charts ───────────────────────────────────────────────────────────────
  readonly chartContainer: Locator;

  // ─── Location analytics ───────────────────────────────────────────────────
  readonly locationAnalyticsSection: Locator;
  readonly locationRows: Locator;

  // ─── Loading / error states ───────────────────────────────────────────────
  readonly loadingSkeleton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Time-period buttons — the app uses button elements with text labels
    this.filterToday = page.getByRole('button', { name: /today/i });
    this.filterYesterday = page.getByRole('button', { name: /yesterday/i });
    this.filterLast7Days = page.getByRole('button', { name: /last 7 days/i });
    this.filterLast30Days = page.getByRole('button', { name: /last 30 days/i });
    this.filterCustom = page.getByRole('button', { name: /custom/i });

    // Date range picker inputs (Calendar/DatePicker component)
    this.dateRangeStartInput = page.locator('input[placeholder*="start"], input[aria-label*="start date"]').first();
    this.dateRangeEndInput = page.locator('input[placeholder*="end"], input[aria-label*="end date"]').first();
    this.applyCustomRangeBtn = page.getByRole('button', { name: /apply|search|go/i });

    // Metric cards — each card wraps its value in a heading or strong element
    this.metricCards = page.locator('[data-testid="metric-card"], .metric-card, [class*="MetricCard"]');
    this.moneyInCard = page.locator('text=Money In').locator('..');
    this.moneyOutCard = page.locator('text=Money Out').locator('..');
    this.grossCard = page.locator('text=Gross').locator('..');

    // Charts rendered via recharts / canvas elements
    this.chartContainer = page.locator('.recharts-wrapper, canvas, [data-testid="chart"]').first();

    // Location analytics
    this.locationAnalyticsSection = page.locator('text=Locations').locator('..').first();
    this.locationRows = page.locator('table tbody tr, [data-testid="location-row"]');

    // States
    this.loadingSkeleton = page.locator('[data-testid="skeleton"], .animate-pulse').first();
    this.errorMessage = page.locator('[role="alert"], [data-testid="error"]').first();
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/');
    // Wait for at least one metric card to appear before proceeding
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async selectTimePeriod(period: 'Today' | 'Yesterday' | 'Last 7 Days' | 'Last 30 Days' | 'Custom') {
    const filterMap: Record<string, Locator> = {
      Today: this.filterToday,
      Yesterday: this.filterYesterday,
      'Last 7 Days': this.filterLast7Days,
      'Last 30 Days': this.filterLast30Days,
      Custom: this.filterCustom,
    };
    await filterMap[period].click();
    // Wait for re-fetch to settle
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select a custom date range using the date range picker.
   * @param startDate - ISO date string (YYYY-MM-DD)
   * @param endDate   - ISO date string (YYYY-MM-DD)
   */
  async selectCustomRange(startDate: string, endDate: string) {
    await this.filterCustom.click();
    await this.dateRangeStartInput.fill(startDate);
    await this.dateRangeEndInput.fill(endDate);
    await this.applyCustomRangeBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Assertions ────────────────────────────────────────────────────────────

  async expectMetricCardsVisible() {
    await expect(this.moneyInCard).toBeVisible();
    await expect(this.moneyOutCard).toBeVisible();
    await expect(this.grossCard).toBeVisible();
  }

  async expectChartsVisible() {
    await expect(this.chartContainer).toBeVisible();
  }

  async expectLocationAnalyticsVisible() {
    await expect(this.locationAnalyticsSection).toBeVisible();
  }

  async expectErrorVisible() {
    await expect(this.errorMessage).toBeVisible();
  }

  async expectTimePeriodActive(period: string) {
    const filterMap: Record<string, Locator> = {
      Today: this.filterToday,
      Yesterday: this.filterYesterday,
      'Last 7 Days': this.filterLast7Days,
      'Last 30 Days': this.filterLast30Days,
      Custom: this.filterCustom,
    };
    // Active state is usually indicated by an aria-pressed="true" or a CSS class
    await expect(filterMap[period]).toHaveAttribute('aria-pressed', 'true').catch(async () => {
      await expect(filterMap[period]).toHaveClass(/active|selected|bg-/);
    });
  }
}
