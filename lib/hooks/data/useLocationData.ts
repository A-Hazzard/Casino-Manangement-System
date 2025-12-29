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
import { LocationFilter } from '@/lib/types/location';
import { useDebounce } from '@/lib/utils/hooks';
import type { AggregatedLocation, dateRange } from '@/lib/types/index';
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
  const fetchInProgressRef = useRef(false);
  const lastFetchKeyRef = useRef<string>('');
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

      // Skip if this exact fetch is already in progress
      if (fetchInProgressRef.current && lastFetchKeyRef.current === fetchKey) {
        console.log('[useLocationData] Skipping duplicate fetch');
        return;
      }

      // Mark as in progress and update key BEFORE making request
      fetchInProgressRef.current = true;
      lastFetchKeyRef.current = fetchKey;
      currentRequestFiltersRef.current = currentFilters;

      console.log('[useLocationData] Starting fetch:', {
        isInitialMount: isInitialMountRef.current,
        hasCompletedFirst: hasCompletedFirstFetchRef.current,
        fetchKey,
      });

      // Don't clear data immediately - keep showing old data with loading state
      // This prevents the "blank screen" issue when navigating or changing filters
      setLoading(true);
      setError(null);

      // Mark that we're no longer on initial mount after first fetch
      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
      }

      const result = await makeRequest(async signal => {
        // Only use backend search if debounced search term exists
        // Frontend filtering is handled in the component
        if (debouncedSearchTerm.trim()) {
          setSearchLoading(true);
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
            signal
          );
          setSearchLoading(false);
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
      }, 'locations'); // Use unique key to prevent cancellation from other requests

      // Only update state if request wasn't aborted (result is not null)
      // AND if the filters haven't changed since this request started
      if (result) {
        // Check if filters changed during the request - if so, ignore this response
        const filtersAtRequestStart = currentRequestFiltersRef.current;
        const filtersNow = selectedFilters.length
          ? selectedFilters.join(',')
          : '';

        if (filtersAtRequestStart !== filtersNow) {
          console.log(
            '[useLocationData] Filters changed during request - ignoring stale response',
            {
              filtersAtRequestStart,
              filtersNow,
            }
          );
          // Don't update state - a new request should be in progress
          fetchInProgressRef.current = false;
          return;
        }

        setLocationData(result.data);
        if (result.pagination) {
          const total =
            result.pagination.totalCount ?? result.pagination.total ?? 0;
          setTotalCount(total);
        } else {
          setTotalCount(result.data.length);
        }
        hasCompletedFirstFetchRef.current = true;
        console.log('[useLocationData] Fetch completed successfully');
        // Only set loading to false when we successfully received data
        setLoading(false);
        setSearchLoading(false);
        lastFetchRef.current = Date.now();
      } else {
        console.log(
          '[useLocationData] Fetch aborted - keeping loading state and existing data'
        );
        // If aborted, keep loading state active so skeleton continues to show
        // The next request will complete and update the loading state
      }

      // Clear in-progress flag AFTER request completes (success or abort)
      fetchInProgressRef.current = false;
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
