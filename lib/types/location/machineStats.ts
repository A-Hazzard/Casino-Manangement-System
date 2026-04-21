import { MachineStats as SharedMachineStats } from '@/shared/types/machines';

/**
 * Location Machine Stats Types
 * Types for location machine statistics and status counts.
 *
 * Tracks total, online, and offline machine counts for locations
 * with refresh functionality.
 */
export type MachineStats = SharedMachineStats;

export type UseLocationMachineStatsReturn = {
  machineStats: MachineStats | null;
  machineStatsLoading: boolean;
  refreshMachineStats: () => Promise<void>;
  error: string | null;
};

