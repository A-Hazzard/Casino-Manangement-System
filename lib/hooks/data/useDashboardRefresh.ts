/**
 * Dashboard Refresh Custom Hook
 *
 * Provides a custom hook for managing dashboard refresh functionality.
 * It handles refresh logic, loading states, error handling, and coordinates
 * data fetching for charts, totals, and top-performing data.
 *
 * Features:
 * - Manages refresh state and loading indicators
 * - Coordinates data fetching for multiple data sources
 * - Handles currency conversion during refresh
 * - Validates refresh conditions
 * - Provides refresh handler with proper dependencies
 */

import { handleDashboardRefresh } from '@/lib/helpers/dashboard';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { TopPerformingData } from '@/lib/types';
import type {
    UseDashboardRefreshProps,
    UseDashboardRefreshReturn,
} from '@/lib/types/dashboard';
import { TimePeriod } from '@/shared/types/common';
import { useCallback } from 'react';

export function useDashboardRefresh({
  selectedLicencee,
  activeMetricsFilter,
  activePieChartFilter,
  customDateRange,
  activeTab,
  displayCurrency,
}: UseDashboardRefreshProps): UseDashboardRefreshReturn {
  const {
    refreshing,
    setRefreshing,
    setLoadingChartData,
    setLoadingTopPerforming,
    setTotals,
    setChartData,
    setActiveFilters,
    setShowDatePicker,
    setTopPerformingData,
  } = useDashBoardStore();

  // Check if refresh is possible
  const canRefresh = Boolean(activeMetricsFilter && activePieChartFilter);

  // Handle refresh functionality
  const handleRefresh = useCallback(async () => {
    // Don't refresh if no filter is selected
    if (!canRefresh) return;

    await handleDashboardRefresh(
      activeMetricsFilter as TimePeriod,
      customDateRange || { startDate: new Date(), endDate: new Date() },
      selectedLicencee,
      activeTab as 'Cabinets' | 'locations',
      activePieChartFilter as TimePeriod,
      setRefreshing,
      setLoadingChartData,
      setLoadingTopPerforming,
      setTotals,
      setChartData,
      setActiveFilters,
      setShowDatePicker,
      (data: TopPerformingData) =>
        setTopPerformingData(data),
      displayCurrency
    );
  }, [
    canRefresh,
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    activeTab,
    activePieChartFilter,
    displayCurrency, // Include currency in dependencies
    setRefreshing,
    setLoadingChartData,
    setLoadingTopPerforming,
    setTotals,
    setChartData,
    setActiveFilters,
    setShowDatePicker,
    setTopPerformingData,
  ]);

  return {
    refreshing,
    handleRefresh,
    canRefresh,
  };
}

