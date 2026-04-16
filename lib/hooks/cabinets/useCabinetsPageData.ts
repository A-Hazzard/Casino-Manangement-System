/**
 * useCabinetsPageData Hook
 *
 * Coordinates all data, filtering, and UI state for the cabinets dashboard.
 *
 * Features:
 * - Tab-based section management (Cabinets, Movement, SMIB, Firmware)
 * - True server-side pagination and sorting
 * - Chart data and financial metrics coordination
 * - Refresh logic synchronized across active sections
 * - Modal state and window resize handling
 */

'use client';

import { getMetrics } from '@/lib/helpers/metrics';
import {
  useCabinetData,
  useCabinetSorting,
  useLocationMachineStats,
} from '@/lib/hooks/data';
import type { CabinetSortOption } from '@/lib/hooks/data/useCabinetSorting';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { TimePeriod } from '@/lib/types';
import { getDefaultChartGranularity } from '@/lib/utils/chart';
import { useDebounce } from '@/lib/utils/hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ITEMS_PER_PAGE = 20;
const ITEMS_PER_BATCH = 40;
const PAGES_PER_BATCH = ITEMS_PER_BATCH / ITEMS_PER_PAGE; // 2

export function useCabinetsPageData() {
  const activeMetricsFilter = useDashBoardStore(state => state.activeMetricsFilter);
  const selectedLicencee = useDashBoardStore(state => state.selectedLicencee);
  const customDateRange = useDashBoardStore(state => state.customDateRange);
  const displayCurrency = useDashBoardStore(state => state.displayCurrency);

  const makeRequest = useAbortableRequest();

  // ============================================================================
  // Tab & Section State
  // ============================================================================
  const [activeSection, setActiveSection] = useState<
    'cabinets' | 'movement' | 'smib' | 'firmware'
  >('cabinets');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ============================================================================
  // Cabinet Data & Sorting
  // ============================================================================
  const [selectedLocation, setSelectedLocation] = useState<string[]>([]);
  const [selectedGameType, setSelectedGameType] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedMembership, setSelectedMembership] = useState<string>('all');
  const [selectedSmibStatus, setSelectedSmibStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  // Local loading state to bridge the gap between clearing data and fetch start
  const [isFilterResetting, setIsFilterResetting] = useState(false);

  // Debounce search term to match useCabinetData timing
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Sorting and Pagination state managed by local state, driving useCabinetData
  const [sortOption, setSortOption] = useState<CabinetSortOption>('moneyIn');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  // Use ref instead of state for synchronous clearing when filters change
  // This prevents the race condition where the data fetch effect sees stale loadedBatches
  const loadedBatchesRef = useRef<Set<number>>(new Set());
  // Counter to force effect re-evaluation when batches are cleared
  const [batchResetCounter, setBatchResetCounter] = useState(0);

  // Helper to calculate which batch a page belongs to
  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / PAGES_PER_BATCH) + 1;
    },
    []
  );

  const {
    allCabinets,
    filteredCabinets,
    loading,
    error,
    locations,
    gameTypes,
    financialTotals,
    metricsTotals,
    initialLoading,
    metricsTotalsLoading,
    totalCount,
    loadCabinets,
  } = useCabinetData({
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    displayCurrency,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    selectedMembership,
    selectedSmibStatus,
    searchTerm,
  });

  // ============================================================================
  // Batch Loading & Pagination (Now true server-side)
  // ============================================================================
  const {
    transformCabinet,
    paginatedCabinets,
  } = useCabinetSorting({
    filteredCabinets: filteredCabinets,
    itemsPerPage: ITEMS_PER_PAGE,
    useBatchPagination: false, // Using simple slicing on accumulated data
    totalCount: totalCount,
    searchTerm: debouncedSearchTerm,
    currentPage: currentPage,
  });

  const isDataMissingForPage = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    // We only need more data if our startIndex for the current page
    // has exceeded what we've loaded in allCabinets, AND
    // the server says there's more to fetch (totalCount).
    // Note: When searching, we fetch all at once, so this correctly bypasses
    // because totalCount is set to the full search result count.
    return !debouncedSearchTerm?.trim() && startIndex >= allCabinets.length && allCabinets.length < totalCount;
  }, [allCabinets.length, currentPage, totalCount, debouncedSearchTerm]);

  // effectiveTotalPages is based on the client-visible filtered count.
  // Adds +1 trigger page only if server has more raw data not yet fetched.
  const effectiveTotalPages = useMemo(() => {
    const displayedPages = Math.ceil(filteredCabinets.length / ITEMS_PER_PAGE) || 1;

    if (allCabinets.length < totalCount && totalCount > 0) {
      const serverTotalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1;
      return Math.min(displayedPages + 1, serverTotalPages);
    }

    return displayedPages;
  }, [filteredCabinets.length, allCabinets.length, totalCount]);

  // Custom column sort handler that triggers fresh fetch
  const handleColumnSort = useCallback((column: CabinetSortOption) => {
    if (sortOption === column) {
      setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortOption(column);
      setSortOrder('desc');
    }
    setCurrentPage(0);
  }, [sortOption]);

  // ============================================================================
  // Stats & Machine Logic
  // ============================================================================
  const {
    machineStats: apiMachineStats,
    machineStatsLoading,
    refreshMachineStats,
  } = useLocationMachineStats(
    selectedLocation.length > 0 && !selectedLocation.includes('all')
      ? selectedLocation.join(',')
      : undefined,
    undefined, // machineTypeFilter
    searchTerm,
    selectedGameType.length > 0 && !selectedGameType.includes('all')
      ? selectedGameType.join(',')
      : undefined
  );

  // Fallback machine stats logic if API returns zero
  const machineStats = useMemo(() => {
    const hasCabinets = filteredCabinets.length > 0;
    const apiReturnsZero = apiMachineStats?.totalMachines === 0;

    if (hasCabinets && apiReturnsZero && !machineStatsLoading) {
      const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
      let onlineCount = 0;
      let offlineCount = 0;

      filteredCabinets.forEach(cab => {
        const aceEnabled = (cab as Record<string, unknown>).aceEnabled === true;
        const lastActivity = cab.lastActivity
          ? new Date(cab.lastActivity as string | number | Date)
          : null;
        if (aceEnabled || (lastActivity && lastActivity >= threeMinutesAgo)) {
          onlineCount++;
        } else {
          offlineCount++;
        }
      });

      return {
        totalMachines: filteredCabinets.length,
        onlineMachines: onlineCount,
        offlineMachines: offlineCount,
      };
    }

    return apiMachineStats;
  }, [apiMachineStats, filteredCabinets, machineStatsLoading]);
  
  // includeJackpot is configured at the Licencee level
  const [includeJackpot, setIncludeJackpot] = useState(false);
  useEffect(() => {
    if (!selectedLicencee || selectedLicencee === 'all') {
      setIncludeJackpot(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/licencees?licencee=${encodeURIComponent(selectedLicencee)}&limit=1`);
        if (cancelled) return;
        const data = await res.json();
        const lic = data?.licencees?.[0];
        setIncludeJackpot(Boolean(lic?.includeJackpot));
      } catch {
        if (!cancelled) setIncludeJackpot(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedLicencee]);

  // ============================================================================
  // Chart Logic
  // ============================================================================
  const [chartGranularity, setChartGranularity] = useState<
    'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly'
  >(() =>
    getDefaultChartGranularity(
      activeMetricsFilter || 'Today',
      customDateRange?.startDate,
      customDateRange?.endDate
    )
  );
  type ChartDataPoint = {
    xValue: string;
    day: string;
    time: string;
    moneyIn: number;
    moneyOut: number;
    gross: number;
  };

  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Recalculate default granularity when date filters change
  useEffect(() => {
    if (!activeMetricsFilter) return;
    const defaultGranularity = getDefaultChartGranularity(
      activeMetricsFilter,
      customDateRange?.startDate,
      customDateRange?.endDate
    );
    setChartGranularity(defaultGranularity);
  }, [activeMetricsFilter, customDateRange?.startDate, customDateRange?.endDate]);

  const fetchChartData = useCallback(async () => {
    if (!activeMetricsFilter) return;
    setLoadingChart(true);
    try {
      await makeRequest(async signal => {
        // Pass granularity to API for short periods and 30d daily/weekly
        const apiGranularity: 'hourly' | 'minute' | 'daily' | 'weekly' | 'monthly' | undefined =
          chartGranularity === 'minute' ? 'minute' :
          chartGranularity === 'hourly' ? 'hourly' :
          chartGranularity === 'daily' ? 'daily' :
          chartGranularity === 'weekly' ? 'weekly' :
          chartGranularity === 'monthly' ? 'monthly' : undefined;
        const data = await getMetrics(
          activeMetricsFilter as TimePeriod,
          customDateRange?.startDate,
          customDateRange?.endDate,
          selectedLicencee,
          displayCurrency,
          signal,
          apiGranularity,
          selectedLocation,
          selectedGameType,
          selectedStatus === 'All' || selectedStatus === 'all'
            ? 'all'
            : selectedStatus === 'Archived'
              ? 'archived'
              : selectedStatus,
          debouncedSearchTerm
        );
        if (data) {
          setChartData(
            data.map(d => ({
              xValue: d.time || d.day,
              day: d.day,
              time: d.time ?? '',
              moneyIn: d.moneyIn,
              moneyOut: d.moneyOut,
              gross: d.gross,
              netGross: d.netGross,
            }))
          );
        }
      }, 'chart');
    } finally {
      setLoadingChart(false);
    }
  }, [
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    displayCurrency,
    chartGranularity,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    debouncedSearchTerm,
    makeRequest,
  ]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleRefresh = async () => {
    if (activeSection === 'cabinets') {
      setIsFilterResetting(true);
      await Promise.all([
        loadCabinets(currentPage + 1, ITEMS_PER_PAGE, sortOption, sortOrder),
        fetchChartData(),
        refreshMachineStats(),
      ]);
      setIsFilterResetting(false);
    } else {
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // Sync sort state from Status changes
  useEffect(() => {
    if (selectedStatus === 'OfflineLongest') {
      setSortOption('offlineTime');
      setSortOrder('desc');
      setCurrentPage(0);
    } else if (selectedStatus === 'OfflineShortest') {
      setSortOption('offlineTime');
      setSortOrder('asc');
      setCurrentPage(0);
    }
  }, [selectedStatus]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
    // Clear synchronously via ref so the data fetch effect in the same render sees the empty set
    loadedBatchesRef.current = new Set();
    // Bump counter to trigger the data fetch effect
    setBatchResetCounter(c => c + 1);
  }, [selectedLocation, selectedGameType, searchTerm, debouncedSearchTerm, selectedLicencee, activeMetricsFilter, customDateRange, sortOption, sortOrder, displayCurrency, selectedMembership, selectedSmibStatus]);

  // Wrapped setters
  const handleSetSelectedStatus = useCallback((status: string) => {
    setIsFilterResetting(true);
    setSelectedStatus(status);
    setCurrentPage(0);
  }, []);

  const handleSetSelectedMembership = useCallback((membership: string) => {
    setIsFilterResetting(true);
    setSelectedMembership(membership);
    setCurrentPage(0);
  }, []);

  const handleSetSelectedSmibStatus = useCallback((smibStatus: string) => {
    setIsFilterResetting(true);
    setSelectedSmibStatus(smibStatus);
    setCurrentPage(0);
  }, []);

  const handleSetSelectedLocation = useCallback((location: string | string[]) => {
    setIsFilterResetting(true);
    const locationArray = Array.isArray(location) ? location : [location];
    setSelectedLocation(locationArray);
    setCurrentPage(0);
  }, []);

  const handleSetSelectedGameType = useCallback((gameType: string | string[]) => {
    setIsFilterResetting(true);
    const gameTypeArray = Array.isArray(gameType) ? gameType : [gameType];
    setSelectedGameType(gameTypeArray);
    setCurrentPage(0);
  }, []);

  const handleSetSearchTerm = useCallback((term: string) => {
    if (term.trim() !== searchTerm.trim()) {
      setIsFilterResetting(true);
      setSearchTerm(term);
      setCurrentPage(0);
    }
  }, [searchTerm]);

  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);
  const [isUploadSmibOpen, setIsUploadSmibOpen] = useState(false);

  // Consolidated data fetch effect
  useEffect(() => {
    if (activeSection === 'cabinets' && activeMetricsFilter) {
      if (
        activeMetricsFilter === 'Custom' &&
        (!customDateRange?.startDate || !customDateRange?.endDate)
      ) {
        return;
      }

      const currentBatch = calculateBatchNumber(currentPage);

      // Fetch next batch if needed (using ref for synchronous check)
      if (!loadedBatchesRef.current.has(currentBatch)) {
        console.warn(`[useCabinetsPageData] Fetching batch ${currentBatch} for page ${currentPage + 1}`);
        loadedBatchesRef.current.add(currentBatch);
        void loadCabinets(currentBatch, ITEMS_PER_BATCH, sortOption, sortOrder);
      }

      void fetchChartData();
    }
  }, [
    currentPage,
    sortOption,
    sortOrder,
    selectedStatus,
    selectedMembership,
    selectedSmibStatus,
    selectedLocation,
    selectedGameType,
    activeSection,
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    loadCabinets,
    fetchChartData,
    debouncedSearchTerm,
    batchResetCounter,
    calculateBatchNumber,
  ]);

  // isFilterResetting is cleared when data arrives
  useEffect(() => {
    if (!loading && isFilterResetting) {
      setIsFilterResetting(false);
    }
  }, [loading, isFilterResetting]);

  return {
    activeSection,
    loading: loading || initialLoading || isFilterResetting || isDataMissingForPage || (searchTerm !== debouncedSearchTerm),
    refreshing: loading || machineStatsLoading || loadingChart || isFilterResetting,
    error,
    locations,
    gameTypes,
    financialTotals,
    metricsTotals,
    metricsTotalsLoading,
    machineStats,
    paginatedCabinets,
    allCabinets: filteredCabinets,
    filteredCabinets: filteredCabinets,
    initialLoading,
    currentPage,
    sortOption,
    sortOrder,
    searchTerm,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    selectedMembership,
    selectedSmibStatus,
    chartGranularity,
    isNewMovementOpen,
    isUploadSmibOpen,
    refreshTrigger,
    totalCount,
    chartData,
    loadingChart,
    totalPages: effectiveTotalPages,
    includeJackpot,
    // Setters & Handlers
    setActiveSection,
    setSearchTerm: handleSetSearchTerm,
    setSelectedLocation: handleSetSelectedLocation,
    setSelectedGameType: handleSetSelectedGameType,
    setSelectedStatus: handleSetSelectedStatus,
    setSelectedMembership: handleSetSelectedMembership,
    setSelectedSmibStatus: handleSetSelectedSmibStatus,
    setChartGranularity,
    setCurrentPage,
    handleColumnSort,
    handleRefresh,
    setIsNewMovementOpen,
    setIsUploadSmibOpen,
    loadCabinets,
    transformCabinet,
  };
}
