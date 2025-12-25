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

import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useCabinetData, useCabinetSorting, useLocationMachineStats } from '@/lib/hooks/data';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { getMetrics } from '@/lib/helpers/metrics';
import { useCallback, useEffect, useState } from 'react';
import type { TimePeriod } from '@/shared/types';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';

export function useCabinetsPageData() {
  const {
    activeMetricsFilter,
    selectedLicencee,
    customDateRange,
    displayCurrency,
    setChartData,
    setLoadingChartData,
  } = useDashBoardStore();

  const makeRequest = useAbortableRequest();

  // ============================================================================
  // Tab & Section State
  // ============================================================================
  const [activeSection, setActiveSection] = useState<'cabinets' | 'movement' | 'smib' | 'firmware'>('cabinets');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // ============================================================================
  // Cabinet Data & Sorting
  // ============================================================================
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedGameType, setSelectedGameType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [accumulatedCabinets, setAccumulatedCabinets] = useState<Cabinet[]>([]);

  const {
    allCabinets, filteredCabinets, loading, error, locations, gameTypes,
    financialTotals, metricsTotals, initialLoading, metricsTotalsLoading, loadCabinets
  } = useCabinetData({
    selectedLicencee, activeMetricsFilter, customDateRange, displayCurrency,
    selectedLocation, selectedGameType, selectedStatus, searchTerm,
  });

  const {
    sortOption, sortOrder, handleColumnSort, currentPage, setCurrentPage,
    paginatedCabinets, transformCabinet,
  } = useCabinetSorting({
    filteredCabinets: searchTerm.trim() ? filteredCabinets : accumulatedCabinets,
    itemsPerPage: 10,
    useBatchPagination: true,
  });

  // ============================================================================
  // Machine Stats
  // ============================================================================
  const { machineStats, machineStatsLoading, refreshMachineStats } = useLocationMachineStats();

  // ============================================================================
  // Chart Logic
  // ============================================================================
  const [chartGranularity, setChartGranularity] = useState<'hourly' | 'minute'>('hourly');
  const [loadingChart, setLoadingChart] = useState(false);

  const fetchChartData = useCallback(async () => {
    if (!activeMetricsFilter) return;
    setLoadingChart(true);
    setLoadingChartData(true);
    try {
      await makeRequest(async signal => {
        const data = await getMetrics(
          activeMetricsFilter as TimePeriod,
          customDateRange?.startDate,
          customDateRange?.endDate,
          selectedLicencee,
          displayCurrency,
          signal,
          chartGranularity
        );
        if (data) setChartData(data.map(d => ({
          xValue: d.time || d.day,
          day: d.day,
          time: d.time,
          moneyIn: d.moneyIn,
          moneyOut: 0,
          gross: d.gross
        })));
      }, 'chart');
    } finally {
      setLoadingChart(false);
      setLoadingChartData(false);
    }
  }, [activeMetricsFilter, customDateRange, selectedLicencee, displayCurrency, chartGranularity, makeRequest, setChartData, setLoadingChartData]);

  // ============================================================================
  // Modals & Handlers
  // ============================================================================
  const [isNewMovementOpen, setIsNewMovementOpen] = useState(false);
  const [isUploadSmibOpen, setIsUploadSmibOpen] = useState(false);

  const handleRefresh = async () => {
    if (activeSection === 'cabinets') {
      await Promise.all([loadCabinets(1, 50), fetchChartData(), refreshMachineStats()]);
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
      if (activeMetricsFilter) {
        void loadCabinets(1, 50);
      }
    }
  }, [activeSection, activeMetricsFilter, fetchChartData, loadCabinets]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setAccumulatedCabinets(prev => {
        const existingIds = new Set(prev.map(c => c._id));
        const newCabs = allCabinets.filter(c => !existingIds.has(c._id));
        return [...prev, ...newCabs];
      });
    }
  }, [allCabinets, searchTerm]);

  return {
    activeSection,
    loading: loading || initialLoading,
    refreshing: loading || machineStatsLoading || loadingChart,
    error,
    locations,
    gameTypes,
    financialTotals,
    metricsTotals,
    metricsTotalsLoading,
    machineStats,
    paginatedCabinets,
    allCabinets: accumulatedCabinets,
    filteredCabinets: searchTerm.trim() ? filteredCabinets : accumulatedCabinets,
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
    // Setters & Handlers
    setActiveSection,
    setSearchTerm,
    setSelectedLocation,
    setSelectedGameType,
    setSelectedStatus,
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

