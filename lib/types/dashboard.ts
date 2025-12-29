/**
 * Dashboard Types
 * Types for dashboard filters, time periods, and date ranges.
 *
 * Used by useDashboardFilters hook to manage metrics filters,
 * pie chart filters, and custom date range selections.
 */
import type { TimePeriod, dateRange } from '@/lib/types/index';

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
