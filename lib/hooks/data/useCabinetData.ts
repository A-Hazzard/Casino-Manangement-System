/**
 * Custom hook for managing cabinet data fetching and state
 * Handles loading, filtering, and error states for cabinet operations
 */

import {
  fetchCabinetLocations,
  fetchCabinets,
  fetchCabinetTotals,
} from '@/lib/helpers/cabinets';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { dateRange } from '@/lib/types/index';
import { isAbortError } from '@/lib/utils/errors';
import { 
  calculateCabinetFinancialTotals,
  type FinancialTotals 
} from '@/lib/utils/financial/totals';
import { useDebounce } from '@/lib/utils/hooks';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type UseCabinetDataProps = {
  selectedLicencee: string;
  activeMetricsFilter: string;
  customDateRange?: dateRange;
  searchTerm: string;
  selectedLocation: string[];
  selectedGameType: string[];
  selectedStatus: string;
  displayCurrency?: string;
};

type UseCabinetDataReturn = {
  // Data states
  allCabinets: Cabinet[];
  filteredCabinets: Cabinet[];
  locations: { _id: string; name: string; includeJackpot?: boolean }[];
  gameTypes: string[];
  financialTotals: FinancialTotals;
  metricsTotals: FinancialTotals | null;
  totalCount: number;

  // Loading states
  initialLoading: boolean;
  loading: boolean;
  metricsTotalsLoading: boolean;
  error: string | null;

  // Actions
  loadCabinets: (
    page?: number,
    limit?: number,
    sortBy?: string,
    sortOrder?: 'asc' | 'desc'
  ) => Promise<void>;
  loadLocations: () => Promise<void>;
  filterCabinets: (
    cabinets: Cabinet[],
    searchTerm: string,
    selectedLocation: string[],
    selectedGameType: string[],
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
  const [loading, setLoading] = useState(false); // Start as false, will be set to true when loadCabinets is called
  const [error, setError] = useState<string | null>(null);
  const [allCabinets, setAllCabinets] = useState<Cabinet[]>([]);
  // Use refs to track first load - these reset when allCabinets is cleared
  const hasReceivedFirstResponseRef = useRef(false);
  const hasStartedFirstLoadRef = useRef(false);
  const activeRequestsRef = useRef(0);

  // Reset refs and initialLoading when data is cleared (fresh page load scenario)
  // This ensures skeleton shows on initial load even if refs persisted from previous session
  useEffect(() => {
    if (
      allCabinets.length === 0 &&
      !loading &&
      !hasReceivedFirstResponseRef.current
    ) {
      // Fresh start: reset refs and ensure initialLoading is true
      hasReceivedFirstResponseRef.current = false;
      hasStartedFirstLoadRef.current = false;
      setInitialLoading(true);
    }
  }, [allCabinets.length, loading]);

  // Sync initialLoading with actual data state after first response
  // This handles async state updates - when allCabinets updates after setAllCabinets,
  // we can safely set initialLoading to false
  useEffect(() => {
    if (hasReceivedFirstResponseRef.current && initialLoading) {
      // First response was received, now that state has updated, set initialLoading to false
      setInitialLoading(false);
    }
  }, [allCabinets.length, initialLoading, loading]);

  // Removed filteredCabinets state - now using memoized value for better performance
  const [locations, setLocations] = useState<{ _id: string; name: string; includeJackpot?: boolean }[]>(
    []
  );
  const [gameTypes, setGameTypes] = useState<string[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);

  // Separate state for metrics totals (from dedicated API call)
  const [metricsTotals, setMetricsTotals] = useState<FinancialTotals | null>(null);
  const [metricsTotalsLoading, setMetricsTotalsLoading] = useState(false);

  // AbortController for canceling previous requests
  const makeRequest = useAbortableRequest();

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
      console.warn('Loading cabinet locations for licencee:', selectedLicencee);
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
    // Location filter is now handled by the API (passed via locationId parameter)
    // We only need to apply frontend filters (game type, status)
    return allCabinets.filter(cabinet => {
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

      // 3. Status filter (if not 'All', filter by onlineStatus)
      if (selectedStatus !== 'All' && selectedStatus !== 'all') {
        const isOnline = cabinet.online === true;

        if (selectedStatus === 'NeverOnline') {
          // Never Online: Offline AND (no activity OR never online)
          // Note: API filtering handles this more reliably, but for client-side search/filter:
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
  }, [
    allCabinets,
    searchTerm,
    selectedLocation,
    selectedGameType,
    selectedStatus,
  ]);

  // Legacy filterCabinets function for backward compatibility (now just updates state)
  const filterCabinets = useCallback(() => {
  }, []);

  // Load cabinets with proper error handling and logging
  const loadCabinets = useCallback(
    async (page?: number, limit?: number, sortBy?: string, sortOrder?: 'asc' | 'desc') => {
      // Synchronously increment and set loading to prevent the "No data" flash
      activeRequestsRef.current++;
      setLoading(true);
      setError(null);

      if (page === 1 || !page) {
        hasStartedFirstLoadRef.current = false;
        hasReceivedFirstResponseRef.current = false;
        setInitialLoading(true);
        setAllCabinets([]);
        setTotalCount(0);
      }

      const result = await makeRequest(async signal => {
        console.warn('[useCabinetData] Loading cabinets with filters:', {
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
          selectedLocation,
          selectedGameType,
          selectedStatus,
        });

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

        // Convert selectedStatus to onlineStatus format for API
        const onlineStatus =
          selectedStatus === 'All' || selectedStatus === 'all'
            ? 'all'
            : selectedStatus === 'Online'
              ? 'online'
              : selectedStatus === 'NeverOnline'
                ? 'never-online'
                : selectedStatus.startsWith('Offline')
                  ? 'offline'
                  : selectedStatus === 'Archived'
                    ? 'archived'
                    : 'all';

        const result = await fetchCabinets(
          selectedLicencee,
          activeMetricsFilter,
          dateRangeForFetch,
          displayCurrency,
          effectivePage,
          effectiveLimit,
          debouncedSearchTerm,
          selectedLocation,
          selectedGameType,
          onlineStatus,
          signal,
          sortBy,
          sortOrder
        );

        return result;
      }, 'cabinets');

      // Only update state if request wasn't aborted
      if (!result) {
        // Always decrement on completion (even aborts)
        activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);
        if (activeRequestsRef.current === 0) {
          setLoading(false);
          // Note: We deliberately DO NOT set initialLoading to false here.
          // In React 18 Strict Mode, the first request is aborted on unmount.
          // If we set initialLoading=false here, the subsequent remount will paint
          // an empty "No Data" state before the next effect can fetch data.
          // Leaving it true ensures the skeleton loader persists through the Strict Mode remount.
        }
        return;
      }

      // Calculate result data length BEFORE try block for use in finally
      // This avoids async state update timing issues
      const resultDataLength = Array.isArray(result)
        ? result.length
        : result && typeof result === 'object' && 'cabinets' in result
          ? (result as { cabinets: unknown[] }).cabinets.length
          : 0;

      try {
        console.warn('✅ [USE CABINET DATA] Fetch completed, received:', {
          isArray: Array.isArray(result),
          isObject:
            typeof result === 'object' &&
            result !== null &&
            !Array.isArray(result),
          length: resultDataLength,
          type: typeof result,
        });

        // Handle paginated response
        if (
          result &&
          typeof result === 'object' &&
          !Array.isArray(result) &&
          'cabinets' in result
        ) {
          const paginatedResponse = result as {
            cabinets: Cabinet[];
            pagination?: {
              total: number;
              totalPages: number;
              page: number;
              limit: number;
            };
          };

          // NOTE: reviewer multiplier is applied server-side — no client-side scaling needed
          const scaledCabinets = paginatedResponse.cabinets;

          if (page === 1 || !page) {
            setAllCabinets(scaledCabinets);
          } else {
            setAllCabinets((prev: Cabinet[]) => {
              const existingIds = new Set(prev.map(c => c._id));
              const uniqueNew = scaledCabinets.filter(
                (c: Cabinet) => !existingIds.has(c._id)
              );
              return [...prev, ...uniqueNew];
            });
          }
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
        } else if (Array.isArray(result)) {
          // Backward compatibility: direct array response
          // NOTE: reviewer multiplier is applied server-side — no client-side scaling needed
          const scaledResult = result;
          setAllCabinets(scaledResult);
          setTotalCount(scaledResult.length);

          const uniqueGameTypes = Array.from(
            new Set(
              scaledResult
                .map(cabinet => cabinet.game || cabinet.installedGame)
                .filter(game => game && game.trim() !== '')
            )
          ).sort();
          setGameTypes(uniqueGameTypes);
        } else {
          setAllCabinets([]);
          setTotalCount(0);
          setError('Invalid data format received from server');
        }

        // Metrics totals fetch moved to dedicated effect to avoid race conditions
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(error)) {
          return;
        }

        console.error('Error fetching cabinet data:', error);
        setAllCabinets([]);
        setTotalCount(0);
        setError(
          error instanceof Error ? error.message : 'Failed to load cabinets'
        );
      } finally {
        // Always decrement on completion
        activeRequestsRef.current = Math.max(0, activeRequestsRef.current - 1);

        // Only set loading to false if this was the last active request
        if (activeRequestsRef.current === 0) {
          setLoading(false);
          if (!hasReceivedFirstResponseRef.current) {
            hasReceivedFirstResponseRef.current = true;
            setInitialLoading(false);
          }
        }
      }
    },
    [
      selectedLicencee,
      activeMetricsFilter,
      customDateRange,
      displayCurrency,
      debouncedSearchTerm,
      selectedLocation,
      selectedStatus,
      makeRequest,
    ]
  );

  // Ref to store the latest loadCabinets function to avoid dependency issues in useEffect
  const loadCabinetsRef = useRef(loadCabinets);

  // Update ref whenever loadCabinets changes
  useEffect(() => {
    loadCabinetsRef.current = loadCabinets;
  }, [loadCabinets]);

  // Effect hooks for data loading
  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  // Note: loadCabinets is called explicitly by the page component
  // This ensures proper control over when data is fetched

  // DISABLED: This effect was causing duplicate API calls
  // The parent component (useCabinetsPageData) already handles filter change refetches
  // Keeping this code commented for reference but it should NOT be re-enabled
  // 
  // Trigger refetch when status or location filter changes (filtering is now done at API level)
  // Note: This replaces the old frontend-first filtering approach since status filtering
  // is now handled at the database query level for better performance
  /*
  useEffect(() => {
    // Only trigger if we have the necessary filters initialized
    if (!activeMetricsFilter) {
      return;
    }

    // Skip initial load (handled by page component)
    if (!hasReceivedFirstResponseRef.current) {
      return;
    }

    // Create a unique key for this filter combination (only status and location since they're API-level)
    // Normalize status to handle both 'All'/'all' and 'Online'/'Offline'
    const filterKey = `${selectedLocation}|${selectedStatus}`;

    // Skip if this is the same filter combination we just loaded
    if (filterKey === lastFilterBackendKey) {
      return;
    }

    // Trigger refetch when status or location changes (these are now API-level filters)
    // We trigger even when going back to "All" or "all" to ensure we get the full dataset
    console.warn('[useCabinetData] Status/Location filter changed, triggering refetch:', {
      selectedStatus,
      selectedLocation,
      filterKey,
      lastFilterBackendKey,
    });
    setLastFilterBackendKey(filterKey);
    if (loadCabinetsRef.current) {
      void loadCabinetsRef.current(1, 50);
    }
  }, [
    selectedLocation,
    selectedStatus,
    activeMetricsFilter,
    lastFilterBackendKey,
    loadCabinetsRef,
  ]);
  */

  // Removed useEffect for filtering - now handled by memoized filteredCabinets
  // Dedicated effect to fetch metrics totals reliably when filters change
  // Track if this is the initial mount to prevent aborting on first load
  const isInitialMountRef = useRef(true);
  const prevTotalsDepsRef = useRef<string>('');

  useEffect(() => {
    const shouldFetchCustom =
      activeMetricsFilter !== 'Custom' ||
      (customDateRange && customDateRange.startDate && customDateRange.endDate);

    if (!activeMetricsFilter || !shouldFetchCustom) {
      return;
    }

    // Create a dependency key to detect actual changes
    const depsKey = `${activeMetricsFilter}-${selectedLicencee || 'all'}-${displayCurrency || 'default'}-${customDateRange?.startDate?.getTime() || ''}-${customDateRange?.endDate?.getTime() || ''}-${selectedLocation.join(',')}-${selectedGameType.join(',')}-${selectedStatus}-${searchTerm}`;

    // On initial mount, don't abort anything (there's nothing to abort)
    // Only abort if dependencies actually changed (not on initial mount)
    const isInitialMount = isInitialMountRef.current;
    const depsChanged = prevTotalsDepsRef.current !== depsKey;

    if (isInitialMount) {
      isInitialMountRef.current = false;
      prevTotalsDepsRef.current = depsKey;
    } else if (!depsChanged) {
      // Dependencies haven't changed, skip fetching
      return;
    } else {
      // Dependencies changed, update the ref
      prevTotalsDepsRef.current = depsKey;
    }

    setMetricsTotalsLoading(true);
    (async () => {
      try {
        const totals = await makeRequest(
          async signal =>
            fetchCabinetTotals(
              activeMetricsFilter,
              customDateRange,
              selectedLicencee,
              displayCurrency,
              signal,
              selectedLocation,
              selectedGameType,
              selectedStatus === 'All' || selectedStatus === 'all'
                ? 'all'
                : selectedStatus === 'NeverOnline'
                  ? 'never-online'
                  : selectedStatus.startsWith('Offline')
                    ? 'offline'
                    : selectedStatus === 'Archived'
                      ? 'archived'
                      : selectedStatus.toLowerCase(),
              searchTerm
            ),
          'totals'
        );
        if (totals) {
          // NOTE: reviewer multiplier is applied server-side — no client-side scaling needed
          setMetricsTotals(totals);
        } else {
          setMetricsTotals(null);
        }
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(error)) {
          return;
        }

        console.error(
          '[useCabinetData] Failed to fetch metrics totals:',
          error
        );
        setMetricsTotals(null);
      } finally {
        setMetricsTotalsLoading(false);
      }
    })();
  }, [
    activeMetricsFilter,
    customDateRange,
    selectedLicencee,
    displayCurrency,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    searchTerm,
    makeRequest,
  ]);

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
