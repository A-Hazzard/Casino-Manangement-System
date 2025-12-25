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

import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { useLocationData, useLocationMachineStats, useLocationMembershipStats } from '@/lib/hooks/data';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { fetchDashboardTotals } from '@/lib/helpers/dashboard';
import { calculateLocationFinancialTotals } from '@/lib/utils/financial';
import type { DashboardTotals } from '@/lib/types';
import type { LocationFilter } from '@/lib/types/location';
import type { AggregatedLocation } from '@/shared/types/common';
import { useEffect, useMemo, useState } from 'react';

export function useLocationsPageData() {
  const { user } = useUserStore();
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
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [accumulatedLocations, setAccumulatedLocations] = useState<AggregatedLocation[]>([]);
  const [metricsTotals, setMetricsTotals] = useState<DashboardTotals | null>(null);
  const [metricsTotalsLoading, setMetricsTotalsLoading] = useState(true);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  const makeMetricsRequest = useAbortableRequest();

  // ============================================================================
  // Base Hook Integration
  // ============================================================================
  const { locationData, loading, searchLoading, error, fetchData } = useLocationData({
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    searchTerm,
    selectedFilters,
  });

  const machineTypeFilterString = useMemo(() => selectedFilters.join(','), [selectedFilters]);
  const { machineStats, machineStatsLoading, refreshMachineStats } = useLocationMachineStats(undefined, machineTypeFilterString);
  const { membershipStats, membershipStatsLoading, refreshMembershipStats } = useLocationMembershipStats(undefined, machineTypeFilterString);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const filteredLocationData = useMemo(() => {
    const data = searchTerm.trim() ? locationData : accumulatedLocations;
    const isDeveloper = user?.roles?.includes('developer') ?? false;
    if (isDeveloper) return data;
    return data.filter(loc => !/^test/i.test(loc.name || ''));
  }, [locationData, accumulatedLocations, searchTerm, user]);

  const financialTotals = useMemo(() => calculateLocationFinancialTotals(
    accumulatedLocations.length > 0 ? accumulatedLocations : locationData
  ), [accumulatedLocations, locationData]);

  const totalPages = useMemo(() => Math.ceil(accumulatedLocations.length / 10) || 1, [accumulatedLocations]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshMachineStats(), refreshMembershipStats(), fetchData()]);
    setRefreshing(false);
  };

  const handleFilterChange = (filter: LocationFilter, checked: boolean) => {
    setSelectedFilters(prev => checked ? [...prev, filter] : prev.filter(f => f !== filter));
  };

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    if (activeMetricsFilter) {
      setFiltersInitialized(true);
    }
  }, [activeMetricsFilter, setFiltersInitialized]);

  // Batch accumulation logic
  useEffect(() => {
    if (!searchTerm.trim() && locationData.length > 0) {
      setAccumulatedLocations(prev => {
        const existingIds = new Set(prev.map(loc => loc._id));
        const newLocations = locationData.filter(loc => !existingIds.has(loc._id));
        return [...prev, ...newLocations];
      });
    }
  }, [locationData, searchTerm]);

  // Initial data fetch on mount
  useEffect(() => {
    if (activeMetricsFilter && filtersInitialized) {
      void fetchData();
    }
  }, [activeMetricsFilter, filtersInitialized, fetchData]);

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
          setMetricsTotals,
          displayCurrency,
          signal,
          machineTypeFilterString
        );
      } finally {
        setMetricsTotalsLoading(false);
      }
    });
  }, [activeMetricsFilter, selectedLicencee, customDateRange, displayCurrency, filtersInitialized, machineTypeFilterString, makeMetricsRequest]);

  return {
    loading: loading || searchLoading,
    refreshing,
    error,
    filteredLocationData,
    financialTotals,
    metricsTotals,
    metricsTotalsLoading,
    machineStats,
    machineStatsLoading,
    membershipStats,
    membershipStatsLoading,
    selectedFilters,
    searchTerm,
    currentPage,
    totalPages,
    // Handlers
    handleRefresh,
    handleFilterChange,
    setSearchTerm,
    setCurrentPage,
    fetchData,
  };
}



