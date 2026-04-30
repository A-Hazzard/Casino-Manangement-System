import type { ActiveTab, dateRange } from '@/lib/types/index';

export type UseDashboardRefreshProps = {
  selectedLicencee: string;
  activeMetricsFilter: string | null;
  activePieChartFilter: string | null;
  customDateRange?: dateRange;
  activeTab: ActiveTab | string;
  displayCurrency?: string;
};

export type UseDashboardRefreshReturn = {
  refreshing: boolean;
  handleRefresh: () => Promise<void>;
  canRefresh: boolean;
};

