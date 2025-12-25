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

import { fetchCabinetsForLocation } from '@/lib/helpers/cabinets';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useDebounce } from '@/lib/utils/hooks';
import { calculateCabinetFinancialTotals } from '@/lib/utils/financial';
import { filterAndSortCabinets } from '@/lib/utils/ui';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { getAuthHeaders } from '@/lib/utils/auth';
import { useRouter } from 'next/navigation';

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
  | 'lastOnline';

type UseLocationCabinetsDataProps = {
  locationId: string;
  selectedLicencee: string | null;
  activeMetricsFilter: string | null;
  customDateRange: { startDate: Date | string; endDate: Date | string } | null;
  dateFilterInitialized: boolean;
  filtersInitialized: boolean;
  isAdminUser: boolean;
  setDateFilterInitialized: (value: boolean) => void;
  setFiltersInitialized: (value: boolean) => void;
};

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
  const router = useRouter();
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
  const [selectedStatus, setSelectedStatus] = useState<
    'All' | 'Online' | 'Offline'
  >('All');
  const [selectedGameType, setSelectedGameType] = useState<string>('all');
  const [allCabinets, setAllCabinets] = useState<Cabinet[]>([]);
  const [accumulatedCabinets, setAccumulatedCabinets] = useState<Cabinet[]>([]);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [sortOption, setSortOption] = useState<CabinetSortOption>('moneyIn');
  const [currentPage, setCurrentPage] = useState(0);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>(
    []
  );
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Refs for preventing duplicate requests
  const cabinetsRequestInProgress = useRef(false);
  const prevCabinetsFetchKey = useRef<string>('');

  // ============================================================================
  // Constants
  // ============================================================================
  const itemsPerPage = 10;
  const itemsPerBatch = 50;
  const pagesPerBatch = itemsPerBatch / itemsPerPage; // 5

  // ============================================================================
  // Computed Values
  // ============================================================================
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const financialTotals = useMemo(
    () => calculateCabinetFinancialTotals(allCabinets),
    [allCabinets]
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
      return Math.floor(page / pagesPerBatch) + 1;
    },
    [pagesPerBatch]
  );

  // Determine the full source set to work from (all loaded cabinets for the period)
  const sourceCabinets = useMemo(
    () => (debouncedSearchTerm?.trim() ? allCabinets : accumulatedCabinets),
    [allCabinets, accumulatedCabinets, debouncedSearchTerm]
  );

  // Calculate total pages based on the filtered & sorted set
  const effectiveTotalPages = useMemo(() => {
    const totalItems = filteredCabinets.length;
    const totalPagesFromItems = Math.ceil(totalItems / itemsPerPage);
    return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
  }, [filteredCabinets.length, itemsPerPage]);

  // Get paginated cabinets for current page
  const paginatedCabinets = useMemo(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredCabinets.slice(startIndex, endIndex);
  }, [filteredCabinets, currentPage, itemsPerPage]);

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

    // Apply status filter
    if (selectedStatus && selectedStatus !== 'All') {
      filtered = filtered.filter(cabinet => {
        if (selectedStatus === 'Online') {
          return cabinet.online === true;
        } else if (selectedStatus === 'Offline') {
          return cabinet.online === false;
        }
        return true;
      });
    }

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
  useEffect(() => {
    setAllCabinets(accumulatedCabinets);
  }, [accumulatedCabinets]);

  // ============================================================================
  // Effects - Batch Loading
  // ============================================================================
  useEffect(() => {
    if (loading || cabinetsLoading || !activeMetricsFilter) return;

    const currentBatch = calculateBatchNumber(currentPage);

    // Check if we're on the last page of the current batch
    const isLastPageOfBatch = (currentPage + 1) % pagesPerBatch === 0;
    const nextBatch = currentBatch + 1;

    // Fetch next batch if we're on the last page of current batch and haven't loaded it yet
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      const nextBatchNumber = nextBatch;
      // Don't fetch next batch if searching (search fetches all results)
      if (debouncedSearchTerm?.trim()) {
        return;
      }

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
                  : new Date(customDateRange.startDate),
              to:
                customDateRange.endDate instanceof Date
                  ? customDateRange.endDate
                  : new Date(customDateRange.endDate),
            }
          : undefined,
        nextBatchNumber,
        itemsPerBatch,
        displayCurrency
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
                  : new Date(customDateRange.startDate),
              to:
                customDateRange.endDate instanceof Date
                  ? customDateRange.endDate
                  : new Date(customDateRange.endDate),
            }
          : undefined,
        currentBatch,
        itemsPerBatch,
        displayCurrency
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
    locationId,
    selectedLicencee,
    customDateRange,
    calculateBatchNumber,
    pagesPerBatch,
    debouncedSearchTerm,
    displayCurrency,
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
    const fetchKey = `${locationId}-${selectedLicencee}-${activeMetricsFilter}-${dateRangeKey}-${debouncedSearchTerm}-${displayCurrency}`;

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
            : itemsPerBatch;

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
                        : new Date(customDateRange.startDate),
                    to:
                      customDateRange.endDate instanceof Date
                        ? customDateRange.endDate
                        : new Date(customDateRange.endDate),
                  }
                : undefined,
              effectivePage,
              effectiveLimit,
              displayCurrency,
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
        setLoading(false);
        setCabinetsLoading(false);
        cabinetsRequestInProgress.current = false;
      }
    };

    fetchData();
  }, [
    locationId,
    selectedLicencee,
    activeMetricsFilter,
    customDateRange,
    dateFilterInitialized,
    router,
    isAdminUser,
    debouncedSearchTerm,
    displayCurrency,
    makeCabinetsRequest,
    filtersInitialized,
    locationMembershipEnabled,
  ]);

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
    loading,
    cabinetsLoading,
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
    financialTotals,
    gameTypes,
    effectiveTotalPages,
    paginatedCabinets,
    debouncedSearchTerm,
    // Setters
    setSearchTerm,
    setSelectedStatus,
    setSelectedGameType,
    setSortOrder,
    setSortOption,
    setCurrentPage,
    setSelectedLocationId,
    // Handlers
    refreshCabinets,
  };
}

