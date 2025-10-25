import type { TimePeriod, dateRange } from '@/lib/types';

export type UseDashboardFiltersProps = {
  selectedLicencee: string;
};

export type UseDashboardFiltersReturn = {
  activeMetricsFilter: TimePeriod | '';
  activePieChartFilter: TimePeriod | '';
  customDateRange: dateRange;
  showDatePicker: boolean;
  setActiveMetricsFilter: (filter: TimePeriod | '') => void;
  setActivePieChartFilter: (filter: TimePeriod | '') => void;
  setCustomDateRange: (range: dateRange) => void;
  setShowDatePicker: (show: boolean) => void;
  isFilterValid: boolean;
  resetFilters: () => void;
};
