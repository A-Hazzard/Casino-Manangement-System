/**
 * useLocationCabinetsData Hook
 *
 * Manages all cabinet-related state, data fetching, filtering, sorting, and pagination
 * for the location details page.
 *
 * Features:
 * - Cabinet data fetching with batch loading
 * - Search functionality with debouncing
 * - Filtering by status and game type
 * - Sorting by various cabinet properties
 * - Pagination with batch management
 * - Location data fetching and validation
 */

'use client';

import {
    fetchCabinetsForLocation
} from '@/lib/helpers/cabinets';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { dateRange as DateRange } from '@/lib/types';
import { getAuthHeaders } from '@/lib/utils/auth';
import { isAbortError } from '@/lib/utils/errors';
import { calculateCabinetFinancialTotals } from '@/lib/utils/financial';
import { useDebounce } from '@/lib/utils/hooks';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import { filterAndSortCabinets } from '@/lib/utils/ui';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import axios from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type CabinetSortOption =
  | 'assetNumber'
  | 'locationName'
  | 'moneyIn'
  | 'moneyOut'
  | 'jackpot'
  | 'gross'
  | 'cancelledCredits'
  | 'game'
  | 'smbId'
  | 'serialNumber'
  | 'lastOnline'
  | 'offlineTime';

type UseLocationCabinetsDataProps = {
  locationId: string;
  selectedLicencee: string | null;
  activeMetricsFilter: string | null;
  customDateRange: DateRange | null;
  dateFilterInitialized: boolean;
  filtersInitialized: boolean;
  isAdminUser: boolean;
  setDateFilterInitialized: (value: boolean) => void;
  setFiltersInitialized: (value: boolean) => void;
};

const ITEMS_PER_PAGE = 20;
const ITEMS_PER_BATCH = 100;
const PAGES_PER_BATCH = ITEMS_PER_BATCH / ITEMS_PER_PAGE; // 5

export function useLocationCabinetsData({
  locationId,
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  dateFilterInitialized,
  filtersInitialized,
  isAdminUser,
  setDateFilterInitialized,
  setFiltersInitialized,
}: UseLocationCabinetsDataProps) {
  const { displayCurrency } = useCurrencyFormat();
  const makeCabinetsRequest = useAbortableRequest();

  // ============================================================================
  // State Management
  // ============================================================================
  const [filteredCabinets, setFilteredCabinets] = useState<Cabinet[]>([]);
  const [loading, setLoading] = useState(true);
  const [cabinetsLoading, setCabinetsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationName, setLocationName] = useState('');
  const [locationMembershipEnabled, setLocationMembershipEnabled] =
    useState<boolean>(false);
  const [locationData, setLocationData] = useState<{
    geoCoords?: {
      latitude?: number;
      longitude?: number;
      longtitude?: number;
    };
  } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const [allCabinets, setAllCabinets] = useState<Cabinet[]>([]);
  const [accumulatedCabinets, setAccumulatedCabinets] = useState<Cabinet[]>([]);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortOption, setSortOption] = useState<CabinetSortOption>('moneyIn');
  const [currentPage, setCurrentPage] = useState(0);

  // Effect to handle automatic sorting when status changes to Offline sorting variants
  useEffect(() => {
    if (selectedStatus === 'OfflineLongest') {
      setSortOption('offlineTime');
      setSortOrder('desc');
    } else if (selectedStatus === 'OfflineShortest') {
      setSortOption('offlineTime');
      setSortOrder('asc');
    }
  }, [selectedStatus]);

  const [locations, setLocations] = useState<{ id: string; name: string }[]>(
    []
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Add isFilterResetting state to handle transitions without "No Data" flash
  const [isFilterResetting, setIsFilterResetting] = useState(false);

  // Refs for preventing duplicate requests
  const cabinetsRequestInProgress = useRef(false);
  const prevCabinetsFetchKey = useRef<string>('');


  // ============================================================================
  // Computed Values
  // ============================================================================
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const financialTotals = useMemo(
    () =>
      filteredCabinets.length > 0
        ? calculateCabinetFinancialTotals(filteredCabinets)
        : null,
    [filteredCabinets]
  );

  const gameTypes = useMemo(() => {
    const uniqueGameTypes = Array.from(
      new Set(
        allCabinets
          .map(cabinet => cabinet.game || cabinet.installedGame)
          .filter((game): game is string => !!game && game.trim() !== '')
      )
    ).sort();
    return uniqueGameTypes;
  }, [allCabinets]);

  const calculateBatchNumber = useCallback(
    (page: number) => {
      return Math.floor(page / PAGES_PER_BATCH) + 1;
    },
    []
  );

  // Determine the full source set to work from (all loaded cabinets for the period)
  const sourceCabinets = useMemo(
    () => (debouncedSearchTerm?.trim() ? allCabinets : accumulatedCabinets),
    [allCabinets, accumulatedCabinets, debouncedSearchTerm]
  );

  // Calculate total pages based on the filtered & sorted set
  const effectiveTotalPages = useMemo(() => {
    const totalItems = filteredCabinets.length;
    const totalPagesFromItems = Math.ceil(totalItems / ITEMS_PER_PAGE);
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [filteredCabinets.length]);

  // Get paginated cabinets for current page
  const paginatedCabinets = useMemo(() => {
    const startIndex = currentPage * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredCabinets.slice(startIndex, endIndex);
  }, [filteredCabinets, currentPage]);

  // ============================================================================
  // Filter & Sort Logic
  // ============================================================================
  const applyFiltersAndSort = useCallback(() => {
    // When searchTerm is provided, API already filtered the results
    // We only need to apply sorting and other filters (game type, status)
    let filtered = filterAndSortCabinets(
      sourceCabinets,
      '', // Empty search term since API already handled search filtering
      sortOption,
      sortOrder
    );

    // Apply game type filter
    if (selectedGameType && selectedGameType !== 'all') {
      filtered = filtered.filter(cabinet => {
        const cabinetGame = cabinet.game || cabinet.installedGame;
        return cabinetGame === selectedGameType;
      });
    }

    // Filter out machines with N/A identifier to match the grid display
    // and ensure financial totals only reflect visible machines
    filtered = filtered.filter(cabinet => getSerialNumberIdentifier(cabinet) !== 'N/A');

    setFilteredCabinets(filtered);
  }, [sourceCabinets, sortOption, sortOrder, selectedStatus, selectedGameType]);

  // ============================================================================
  // Effects - Filter & Sort
  // ============================================================================
  useEffect(() => {
    applyFiltersAndSort();
  }, [applyFiltersAndSort]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(0);
  }, [sortOption, sortOrder, selectedStatus, selectedGameType]);

  // Reset to default view when search is cleared
  useEffect(() => {
    if (!debouncedSearchTerm?.trim()) {
      setCurrentPage(0);
      setAccumulatedCabinets([]);
      setLoadedBatches(new Set([1]));
    }
  }, [debouncedSearchTerm]);

  // Update allCabinets when accumulatedCabinets changes
  // Update allCabinets when accumulatedCabinets changes
  useEffect(() => {
    // Only update if we have data or if filters are actively resetting
    // This prevents clearing allCabinets unnecessarily during intermediate states
    if (accumulatedCabinets.length > 0) {
      setAllCabinets(accumulatedCabinets);
    } else if (isFilterResetting && accumulatedCabinets.length === 0) {
      // If we cleared accumulatedCabinets explicitly (filter change), reflect that
      setAllCabinets([]);
    }
  }, [accumulatedCabinets, isFilterResetting]);

  // ============================================================================
  // Effects - Batch Loading
  // ============================================================================
  useEffect(() => {
    if (loading || cabinetsLoading || !activeMetricsFilter) return;

    const currentBatch = calculateBatchNumber(currentPage);

    const isLastPageOfBatch = (currentPage + 1) % PAGES_PER_BATCH === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      const nextBatchNumber = nextBatch;
      // Don't fetch next batch if searching (search fetches all results)
      if (debouncedSearchTerm?.trim()) {
        return;
      }

      // Convert selectedStatus to onlineStatus format for API
      const onlineStatus =
        selectedStatus === 'All'
          ? 'all'
          : selectedStatus === 'Online'
            ? 'online'
            : selectedStatus === 'NeverOnline'
              ? 'never-online'
              : selectedStatus.startsWith('Offline')
                ? 'offline'
                : 'all';

      fetchCabinetsForLocation(
        locationId,
        selectedLicencee ?? undefined,
        activeMetricsFilter,
        undefined, // No searchTerm for batch fetching
              activeMetricsFilter === 'Custom' && customDateRange
                ? {
                    from:
                      customDateRange.startDate instanceof Date
                        ? customDateRange.startDate
                        : customDateRange.startDate
                          ? new Date(customDateRange.startDate)
                          : customDateRange.from
                            ? new Date(customDateRange.from)
                            : undefined,
                    to:
                      customDateRange.endDate instanceof Date
                        ? customDateRange.endDate
                        : customDateRange.endDate
                          ? new Date(customDateRange.endDate)
                          : customDateRange.to
                            ? new Date(customDateRange.to)
                            : undefined,
                  }
                : undefined,
        PAGES_PER_BATCH,
        ITEMS_PER_BATCH,
        onlineStatus
      ).then(result => {
        if (result.data.length > 0) {
          setLoadedBatches(prev => new Set([...prev, nextBatchNumber]));
          setAccumulatedCabinets(prev => {
            const existingIds = new Set(prev.map(cab => cab._id));
            const newCabinets = result.data.filter(
              cab => !existingIds.has(cab._id)
            );
            return [...prev, ...newCabinets];
          });
        }
      });
    }

    // Also ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      // Don't fetch batch if searching (search fetches all results)
      if (debouncedSearchTerm?.trim()) {
        return;
      }

      // Convert selectedStatus to onlineStatus format for API
      const onlineStatus =
        selectedStatus === 'All'
          ? 'all'
          : selectedStatus === 'Online'
            ? 'online'
            : selectedStatus === 'NeverOnline'
              ? 'never-online'
              : selectedStatus.startsWith('Offline')
                ? 'offline'
                : 'all';

      fetchCabinetsForLocation(
        locationId,
        selectedLicencee ?? undefined,
        activeMetricsFilter,
        undefined, // No searchTerm for batch fetching
              activeMetricsFilter === 'Custom' && customDateRange
                ? {
                    from:
                      customDateRange.startDate instanceof Date
                        ? customDateRange.startDate
                        : customDateRange.startDate
                          ? new Date(customDateRange.startDate)
                          : customDateRange.from
                            ? new Date(customDateRange.from)
                            : undefined,
                    to:
                      customDateRange.endDate instanceof Date
                        ? customDateRange.endDate
                        : customDateRange.endDate
                          ? new Date(customDateRange.endDate)
                          : customDateRange.to
                            ? new Date(customDateRange.to)
                            : undefined,
                  }
                : undefined,
        currentBatch,
        ITEMS_PER_BATCH,
        displayCurrency,
        onlineStatus
      ).then(result => {
        if (result.data.length > 0) {
          setLoadedBatches(prev => new Set([...prev, currentBatch]));
          setAccumulatedCabinets(prev => {
            const existingIds = new Set(prev.map(cab => cab._id));
            const newCabinets = result.data.filter(
              cab => !existingIds.has(cab._id)
            );
            return [...prev, ...newCabinets];
          });
        }
      });
    }
  }, [
    currentPage,
    loading,
    cabinetsLoading,
    activeMetricsFilter,
    loadedBatches,
    calculateBatchNumber,
    PAGES_PER_BATCH,
    debouncedSearchTerm,
    displayCurrency,
    selectedStatus,
  ]);

  // ============================================================================
  // Effects - Data Fetching
  // ============================================================================
  useEffect(() => {
    // Create a unique key for this fetch to detect actual filter changes
    const dateRangeKey =
      activeMetricsFilter === 'Custom' && customDateRange
        ? JSON.stringify(customDateRange)
        : 'none';

    const fetchKey = `${locationId}-${selectedLicencee}-${activeMetricsFilter}-${dateRangeKey}-${debouncedSearchTerm}-${displayCurrency}-${selectedStatus}`;

    const fetchData = async () => {
      // Only proceed if filters are initialized
      if (
        !activeMetricsFilter ||
        !dateFilterInitialized ||
        !filtersInitialized
      ) {
        setAllCabinets([]);
        setAccumulatedCabinets([]);
        setLoadedBatches(new Set());
        setLoading(false);
        setCabinetsLoading(false);
        return;
      }

      // Prevent duplicate requests
      if (prevCabinetsFetchKey.current === fetchKey) {
        if (!cabinetsRequestInProgress.current) {
          setLoading(false);
          setCabinetsLoading(false);
          setIsFilterResetting(false);
        }
        return;
      }

      // Prevent concurrent requests
      if (cabinetsRequestInProgress.current) {
        return;
      }

      prevCabinetsFetchKey.current = fetchKey;
      cabinetsRequestInProgress.current = true;
      setLoading(true);
      setCabinetsLoading(true);

      try {
        // First, try to fetch location details to check access
        try {
          const locationResponse = await axios.get(
            `/api/locations/${locationId}`,
            {
              headers: getAuthHeaders(),
            }
          );

          const locationData =
            locationResponse.data?.location || locationResponse.data;
          if (locationData) {
            setLocationName(locationData.name || 'Location');
            setSelectedLocationId(locationId);
            setLocationMembershipEnabled(
              locationData.membershipEnabled === true ||
                locationData.enableMembership === true
            );
            setLocationData(locationData);
          }
        } catch (locationError) {
          const errorWithStatus = locationError as Error & {
            status?: number;
            isUnauthorized?: boolean;
            response?: { status?: number };
          };

          if (
            errorWithStatus?.response?.status === 403 ||
            errorWithStatus?.status === 403 ||
            errorWithStatus?.isUnauthorized ||
            (locationError instanceof Error &&
              locationError.message?.includes('Unauthorized')) ||
            (locationError instanceof Error &&
              locationError.message?.includes('do not have access'))
          ) {
            setError('UNAUTHORIZED');
            setLoading(false);
            setCabinetsLoading(false);
            return;
          } else if (errorWithStatus?.response?.status === 404) {
            setError('Location not found');
            setLoading(false);
            setCabinetsLoading(false);
            return;
          }
        }

        // Fetch locations for the selected licensee
        const formattedLocations = await fetchAllGamingLocations(
          isAdminUser ? 'all' : (selectedLicencee ?? undefined)
        );
        setLocations(formattedLocations);

        const currentLocation = formattedLocations.find(
          loc => loc.id === locationId
        );

        if (currentLocation && !locationMembershipEnabled) {
          const hasMembership =
            (
              currentLocation as {
                membershipEnabled?: boolean;
                enableMembership?: boolean;
              }
            ).membershipEnabled === true ||
            (
              currentLocation as {
                membershipEnabled?: boolean;
                enableMembership?: boolean;
              }
            ).enableMembership === true;
          if (hasMembership) {
            setLocationMembershipEnabled(true);
          }
        }

        const currentLocationAlt = formattedLocations.find(
          loc => loc.id.toString() === locationId
        );

        const foundLocation = currentLocation || currentLocationAlt;

        if (!foundLocation && formattedLocations.length > 0) {
          setSelectedLocationId('');
          setLocationName('');
          setAllCabinets([]);
          setAccumulatedCabinets([]);
          setLoadedBatches(new Set());
          setError('Location not found');
          setLoading(false);
          setCabinetsLoading(false);
          return;
        } else if (formattedLocations.length === 0) {
          setSelectedLocationId('');
          setLocationName('');
          setAllCabinets([]);
          setAccumulatedCabinets([]);
          setLoadedBatches(new Set());
          setError('No locations found for the selected licensee.');
          setLoading(false);
          setCabinetsLoading(false);
          return;
        }

        if (foundLocation) {
          setLocationName(foundLocation.name);
          setSelectedLocationId(foundLocation.id);
        }

        // Fetch cabinets data
        try {
          if (!activeMetricsFilter) {
            setAllCabinets([]);
            setAccumulatedCabinets([]);
            setLoadedBatches(new Set());
            setError('No time period filter selected');
            return;
          }

          const effectivePage = debouncedSearchTerm?.trim() ? 1 : 1;
          const effectiveLimit = debouncedSearchTerm?.trim()
            ? undefined
            : ITEMS_PER_BATCH;

          // Convert selectedStatus to onlineStatus format for API
          const onlineStatus =
            selectedStatus === 'All'
              ? 'all'
              : selectedStatus === 'Online'
                ? 'online'
                : selectedStatus === 'NeverOnline'
                  ? 'never-online'
                  : selectedStatus.startsWith('Offline')
                    ? 'offline'
                    : 'all';

          const result = await makeCabinetsRequest(async signal => {
            return await fetchCabinetsForLocation(
              locationId,
              selectedLicencee ?? undefined,
              activeMetricsFilter,
              debouncedSearchTerm?.trim() || undefined,
              activeMetricsFilter === 'Custom' && customDateRange
                ? {
                    from:
                      customDateRange.startDate instanceof Date
                        ? customDateRange.startDate
                        : customDateRange.startDate
                          ? new Date(customDateRange.startDate)
                          : customDateRange.from
                            ? new Date(customDateRange.from)
                            : undefined,
                    to:
                      customDateRange.endDate instanceof Date
                        ? customDateRange.endDate
                        : customDateRange.endDate
                          ? new Date(customDateRange.endDate)
                          : customDateRange.to
                            ? new Date(customDateRange.to)
                            : undefined,
                  }
                : undefined,
              effectivePage,
              effectiveLimit,
              displayCurrency,
              onlineStatus,
              signal
            );
          });

          if (!result) {
            return;
          }
          setAllCabinets(result.data);
          if (!debouncedSearchTerm?.trim()) {
            setAccumulatedCabinets(result.data);
            setLoadedBatches(new Set([1]));
          } else {
            setAccumulatedCabinets([]);
            setLoadedBatches(new Set());
          }
          setError(null);
        } catch (error) {
          // Silently handle aborted requests - this is expected behavior when switching filters
          if (isAbortError(error)) {
            return;
          }

          if (process.env.NODE_ENV === 'development') {
            console.error('Error fetching cabinets:', error);
          }

          const errorWithStatus = error as Error & {
            status?: number;
            isUnauthorized?: boolean;
            response?: { status?: number };
          };
          if (
            errorWithStatus?.status === 403 ||
            errorWithStatus?.isUnauthorized ||
            errorWithStatus?.response?.status === 403 ||
            (error instanceof Error &&
              error.message?.includes('Unauthorized')) ||
            (error instanceof Error &&
              error.message?.includes('do not have access'))
          ) {
            setError('UNAUTHORIZED');
            setAllCabinets([]);
            setAccumulatedCabinets([]);
            setLoadedBatches(new Set());
          } else {
            setAllCabinets([]);
            setAccumulatedCabinets([]);
            setLoadedBatches(new Set());
            setError('Failed to fetch cabinets data.');
          }
        }
      } finally {
        // Only turn off loading if the request completed and wasn't aborted/superseded
        if (cabinetsRequestInProgress.current && prevCabinetsFetchKey.current === fetchKey) {
          setLoading(false);
          setCabinetsLoading(false);
          cabinetsRequestInProgress.current = false;
        }
        // Ensure isFilterResetting is always reset when fetching completes or errors
        setIsFilterResetting(false);
      }
    };

    fetchData();
  }, [
    locationId,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    dateFilterInitialized,
    makeCabinetsRequest,
    filtersInitialized,
    debouncedSearchTerm,
    displayCurrency,
    selectedStatus,
  ]);
  
  // Clear isFilterResetting when new data arrives
  useEffect(() => {
    if (allCabinets.length > 0) {
      setIsFilterResetting(false);
    }
  }, [allCabinets]);

  // Initialize filters flag
  useEffect(() => {
    if (activeMetricsFilter) {
      if (!dateFilterInitialized) {
        setDateFilterInitialized(true);
      }
      if (!filtersInitialized) {
        setFiltersInitialized(true);
      }
    }
  }, [activeMetricsFilter, dateFilterInitialized, filtersInitialized, setDateFilterInitialized, setFiltersInitialized]);

  // ============================================================================
  // Refresh Handler
  // ============================================================================
  const refreshCabinets = useCallback(async () => {
    setRefreshing(true);
    prevCabinetsFetchKey.current = '';
    // Trigger refetch by clearing and resetting
    setAllCabinets([]);
    setAccumulatedCabinets([]);
    setLoadedBatches(new Set());
    setRefreshing(false);
  }, []);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    // State
    filteredCabinets,
    loading: loading || cabinetsLoading || isFilterResetting,
    cabinetsLoading: cabinetsLoading || isFilterResetting,
    searchTerm,
    locationName,
    locationMembershipEnabled,
    locationData,
    selectedStatus,
    selectedGameType,
    allCabinets,
    accumulatedCabinets,
    loadedBatches,
    sortOrder,
    sortOption,
    currentPage,
    locations,
    selectedLocationId,
    error,
    refreshing,
    gameTypes,
    effectiveTotalPages,
    paginatedCabinets,
    debouncedSearchTerm,
    financialTotals,
    // Setters
    setSearchTerm,
    setSelectedStatus: useCallback((status: string) => {
      setIsFilterResetting(true);
      setAccumulatedCabinets([]);
      setSelectedStatus(status);
    }, []),
    setSelectedGameType,
    setSortOrder,
    setSortOption,
    setCurrentPage,
    setSelectedLocationId,
    // Handlers
    refreshCabinets,
  };
}


