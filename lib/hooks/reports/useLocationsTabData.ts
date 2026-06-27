/**
 * Custom hook for Locations Tab data fetching
 *
 * Handles all data fetching logic for the Locations tab including:
 * - Gaming locations
 * - Aggregated location data with pagination
 * - Top/bottom machines
 * - Location trend data
 * - Metrics totals
 *
 * Features:
 * - Batch loading for pagination
 * - Abortable requests
 * - Loading state management
 * - Error handling
 *
 * @module lib/hooks/reports/useLocationsTabData
 */

import { useEffect, useMemo } from 'react';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useLocationsFiltering } from './useLocationsFiltering';
import { useLocationsFetching } from './useLocationsFetching';

type UseLocationsTabDataProps = {
  activeTab: string;
  selectedSasLocations: string[];
  selectedRevenueLocations: string[];
  itemsPerPage: number;
  itemsPerBatch: number;
  pagesPerBatch: number;
  chartGranularity?: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly';
};

/**
 * Custom hook for Locations Tab data fetching
 */
export function useLocationsTabData({
  activeTab,
  selectedSasLocations,
  selectedRevenueLocations,
  itemsPerPage,
  itemsPerBatch,
  pagesPerBatch,
  chartGranularity,
}: UseLocationsTabDataProps) {
  // ============================================================================
  // Store & Context
  // ============================================================================
  const { activeMetricsFilter, customDateRange, selectedLicencee } = useDashBoardStore();
  const { displayCurrency } = useCurrencyFormat();

  // ============================================================================
  // Filtering Hook (manages filter state & conversion)
  // ============================================================================
  const filtering = useLocationsFiltering({
    activeMetricsFilter,
    customDateRange: customDateRange as { startDate: Date | null; endDate: Date | null } | null,
    selectedLicencee,
    displayCurrency,
    activeTab,
    itemsPerPage,
    itemsPerBatch,
    pagesPerBatch,
  });

  // ============================================================================
  // Fetching Hook (manages data fetching & state)
  // ============================================================================
  const fetching = useLocationsFetching({
    activeTab,
    selectedSasLocations,
    selectedRevenueLocations,
    itemsPerPage,
    itemsPerBatch,
    chartGranularity,
    timePeriod: filtering.timePeriod,
    hasCustomDateRange: filtering.hasCustomDateRange,
    customDateRange: customDateRange as { startDate: Date | null; endDate: Date | null } | null,
    effectiveLicencee: filtering.effectiveLicencee,
    displayCurrency,
    getTimePeriod: filtering.getTimePeriod,
    buildTimePeriodParams: filtering.buildTimePeriodParams,
    calculateBatchNumber: filtering.calculateBatchNumber,
  });

  // ============================================================================
  // Computed
  // ============================================================================
  const paginatedLocations = useMemo(() => {
    if (fetching.accumulatedLocations.length === 0) return [];
    const startIndex = fetching.currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return fetching.accumulatedLocations.slice(startIndex, endIndex);
  }, [fetching.accumulatedLocations, fetching.currentPage, itemsPerPage]);

  // ============================================================================
  // Effects
  // ============================================================================
  // Fetch the next batch of locations when the user pages past what is loaded
  useEffect(() => {
    if (fetching.paginationLoading || fetching.accumulatedLocations.length === 0) return;

    const currentBatch = filtering.calculateBatchNumber(fetching.currentPage);
    const isLastPageOfBatch = (fetching.currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;
    const hasBatch = (batch: number) => (batch - 1) * itemsPerBatch < fetching.totalCount;

    if (!fetching.loadedBatches.has(currentBatch) && hasBatch(currentBatch)) {
      fetching.setLoadedBatches((prev) => new Set([...prev, currentBatch]));
      void fetching.loadLocationBatch(currentBatch);
    } else if (
      isLastPageOfBatch &&
      !fetching.loadedBatches.has(nextBatch) &&
      hasBatch(nextBatch)
    ) {
      fetching.setLoadedBatches((prev) => new Set([...prev, nextBatch]));
      void fetching.loadLocationBatch(nextBatch);
    }
  }, [
    fetching.currentPage,
    fetching.paginationLoading,
    fetching.accumulatedLocations.length,
    fetching.loadedBatches,
    fetching.totalCount,
    itemsPerBatch,
    pagesPerBatch,
    filtering.calculateBatchNumber,
    fetching.loadLocationBatch,
  ]);

  // Track previous filter values to prevent infinite loops when callbacks change
  // Fetch location data and metrics totals when filters change
  useEffect(() => {
    void fetching.fetchLocationDataAsync();
    void fetching.fetchMetricsTotals();
    void fetching.fetchLocationAggregationAsync(); // Fetch location aggregation for map
  }, [
    activeMetricsFilter,
    filtering.dateRangeKey,
    selectedLicencee,
    displayCurrency,
    fetching.fetchLocationDataAsync,
    fetching.fetchMetricsTotals,
    fetching.fetchLocationAggregationAsync,
  ]);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    // State from fetching hook
    gamingLocations: fetching.gamingLocations,
    gamingLocationsLoading: fetching.gamingLocationsLoading,
    locationAggregates: fetching.locationAggregates,
    locationAggregatesLoading: fetching.locationAggregatesLoading,
    metricsLoading: fetching.metricsLoading,
    locationsLoading: fetching.locationsLoading,
    metricsOverview: fetching.metricsOverview,
    topLocations: fetching.topLocations,
    metricsTotals: fetching.metricsTotals,
    metricsTotalsLoading: fetching.metricsTotalsLoading,
    topMachinesData: fetching.topMachinesData,
    topMachinesLoading: fetching.topMachinesLoading,
    bottomMachinesData: fetching.bottomMachinesData,
    bottomMachinesLoading: fetching.bottomMachinesLoading,
    locationTrendData: fetching.locationTrendData,
    locationTrendLoading: fetching.locationTrendLoading,
    accumulatedLocations: fetching.accumulatedLocations,
    loadedBatches: fetching.loadedBatches,
    paginatedLocations,
    paginationLoading: fetching.paginationLoading,
    allLocationsForDropdown: fetching.allLocationsForDropdown,
    currentPage: fetching.currentPage,
    totalPages: fetching.totalPages,
    totalCount: fetching.totalCount,
    // Setters from fetching hook
    setCurrentPage: fetching.setCurrentPage,
    setAccumulatedLocations: fetching.setAccumulatedLocations,
    setLoadedBatches: fetching.setLoadedBatches,
    setPaginationLoading: fetching.setPaginationLoading,
    setLocationsLoading: fetching.setLocationsLoading,
    setMetricsLoading: fetching.setMetricsLoading,
    setGamingLocationsLoading: fetching.setGamingLocationsLoading,
    setMetricsOverview: fetching.setMetricsOverview,
    setTopLocations: fetching.setTopLocations,
    setTopMachinesData: fetching.setTopMachinesData,
    setTopMachinesLoading: fetching.setTopMachinesLoading,
    setBottomMachinesData: fetching.setBottomMachinesData,
    setBottomMachinesLoading: fetching.setBottomMachinesLoading,
    setLocationTrendData: fetching.setLocationTrendData,
    setLocationTrendLoading: fetching.setLocationTrendLoading,
    setAllLocationsForDropdown: fetching.setAllLocationsForDropdown,
    setTotalPages: fetching.setTotalPages,
    setTotalCount: fetching.setTotalCount,
    setMetricsTotals: fetching.setMetricsTotals,
    setMetricsTotalsLoading: fetching.setMetricsTotalsLoading,
    // Functions from fetching hook
    fetchGamingLocationsAsync: fetching.fetchGamingLocationsAsync,
    fetchBatch: fetching.fetchBatch,
    fetchMetricsTotals: fetching.fetchMetricsTotals,
    fetchLocationDataAsync: fetching.fetchLocationDataAsync,
    fetchTopMachines: fetching.fetchTopMachines,
    fetchBottomMachines: fetching.fetchBottomMachines,
    fetchLocationTrendData: fetching.fetchLocationTrendData,
    calculateBatchNumber: filtering.calculateBatchNumber,
    loadLocationBatch: fetching.loadLocationBatch,
  };
}