/**
 * Custom hook for managing location machine statistics
 * Handles machine stats fetching and state management for locations page
 * Uses the new dedicated machine status API that respects user permissions
 *
 * @param locationId - Optional specific location ID to get stats for that location only
 */

import { fetchMachineStats } from '@/lib/helpers/machineStats';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type {
  MachineStats,
  UseLocationMachineStatsReturn,
} from '@/lib/types/locationMachineStats';
import { useCallback, useEffect, useRef, useState } from 'react';

export function useLocationMachineStats(
  locationId?: string,
  machineTypeFilter?: string | null
): UseLocationMachineStatsReturn {
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null);
  const [machineStatsLoading, setMachineStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedLicencee = useDashBoardStore(state => state.selectedLicencee);
  const makeRequest = useAbortableRequest();

  // Track initial mount to prevent aborting on first load
  const isInitialMountRef = useRef(true);
  const prevDepsRef = useRef<string>('');

  // Fetch machine stats
  const fetchMachineStatsData = useCallback(async () => {
    setMachineStatsLoading(true);
    setError(null);

    try {
      // Use selected licensee or 'all' if not selected
      const licensee = selectedLicencee || 'all';
      const stats = await fetchMachineStats(
        licensee,
        locationId,
        machineTypeFilter
      );
      setMachineStats(stats);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch machine stats';
      setError(errorMessage);
      setMachineStats({
        totalMachines: 0,
        onlineMachines: 0,
        offlineMachines: 0,
      });
    } finally {
      setMachineStatsLoading(false);
    }
  }, [selectedLicencee, locationId, machineTypeFilter]);

  // Refresh machine stats
  const refreshMachineStats = useCallback(async () => {
    await fetchMachineStatsData();
  }, [fetchMachineStatsData]);

  // Load machine stats on mount and when selectedLicencee, locationId, or machineTypeFilter changes
  useEffect(() => {
    // Create dependency key to detect actual changes
    const depsKey = `${selectedLicencee || 'all'}-${locationId || 'none'}-${machineTypeFilter || 'none'}`;
    
    // On initial mount, don't abort - just fetch
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevDepsRef.current = depsKey;
      
      const loadMachineStats = async () => {
        setMachineStatsLoading(true);
        setError(null);

        try {
          const result = await makeRequest(async signal => {
            const licensee = selectedLicencee || 'all';
            const stats = await fetchMachineStats(
              licensee,
              locationId,
              machineTypeFilter,
              signal
            );
            return stats;
          }, 'machine-stats');

          // Only update state if request wasn't aborted
          if (result !== null) {
            setMachineStats(result);
            setMachineStatsLoading(false);
          } else {
            // If aborted on initial mount, set loading to false to prevent stuck state
            // This can happen if component unmounts/remounts quickly
            setMachineStatsLoading(false);
          }
        } catch (error) {
          // Handle any errors
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to fetch machine stats';
          setError(errorMessage);
          setMachineStats({
            totalMachines: 0,
            onlineMachines: 0,
            offlineMachines: 0,
          });
          setMachineStatsLoading(false);
        }
      };

      loadMachineStats();
      return;
    }

    // After initial mount, only abort if dependencies actually changed
    if (prevDepsRef.current === depsKey) {
      return; // Dependencies haven't changed, don't refetch
    }

    prevDepsRef.current = depsKey;

    const loadMachineStats = async () => {
      setMachineStatsLoading(true);
      setError(null);

      try {
        const result = await makeRequest(async signal => {
          const licensee = selectedLicencee || 'all';
          const stats = await fetchMachineStats(
            licensee,
            locationId,
            machineTypeFilter,
            signal
          );
          return stats;
        }, 'machine-stats');

        // Only update state if request wasn't aborted
        if (result !== null) {
          setMachineStats(result);
          setMachineStatsLoading(false);
        } else {
          // If aborted, set loading to false - the next request will handle loading state
          // Keeping it true would cause stuck loading state
          setMachineStatsLoading(false);
        }
      } catch (error) {
        // Handle any errors
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch machine stats';
        setError(errorMessage);
        setMachineStats({
          totalMachines: 0,
          onlineMachines: 0,
          offlineMachines: 0,
        });
        setMachineStatsLoading(false);
      }
    };

    loadMachineStats();
  }, [selectedLicencee, locationId, machineTypeFilter, makeRequest]);

  return {
    machineStats,
    machineStatsLoading,
    refreshMachineStats,
    error,
  };
}
