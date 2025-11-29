/**
 * Custom hook for managing cabinet data fetching and state
 * Handles loading, filtering, and error states for cabinet operations
 */

import { fetchCabinetLocations, fetchCabinets, fetchCabinetTotals } from '@/lib/helpers/cabinets';
import { calculateCabinetFinancialTotals } from '@/lib/utils/financial';
import { useDebounce } from '@/lib/utils/hooks';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { useCallback, useEffect, useMemo, useState } from 'react';
type CustomDateRange = {
  startDate: Date;
  endDate: Date;
};

type UseCabinetDataProps = {
  selectedLicencee: string;
  activeMetricsFilter: string;
  customDateRange?: CustomDateRange;
  searchTerm: string;
  selectedLocation: string;
  selectedGameType: string;
  selectedStatus: string;
  displayCurrency?: string;
};

type UseCabinetDataReturn = {
  // Data states
  allCabinets: Cabinet[];
  filteredCabinets: Cabinet[];
  locations: { _id: string; name: string }[];
  gameTypes: string[];
  financialTotals: ReturnType<typeof calculateCabinetFinancialTotals>;
  metricsTotals: { moneyIn: number; moneyOut: number; gross: number } | null;
  totalCount: number;

  // Loading states
  initialLoading: boolean;
  loading: boolean;
  metricsTotalsLoading: boolean;
  error: string | null;

  // Actions
  loadCabinets: (page?: number, limit?: number) => Promise<void>;
  loadLocations: () => Promise<void>;
  filterCabinets: (
    cabinets: Cabinet[],
    searchTerm: string,
    selectedLocation: string,
    selectedGameType: string,
    selectedStatus: string
  ) => void;
  setError: (error: string | null) => void;
};

export const useCabinetData = ({
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  searchTerm,
  selectedLocation,
  selectedGameType,
  selectedStatus,
  displayCurrency,
}: UseCabinetDataProps): UseCabinetDataReturn => {
  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // State management
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCabinets, setAllCabinets] = useState<Cabinet[]>([]);
  // Removed filteredCabinets state - now using memoized value for better performance
  const [locations, setLocations] = useState<{ _id: string; name: string }[]>(
    []
  );
  const [gameTypes, setGameTypes] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Separate state for metrics totals (from dedicated API call)
  const [metricsTotals, setMetricsTotals] = useState<{
    moneyIn: number;
    moneyOut: number;
    gross: number;
  } | null>(null);
  const [metricsTotalsLoading, setMetricsTotalsLoading] = useState(false);
  const [lastFilterBackendKey, setLastFilterBackendKey] = useState<string>('');

  // PERFORMANCE OPTIMIZATION: Memoize financial totals calculation (for backward compatibility)
  // Note: This is now only used for table display, metrics cards use metricsTotals from API
  const financialTotals = useMemo(() => {
    // If we have API totals, use those; otherwise fall back to calculated totals
    if (metricsTotals) {
      return metricsTotals;
    }
    return calculateCabinetFinancialTotals(allCabinets);
  }, [allCabinets, metricsTotals]);

  // Load locations for filter dropdown
  const loadLocations = useCallback(async () => {
    try {
      console.warn('Loading cabinet locations for licensee:', selectedLicencee);
      const locationsData = await fetchCabinetLocations(selectedLicencee);

      if (Array.isArray(locationsData)) {
        setLocations(locationsData);
        console.warn('Successfully loaded locations:', locationsData.length);
      } else {
        console.error('Locations data is not an array:', locationsData);
        setLocations([]);
      }
    } catch (error) {
      console.error('Failed to fetch locations:', error);
      setLocations([]);
    }
  }, [selectedLicencee]);

  // PERFORMANCE OPTIMIZATION: Memoize filtered cabinets calculation
  const filteredCabinets = useMemo(() => {
    console.warn('Filtering cabinets:', {
      totalCabinets: allCabinets.length,
      searchTerm,
      selectedLocation,
      selectedGameType,
      selectedStatus,
    });

    // If searchTerm is provided, the API already filtered the results by search
    // We still need to apply frontend filters (location, game type, status)
    // But we don't need to apply search filter again since API already did it
    let filtered = allCabinets;

    // Apply location filter
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(cab => cab.locationId === selectedLocation);
    }

    // Apply game type filter
    if (selectedGameType && selectedGameType !== 'all') {
      filtered = filtered.filter(cabinet => {
        const cabinetGame = cabinet.game || cabinet.installedGame;
        return cabinetGame === selectedGameType;
      });
    }

    // Apply status filter
    if (
      selectedStatus &&
      selectedStatus !== 'All' &&
      selectedStatus !== 'all'
    ) {
      filtered = filtered.filter(cabinet => {
        if (selectedStatus === 'Online') {
          return cabinet.online === true;
        } else if (selectedStatus === 'Offline') {
          return cabinet.online === false;
        }
        return true;
      });
    }

    // Note: Search filtering is handled by the API when searchTerm is provided
    // Frontend search filter is only needed if we're doing client-side only filtering
    // which we're not doing anymore - all search goes through the API

    console.warn('Filtered cabinets result:', filtered.length);
    return filtered;
  }, [
    allCabinets,
    searchTerm,
    selectedLocation,
    selectedGameType,
    selectedStatus,
  ]);

  // Legacy filterCabinets function for backward compatibility (now just updates state)
  const filterCabinets = useCallback(
    (
      _cabinets: Cabinet[],
      _search: string,
      _location: string,
      _gameType: string,
      _status: string
    ) => {
      // This function is now handled by the memoized filteredCabinets above
      // Keeping for backward compatibility but it's no longer needed
    },
    []
  );

  // Load cabinets with proper error handling and logging
  const loadCabinets = useCallback(
    async (page?: number, limit?: number) => {
      try {
        console.warn('Loading cabinets with filters:', {
          selectedLicencee,
          activeMetricsFilter,
          page,
          limit,
          customDateRange: customDateRange
            ? {
                startDate: customDateRange.startDate?.toISOString(),
                endDate: customDateRange.endDate?.toISOString(),
              }
            : undefined,
        });

        setLoading(true);
        setError(null);

        const dateRangeForFetch =
          activeMetricsFilter === 'Custom' &&
          customDateRange?.startDate &&
          customDateRange?.endDate
            ? {
                from: customDateRange.startDate,
                to: customDateRange.endDate,
              }
            : undefined;

        // When searching, fetch all results (no pagination limit) to find matches across all machines
        // Otherwise, use pagination for performance
        // Note: When debouncedSearchTerm is provided, we want to search ALL machines, not just the current batch
        const effectivePage = debouncedSearchTerm?.trim() ? 1 : page;
        const effectiveLimit = debouncedSearchTerm?.trim() ? undefined : limit; // No limit when searching = fetch all

        const cabinetsData = await fetchCabinets(
          selectedLicencee,
          activeMetricsFilter,
          dateRangeForFetch,
          displayCurrency,
          effectivePage,
          effectiveLimit,
          debouncedSearchTerm
        );

        console.warn('✅ [USE CABINET DATA] Fetch completed, received:', {
          isArray: Array.isArray(cabinetsData),
          isObject:
            typeof cabinetsData === 'object' &&
            cabinetsData !== null &&
            !Array.isArray(cabinetsData),
          length: Array.isArray(cabinetsData)
            ? cabinetsData.length
            : cabinetsData &&
                typeof cabinetsData === 'object' &&
                'cabinets' in cabinetsData
              ? (cabinetsData as { cabinets: unknown[] }).cabinets.length
              : 0,
          type: typeof cabinetsData,
        });

        // Handle paginated response
        if (
          cabinetsData &&
          typeof cabinetsData === 'object' &&
          !Array.isArray(cabinetsData) &&
          'cabinets' in cabinetsData
        ) {
          const paginatedResponse = cabinetsData as {
            cabinets: Cabinet[];
            pagination?: {
              total: number;
              totalPages: number;
              page: number;
              limit: number;
            };
          };
          console.warn(
            '✅ [USE CABINET DATA] Successfully loaded cabinets (paginated):',
            paginatedResponse.cabinets.length,
            'pagination:',
            paginatedResponse.pagination
          );
          setAllCabinets(paginatedResponse.cabinets);
          if (paginatedResponse.pagination) {
            setTotalCount(paginatedResponse.pagination.total);
          }

          // Extract unique game types from all cabinets (we may need to fetch all for this)
          const uniqueGameTypes = Array.from(
            new Set(
              paginatedResponse.cabinets
                .map(cabinet => cabinet.game || cabinet.installedGame)
                .filter((game): game is string => !!game && game.trim() !== '')
            )
          ).sort();
          setGameTypes(uniqueGameTypes);
        } else if (Array.isArray(cabinetsData)) {
          // Backward compatibility: direct array response
          console.warn(
            '✅ [USE CABINET DATA] Successfully loaded cabinets (array):',
            cabinetsData.length
          );
          setAllCabinets(cabinetsData);
          setTotalCount(cabinetsData.length);

          // PERFORMANCE OPTIMIZATION: Extract unique game types efficiently
          const uniqueGameTypes = Array.from(
            new Set(
              cabinetsData
                .map(cabinet => cabinet.game || cabinet.installedGame)
                .filter(game => game && game.trim() !== '')
            )
          ).sort();
          setGameTypes(uniqueGameTypes);
        } else {
          console.error(
            '❌ [USE CABINET DATA] Cabinets data is not in expected format:',
            cabinetsData
          );
          setAllCabinets([]);
          setTotalCount(0);
          setError('Invalid data format received from server');
        }

        // Fetch metrics totals separately (for metrics cards) - always fetch all machines totals
        setMetricsTotalsLoading(true);
        try {
          const totals = await fetchCabinetTotals(
            activeMetricsFilter,
            customDateRange,
            selectedLicencee,
            displayCurrency
          );
          setMetricsTotals(totals);
        } catch (error) {
          console.error('Failed to fetch cabinet metrics totals:', error);
          setMetricsTotals(null);
        } finally {
          setMetricsTotalsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching cabinet data:', error);
        setAllCabinets([]);
        setTotalCount(0);
        setError(
          error instanceof Error ? error.message : 'Failed to load cabinets'
        );
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [
      selectedLicencee,
      activeMetricsFilter,
      customDateRange,
      displayCurrency,
      debouncedSearchTerm,
    ]
  );

  // Effect hooks for data loading
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    loadCabinets();
  }, [loadCabinets]);

  // Frontend-first filtering for location/status, with backend fallback when no results
  useEffect(() => {
    // Only consider fallback when we actually have some cabinets loaded
    if (!allCabinets.length) {
      return;
    }

    const hasLocationOrStatusFilter =
      (selectedLocation && selectedLocation !== 'all') ||
      (selectedStatus &&
        selectedStatus !== 'All' &&
        selectedStatus !== 'all');

    if (!hasLocationOrStatusFilter) {
      return;
    }

    const filterKey = `${selectedLocation}|${selectedStatus}|${selectedGameType}|${debouncedSearchTerm}`;

    // If frontend filtering returns zero results for the current filters,
    // perform a backend query without pagination to ensure we didn't miss
    // matches that live outside the initial batch.
    if (
      filteredCabinets.length === 0 &&
      !loading &&
      filterKey !== lastFilterBackendKey
    ) {
      setLastFilterBackendKey(filterKey);
      // Fetch full dataset for this licensee/time period/currency, then
      // frontend filters will re-run automatically on the larger set.
      // Passing undefined page/limit lets the API decide (typically "all").
      // We intentionally ignore the returned promise here – errors are
      // handled inside loadCabinets.
      void loadCabinets(undefined, undefined);
    }
  }, [
    allCabinets.length,
    filteredCabinets.length,
    selectedLocation,
    selectedStatus,
    selectedGameType,
    debouncedSearchTerm,
    loading,
    lastFilterBackendKey,
    loadCabinets,
  ]);

  // Removed useEffect for filtering - now handled by memoized filteredCabinets

  return {
    // Data states
    allCabinets,
    filteredCabinets,
    locations,
    gameTypes,
    financialTotals,
    metricsTotals,
    totalCount,

    // Loading states
    initialLoading,
    loading,
    metricsTotalsLoading,
    error,

    // Actions
    loadCabinets,
    loadLocations,
    filterCabinets,
    setError,
  };
};
