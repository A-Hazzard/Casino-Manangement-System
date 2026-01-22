/**
 * Dashboard Filters Custom Hook
 *
 * Provides a custom hook for managing dashboard filter state and logic.
 * It handles filter initialization, validation, state management, and
 * provides memoized setters to prevent unnecessary re-renders.
 *
 * Features:
 * - Manages active metrics filter state
 * - Manages pie chart filter state
 * - Handles custom date range selection
 * - Validates filter configurations
 * - Provides reset functionality
 * - Memoized setters for performance
 */

import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { TimePeriod, dateRange } from '@/lib/types';
import type {
  UseDashboardFiltersProps,
  UseDashboardFiltersReturn,
} from '@/lib/types/dashboard';
import { useCallback, useEffect, useMemo } from 'react';

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

  // Memoize setters to prevent unnecessary re-renders
  const memoizedSetActiveMetricsFilter = useCallback(
    (filter: TimePeriod | '') => {
      setActiveMetricsFilter(filter);
    },
    [setActiveMetricsFilter]
  );

  const memoizedSetActivePieChartFilter = useCallback(
    (filter: TimePeriod | '') => {
      setActivePieChartFilter(filter);
    },
    [setActivePieChartFilter]
  );

  const memoizedSetCustomDateRange = useCallback(
    (range: dateRange) => {
      setCustomDateRange(range);
    },
    [setCustomDateRange]
  );

  const memoizedSetShowDatePicker = useCallback(
    (show: boolean) => {
      setShowDatePicker(show);
    },
    [setShowDatePicker]
  );

  return {
    activeMetricsFilter,
    activePieChartFilter,
    customDateRange,
    showDatePicker: isShowDatePicker,
    setActiveMetricsFilter: memoizedSetActiveMetricsFilter,
    setActivePieChartFilter: memoizedSetActivePieChartFilter,
    setCustomDateRange: memoizedSetCustomDateRange,
    setShowDatePicker: memoizedSetShowDatePicker,
    isFilterValid,
    resetFilters,
  };
}

