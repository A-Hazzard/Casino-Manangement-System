export type MachineStats = {
  totalMachines: number;
  onlineMachines: number;
  offlineMachines: number;
};

export type UseLocationMachineStatsReturn = {
  machineStats: MachineStats | null;
  machineStatsLoading: boolean;
  refreshMachineStats: () => Promise<void>;
  error: string | null;
};
