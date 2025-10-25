import { useEffect, useCallback, useMemo } from 'react';
import { useAnalyticsDataStore } from '@/lib/store/reportsDataStore';
import axios from 'axios';

export function useLocationsAnalytics() {
  const { setLocations, setLocationComparisons, setLastUpdated, locations } =
    useAnalyticsDataStore();

  // Use useCallback to memoize setter functions
  const setIsLoading = useCallback(() => {
    // TODO: Add loading state to reports store
  }, []);

  const setError = useCallback(() => {
    // TODO: Add error state to reports store
  }, []);

  // Use useMemo to memoize the selectedLocationIds array
  const selectedLocationIds = useMemo(() => {
    // TODO: Get this from store or props
    return [] as string[];
  }, []);

  useEffect(() => {
    const fetchLocationsData = async () => {
      // Only fetch the full list if it's not already loaded
      if (locations.length > 0) {
        return;
      }

      setIsLoading();
      setError();
      try {
        const response = await axios.get('/api/analytics/locations');
        if (response.data?.success) {
          setLocations(response.data?.data || []);
          setLastUpdated('locations');
        } else {
          setError();
        }
      } catch (err) {
        console.error('Failed to fetch locations data:', err);
        setError();
      } finally {
        setIsLoading();
      }
    };

    fetchLocationsData();
  }, [locations.length, setIsLoading, setError, setLocations, setLastUpdated]);

  useEffect(() => {
    const fetchLocationComparisonData = async () => {
      if (selectedLocationIds.length === 0) {
        setLocationComparisons([]);
        return;
      }

      // Here you could add a loading state specific to the comparison
      try {
        const response = await axios.get('/api/analytics/locations', {
          params: { locationIds: selectedLocationIds.join(',') },
        });
        if (response.data.success) {
          // The API returns a single object if one ID is passed, so we ensure it's always an array
          const comparisons = Array.isArray(response.data.data)
            ? response.data.data
            : [response.data.data];
          setLocationComparisons(comparisons);
        } else {
          setError();
        }
      } catch (err) {
        console.error('Failed to fetch location comparison data:', err);
        setError();
      }
    };

    fetchLocationComparisonData();
  }, [selectedLocationIds, setLocationComparisons, setError]);
}
