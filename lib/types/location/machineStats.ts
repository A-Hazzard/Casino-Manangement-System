/**
 * Location Machine Stats Types
 * Types for location machine statistics and status counts.
 *
 * Tracks total, online, and offline machine counts for locations
 * with refresh functionality.
 */
export type MachineStats = {
  totalMachines: number;
  onlineMachines: number;
  offlineMachines: number;
  criticalOffline?: number;
  recentOffline?: number;
};

export type UseLocationMachineStatsReturn = {
  machineStats: MachineStats | null;
  machineStatsLoading: boolean;
  refreshMachineStats: () => Promise<void>;
  error: string | null;
};

