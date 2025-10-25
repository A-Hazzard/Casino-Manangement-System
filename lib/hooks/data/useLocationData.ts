/**
 * Custom hook for managing location data fetching and state
 * Extracts complex data fetching logic from the Locations page
 */

import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/lib/utils/hooks';
import {
  fetchAggregatedLocationsData,
  searchAllLocations,
} from '@/lib/helpers/locations';
import { AggregatedLocation, TimePeriod } from '@/shared/types/common';
import { LocationFilter } from '@/lib/types/location';

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
  fetchData: () => Promise<void>;
};

export function useLocationData({
  selectedLicencee,
  activeMetricsFilter,
  customDateRange,
  searchTerm,
  selectedFilters,
}: UseLocationDataProps): UseLocationDataReturn {
  const [locationData, setLocationData] = useState<AggregatedLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  // Optimized data fetching with better error handling
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // If there's a search term, use the search function to get ALL locations
      if (debouncedSearchTerm.trim()) {
        setSearchLoading(true);
        const effectiveLicencee = selectedLicencee || '';
        const searchData = await searchAllLocations(
          debouncedSearchTerm,
          effectiveLicencee
        );
        setLocationData(searchData);
        setSearchLoading(false);
        return;
      }

      // Otherwise, use the normal fetchLocationsData for metrics-based data
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

      // Use empty string as fallback if selectedLicencee is empty
      const effectiveLicencee = selectedLicencee || '';

      const data = await fetchAggregatedLocationsData(
        (activeMetricsFilter || 'Today') as TimePeriod,
        effectiveLicencee,
        filterString,
        dateRangeForFetch
      );

      setLocationData(data);
    } catch (err) {
      setLocationData([]);
      setError(err instanceof Error ? err.message : 'Failed to load locations');
    } finally {
      setLoading(false);
    }
  }, [
    selectedLicencee,
    activeMetricsFilter,
    selectedFilters,
    customDateRange,
    debouncedSearchTerm,
  ]);

  // Fetch data when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh data when user returns to the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
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
  };
}
