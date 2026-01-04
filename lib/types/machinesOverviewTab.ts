/**
 * Machines Overview Tab Types
 * Types for machines overview tab component with comprehensive machine data.
 *
 * Defines props for overview tab including machine lists, statistics,
 * manufacturer/game data, pagination, sorting, and action handlers.
 */
import type {
  MachineData as SharedMachineData,
  MachineStats as SharedMachineStats,
} from '@/shared/types/machines';

// Use the shared types for consistency
export type MachineData = SharedMachineData;
export type MachineStats = SharedMachineStats;

export type ReportsMachinesOverviewProps = {
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
    totalGamesPlayed: number;
  }>;
  gamesData: Array<{
    gameName: string;
    floorPositions: number;
    totalHandle: number;
    totalWin: number;
    totalDrop: number;
    totalCancelledCredits: number;
    totalGross: number;
    totalGamesPlayed: number;
  }>;
  locations: { id: string; name: string; sasEnabled: boolean }[];

  // Filter values
  searchTerm: string;
  selectedLocation: string;
  onlineStatusFilter: string;

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
  onSearchChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onSort: (key: keyof MachineData) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onExport: (format: 'pdf' | 'excel') => void;
  onEdit: (machine: MachineData) => void;
  onDelete: (machine: MachineData) => void;
};
