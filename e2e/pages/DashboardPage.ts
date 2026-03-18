import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Dashboard / root page (/).
 *
 * Selectors are based on the actual component structure:
 *   - FinancialMetricsCards: label text "Money In" / "Money Out" / "Jackpot" / "Gross"
 *   - DateFilters: <button> elements with exact text labels on desktop
 *   - DashboardChart: recharts ResponsiveContainer → .recharts-responsive-container
 *   - DashboardDesktopLayout: <h3>Location Map</h3>
 *   - Error state: <div role="alert"> from the Alert component
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

  // ─── Metric card labels ───────────────────────────────────────────────────
  readonly moneyInCard: Locator;
  readonly moneyOutCard: Locator;
  readonly jackpotCard: Locator;
  readonly grossCard: Locator;

  // ─── Charts ───────────────────────────────────────────────────────────────
  readonly chartContainer: Locator;

  // ─── Location analytics ───────────────────────────────────────────────────
  readonly locationAnalyticsSection: Locator;

  // ─── Loading / error states ───────────────────────────────────────────────
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Time-period buttons — desktop renders <button> elements; exact match avoids
    // picking up mobile <select> options or unrelated buttons.
    this.filterToday = page.getByRole('button', { name: 'Today', exact: true }).first();
    this.filterYesterday = page.getByRole('button', { name: 'Yesterday', exact: true }).first();
    this.filterLast7Days = page.getByRole('button', { name: 'Last 7 Days', exact: true }).first();
    this.filterLast30Days = page.getByRole('button', { name: 'Last 30 Days', exact: true }).first();
    this.filterCustom = page.getByRole('button', { name: 'Custom', exact: true }).first();

    // Date range picker inputs (visible after "Custom" is selected)
    this.dateRangeStartInput = page.locator('input[placeholder*="start"], input[aria-label*="start date"]').first();
    this.dateRangeEndInput = page.locator('input[placeholder*="end"], input[aria-label*="end date"]').first();
    this.applyCustomRangeBtn = page.getByRole('button', { name: /apply|search|go/i }).first();

    // Metric card containers — FinancialMetricsCards renders:
    //   Desktop: <p>Money In</p> as a direct child of the card div (shadow-md)
    //   Mobile:  <h3>Money In</h3> inside nested divs
    // Using `.locator('..')` on the label <p> gives the card container on desktop Chrome,
    // which includes both the label AND the financial value (needed for toContainText(/\d/)).
    this.moneyInCard = page.getByText('Money In', { exact: true }).first().locator('..');
    this.moneyOutCard = page.getByText('Money Out', { exact: true }).first().locator('..');
    this.jackpotCard = page.getByText('Jackpot', { exact: true }).first().locator('..');
    this.grossCard = page.getByText('Gross', { exact: true }).first().locator('..');

    // Chart — recharts ResponsiveContainer renders a div.recharts-responsive-container
    this.chartContainer = page.locator('.recharts-responsive-container').first();

    // Location section — DashboardDesktopLayout has <h3>Location Map</h3>
    this.locationAnalyticsSection = page.getByRole('heading', { name: /location map/i }).first();

    // Error state — Alert component renders with role="alert"
    this.errorMessage = page.locator('[role="alert"]').first();
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/');
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
    // Active state: bg-buttonActive class applied when selected
    await expect(filterMap[period]).toHaveClass(/bg-buttonActive/);
  }
}
