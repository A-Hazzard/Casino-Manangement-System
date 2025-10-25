import type {
  MachineData as SharedMachineData,
  MachineStats as SharedMachineStats,
} from '@/shared/types/machines';

// Use the shared types for consistency
export type MachineData = SharedMachineData;
export type MachineStats = SharedMachineStats;

export type MachinesOverviewTabProps = {
  // Data props
  overviewMachines: MachineData[];
  allMachines: MachineData[];
  machineStats: MachineStats | null;
  manufacturerData: Array<{
    manufacturer: string;
    floorPositions: number;
    totalHandle: number;
    totalWin: number;
    totalDrop: number;
    totalCancelledCredits: number;
    totalGross: number;
  }>;
  gamesData: Array<{
    gameName: string;
    floorPositions: number;
    totalHandle: number;
    totalWin: number;
    totalDrop: number;
    totalCancelledCredits: number;
    totalGross: number;
  }>;
  locations: { id: string; name: string; sasEnabled: boolean }[];

  // Loading states
  overviewLoading: boolean;
  manufacturerLoading: boolean;
  gamesLoading: boolean;
  statsLoading: boolean;

  // Pagination
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };

  // Sorting
  sortConfig: {
    key: keyof MachineData;
    direction: 'asc' | 'desc';
  };

  // Actions
  onSort: (key: keyof MachineData) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onExport: () => void;
  onEdit: (machine: MachineData) => void;
  onDelete: (machine: MachineData) => void;
};
