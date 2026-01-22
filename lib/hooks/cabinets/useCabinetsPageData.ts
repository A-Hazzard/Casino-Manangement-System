/**
 * useCabinetsPageData Hook
 *
 * Coordinates all data, filtering, and UI state for the cabinets dashboard.
 *
 * Features:
 * - Tab-based section management (Cabinets, Movement, SMIB, Firmware)
 * - Cabinet data fetching with batch accumulation
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
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { TimePeriod } from '@/shared/types';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { useCallback, useEffect, useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 20;
const ITEMS_PER_BATCH = 100;
const PAGES_PER_BATCH = ITEMS_PER_BATCH / ITEMS_PER_PAGE; // 5

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
  const [searchTerm, setSearchTerm] = useState('');
  const [accumulatedCabinets, setAccumulatedCabinets] = useState<Cabinet[]>([]);
  // Local loading state to bridge the gap between clearing data and fetch start
  const [isFilterResetting, setIsFilterResetting] = useState(false);

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
    searchTerm,
  });

  // ============================================================================
  // Filtered Accumulated Data
  // ============================================================================
  const filteredAccumulatedCabinets = useMemo(() => {
    if (accumulatedCabinets.length === 0) return [];
    
    return accumulatedCabinets.filter(cabinet => {
      // 1. Location filter (matches any of multiple selected locations)
      if (selectedLocation.length > 0 && !selectedLocation.includes('all')) {
        const matchesLocation = selectedLocation.some(locId => String(cabinet.locationId) === String(locId));
        if (!matchesLocation) return false;
      }

      // 2. Game Type filter (matches any of multiple selected game types)
      if (selectedGameType.length > 0 && !selectedGameType.includes('all')) {
        const machineGame = (cabinet.game || cabinet.installedGame || '').toString();
        const matchesGameType = selectedGameType.includes(machineGame);
        if (!matchesGameType) return false;
      }

      // 3. Status filter (if not 'All', filter by online status)
      if (selectedStatus !== 'All' && selectedStatus !== 'all') {
        const isOnline = cabinet.online === true;
        
        if (selectedStatus === 'NeverOnline') {
            const hasHistory = cabinet.lastOnline || cabinet.lastActivity;
            return !isOnline && !hasHistory;
        }

        const matchesStatus =
          (selectedStatus === 'Online' && isOnline) ||
          (selectedStatus.startsWith('Offline') && !isOnline);
        if (!matchesStatus) return false;
      }

      return true;
    });
  }, [accumulatedCabinets, selectedLocation, selectedGameType, selectedStatus]);

  // ============================================================================
  // Batch Loading & Pagination
  // ============================================================================
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());

  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / PAGES_PER_BATCH) + 1;
    },
    []
  );
  
  const {
    sortOrder,
    sortOption,
    currentPage,
    paginatedCabinets,
    handleColumnSort,
    setSortOption,
    setSortOrder,
    setCurrentPage,
    transformCabinet,
  } = useCabinetSorting({
    filteredCabinets: searchTerm.trim()
      ? filteredCabinets
      : filteredAccumulatedCabinets,
    itemsPerPage: ITEMS_PER_PAGE,
    useBatchPagination: true,
  });

  // Effect to handle automatic sorting when status changes to Offline sorting variants
  useEffect(() => {
    if (selectedStatus === 'OfflineLongest') {
      setSortOption('offlineTime');
      setSortOrder('desc');
    } else if (selectedStatus === 'OfflineShortest') {
      setSortOption('offlineTime');
      setSortOrder('asc');
    }
  }, [selectedStatus, setSortOption, setSortOrder]);

  // ============================================================================
  // Cabinet Data & Sorting
  // ============================================================================
  const { machineStats, machineStatsLoading, refreshMachineStats } =
    useLocationMachineStats(
      selectedLocation.length > 0 && !selectedLocation.includes('all')
        ? selectedLocation.join(',')
        : undefined,
      undefined, // machineTypeFilter (SMIB etc)
      searchTerm,
      selectedGameType.length > 0 && !selectedGameType.includes('all')
        ? selectedGameType.join(',')
        : undefined
    );

  // ============================================================================
  // Chart Logic
  // ============================================================================
  const [chartGranularity, setChartGranularity] = useState<'hourly' | 'minute'>(
    'hourly'
  );
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  const fetchChartData = useCallback(async () => {
    if (!activeMetricsFilter) return;
    setLoadingChart(true);
    try {
      await makeRequest(async signal => {
        const data = await getMetrics(
          activeMetricsFilter as TimePeriod,
          customDateRange?.startDate,
          customDateRange?.endDate,
          selectedLicencee,
          displayCurrency,
          signal,
          chartGranularity,
          selectedLocation,
          selectedGameType,
          selectedStatus === 'All' || selectedStatus === 'all'
            ? 'all'
            : selectedStatus.toLowerCase()
        );
        if (data)
          setChartData(
            data.map(d => ({
              xValue: d.time || d.day,
              day: d.day,
              time: d.time,
              moneyIn: d.moneyIn,
              moneyOut: d.moneyOut,
              gross: d.gross,
            }))
          );
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
    makeRequest,
    setChartData,
  ]);

  // ============================================================================
  // Modals & Handlers
  // ============================================================================
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);
  const [isUploadSmibOpen, setIsUploadSmibOpen] = useState(false);

  const handleRefresh = async () => {
    if (activeSection === 'cabinets') {
      setIsFilterResetting(true);
      setAccumulatedCabinets([]);
      setLoadedBatches(new Set([1]));
      await Promise.all([
        loadCabinets(1, ITEMS_PER_BATCH),
        fetchChartData(),
        refreshMachineStats(),
      ]);
    } else {
      setRefreshTrigger(prev => prev + 1);
    }
  };

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    if (activeSection === 'cabinets') {
      fetchChartData();
      // Load cabinets on mount and when section changes to cabinets
      if (activeMetricsFilter) {
        void loadCabinets(1, ITEMS_PER_BATCH);
      }
    }
  }, [activeSection, activeMetricsFilter, fetchChartData, loadCabinets]);

  // Trigger refetch when filters change
  useEffect(() => {
    if (activeSection === 'cabinets' && activeMetricsFilter) {
      if (activeMetricsFilter === 'Custom' && (!customDateRange?.startDate || !customDateRange?.endDate)) {
        return;
      }
      void loadCabinets(1, ITEMS_PER_BATCH);
      void fetchChartData(); 
    }
  }, [selectedStatus, selectedLocation, selectedGameType, activeSection, activeMetricsFilter, customDateRange, loadCabinets, fetchChartData]);

  // Batch loading effect
  useEffect(() => {
    if (loading || !activeMetricsFilter || searchTerm.trim()) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % PAGES_PER_BATCH === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of the current batch and it's not loaded,
    // or if the current batch itself isn't loaded (e.g., jumping pages)
    if ((isLastPageOfBatch && !loadedBatches.has(nextBatch)) || !loadedBatches.has(currentBatch)) {
      const batchToLoad = isLastPageOfBatch ? nextBatch : currentBatch;
      loadCabinets(batchToLoad, ITEMS_PER_BATCH);
      setLoadedBatches(prev => new Set([...prev, batchToLoad]));
    }
  }, [currentPage, loading, activeMetricsFilter, searchTerm, loadedBatches, loadCabinets, calculateBatchNumber]);
  
  useEffect(() => {
    if (!searchTerm.trim()) {
      if (allCabinets.length > 0) {
        setAccumulatedCabinets(prev => {
          if (prev.length === 0) {
            return allCabinets;
          }
          const existingIds = new Set(prev.map(c => c._id));
          const newCabs = allCabinets.filter(c => !existingIds.has(c._id));
          return [...prev, ...newCabs];
        });
        
        // Update loaded batches if it was empty (initial load scenario)
        setLoadedBatches(prev => {
          if (prev.size === 0) return new Set([1]);
          return prev;
        });
      } else {
        setAccumulatedCabinets([]);
        // If we get empty data, mark the current batch as loaded so we don't infinitely retry
        const currentBatch = calculateBatchNumber(currentPage);
        setLoadedBatches(prev => new Set([...prev, currentBatch]));
      }
      setIsFilterResetting(false);
    }
  }, [allCabinets, searchTerm]);

  // NOTE: accumulatedCabinets is cleared inside the wrapped setters below
  // This ensures the loading state and data clear happen in the same React batch

  // Wrapped setters that set isFilterResetting and clear data SYNCHRONOUSLY in the same batch
  // This ensures React sees both updates together and renders with loading=true AND empty data
  const handleSetSelectedStatus = useCallback((status: string) => {
    setIsFilterResetting(true);
    setLoadedBatches(new Set()); // Reset loaded batches to allow fresh fetch
    setAccumulatedCabinets([]);
    setSelectedStatus(status);
  }, []);

  const handleSetSelectedLocation = useCallback((location: string | string[]) => {
    console.warn('[useCabinetsPageData] handleSetSelectedLocation called with:', location);
    setIsFilterResetting(true);
    setLoadedBatches(new Set()); // Reset loaded batches to allow fresh fetch
    setAccumulatedCabinets([]);
    const locationArray = Array.isArray(location) ? location : [location];
    console.warn('[useCabinetsPageData] Setting selectedLocation to:', locationArray);
    setSelectedLocation(locationArray);
  }, []);

  const handleSetSelectedGameType = useCallback((gameType: string | string[]) => {
    // Note: We don't necessarily need to reset accumulated cabinets for game type 
    // if it's a frontend filter, but with multi-select it's better to fetch fresh
    setIsFilterResetting(true);
    setLoadedBatches(new Set()); // Reset loaded batches to allow fresh fetch
    setAccumulatedCabinets([]);
    const gameTypeArray = Array.isArray(gameType) ? gameType : [gameType];
    setSelectedGameType(gameTypeArray);
  }, []);

  // isFilterResetting is cleared in the effect above when new data arrives
  // This is more reliable than depending on loading state timing

  return {
    activeSection,
    loading: loading || initialLoading || isFilterResetting,
    refreshing: loading || machineStatsLoading || loadingChart || isFilterResetting,
    error,
    locations,
    gameTypes,
    financialTotals,
    metricsTotals,
    metricsTotalsLoading,
    machineStats,
    paginatedCabinets,
    allCabinets: accumulatedCabinets,
    filteredCabinets: searchTerm.trim()
      ? filteredCabinets
      : accumulatedCabinets,
    initialLoading,
    currentPage,
    sortOption,
    sortOrder,
    searchTerm,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    chartGranularity,
    isNewMovementOpen,
    isUploadSmibOpen,
    refreshTrigger,
    totalCount,
    chartData,
    loadingChart,
    // Setters & Handlers
    setActiveSection,
    setSearchTerm,
    setSelectedLocation: handleSetSelectedLocation,
    setSelectedGameType: handleSetSelectedGameType,
    setSelectedStatus: handleSetSelectedStatus,
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
