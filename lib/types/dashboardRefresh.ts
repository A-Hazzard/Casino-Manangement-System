/**
 * Dashboard Refresh Types
 * Types for dashboard refresh functionality with currency support.
 *
 * Manages dashboard data refresh state including active filters,
 * date ranges, and currency display preferences.
 */

import { ActiveTab, dateRange } from './index';

export type UseDashboardRefreshProps = {
  selectedLicencee: string;
  activeMetricsFilter: string | null;
  activePieChartFilter: string | null;
  customDateRange?: dateRange;
  activeTab: ActiveTab | string;
  displayCurrency?: string; //  ADDED: Currency parameter for refresh
};

export type UseDashboardRefreshReturn = {
  refreshing: boolean;
  handleRefresh: () => Promise<void>;
  canRefresh: boolean;
};
