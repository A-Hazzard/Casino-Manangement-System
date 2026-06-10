import { type Page, type Locator, expect } from '@playwright/test';

/**
 * Page Object for the Collection Report DETAIL page
 * (/collection-report/report/[reportId]).
 *
 * The page renders:
 *   - Header: location name (h1), Report ID, Collector, Machine Total Gross
 *   - Desktop sidebar tabs (buttons): Machine Metrics · Location Metrics · SAS Metrics Compare
 *   - Mobile: a <select> dropdown for the same three sections
 *   - Machine Metrics tab: a searchable, sortable, paginated machine table
 *   - Modify Report button (developer / admin / owner only) → shadcn Dialog
 *   - Back arrow link → /collection-report
 */
export class CollectionReportDetailPage {
  readonly page: Page;

  // ─── Header ────────────────────────────────────────────────────────────────
  readonly pageHeading: Locator;
  readonly locationHeading: Locator;
  readonly backLink: Locator;
  readonly editButton: Locator;
  readonly shareButton: Locator;

  // ─── Tabs (desktop sidebar buttons) ──────────────────────────────────────────
  readonly machineMetricsTab: Locator;
  readonly locationMetricsTab: Locator;
  readonly sasCompareTab: Locator;

  // ─── Machine Metrics content ─────────────────────────────────────────────────
  readonly machineSearchInput: Locator;
  readonly machineTable: Locator;

  constructor(page: Page) {
    this.page = page;

    this.pageHeading = page
      .getByRole('heading', { name: /Collection Report Details/i })
      .first();
    this.locationHeading = page.getByRole('heading', { level: 1 });
    // Two back links exist (desktop header + mobile bar) — both href="/collection-report".
    // Pick the one currently visible for the viewport.
    this.backLink = page
      .locator('a[href="/collection-report"]')
      .filter({ visible: true })
      .first();
    this.editButton = page
      .getByRole('button', { name: /modify report|loading/i })
      .filter({ visible: true })
      .first();
    this.shareButton = page
      .getByRole('button', { name: /share/i })
      .filter({ visible: true })
      .first();

    // Sidebar tab buttons (exact label match)
    this.machineMetricsTab = page
      .getByRole('button', { name: 'Machine Metrics', exact: true })
      .first();
    this.locationMetricsTab = page
      .getByRole('button', { name: 'Location Metrics', exact: true })
      .first();
    this.sasCompareTab = page
      .getByRole('button', { name: 'SAS Metrics Compare', exact: true })
      .first();

    this.machineSearchInput = page
      .locator('input[placeholder="Search machines..."]:visible')
      .first();
    this.machineTable = page.locator('table').first();
  }

  // ─── Navigation ─────────────────────────────────────────────────────────────

  async goto(reportId: string, section?: 'machine' | 'location' | 'sas') {
    const url = section
      ? `/collection-report/report/${reportId}?section=${section}`
      : `/collection-report/report/${reportId}`;
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
  }

  // ─── Assertions ──────────────────────────────────────────────────────────────

  async expectHeaderVisible(locationName: string, reportId: string) {
    await expect(
      this.page.getByRole('heading', { name: locationName, level: 1 }).first()
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      this.page.getByText(`Report ID: ${reportId}`).first()
    ).toBeVisible({ timeout: 8_000 });
  }

  async expectMachineInTable(machineName: string) {
    await expect(
      this.page.locator('td').filter({ hasText: machineName }).first()
    ).toBeVisible({ timeout: 8_000 });
  }

  async expectMachineTableHeaders() {
    for (const header of ['MACHINE', 'MACHINE GROSS', 'SAS GROSS']) {
      await expect(
        this.page.getByText(header, { exact: true }).first()
      ).toBeVisible({ timeout: 8_000 });
    }
  }

  async searchMachines(term: string) {
    await this.machineSearchInput.fill(term);
  }
}
