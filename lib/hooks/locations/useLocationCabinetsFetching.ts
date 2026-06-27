/**
 * useLocationCabinetsFetching Hook
 *
 * Handles all data fetching for location cabinets: cabinet list with batch loading,
 * metrics totals, location details, and refresh operations.
 */

'use client';

import { fetchCabinetsForLocation, fetchCabinetTotals } from '@/lib/helpers/cabinets';
import { fetchAllGamingLocations } from '@/lib/helpers/locations';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { dateRange as LibDateRange } from '@/lib/types';
import { isAbortError } from '@/lib/utils/errors';
import type { GamingMachine as Cabinet, AggregatedLocation } from '@/shared/types/entities';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { DateRange as ReactDayPickerDateRange } from 'react-day-picker';

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

type UseLocationCabinetsFetchingProps = {
  locationId: string;
  selectedLicencee: string | null;
  activeMetricsFilter: string | null;
  customDateRange: LibDateRange | null;
  dateFilterInitialized: boolean;
  filtersInitialized: boolean;
  isAdminUser: boolean;
  displayCurrency: string;
  setDateFilterInitialized: (value: boolean) => void;
  setFiltersInitialized: (value: boolean) => void;
  // Filter state
  debouncedSearchTerm: string;
  selectedStatus: string;
  selectedGameType: string;
  selectedSmibStatus: string;
  sortOption: CabinetSortOption;
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  showArchived: boolean;
  isFilterResetting: boolean;
  setIsFilterResetting: (value: boolean) => void;
  calculateBatchNumber: (page: number) => number;
};

type UseLocationCabinetsFetchingReturn = {
  loading: boolean;
  cabinetsLoading: boolean;
  allCabinets: Cabinet[];
  accumulatedCabinets: Cabinet[];
  totalCount: number;
  loadedBatches: Set<number>;
  metricsTotals: Record<string, number> | null;
  metricsTotalsLoading: boolean;
  locationName: string;
  locationMembershipEnabled: boolean;
  locationData: AggregatedLocation | null;
  locations: { id: string; name: string }[];
  selectedLocationId: string;
  error: string | null;
  refreshing: boolean;
  refreshCabinets: () => Promise<void>;
  refreshLocation: () => Promise<void>;
};

const ITEMS_PER_BATCH = 40;
const ITEMS_PER_PAGE = 20;
const PAGES_PER_BATCH = ITEMS_PER_BATCH / ITEMS_PER_PAGE; // 2

function convertStatusToOnlineStatus(selectedStatus: string): string {
  if (selectedStatus === 'All' || selectedStatus === 'all') return 'all';
  if (selectedStatus === 'Online') return 'online';
  if (selectedStatus === 'NeverOnline') return 'never-online';
  if (selectedStatus.startsWith('Offline')) return 'offline';
  return 'all';
}

function extractDateRange(
  customDateRange: LibDateRange | null
): ReactDayPickerDateRange | undefined {
  if (!customDateRange) return undefined;
  return {
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
  };
}

export function useLocationCabinetsFetching({
  locationId,
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  dateFilterInitialized,
  filtersInitialized,
  isAdminUser,
  displayCurrency,
  setDateFilterInitialized,
  setFiltersInitialized,
  debouncedSearchTerm,
  selectedStatus,
  selectedGameType,
  selectedSmibStatus,
  sortOption,
  sortOrder,
  currentPage,
  showArchived,
  isFilterResetting,
  setIsFilterResetting,
  calculateBatchNumber,
}: UseLocationCabinetsFetchingProps): UseLocationCabinetsFetchingReturn {
  const makeCabinetsRequest = useAbortableRequest();

  // ============================================================================
  // State
  // ============================================================================
  const [loading, setLoading] = useState(true);
  const [cabinetsLoading, setCabinetsLoading] = useState(true);
  const [allCabinets, setAllCabinets] = useState<Cabinet[]>([]);
  const [accumulatedCabinets, setAccumulatedCabinets] = useState<Cabinet[]>([]);
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set());
  const [totalCount, setTotalCount] = useState<number>(0);
  const [metricsTotals, setMetricsTotals] = useState<Record<string, number> | null>(null);
  const [metricsTotalsLoading, setMetricsTotalsLoading] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [locationMembershipEnabled, setLocationMembershipEnabled] = useState<boolean>(false);
  const [locationData, setLocationData] = useState<AggregatedLocation | null>(null);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [totalsRefreshTrigger, setTotalsRefreshTrigger] = useState(0);

  const cabinetsRequestInProgress = useRef(false);
  const prevCabinetsFetchKey = useRef<string>('');

  // ============================================================================
  // Effects - Batch Loading
  // ============================================================================
  useEffect(() => {
    if (loading || cabinetsLoading || !activeMetricsFilter) return;

    const currentBatch = calculateBatchNumber(currentPage);
    const isLastPageOfBatch = (currentPage + 1) % PAGES_PER_BATCH === 0;
    const nextBatch = currentBatch + 1;

    const onlineStatus = convertStatusToOnlineStatus(selectedStatus);
    const dateRange = activeMetricsFilter === 'Custom' ? extractDateRange(customDateRange) : undefined;

    // Fetch next batch if on last page of current batch
    if (isLastPageOfBatch && !loadedBatches.has(nextBatch)) {
      if (debouncedSearchTerm?.trim()) return;

      fetchCabinetsForLocation(
        locationId,
        selectedLicencee ?? undefined,
        activeMetricsFilter,
        undefined,
        dateRange,
        nextBatch,
        ITEMS_PER_BATCH,
        undefined,
        onlineStatus,
        showArchived,
        selectedSmibStatus,
        sortOption,
        sortOrder,
        undefined
      )
.then(result => {
            if (result.data.length > 0) {
              setLoadedBatches((prev: Set<number>) => new Set([...prev, nextBatch]));
              if (result.pagination?.total) {
                setTotalCount(result.pagination.total);
              }
              setAccumulatedCabinets((prev: Cabinet[]) => {
                const existingIds = new Set(prev.map(cab => cab._id));
                const newCabinets = result.data.filter(cab => !existingIds.has(cab._id));
                return [...prev, ...newCabinets];
              });
            }
          })
        .catch(err => {
          if (!isAbortError(err)) {
            console.error('[BATCH FETCH] Error fetching next batch:', err);
          }
        });
    }

    // Ensure current batch is loaded
    if (!loadedBatches.has(currentBatch)) {
      if (debouncedSearchTerm?.trim()) return;

      fetchCabinetsForLocation(
        locationId,
        selectedLicencee ?? undefined,
        activeMetricsFilter,
        undefined,
        dateRange,
        currentBatch,
        ITEMS_PER_BATCH,
        displayCurrency,
        onlineStatus,
        showArchived,
        selectedSmibStatus,
        sortOption,
        sortOrder,
        undefined
      )
.then(result => {
            if (result.data.length > 0) {
              setLoadedBatches((prev: Set<number>) => new Set([...prev, currentBatch]));
              if (result.pagination?.total) {
                setTotalCount(result.pagination.total);
              }
              setAccumulatedCabinets((prev: Cabinet[]) => {
                const existingIds = new Set(prev.map(cab => cab._id));
                const newCabinets = result.data.filter(cab => !existingIds.has(cab._id));
                return [...prev, ...newCabinets];
              });
            }
          })
        .catch(err => {
          if (!isAbortError(err)) {
            console.error('[BATCH FETCH] Error fetching current batch:', err);
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
    debouncedSearchTerm,
    displayCurrency,
    selectedStatus,
    showArchived,
    selectedSmibStatus,
    sortOption,
    sortOrder,
    locationId,
    selectedLicencee,
    customDateRange,
  ]);

  // ============================================================================
  // Effects - Fetch Metrics Totals
  // ============================================================================
  useEffect(() => {
    if (!activeMetricsFilter || !dateFilterInitialized || !filtersInitialized || !locationId) {
      return;
    }

    setMetricsTotalsLoading(true);
    (async () => {
      try {
        const onlineStatus = convertStatusToOnlineStatus(selectedStatus);

        const totals = await makeCabinetsRequest(
          async signal =>
            fetchCabinetTotals(
              activeMetricsFilter,
              customDateRange || undefined,
              selectedLicencee ?? undefined,
              displayCurrency,
              signal,
              locationId,
              selectedGameType !== 'all' ? selectedGameType : undefined,
              onlineStatus,
              debouncedSearchTerm,
              undefined,
              selectedSmibStatus
            ),
          'location-totals'
        );

        if (totals) {
          setMetricsTotals(totals);
        } else {
          setMetricsTotals(null);
        }
      } catch (error) {
        if (isAbortError(error)) return;
        console.error('[useLocationCabinetsData] Failed to fetch metrics totals:', error);
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
    locationId,
    selectedStatus,
    selectedSmibStatus,
    selectedGameType,
    debouncedSearchTerm,
    dateFilterInitialized,
    filtersInitialized,
    makeCabinetsRequest,
    totalsRefreshTrigger,
  ]);

  // ============================================================================
  // Effects - Main Data Fetching
  // ============================================================================
  useEffect(() => {
    const dateRangeKey =
      activeMetricsFilter === 'Custom' && customDateRange
        ? JSON.stringify(customDateRange)
        : 'none';

    const fetchKey = `${locationId}-${selectedLicencee}-${activeMetricsFilter}-${dateRangeKey}-${debouncedSearchTerm}-${displayCurrency}-${selectedStatus}-${selectedSmibStatus}-${showArchived}-${sortOption}-${sortOrder}`;

    const fetchData = async () => {
      if (!activeMetricsFilter || !dateFilterInitialized || !filtersInitialized) {
        setAllCabinets([]);
        setAccumulatedCabinets([]);
        setLoadedBatches(new Set());
        setLoading(false);
        setCabinetsLoading(false);
        return;
      }

      if (prevCabinetsFetchKey.current === fetchKey) {
        if (!cabinetsRequestInProgress.current) {
          setLoading(false);
          setCabinetsLoading(false);
          setIsFilterResetting(false);
        }
        return;
      }

      if (cabinetsRequestInProgress.current) return;

      prevCabinetsFetchKey.current = fetchKey;
      cabinetsRequestInProgress.current = true;
      setLoading(true);
      setCabinetsLoading(true);

      try {
        // Fetch location details to check access
        try {
          const locationResponse = await axios.get(`/api/locations/${locationId}`, {
            headers: { Authorization: `Bearer ${document.cookie}` },
          });

          const locationData = locationResponse.data?.location || locationResponse.data;
          if (locationData) {
            const locationWithId = {
              ...locationData,
              location: locationData._id ? String(locationData._id) : locationId,
              locationName: locationData.name || 'Location',
            };
            setLocationName(locationData.name || 'Location');
            setSelectedLocationId(locationId);
            setLocationMembershipEnabled(
              locationData.membershipEnabled === true ||
                locationData.enableMembership === true
            );
            setLocationData(locationWithId as AggregatedLocation);
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

        // Fetch locations for the selected licencee
        const formattedLocations = await fetchAllGamingLocations(
          isAdminUser ? 'all' : (selectedLicencee ?? undefined)
        );
        setLocations(formattedLocations);

        const currentLocation = formattedLocations.find(loc => loc.id === locationId);
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
          setError('No locations found for the selected licencee.');
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

          const effectiveLimit = debouncedSearchTerm?.trim() ? undefined : ITEMS_PER_BATCH;
          const onlineStatus = convertStatusToOnlineStatus(selectedStatus);
          const dateRange = activeMetricsFilter === 'Custom' ? extractDateRange(customDateRange) : undefined;

          const result = await makeCabinetsRequest(async signal => {
            return await fetchCabinetsForLocation(
              locationId,
              selectedLicencee ?? undefined,
              activeMetricsFilter,
              debouncedSearchTerm?.trim() || undefined,
              dateRange,
              1,
              effectiveLimit,
              displayCurrency,
              onlineStatus,
              showArchived,
              selectedSmibStatus,
              sortOption,
              sortOrder,
              signal
            );
          });

          if (!result) return;

          setAllCabinets(result.data);

          if (!debouncedSearchTerm?.trim()) {
            setAccumulatedCabinets(result.data);
            setLoadedBatches(new Set([1]));
          } else {
            setAccumulatedCabinets([]);
            setLoadedBatches(new Set());
          }

          if (result.pagination?.total) {
            setTotalCount(result.pagination.total);
          } else {
            setTotalCount(result.data.length);
          }
          setError(null);
        } catch (error) {
          if (isAbortError(error)) return;

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
            (error instanceof Error && error.message?.includes('Unauthorized')) ||
            (error instanceof Error && error.message?.includes('do not have access'))
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
        if (
          cabinetsRequestInProgress.current &&
          prevCabinetsFetchKey.current === fetchKey
        ) {
          setLoading(false);
          setCabinetsLoading(false);
          cabinetsRequestInProgress.current = false;
        }
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
    selectedSmibStatus,
    showArchived,
    sortOption,
    sortOrder,
    isAdminUser,
    setIsFilterResetting,
  ]);

  // ============================================================================
  // Effects - Sync allCabinets from accumulatedCabinets
  // ============================================================================
  useEffect(() => {
    if (accumulatedCabinets.length > 0) {
      setAllCabinets(accumulatedCabinets);
    } else if (isFilterResetting && accumulatedCabinets.length === 0) {
      setAllCabinets([]);
    }
  }, [accumulatedCabinets, isFilterResetting]);

  // ============================================================================
  // Effects - Clear isFilterResetting when data arrives
  // ============================================================================
  useEffect(() => {
    if (allCabinets.length > 0) {
      setIsFilterResetting(false);
    }
  }, [allCabinets, setIsFilterResetting]);

  // ============================================================================
  // Effects - Initialize filter flags
  // ============================================================================
  useEffect(() => {
    if (activeMetricsFilter) {
      if (!dateFilterInitialized) {
        setDateFilterInitialized(true);
      }
      if (!filtersInitialized) {
        setFiltersInitialized(true);
      }
    }
  }, [
    activeMetricsFilter,
    dateFilterInitialized,
    filtersInitialized,
    setDateFilterInitialized,
    setFiltersInitialized,
  ]);

  // ============================================================================
  // Refresh Handlers
  // ============================================================================
  const refreshCabinets = useCallback(async () => {
    setRefreshing(true);
    prevCabinetsFetchKey.current = '';
    setAllCabinets([]);
    setAccumulatedCabinets([]);
    setLoadedBatches(new Set());
    setTotalsRefreshTrigger(prev => prev + 1);
    setRefreshing(false);
  }, []);

  const refreshLocation = useCallback(async () => {
    try {
      const locationResponse = await axios.get(`/api/locations/${locationId}`, {
        headers: { Authorization: `Bearer ${document.cookie}` },
      });
      const data = locationResponse.data?.location || locationResponse.data;
      if (data) {
        const locationWithId = {
          ...data,
          location: data._id ? String(data._id) : locationId,
          locationName: data.name || 'Location',
        };
        setLocationName(data.name || 'Location');
        setLocationMembershipEnabled(
          data.membershipEnabled === true || data.enableMembership === true
        );
        setLocationData(locationWithId as AggregatedLocation);
      }
    } catch (err) {
      console.error('[useLocationCabinetsData] refreshLocation error:', err);
    }
  }, [locationId]);

  return {
    loading,
    cabinetsLoading,
    allCabinets,
    accumulatedCabinets,
    totalCount,
    loadedBatches,
    metricsTotals,
    metricsTotalsLoading,
    locationName,
    locationMembershipEnabled,
    locationData,
    locations,
    selectedLocationId,
    error,
    refreshing,
    refreshCabinets,
    refreshLocation,
  };
}
