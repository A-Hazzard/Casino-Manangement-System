/**
 * Custom hook for managing location data fetching and state
 * Extracts complex data fetching logic from the Locations page
 */

import { useState, useEffect, useCallback, useRef } from 'react';
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

  // Get display currency from store
  const { displayCurrency } = useDashBoardStore();

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Fetch a specific batch of locations
  const fetchBatch = useCallback(async (page: number = 1, limit: number = 50) => {
    const filterString = selectedFilters.length
      ? selectedFilters.join(',')
      : '';

    let dateRangeForFetch = undefined;
    const effectiveFilter = activeMetricsFilter || 'Today';

    if (
      effectiveFilter === 'Custom' &&
      customDateRange?.startDate &&
      customDateRange?.endDate
    ) {
      dateRangeForFetch = {
        from: customDateRange.startDate,
        to: customDateRange.endDate,
      };
    }

    const effectiveLicencee = selectedLicencee || '';

    return await fetchAggregatedLocationsData(
      (activeMetricsFilter || 'Today') as TimePeriod,
      effectiveLicencee,
      filterString,
      dateRangeForFetch,
      displayCurrency,
      page,
      limit
    );
  }, [
    selectedLicencee,
    activeMetricsFilter,
    selectedFilters,
    customDateRange,
    displayCurrency,
  ]);

  // Optimized data fetching with better error handling
  const fetchData = useCallback(async (page?: number, limit?: number) => {
    setLoading(true);
    setError(null);

    try {
      // If there's a search term, use the search function to get ALL locations
      if (debouncedSearchTerm.trim()) {
        setSearchLoading(true);
        const effectiveLicencee = selectedLicencee || '';
        const searchData = await searchAllLocations(
          debouncedSearchTerm,
          effectiveLicencee,
          displayCurrency
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
    }
  }, [
    debouncedSearchTerm,
    displayCurrency,
    fetchBatch,
    selectedLicencee,
  ]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data when user returns to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const timeSinceLastFetch = Date.now() - lastFetchRef.current;
        if (timeSinceLastFetch < 0 || timeSinceLastFetch < 60000) {
          return;
        }
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
