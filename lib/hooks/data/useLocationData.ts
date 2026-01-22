/**
 * Custom hook for managing location data fetching and state
 * Extracts complex data fetching logic from the Locations page
 */

import { useCurrency } from '@/lib/contexts/CurrencyContext';
import {
    fetchAggregatedLocationsData,
    searchAllLocations,
} from '@/lib/helpers/locations';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import type { AggregatedLocation, dateRange } from '@/lib/types/index';
import { LocationFilter } from '@/lib/types/location';
import { useDebounce } from '@/lib/utils/hooks';
import type { TimePeriod } from '@/shared/types/common';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type UseLocationDataProps = {
  selectedLicencee: string;
  activeMetricsFilter: string | null;
  customDateRange?: dateRange;
  searchTerm: string;
  selectedFilters: LocationFilter[];
};

type UseLocationDataReturn = {
  locationData: AggregatedLocation[];
  loading: boolean;
  searchLoading: boolean;
  error: string | null;
  fetchData: (page?: number, limit?: number) => Promise<void>;
  totalCount: number;
  fetchBatch: (
    page: number,
    limit: number
  ) => Promise<{
    data: AggregatedLocation[];
    pagination?: {
      page: number;
      limit: number;
      total?: number;
      totalCount?: number;
      totalPages: number;
    };
  }>;
};

export function useLocationData({
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  searchTerm,
  selectedFilters,
}: UseLocationDataProps): UseLocationDataReturn {
  const [locationData, setLocationData] = useState<AggregatedLocation[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const selectedFiltersRef = useRef(selectedFilters);
  const selectedFiltersKeyRef = useRef<string>('');

  // Get display currency from CurrencyContext (kept in sync with dashboard store)
  const { displayCurrency } = useCurrency();

  // AbortController for canceling previous requests
  const makeRequest = useAbortableRequest();

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Memoize selectedFilters to avoid recreating fetchBatch
  const selectedFiltersKey = useMemo(() => {
    return JSON.stringify([...selectedFilters].sort());
  }, [selectedFilters]);

  // Update ref when selectedFilters actually changes
  useEffect(() => {
    if (selectedFiltersKeyRef.current !== selectedFiltersKey) {
      selectedFiltersKeyRef.current = selectedFiltersKey;
      selectedFiltersRef.current = [...selectedFilters];
    }
  }, [selectedFiltersKey, selectedFilters]);

  // Memoize date range to avoid recreating callback
  const dateRangeForFetch = useMemo(() => {
    const effectiveFilter = activeMetricsFilter || 'Today';
    if (
      effectiveFilter === 'Custom' &&
      customDateRange?.startDate &&
      customDateRange?.endDate
    ) {
      return {
        from: customDateRange.startDate,
        to: customDateRange.endDate,
      };
    }
    return undefined;
  }, [
    activeMetricsFilter,
    customDateRange?.startDate,
    customDateRange?.endDate,
  ]);

  // Fetch a specific batch of locations
  const fetchBatch = useCallback(
    async (page: number = 1, limit: number = 50) => {
      const effectiveLicencee = selectedLicencee || '';
      // Use current filter string from ref to avoid dependency on array
      const currentFilterString = selectedFiltersRef.current.length
        ? selectedFiltersRef.current.join(',')
        : '';

      return await fetchAggregatedLocationsData(
        (activeMetricsFilter || 'Today') as TimePeriod,
        effectiveLicencee,
        currentFilterString,
        dateRangeForFetch,
        displayCurrency,
        page,
        limit
      );
    },
    [
      selectedLicencee,
      activeMetricsFilter,
      dateRangeForFetch,
      displayCurrency,
      // Note: selectedFiltersKey is intentionally excluded - we use ref to avoid recreation
    ]
  );

  // Track fetch to prevent duplicate calls
  const isInitialMountRef = useRef(true);
  const hasCompletedFirstFetchRef = useRef(false);
  // Track the current filter state for each request to prevent stale updates
  const currentRequestFiltersRef = useRef<string>('');

  // Optimized data fetching with better error handling
  const fetchData = useCallback(
    async (page?: number, limit?: number) => {
      // Get current filter state at the start of the request
      const currentFilters = selectedFilters.length
        ? selectedFilters.join(',')
        : '';

      // Create unique key for this fetch - include filters in the key
      const fetchKey = `${debouncedSearchTerm}-${selectedLicencee}-${activeMetricsFilter}-${dateRangeForFetch?.from?.getTime()}-${dateRangeForFetch?.to?.getTime()}-${displayCurrency}-${page}-${limit}-${currentFilters}`;

      // Mark this as the current active fetch generation
      const currentFetchId = performance.now();
      lastFetchRef.current = currentFetchId;
      currentRequestFiltersRef.current = currentFilters;

      // Reset error state
      setError(null);
      
      // Update loading state
      // If we are searching or changing filters, we might want to clear data or show loading immediately
      setLoading(true);
      if (debouncedSearchTerm.trim()) {
        setSearchLoading(true);
      }

      // Mark that we're no longer on initial mount after first fetch
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
      }

      console.log('[useLocationData] Starting fetch:', {
        fetchId: currentFetchId,
        fetchKey,
        filter: activeMetricsFilter,
        hasCustomDate: !!dateRangeForFetch
      });

      const result = await makeRequest(async signal => {
        // Only use backend search if debounced search term exists
        // Frontend filtering is handled in the component
        if (debouncedSearchTerm.trim()) {
          const effectiveLicencee = selectedLicencee || '';
          const effectiveFilter = activeMetricsFilter || 'Today';
          const searchData = await searchAllLocations(
            debouncedSearchTerm,
            effectiveLicencee,
            displayCurrency,
            effectiveFilter,
            dateRangeForFetch
              ? { from: dateRangeForFetch.from, to: dateRangeForFetch.to }
              : undefined,
            signal,
            currentFilters
          );
          return { data: searchData, pagination: undefined };
        }

        // Otherwise, use the normal fetchLocationsData for metrics-based data
        const result = await fetchAggregatedLocationsData(
          (activeMetricsFilter || 'Today') as TimePeriod,
          selectedLicencee || '',
          selectedFilters.length
            ? selectedFilters.join(',')
            : '',
          dateRangeForFetch,
          displayCurrency,
          page || 1,
          limit || 50,
          signal
        );

        return result;
      }, 'locations'); // Unique key prevents overlapping requests

      // Only process the result if this is still the latest request
      if (lastFetchRef.current === currentFetchId) {
        if (result) {
          setLocationData(result.data);
          if (result.pagination) {
            const total =
              result.pagination.totalCount ?? result.pagination.total ?? 0;
            setTotalCount(total);
          } else {
            setTotalCount(result.data.length);
          }
          hasCompletedFirstFetchRef.current = true;
        }
        
        // Always clear loading if we are the latest request
        setLoading(false);
        setSearchLoading(false);
      } else {
        console.log('[useLocationData] Ignoring stale response from older fetch', {
          currentFetchId,
          latestFetchId: lastFetchRef.current
        });
      }
    },
    [
      debouncedSearchTerm,
      displayCurrency,
      selectedLicencee,
      activeMetricsFilter,
      dateRangeForFetch,
      makeRequest,
      selectedFilters,
    ]
  );

  // Refresh data when user returns to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const timeSinceLastFetch = Date.now() - lastFetchRef.current;
        if (timeSinceLastFetch < 0 || timeSinceLastFetch < 60000) {
          return;
        }
        // Use fetchData directly since it's stable
        setTimeout(() => {
          fetchData();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);

  return {
    locationData,
    loading,
    searchLoading,
    error,
    fetchData,
    totalCount,
    fetchBatch,
  };
}

