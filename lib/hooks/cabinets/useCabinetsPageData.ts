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

export function useCabinetsPageData() {
  const {
    activeMetricsFilter,
    selectedLicencee,
    customDateRange,
    displayCurrency,
  } = useDashBoardStore();

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
        const matchesStatus =
          (selectedStatus === 'Online' && isOnline) ||
          (selectedStatus === 'Offline' && !isOnline);
        if (!matchesStatus) return false;
      }

      return true;
    });
  }, [accumulatedCabinets, selectedLocation, selectedGameType, selectedStatus]);

  const {
    sortOption,
    sortOrder,
    handleColumnSort,
    currentPage,
    setCurrentPage,
    paginatedCabinets,
    transformCabinet,
  } = useCabinetSorting({
    filteredCabinets: searchTerm.trim()
      ? filteredCabinets
      : filteredAccumulatedCabinets,
    itemsPerPage: 20,
    useBatchPagination: true,
  });

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
      await Promise.all([
        loadCabinets(1, 50),
        fetchChartData(),
        refreshMachineStats(),
      ]);
      setAccumulatedCabinets([]);
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
      // Always call loadCabinets if activeMetricsFilter exists (defaults to 'Today')
      if (activeMetricsFilter) {
        void loadCabinets(1, 50);
      }
    }
  }, [activeSection, activeMetricsFilter, fetchChartData, loadCabinets]);

  // Trigger refetch when status or location filter changes (filtering is now done at API level)
  // Trigger refetch when status, location, or date filter changes
  useEffect(() => {
    if (activeSection === 'cabinets' && activeMetricsFilter) {
      // Prevent fetch on incomplete custom date range to avoid 400 errors and "No Data" flash
      if (activeMetricsFilter === 'Custom') {
        if (!customDateRange?.startDate || !customDateRange?.endDate) {
          return;
        }
      }

      // Set resetting state to ensure skeleton shows immediately
      setIsFilterResetting(true);
      setAccumulatedCabinets([]);

      void loadCabinets(1, 50);
      void fetchChartData(); // Also refresh chart when filters change
    }
  }, [selectedStatus, selectedLocation, selectedGameType, activeSection, activeMetricsFilter, customDateRange, loadCabinets, fetchChartData]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      if (allCabinets.length > 0) {
        setAccumulatedCabinets(prev => {
          // If prev is empty (e.g., after filter change), just set directly
          if (prev.length === 0) {
            return allCabinets;
          }
          // Otherwise, merge new cabinets with existing ones
          const existingIds = new Set(prev.map(c => c._id));
          const newCabs = allCabinets.filter(c => !existingIds.has(c._id));
          return [...prev, ...newCabs];
        });
      } else {
        // If allCabinets is empty, set accumulated to empty as well
        // This ensures we show empty state instead of stale data
        setAccumulatedCabinets([]);
      }
      // Clear the filter resetting flag once we have processed the data (even if empty)
      setIsFilterResetting(false);
    }
  }, [allCabinets, searchTerm]);

  // NOTE: accumulatedCabinets is cleared inside the wrapped setters below
  // This ensures the loading state and data clear happen in the same React batch

  // Wrapped setters that set isFilterResetting and clear data SYNCHRONOUSLY in the same batch
  // This ensures React sees both updates together and renders with loading=true AND empty data
  const handleSetSelectedStatus = useCallback((status: string) => {
    setIsFilterResetting(true);
    setAccumulatedCabinets([]);
    setSelectedStatus(status);
  }, []);

  const handleSetSelectedLocation = useCallback((location: string | string[]) => {
    console.warn('[useCabinetsPageData] handleSetSelectedLocation called with:', location);
    setIsFilterResetting(true);
    setAccumulatedCabinets([]);
    const locationArray = Array.isArray(location) ? location : [location];
    console.warn('[useCabinetsPageData] Setting selectedLocation to:', locationArray);
    setSelectedLocation(locationArray);
  }, []);

  const handleSetSelectedGameType = useCallback((gameType: string | string[]) => {
    // Note: We don't necessarily need to reset accumulated cabinets for game type 
    // if it's a frontend filter, but with multi-select it's better to fetch fresh
    setIsFilterResetting(true);
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
