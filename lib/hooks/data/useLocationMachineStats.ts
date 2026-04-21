/**
 * Custom hook for managing location machine statistics
 * Handles machine stats fetching and state management for locations page
 * Uses the new dedicated machine status API that respects user permissions
 *
 * @param locationId - Optional specific location ID to get stats for that location only
 */

import { fetchMachineStats } from '@/lib/helpers/cabinets';
import { useAbortableRequest } from '@/lib/hooks/useAbortableRequest';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type {
  MachineStats,
  UseLocationMachineStatsReturn,
} from '@/lib/types/location';
import { isAbortError } from '@/lib/utils/errors';
import { useCallback, useEffect, useState } from 'react';

export function useLocationMachineStats(
  locationId?: string,
  machineTypeFilter?: string | null,
  search?: string,
  gameTypeFilter?: string | null,
  selectedStatus?: string
): UseLocationMachineStatsReturn {
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null);
  const [machineStatsLoading, setMachineStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedLicencee = useDashBoardStore(state => state.selectedLicencee);
  const makeRequest = useAbortableRequest();

  // Fetch machine stats
  const fetchMachineStatsData = useCallback(async () => {
    setMachineStatsLoading(true);
    setError(null);

    try {
      // Use selected licencee or 'all' if not selected
      const licencee = selectedLicencee || 'all';
      const stats = await fetchMachineStats(
        licencee,
        locationId,
        machineTypeFilter,
        undefined,
        search,
        gameTypeFilter || undefined,
        selectedStatus
      );
      setMachineStats(stats);
    } catch (err) {
      // Silently handle aborted requests - this is expected behavior when switching filters
      if (isAbortError(err)) {
        return;
      }

      const errorMessage =
        err instanceof Error ? err.message : 'Failed to fetch machine stats';
      setError(errorMessage);
      setMachineStats({
        totalMachines: 0,
        onlineMachines: 0,
        offlineMachines: 0,
        totalCount: 0,
        onlineCount: 0,
        offlineCount: 0,
        totalGross: 0,
        totalDrop: 0,
        totalCancelledCredits: 0,
        totalLocations: 0,
        onlineLocations: 0,
        offlineLocations: 0,
      });
    } finally {
      setMachineStatsLoading(false);
    }
  }, [selectedLicencee, locationId, machineTypeFilter, search, gameTypeFilter, selectedStatus]);

  // Refresh machine stats
  const refreshMachineStats = useCallback(async () => {
    await fetchMachineStatsData();
  }, [fetchMachineStatsData]);

  // Load machine stats on mount and when selectedLicencee, locationId, or machineTypeFilter changes
  useEffect(() => {
    const loadMachineStats = async () => {
      setMachineStatsLoading(true);
      setError(null);

      try {
        const result = await makeRequest(async signal => {
          const licencee = selectedLicencee || 'all';
          const stats = await fetchMachineStats(
            licencee,
            locationId,
            machineTypeFilter,
            signal,
            search,
            gameTypeFilter || undefined,
            selectedStatus
          );
          return stats;
        }, 'machine-stats');

        // Only update state if request wasn't aborted
        if (result !== null) {
          setMachineStats(result);
          setMachineStatsLoading(false);
        }
      } catch (error) {
        // Silently handle aborted requests - this is expected behavior when switching filters
        if (isAbortError(error)) {
          return;
        }

        // Handle any errors
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch machine stats';
        setError(errorMessage);
        setMachineStats({
          totalMachines: 0,
          onlineMachines: 0,
          offlineMachines: 0,
          totalCount: 0,
          onlineCount: 0,
          offlineCount: 0,
          totalGross: 0,
          totalDrop: 0,
          totalCancelledCredits: 0,
          totalLocations: 0,
          onlineLocations: 0,
          offlineLocations: 0,
        });
        setMachineStatsLoading(false);
      }
    };

    loadMachineStats();
  }, [selectedLicencee, locationId, machineTypeFilter, search, gameTypeFilter, selectedStatus, makeRequest]);

  return {
    machineStats,
    machineStatsLoading,
    refreshMachineStats,
    error,
  };
}


