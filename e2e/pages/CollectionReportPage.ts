import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Collection Report page (/collection-report).
 *
 * The page renders:
 *   - Tab navigation (Collection Reports, Monthly Report, Collectors Schedule, Manager Schedule)
 *   - Collection tab: table of reports with search, location filter, uncollected toggle
 *   - Monthly tab: month/year picker + summary and details tables
 *   - Collector/Manager tabs: schedule tables with optional edit/delete
 */
export class CollectionReportPage {
  readonly page: Page;

  // ─── Tab navigation ────────────────────────────────────────────────────────
  readonly collectionTab: Locator;
  readonly monthlyTab: Locator;
  readonly collectorTab: Locator;
  readonly managerTab: Locator;

  // ─── Collection tab filters ────────────────────────────────────────────────
  readonly searchInput: Locator;
  readonly locationFilterTrigger: Locator;

  // ─── Collection tab table ──────────────────────────────────────────────────
  readonly reportTable: Locator;
  readonly reportTableRows: Locator;

  // ─── Header action buttons ─────────────────────────────────────────────────
  readonly createButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Tabs — rendered as <button> elements inside the navigation bar
    this.collectionTab = page
      .getByRole('button', { name: /Collection Reports/i })
      .filter({ visible: true })
      .first();
    this.monthlyTab = page
      .getByRole('button', { name: /Monthly Report/i })
      .filter({ visible: true })
      .first();
    this.collectorTab = page
      .getByRole('button', { name: /Collectors? Schedule/i })
      .filter({ visible: true })
      .first();
    this.managerTab = page
      .getByRole('button', { name: /Manager Schedule/i })
      .filter({ visible: true })
      .first();

    // Filters — desktop search input
    this.searchInput = page
      .locator('input[placeholder*="Search" i]:visible')
      .first();
    // LocationMultiSelect uses a Popover + Button (no role="combobox")
    this.locationFilterTrigger = page
      .getByRole('button', { name: /select locations/i })
      .filter({ visible: true })
      .first();

    // Table
    this.reportTable = page.locator('table').first();
    this.reportTableRows = page.locator('table tbody tr');

    // Create button in the page header (desktop: "Create Collection Report")
    this.createButton = page
      .getByRole('button', { name: /create collection report/i })
      .filter({ visible: true })
      .first();
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  async goto(section?: string) {
    const url = section
      ? `/collection-report?section=${section}`
      : '/collection-report';
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Tab helpers ─────────────────────────────────────────────────────────────

  async clickTab(label: 'collection' | 'monthly' | 'collector' | 'manager') {
    const map: Record<string, Locator> = {
      collection: this.collectionTab,
      monthly: this.monthlyTab,
      collector: this.collectorTab,
      manager: this.managerTab,
    };
    await map[label].click();
    await this.page.waitForTimeout(300);
  }

  // ─── Assertions ──────────────────────────────────────────────────────────────

  async expectTabsVisible(tabs: string[]) {
    for (const tab of tabs) {
      await expect(
        this.page.getByRole('button', { name: new RegExp(tab, 'i') }).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  }

  async expectTabNotVisible(tabLabel: string) {
    await expect(
      this.page
        .getByRole('button', { name: new RegExp(tabLabel, 'i') })
        .first()
    ).not.toBeVisible({ timeout: 5_000 });
  }

  async expectReportsInTable(...names: string[]) {
    for (const name of names) {
      await expect(
        this.page.getByText(name, { exact: false }).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  }

  async expectTableRowCount(count: number) {
    await expect(this.reportTableRows).toHaveCount(count, { timeout: 8_000 });
  }

  async expectEmptyState() {
    await expect(
      this.page.getByText(/no data available|no collection reports/i).first()
    ).toBeVisible({ timeout: 8_000 });
  }

  /** Row locator by any cell text (e.g. location name or collector name). */
  rowContaining(text: string): Locator {
    return this.reportTableRows.filter({ hasText: text });
  }

  /** Modify button within a specific table row. */
  editButtonInRow(text: string): Locator {
    return this.rowContaining(text).getByRole('button', { name: /modify report/i });
  }

  /** Delete button within a specific table row. */
  deleteButtonInRow(text: string): Locator {
    return this.rowContaining(text).getByRole('button', { name: /delete report/i });
  }

  /** Details link within a specific table row. */
  detailsLinkInRow(text: string): Locator {
    return this.rowContaining(text).getByRole('link', { name: /view details/i });
  }
}
