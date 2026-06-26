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
import {
  useLocationData,
  useLocationMachineStats,
  useLocationMembershipStats,
} from '@/lib/hooks/data';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { DashboardTotals } from '@/lib/types';
import type { LocationFilter, LocationSortOption } from '@/lib/types/location';
import { isAbortError } from '@/lib/utils/errors';
import { calculateLocationFinancialTotals } from '@/lib/utils/financial';
import { useDebounce } from '@/lib/utils/hooks';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';

type SmibSyncStatus = {
  lastSync: Date | null;
  isStale: boolean;
  staleAfterHours: number;
};

export function useLocationsPageData() {
  const { selectedLicencee, activeMetricsFilter, customDateRange } =
    useDashBoardStore();
  const { displayCurrency } = useCurrencyFormat();
  const searchParams = useSearchParams();
  const router = useRouter();
  const isInitialPageLoad = useRef(true);

  // ============================================================================
  // State & Hooks
  // ============================================================================
  const [selectedFilters, setSelectedFilters] = useState<LocationFilter[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(() => {
    const pageParam = searchParams.get('page');
    const parsed = pageParam ? parseInt(pageParam, 10) : 0;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  });
  const [metricsTotals, setMetricsTotals] = useState<DashboardTotals | null>(
    null
  );
  const [metricsTotalsLoading, setMetricsTotalsLoading] = useState(true);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Sorting State
  const [sortOption, setSortOption] = useState<LocationSortOption>('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // SMIB Sync State
  const [smibSyncStatus, setSmibSyncStatus] = useState<SmibSyncStatus | null>(
    null
  );
  const [hasCheckedSmibSync, setHasCheckedSmibSync] = useState(false);

  const makeMetricsRequest = useAbortableRequest();

  // ============================================================================
  // Pagination Constants
  // ============================================================================
  const ITEMS_PER_PAGE = 20;
  const ITEMS_PER_BATCH = 100;
  const PAGES_PER_BATCH = ITEMS_PER_BATCH / ITEMS_PER_PAGE; // 5

  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());

  // Helper to calculate which batch a page belongs to
  const calculateBatchNumber = useCallback((page: number) => {
    return Math.floor(page / PAGES_PER_BATCH) + 1;
  }, []);

  // ============================================================================
  // Base Hook Integration
  // ============================================================================
  const { locationData, loading, searchLoading, error, fetchData, totalCount } =
    useLocationData({
      selectedLicencee,
      activeMetricsFilter,
      customDateRange,
      searchTerm,
      selectedFilters,
      selectedStatus,
      sortBy: sortOption,
      sortOrder: sortOrder,
    });

  const machineTypeFilterString = useMemo(
    () => selectedFilters.join(','),
    [selectedFilters]
  );
  const { machineStats, machineStatsLoading, refreshMachineStats } =
    useLocationMachineStats(
      undefined,
      machineTypeFilterString,
      debouncedSearchTerm,
      undefined,
      selectedStatus
    );
  const { membershipStats, membershipStatsLoading, refreshMembershipStats } =
    useLocationMembershipStats(undefined, machineTypeFilterString);

  // ============================================================================
  // Computed
  // ============================================================================
  const financialTotals = useMemo(
    () => calculateLocationFinancialTotals(locationData),
    [locationData]
  );

  // Sliced data for the current page
  const paginatedLocationData = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    return locationData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [locationData, currentPage, ITEMS_PER_PAGE]);

  const isDataMissingForPage = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const currentBatch = calculateBatchNumber(currentPage);
    if (!loadedBatches.has(currentBatch)) {
      return true;
    }
    if (locationData.length <= startIndex && totalCount > locationData.length) {
      return loading;
    }
    return false;
  }, [
    locationData.length,
    currentPage,
    ITEMS_PER_PAGE,
    totalCount,
    loadedBatches,
    calculateBatchNumber,
    loading,
  ]);

  const isDataComplete = useMemo(
    () => locationData.length >= totalCount && totalCount > 0,
    [locationData.length, totalCount]
  );

  const hasMoreLocations = totalCount > 0 && locationData.length < totalCount;

  const effectiveTotalPages = useMemo(() => {
    if (hasMoreLocations) {
      const loadedBatchCount =
        Math.ceil(locationData.length / ITEMS_PER_BATCH) || 1;
      return loadedBatchCount * PAGES_PER_BATCH;
    }
    return Math.max(1, Math.ceil(locationData.length / ITEMS_PER_PAGE));
  }, [
    locationData.length,
    hasMoreLocations,
    ITEMS_PER_BATCH,
    ITEMS_PER_PAGE,
    PAGES_PER_BATCH,
  ]);

  // ============================================================================
  // URL Pagination Sync
  // ============================================================================
  const pushPageToUrl = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page > 0) {
        params.set('page', String(page + 1));
      } else {
        params.delete('page');
      }
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // Sync URL page param on mount (only on initial load)
  useEffect(() => {
    if (isInitialPageLoad.current) {
      isInitialPageLoad.current = false;
      // URL state already used to initialize currentPage — no push needed
    }
  }, []);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(0);
    pushPageToUrl(0);
    setLoadedBatches(new Set());

    // Check and sync SMIB status on refresh
    try {
      const statusRes = await axios.get<SmibSyncStatus>('/api/admin/smib-sync');
      const status = statusRes.data;
      if (status.isStale) {
        console.log(`[useLocationsPageData] SMIB stale on refresh, syncing...`);
        await axios.post('/api/admin/smib-sync', {}, { timeout: 300000 });
        console.log('[useLocationsPageData] SMIB sync complete on refresh');
      }
    } catch (err) {
      console.error(
        '[useLocationsPageData] SMIB sync check failed on refresh:',
        err
      );
    }

    // Refresh stats while data-fetch effect handles location data re-fetch
    await Promise.all([refreshMachineStats(), refreshMembershipStats()]);
    setRefreshing(false);
  };

  const handleFilterChange = (filter: LocationFilter, checked: boolean) => {
    setSelectedFilters(prev =>
      checked
        ? [...prev, filter]
        : prev.filter(activeFilter => activeFilter !== filter)
    );
    setCurrentPage(0);
    pushPageToUrl(0);
  };

  const handleMultiFilterChange = (filters: LocationFilter[]) => {
    setSelectedFilters(filters);
    setCurrentPage(0);
    pushPageToUrl(0);
  };

  const handleSort = (option: LocationSortOption) => {
    if (sortOption === option) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortOption(option);
      setSortOrder('desc');
    }
    setCurrentPage(0);
    pushPageToUrl(0);
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
    pushPageToUrl(0);
    setLoadedBatches(new Set());
  }, [
    selectedFilters,
    selectedStatus,
    searchTerm,
    debouncedSearchTerm,
    activeMetricsFilter,
    selectedLicencee,
    customDateRange,
    sortOption,
    sortOrder,
    displayCurrency,
  ]);

  // SMIB Auto-Sync on mount (run once when filters are initialized)
  useEffect(() => {
    if (!filtersInitialized || hasCheckedSmibSync) return;

    const checkAndSyncSmib = async () => {
      try {
        setHasCheckedSmibSync(true);
        const statusRes = await axios.get<SmibSyncStatus>(
          '/api/admin/smib-sync'
        );
        const status = statusRes.data;

        if (status.isStale) {
          console.log(
            `[useLocationsPageData] SMIB status stale (last sync: ${status.lastSync}), triggering sync...`
          );
          await axios.post('/api/admin/smib-sync', {}, { timeout: 300000 });
          console.log('[useLocationsPageData] SMIB sync complete');
        } else {
          console.log(
            `[useLocationsPageData] SMIB status fresh (last sync: ${status.lastSync}), skipping sync`
          );
        }
        setSmibSyncStatus(status);
      } catch (err) {
        console.error(
          '[useLocationsPageData] Failed to check SMIB sync status:',
          err
        );
        setHasCheckedSmibSync(false); // Allow retry on next mount
      }
    };

    void checkAndSyncSmib();
  }, [filtersInitialized, hasCheckedSmibSync]);

  // Consolidated data fetch effect
  useEffect(() => {
    if (filtersInitialized) {
      const startIndex = currentPage * ITEMS_PER_PAGE;
      let targetBatch = calculateBatchNumber(currentPage);

      // If we are trying to view a page that is beyond our currently loaded data,
      // but the server has more data, we should fetch the next batch.
      if (
        locationData.length <= startIndex &&
        totalCount > locationData.length
      ) {
        targetBatch = Math.ceil(locationData.length / ITEMS_PER_BATCH) + 1;
      }

      if (!loadedBatches.has(targetBatch)) {
        console.warn(
          `[useLocationsPageData] Fetching batch ${targetBatch} for page ${currentPage + 1}`
        );
        setLoadedBatches(prev => new Set([...prev, targetBatch]));
        void fetchData(targetBatch, ITEMS_PER_BATCH);
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
    ITEMS_PER_PAGE,
    loadedBatches,
    calculateBatchNumber,
    debouncedSearchTerm, // Added to ensure fetch re-triggers when term settles
    locationData.length,
    totalCount,
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
          data => {
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
  }, [
    activeMetricsFilter,
    selectedLicencee,
    customDateRange,
    displayCurrency,
    filtersInitialized,
    machineTypeFilterString,
    makeMetricsRequest,
    debouncedSearchTerm,
    selectedStatus,
  ]);

  // ============================================================================
  // Page Change Handler (state + URL sync)
  // ============================================================================
  const handlePageChange = useCallback(
    (page: number) => {
      setCurrentPage(page);
      pushPageToUrl(page);
    },
    [pushPageToUrl]
  );

  return {
    loading:
      loading ||
      searchLoading ||
      isDataMissingForPage ||
      searchTerm !== debouncedSearchTerm,
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
    smibSyncStatus,
    // Handlers
    handleRefresh,
    handleFilterChange,
    handleMultiFilterChange,
    handleSort,
    handlePageChange,
    setSearchTerm,
    setSelectedStatus,
    fetchData,
    totalCount,
    hasMoreLocations,
    locationDataLength: paginatedLocationData.length,
    isDataComplete,
  };
}
