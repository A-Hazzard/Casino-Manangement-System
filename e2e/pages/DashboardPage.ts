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

    // Time-period buttons — desktop renders <Button> elements; filtered for visibility
    this.filterToday = page.getByRole('button', { name: 'Today', exact: true }).filter({ visible: true }).first();
    this.filterYesterday = page.getByRole('button', { name: 'Yesterday', exact: true }).filter({ visible: true }).first();
    this.filterLast7Days = page.getByRole('button', { name: 'Last 7 Days', exact: true }).filter({ visible: true }).first();
    this.filterLast30Days = page.getByRole('button', { name: 'Last 30 Days', exact: true }).filter({ visible: true }).first();

    // The "Custom" filter trigger button on desktop
    this.filterCustom = page.getByRole('button', { name: 'Custom', exact: true }).filter({ visible: true }).first();

    // Date range picker inputs (visible in the ModernCalendar popover after click)
    // Refined to be more robust for the specific calendar components used
    this.dateRangeStartInput = page
      .locator('.react-datepicker__input-container input')
      .first();
    this.dateRangeEndInput = page
      .locator('.react-datepicker__input-container input')
      .last();
    // The "Get Meters" button inside the calendar popover
    this.applyCustomRangeBtn = page
      .getByRole('button', { name: 'Get Meters', exact: true })
      .first();

    // Metric card containers — use flexible locators based on labels, filtered for visibility
    this.moneyInCard = page.locator('.rounded-lg, .rounded-xl').filter({ has: page.getByText('Money In', { exact: true }) }).filter({ visible: true }).first();
    this.moneyOutCard = page.locator('.rounded-lg, .rounded-xl').filter({ has: page.getByText('Money Out', { exact: true }) }).filter({ visible: true }).first();
    this.jackpotCard = page.locator('.rounded-lg, .rounded-xl').filter({ has: page.getByText('Jackpot', { exact: true }) }).filter({ visible: true }).first();
    this.grossCard = page.locator('.rounded-lg, .rounded-xl').filter({ has: page.getByText('Gross', { exact: true }) }).filter({ visible: true }).first();

    // Chart — recharts ResponsiveContainer renders a div.recharts-responsive-container
    this.chartContainer = page.locator('.recharts-responsive-container, .recharts-wrapper').filter({ visible: true }).first();

    // Location section — DashboardDesktopLayout has <h3>Location Map</h3>
    this.locationAnalyticsSection = page.locator('.rounded-lg, .bg-container').filter({ hasText: /Location Map|Top Performing/i }).filter({ visible: true }).first();

    // Error state — Alert component renders with role="alert"
    this.errorMessage = page
      .locator('[role="alert"]')
      .filter({ visible: true })
      .first();
  }

  // ─── Navigation ────────────────────────────────────────────────────────────

  async goto() {
    await this.page.goto('/');
    // Wait for the page to be somewhat settled
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Actions ───────────────────────────────────────────────────────────────

  async selectTimePeriod(
    period: 'Today' | 'Yesterday' | 'Last 7 Days' | 'Last 30 Days' | 'Custom'
  ) {
    const filterMap: Record<string, Locator> = {
      Today: this.filterToday,
      Yesterday: this.filterYesterday,
      'Last 7 Days': this.filterLast7Days,
      'Last 30 Days': this.filterLast30Days,
      Custom: this.filterCustom,
    };
    const target = filterMap[period];
    // Ensure the button is visible and ready before clicking
    await target.waitFor({ state: 'visible', timeout: 8000 });
    await target.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Select a custom date range using the date range picker.
   * @param startDate - ISO date string (YYYY-MM-DD)
   * @param endDate   - ISO date string (YYYY-MM-DD)
   */
  async selectCustomRange() {
    // Open the Custom calendar popover
    await this.filterCustom.waitFor({ state: 'visible' });
    await this.filterCustom.click();

    // Choose the 15th of the month in the calendar grid to trigger a change
    const day15 = this.page.getByRole('gridcell', { name: '15', exact: true }).first();
    await day15.waitFor({ state: 'visible' });
    await day15.click();

    // Click Get Meters to confirm the selection
    await this.applyCustomRangeBtn.waitFor({ state: 'visible' });
    await this.applyCustomRangeBtn.click();

    // Wait for the change to be processed
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Assertions ────────────────────────────────────────────────────────────

  async expectMetricCardsVisible() {
    // First wait for any skeleton loaders to finish
    const skeleton = this.page.locator('.animate-pulse');
    if ((await skeleton.count()) > 0) {
      await expect(skeleton).toHaveCount(0, { timeout: 15_000 });
    }

    // Ensure the main cards are visible with sufficient timeout
    await expect(this.moneyInCard).toBeVisible({ timeout: 10_000 });
    await expect(this.moneyOutCard).toBeVisible();
    await expect(this.jackpotCard).toBeVisible();
    await expect(this.grossCard).toBeVisible();
  }

  async expectChartsVisible() {
    // Recharts can take a moment to render after data loads
    await this.chartContainer.waitFor({ state: 'visible', timeout: 12_000 });
    await expect(this.chartContainer).toBeVisible();
  }

  async expectLocationAnalyticsVisible() {
    // Map/Analytics may take longer to load
    await this.locationAnalyticsSection.waitFor({
      state: 'visible',
      timeout: 10_000,
    });
    await expect(this.locationAnalyticsSection).toBeVisible();
  }

  async expectErrorVisible() {
    await expect(this.errorMessage).toBeVisible({ timeout: 10_000 });
  }

  async expectTimePeriodActive(period: string) {
    const filterMap: Record<string, Locator> = {
      Today: this.filterToday,
      Yesterday: this.filterYesterday,
      'Last 7 Days': this.filterLast7Days,
      'Last 30 Days': this.filterLast30Days,
      Custom: this.filterCustom,
    };
    // Active state: verified by checking the button's class list for 'bg-buttonActive'
    await expect(filterMap[period]).toHaveClass(/bg-buttonActive/);
  }
}
