/**
 * Custom hook for managing location data fetching and state
 * Extracts complex data fetching logic from the Locations page
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDebounce } from '@/lib/utils/hooks';
import {
  fetchAggregatedLocationsData,
  searchAllLocations,
} from '@/lib/helpers/locations';
import { AggregatedLocation, TimePeriod } from '@/shared/types/common';
import { LocationFilter } from '@/lib/types/location';
import { useDashBoardStore } from '@/lib/store/dashboardStore';

type UseLocationDataProps = {
  selectedLicencee: string;
  activeMetricsFilter: string | null;
  customDateRange: { startDate: Date; endDate: Date } | null;
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
  fetchBatch: (page: number, limit: number) => Promise<{ data: AggregatedLocation[]; pagination?: { page: number; limit: number; total: number; totalPages: number } }>;
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

  // Get display currency from store
  const { displayCurrency } = useDashBoardStore();

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
  const fetchBatch = useCallback(async (page: number = 1, limit: number = 50) => {
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
  }, [
    selectedLicencee,
    activeMetricsFilter,
    dateRangeForFetch,
    displayCurrency,
    // Note: selectedFiltersKey is intentionally excluded - we use ref to avoid recreation
  ]);

  // Track fetch to prevent duplicate calls
  const fetchInProgressRef = useRef(false);
  const lastFetchKeyRef = useRef<string>('');

  // Optimized data fetching with better error handling
  const fetchData = useCallback(async (page?: number, limit?: number) => {
    // Create unique key for this fetch
    const fetchKey = `${debouncedSearchTerm}-${selectedLicencee}-${activeMetricsFilter}-${dateRangeForFetch?.from?.getTime()}-${dateRangeForFetch?.to?.getTime()}-${displayCurrency}-${page}-${limit}`;
    
    // Skip if this exact fetch is already in progress
    if (fetchInProgressRef.current && lastFetchKeyRef.current === fetchKey) {
      return;
    }

    // Mark as in progress and update key
    fetchInProgressRef.current = true;
    lastFetchKeyRef.current = fetchKey;

    setLoading(true);
    setError(null);

    try {
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
            : undefined
        );
        setLocationData(searchData);
        setTotalCount(searchData.length);
        setSearchLoading(false);
        return;
      }

      // Otherwise, use the normal fetchLocationsData for metrics-based data
      const result = await fetchBatch(page || 1, limit || 50);
      
      setLocationData(result.data);
      if (result.pagination) {
        setTotalCount(result.pagination.total);
      } else {
        setTotalCount(result.data.length);
      }
    } catch (err) {
      setLocationData([]);
      setTotalCount(0);
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      lastFetchRef.current = Date.now();
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, [
    debouncedSearchTerm,
    displayCurrency,
    fetchBatch,
    selectedLicencee,
    activeMetricsFilter,
    dateRangeForFetch,
  ]);

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
