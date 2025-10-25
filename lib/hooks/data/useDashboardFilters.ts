/**
 * Custom hook for managing dashboard filter state and logic
 * Handles filter initialization, validation, and state management
 */

import { useEffect, useCallback, useMemo } from 'react';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { TimePeriod, dateRange } from '@/lib/types';
import type {
  UseDashboardFiltersProps,
  UseDashboardFiltersReturn,
} from '@/lib/types/dashboard';

export function useDashboardFilters({
  selectedLicencee,
}: UseDashboardFiltersProps): UseDashboardFiltersReturn {
  const {
    activeMetricsFilter,
    setActiveMetricsFilter,
    activePieChartFilter,
    setActivePieChartFilter,
    customDateRange,
    setCustomDateRange,
    showDatePicker,
    setShowDatePicker,
  } = useDashBoardStore();

  // Ensure showDatePicker is boolean
  const isShowDatePicker = Boolean(showDatePicker);

  // Initialize selected licensee on component mount
  useEffect(() => {
    if (!selectedLicencee) {
      // This would be handled by the parent component
    }
  }, [selectedLicencee]);

  // Validate if current filter configuration is valid
  const isFilterValid = useMemo(() => {
    if (!activeMetricsFilter) return false;

    if (activeMetricsFilter === 'Custom') {
      return Boolean(customDateRange?.startDate && customDateRange?.endDate);
    }

    return true;
  }, [activeMetricsFilter, customDateRange]);

  // Reset all filters to default state
  const resetFilters = useCallback(() => {
    setActiveMetricsFilter('');
    setActivePieChartFilter('');
    setCustomDateRange({
      startDate: new Date(new Date().setHours(0, 0, 0, 0)),
      endDate: new Date(new Date().setHours(23, 59, 59, 999)),
    });
    setShowDatePicker(false);
  }, [
    setActiveMetricsFilter,
    setActivePieChartFilter,
    setCustomDateRange,
    setShowDatePicker,
  ]);

  return {
    activeMetricsFilter,
    activePieChartFilter,
    customDateRange,
    showDatePicker: isShowDatePicker,
    setActiveMetricsFilter: (filter: TimePeriod | '') =>
      setActiveMetricsFilter(filter),
    setActivePieChartFilter: (filter: TimePeriod | '') =>
      setActivePieChartFilter(filter),
    setCustomDateRange: (range: dateRange) => setCustomDateRange(range),
    setShowDatePicker: (show: boolean) => setShowDatePicker(show),
    isFilterValid,
    resetFilters,
  };
}
