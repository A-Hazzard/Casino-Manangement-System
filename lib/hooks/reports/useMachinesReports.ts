import { useEffect, useCallback, useMemo } from 'react';
import { useAnalyticsDataStore } from '@/lib/store/reportsDataStore';
import axios from 'axios';

export function useMachinesAnalytics() {
  const { setMachines, setMachineComparisons, setLastUpdated, machines } =
    useAnalyticsDataStore();

  // Use useCallback to memoize setter functions
  const setIsLoading = useCallback(() => {
    // TODO: Add loading state to reports store
  }, []);

  const setError = useCallback(() => {
    // TODO: Add error state to reports store
  }, []);

  // Use useMemo to memoize the selectedMachineIds array
  const selectedMachineIds = useMemo(() => {
    // TODO: Get this from store or props
    return [] as string[];
  }, []);

  useEffect(() => {
    const fetchMachinesData = async () => {
      // Only fetch the full list if it's not already loaded
      if (machines.length > 0) {
        return;
      }

      setIsLoading();
      setError();
      try {
        const response = await axios.get('/api/analytics/machines');
        if (response.data?.success) {
          setMachines(response.data?.data || []);
          setLastUpdated('machines');
        } else {
          setError();
        }
      } catch (err) {
        console.error('Failed to fetch machines data:', err);
        setError();
      } finally {
        setIsLoading();
      }
    };

    fetchMachinesData();
  }, [machines.length, setIsLoading, setError, setMachines, setLastUpdated]);

  useEffect(() => {
    const fetchMachineComparisonData = async () => {
      if (selectedMachineIds.length === 0) {
        setMachineComparisons([]);
        return;
      }

      // Here you could add a loading state specific to the comparison
      try {
        const response = await axios.get('/api/analytics/machines', {
          params: { machineIds: selectedMachineIds.join(',') },
        });
        if (response.data.success) {
          // The API returns a single object if one ID is passed, so we ensure it's always an array
          const comparisons = Array.isArray(response.data.data)
            ? response.data.data
            : [response.data.data];
          setMachineComparisons(comparisons);
        } else {
          setError();
        }
      } catch (err) {
        console.error('Failed to fetch machine comparison data:', err);
        setError();
      }
    };

    fetchMachineComparisonData();
  }, [selectedMachineIds, setMachineComparisons, setError]);
}
