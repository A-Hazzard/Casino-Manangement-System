/**
 * Custom hook for managing location machine statistics
 * Handles machine stats fetching and state management for locations page
 */

import { useState, useEffect, useCallback } from "react";
import { fetchMachineStats } from "@/lib/helpers/machineStats";

interface MachineStats {
  totalMachines: number;
  onlineMachines: number;
  offlineMachines: number;
}

interface UseLocationMachineStatsReturn {
  machineStats: MachineStats | null;
  machineStatsLoading: boolean;
  refreshMachineStats: () => Promise<void>;
  error: string | null;
}

export function useLocationMachineStats(): UseLocationMachineStatsReturn {
  const [machineStats, setMachineStats] = useState<MachineStats | null>(null);
  const [machineStatsLoading, setMachineStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch machine stats
  const fetchMachineStatsData = useCallback(async () => {
    setMachineStatsLoading(true);
    setError(null);
    
    try {
      const stats = await fetchMachineStats("all");
      setMachineStats(stats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch machine stats";
      setError(errorMessage);
      setMachineStats({
        totalMachines: 0,
        onlineMachines: 0,
        offlineMachines: 0,
      });
    } finally {
      setMachineStatsLoading(false);
    }
  }, []);

  // Refresh machine stats
  const refreshMachineStats = useCallback(async () => {
    await fetchMachineStatsData();
  }, [fetchMachineStatsData]);

  // Load machine stats on mount
  useEffect(() => {
    let aborted = false;
    
    const loadMachineStats = async () => {
      setMachineStatsLoading(true);
      try {
        const stats = await fetchMachineStats("all");
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
  }, []);

  return {
    machineStats,
    machineStatsLoading,
    refreshMachineStats,
    error,
  };
}
