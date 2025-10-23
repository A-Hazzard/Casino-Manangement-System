// Removed unused imports: TimePeriod, TopPerformingData

export type UseDashboardRefreshProps = {
  selectedLicencee: string;
  activeMetricsFilter: string | null;
  activePieChartFilter: string | null;
  customDateRange: { startDate: Date; endDate: Date } | null;
  activeTab: string;
  displayCurrency?: string; //  ADDED: Currency parameter for refresh
};

export type UseDashboardRefreshReturn = {
  refreshing: boolean;
  handleRefresh: () => Promise<void>;
  canRefresh: boolean;
};
