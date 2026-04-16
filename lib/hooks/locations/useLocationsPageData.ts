/**
 * useLocationsPageData Hook
 *
 * Coordinates all data, filtering, and UI state for the locations dashboard.
 *
 * Features:
 * - Location data fetching with batch accumulation
 * - Search with frontend first, backend fallback
 * - Financial metrics and machine status coordination
 * - Pagination state management
 * - Filter initialization handling
 */

'use client';

import { fetchDashboardTotals } from '@/lib/helpers/dashboard';
import { useLocationData, useLocationMachineStats, useLocationMembershipStats } from '@/lib/hooks/data';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { DashboardTotals } from '@/lib/types';
import type { LocationFilter, LocationSortOption } from '@/lib/types/location';
import { isAbortError } from '@/lib/utils/errors';
import { calculateLocationFinancialTotals } from '@/lib/utils/financial';
import { useDebounce } from '@/lib/utils/hooks';
import { useCallback, useEffect, useMemo, useState } from 'react';

export function useLocationsPageData() {
  const {
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
  } = useDashBoardStore();
  const { displayCurrency } = useCurrencyFormat();

  // ============================================================================
  // State Management
  // ============================================================================
  const [selectedFilters, setSelectedFilters] = useState<LocationFilter[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [metricsTotals, setMetricsTotals] = useState<DashboardTotals | null>(null);
  const [metricsTotalsLoading, setMetricsTotalsLoading] = useState(true);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Sorting State
  const [sortOption, setSortOption] = useState<LocationSortOption>('moneyIn');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const makeMetricsRequest = useAbortableRequest();

  // ============================================================================
  // Pagination Constants
  // ============================================================================
  const ITEMS_PER_PAGE = 20;
  const ITEMS_PER_BATCH = 40;
  const PAGES_PER_BATCH = ITEMS_PER_BATCH / ITEMS_PER_PAGE; // 2

  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());

  // Helper to calculate which batch a page belongs to
  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / PAGES_PER_BATCH) + 1;
    },
    []
  );

  // ============================================================================
  // Base Hook Integration
  // ============================================================================
  const { locationData, loading, searchLoading, error, fetchData, totalCount } = useLocationData({
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    searchTerm,
    selectedFilters,
    selectedStatus,
    sortBy: sortOption,
    sortOrder: sortOrder,
  });

  const machineTypeFilterString = useMemo(() => selectedFilters.join(','), [selectedFilters]);
  const { machineStats, machineStatsLoading, refreshMachineStats } = useLocationMachineStats(undefined, machineTypeFilterString, debouncedSearchTerm, undefined, selectedStatus);
  const { membershipStats, membershipStatsLoading, refreshMembershipStats } = useLocationMembershipStats(undefined, machineTypeFilterString);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const financialTotals = useMemo(() => calculateLocationFinancialTotals(
    locationData
  ), [locationData]);

  // Sliced data for the current page
  const paginatedLocationData = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return locationData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [locationData, currentPage, ITEMS_PER_PAGE]);

  const isDataMissingForPage = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return locationData.length <= startIndex && totalCount > locationData.length;
  }, [locationData.length, currentPage, ITEMS_PER_PAGE, totalCount]);

  const isDataComplete = useMemo(() =>
    locationData.length >= totalCount && totalCount > 0,
    [locationData.length, totalCount]);

  const effectiveTotalPages = useMemo(() => {
    const displayedCount = locationData.length;
    const displayedPages = Math.ceil(displayedCount / ITEMS_PER_PAGE) || 1;

    // If server has more data not yet fetched, allow +1 page to trigger next batch
    if (locationData.length < totalCount && totalCount > 0) {
      const serverTotalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;
      return Math.min(displayedPages + 1, serverTotalPages);
    }

    return displayedPages;
  }, [locationData.length, totalCount, ITEMS_PER_PAGE]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleRefresh = async () => {
    setRefreshing(true);
    setLoadedBatches(new Set());
    const firstBatch = calculateBatchNumber(0);
    setLoadedBatches(new Set([firstBatch]));
    await Promise.all([refreshMachineStats(), refreshMembershipStats(), fetchData(firstBatch, ITEMS_PER_BATCH)]);
    setRefreshing(false);
  };

  const handleFilterChange = (filter: LocationFilter, checked: boolean) => {
    setSelectedFilters(prev => checked ? [...prev, filter] : prev.filter(f => f !== filter));
    setCurrentPage(0);
  };

  const handleMultiFilterChange = (filters: LocationFilter[]) => {
    setSelectedFilters(filters);
    setCurrentPage(0);
  };

  const handleSort = (option: LocationSortOption) => {
    if (sortOption === option) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      setSortOrder('desc');
    }
    setCurrentPage(0);
    setLoadedBatches(new Set());
  };

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    if (activeMetricsFilter) {
      setFiltersInitialized(true);
    }
  }, [activeMetricsFilter, setFiltersInitialized]);

  // Reset accumulation when filters change
  useEffect(() => {
    setCurrentPage(0);
    setLoadedBatches(new Set());
  }, [selectedFilters, selectedStatus, searchTerm, debouncedSearchTerm, activeMetricsFilter, selectedLicencee, customDateRange, sortOption, sortOrder, displayCurrency]);

  // Consolidated data fetch effect
  useEffect(() => {
    if (filtersInitialized) {
      const currentBatch = calculateBatchNumber(currentPage);
      if (!loadedBatches.has(currentBatch)) {
        console.warn(`[useLocationsPageData] Fetching batch ${currentBatch} for page ${currentPage + 1}`);
        setLoadedBatches(prev => new Set([...prev, currentBatch]));
        void fetchData(currentBatch, ITEMS_PER_BATCH);
      }
    }
  }, [
    currentPage,
    sortOption,
    sortOrder,
    selectedFilters,
    activeMetricsFilter,
    selectedLicencee,
    customDateRange,
    filtersInitialized,
    fetchData,
    selectedStatus,
    ITEMS_PER_BATCH,
    loadedBatches,
    calculateBatchNumber,
    debouncedSearchTerm, // Added to ensure fetch re-triggers when term settles
  ]);

  // Metrics totals fetch
  useEffect(() => {
    if (!activeMetricsFilter || !filtersInitialized) return;

    makeMetricsRequest(async signal => {
      setMetricsTotalsLoading(true);
      try {
        await fetchDashboardTotals(
          activeMetricsFilter,
          customDateRange || { startDate: new Date(), endDate: new Date() },
          selectedLicencee,
          (data) => {
            setMetricsTotals(data);
          },
          displayCurrency,
          signal,
          machineTypeFilterString,
          undefined,
          debouncedSearchTerm,
          selectedStatus
        );
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        // fetchDashboardTotals should handle abort errors internally, but catch any that leak through
        if (isAbortError(error)) {
          return;
        }
        // Re-throw actual errors - fetchDashboardTotals will handle them and show appropriate toasts
        throw error;
      } finally {
        setMetricsTotalsLoading(false);
      }
    });
  }, [activeMetricsFilter, selectedLicencee, customDateRange, displayCurrency, filtersInitialized, machineTypeFilterString, makeMetricsRequest, debouncedSearchTerm, selectedStatus]);

  return {
    loading: loading || searchLoading || isDataMissingForPage || (searchTerm !== debouncedSearchTerm),
    refreshing,
    error,
    locationData: paginatedLocationData,
    financialTotals,
    metricsTotals,
    metricsTotalsLoading,
    machineStats,
    machineStatsLoading,
    membershipStats,
    membershipStatsLoading,
    selectedFilters,
    selectedStatus,
    searchTerm,
    currentPage,
    totalPages: effectiveTotalPages,
    sortOption,
    sortOrder,
    // Handlers
    handleRefresh,
    handleFilterChange,
    handleMultiFilterChange,
    handleSort,
    setSearchTerm,
    setCurrentPage,
    setSelectedStatus,
    fetchData,
    totalCount,
    locationDataLength: paginatedLocationData.length,
    isDataComplete,
  };
}




