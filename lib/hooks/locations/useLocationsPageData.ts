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
import { useUserStore } from '@/lib/store/userStore';
import type { DashboardTotals } from '@/lib/types';
import type { LocationFilter, LocationSortOption } from '@/lib/types/location';
import { isAbortError } from '@/lib/utils/errors';
import { calculateLocationFinancialTotals } from '@/lib/utils/financial';
import { useDebounce } from '@/lib/utils/hooks';
import type { AggregatedLocation } from '@/shared/types';
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
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [accumulatedLocations, setAccumulatedLocations] = useState<AggregatedLocation[]>([]);
  const [metricsTotals, setMetricsTotals] = useState<DashboardTotals | null>(null);
  const [metricsTotalsLoading, setMetricsTotalsLoading] = useState(true);
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  
  // Sorting State
  const [sortOption, setSortOption] = useState<LocationSortOption>('moneyIn');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
  const { machineStats, machineStatsLoading, refreshMachineStats } = useLocationMachineStats(undefined, machineTypeFilterString, debouncedSearchTerm);
  const { membershipStats, membershipStatsLoading, refreshMembershipStats } = useLocationMembershipStats(undefined, machineTypeFilterString);

  // ============================================================================
  // Computed Values
  // ============================================================================
  const filteredLocationData = useMemo(() => {
    // When filters are active, always use locationData from API (which is already filtered)
    // When no filters and no search, use accumulatedLocations
    let data = selectedFilters.length > 0
      ? locationData
      : (searchTerm.trim() ? locationData : accumulatedLocations);

    const isDeveloper = user?.roles?.includes('developer') ?? false;
    if (!isDeveloper) {
      data = data.filter(loc => !/^test/i.test(loc.locationName || loc.location || ''));
    }
    
    // sorting logic
    return [...data].sort((a, b) => {
      let valA: any = a[sortOption as keyof AggregatedLocation];
      let valB: any = b[sortOption as keyof AggregatedLocation];

      // Handle undefined/null
      if (valA === undefined || valA === null) valA = 0;
      if (valB === undefined || valB === null) valB = 0;

      // String comparison
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      
      // Numeric comparison
      return sortOrder === 'asc' 
        ? (Number(valA) - Number(valB)) 
        : (Number(valB) - Number(valA));
    });
  }, [locationData, accumulatedLocations, searchTerm, selectedFilters, user, sortOption, sortOrder]);

  const financialTotals = useMemo(() => calculateLocationFinancialTotals(
    accumulatedLocations.length > 0 ? accumulatedLocations : locationData
  ), [accumulatedLocations, locationData]);

  const itemsPerPage = 20;
  const totalPages = useMemo(() => Math.ceil(filteredLocationData.length / itemsPerPage) || 1, [filteredLocationData.length]);
  
  // Paginate filteredLocationData
  const paginatedLocationData = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLocationData.slice(startIndex, endIndex);
  }, [filteredLocationData, currentPage, itemsPerPage]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleRefresh = async () => {
    setRefreshing(true);
    setAccumulatedLocations([]);
    await Promise.all([refreshMachineStats(), refreshMembershipStats(), fetchData()]);
    setRefreshing(false);
  };

  const handleFilterChange = (filter: LocationFilter, checked: boolean) => {
    setSelectedFilters(prev => checked ? [...prev, filter] : prev.filter(f => f !== filter));
  };

  const handleMultiFilterChange = (filters: LocationFilter[]) => {
    setSelectedFilters(filters);
  };
  
  const handleSort = (option: LocationSortOption) => {
    if (sortOption === option) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOption(option);
      setSortOrder('desc');
    }
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
    // Don't accumulate if filters are active - API already filtered
    if (selectedFilters.length > 0) {
      return;
    }
    
    // Don't accumulate stale data while loading new data
    if (loading) {
      return;
    }

    if (!searchTerm.trim() && locationData.length > 0) {
      setAccumulatedLocations(prev => {
        const existingIds = new Set(prev.map(loc => loc._id));
        const newLocations = locationData.filter(loc => !existingIds.has(loc._id));
        return [...prev, ...newLocations];
      });
    }
  }, [locationData, searchTerm, selectedFilters, loading]);

  // Clear accumulated locations when filters change
  useEffect(() => {
    setAccumulatedLocations([]);
  }, [selectedFilters, activeMetricsFilter, selectedLicencee, customDateRange]);

  // Consolidated data fetch effect
  // Triggers when filters, identity of fetchData, or custom date range changes
  useEffect(() => {
    if (filtersInitialized) {
      // Clear accumulated locations whenever parameters change to ensure fresh metrics
      setAccumulatedLocations([]);
      void fetchData();
    }
  }, [
    selectedFilters, 
    activeMetricsFilter, 
    selectedLicencee, 
    customDateRange,
    filtersInitialized, 
    fetchData
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
          setMetricsTotals,
          displayCurrency,
          signal,
          machineTypeFilterString
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
  }, [activeMetricsFilter, selectedLicencee, customDateRange, displayCurrency, filtersInitialized, machineTypeFilterString, makeMetricsRequest]);

  return {
    loading: loading || searchLoading,
    refreshing,
    error,
    filteredLocationData: paginatedLocationData,
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
    sortOption,
    sortOrder,
    // Handlers
    handleRefresh,
    handleFilterChange,
    handleMultiFilterChange,
    handleSort,
    setSearchTerm,
    setCurrentPage,
    fetchData,
  };
}




