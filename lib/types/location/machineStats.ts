import { MachineStats as SharedMachineStats } from '@/shared/types/machines';

export type MachineStats = SharedMachineStats;

export type UseLocationMachineStatsReturn = {
  machineStats: MachineStats | null;
  machineStatsLoading: boolean;
  refreshMachineStats: () => Promise<void>;
  error: string | null;
};

