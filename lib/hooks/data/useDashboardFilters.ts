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
import { setTimeToGamingDayStart } from '@/shared/utils/dateFormat';
import type { TimePeriod, dateRange } from '@/lib/types';
import type {
  UseDashboardFiltersProps,
  UseDashboardFiltersReturn,
} from '@/lib/types/dashboard';
import { useEffect } from 'react';

export function useDashboardFilters({
  selectedLicencee,
}: UseDashboardFiltersProps): UseDashboardFiltersReturn {
  // ============================================================================
  // State & Hooks
  // ============================================================================
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

  // ============================================================================
  // Effects
  // ============================================================================

  // Initialize selected licencee on component mount
  useEffect(() => {
    if (!selectedLicencee) {
      // This would be handled by the parent component
    }
  }, [selectedLicencee]);

  // ============================================================================
  // Computed
  // ============================================================================

  // Validate if current filter configuration is valid
  const isFilterValid = (() => {
    if (!activeMetricsFilter) return false;

    if (activeMetricsFilter === 'Custom') {
      return Boolean(customDateRange?.startDate && customDateRange?.endDate);
    }

    return true;
  })();

  // ============================================================================
  // Handlers
  // ============================================================================

  // Reset all filters to default state
  const resetFilters = () => {
    const { gameDayOffset } = useDashBoardStore.getState();
    const today = new Date();
    const startDate = setTimeToGamingDayStart(today, gameDayOffset);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const endDate = setTimeToGamingDayStart(tomorrow, gameDayOffset);

    setActiveMetricsFilter('Today');
    setActivePieChartFilter('Today');
    setCustomDateRange({
      startDate,
      endDate,
    });
    setShowDatePicker(false);
  };

  // Memoize setters to prevent unnecessary re-renders
  const memoizedSetActiveMetricsFilter = (filter: TimePeriod | '') => {
      setActiveMetricsFilter(filter);
    };

  const memoizedSetActivePieChartFilter = (filter: TimePeriod | '') => {
      setActivePieChartFilter(filter);
    };

  const memoizedSetCustomDateRange = (range: dateRange) => {
      setCustomDateRange(range);
    };

  const memoizedSetShowDatePicker = (show: boolean) => {
      setShowDatePicker(show);
    };

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
