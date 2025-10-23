/**
 * Custom hook for managing dashboard refresh functionality
 * Handles refresh logic, loading states, and error handling
 */

import { useCallback } from "react";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { handleDashboardRefresh } from "@/lib/helpers/dashboard";
import { TimePeriod } from "@/shared/types/common";
import { TopPerformingData } from "@/lib/types";
import type {
  UseDashboardRefreshProps,
  UseDashboardRefreshReturn,
} from "@/lib/types/dashboardRefresh";

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
      activeTab as "Cabinets" | "locations",
      activePieChartFilter as TimePeriod,
      setRefreshing,
      setLoadingChartData,
      setLoadingTopPerforming,
      setTotals,
      setChartData,
      setActiveFilters,
      setShowDatePicker,
      (data: TopPerformingData[]) =>
        setTopPerformingData(data as unknown as TopPerformingData),
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
