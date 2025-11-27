/**
 * Custom hook for managing location machine statistics
 * Handles machine stats fetching and state management for locations page
 * Uses the new dedicated machine status API that respects user permissions
 * 
 * @param locationId - Optional specific location ID to get stats for that location only
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchMachineStats } from '@/lib/helpers/machineStats';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type {
  MachineStats,
  UseLocationMachineStatsReturn,
} from '@/lib/types/locationMachineStats';

export function useLocationMachineStats(
  locationId?: string
): UseLocationMachineStatsReturn {
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null);
  const [machineStatsLoading, setMachineStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedLicencee = useDashBoardStore(state => state.selectedLicencee);

  // Fetch machine stats
  const fetchMachineStatsData = useCallback(async () => {
    setMachineStatsLoading(true);
    setError(null);

    try {
      // Use selected licensee or 'all' if not selected
      const licensee = selectedLicencee || 'all';
      const stats = await fetchMachineStats(licensee, locationId);
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
  }, [selectedLicencee, locationId]);

  // Refresh machine stats
  const refreshMachineStats = useCallback(async () => {
    await fetchMachineStatsData();
  }, [fetchMachineStatsData]);

  // Load machine stats on mount and when selectedLicencee or locationId changes
  useEffect(() => {
    let aborted = false;

    const loadMachineStats = async () => {
      setMachineStatsLoading(true);
      try {
        const licensee = selectedLicencee || 'all';
        const stats = await fetchMachineStats(licensee, locationId);
        if (!aborted) {
          setMachineStats(stats);
        }
      } catch {
        if (!aborted) {
          setMachineStats({
            totalMachines: 0,
            onlineMachines: 0,
            offlineMachines: 0,
          });
        }
      } finally {
        if (!aborted) setMachineStatsLoading(false);
      }
    };

    loadMachineStats();
    return () => {
      aborted = true;
    };
  }, [selectedLicencee, locationId]);

  return {
    machineStats,
    machineStatsLoading,
    refreshMachineStats,
    error,
  };
}
