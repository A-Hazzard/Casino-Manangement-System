/**
 * Machines Offline Tab Types
 * Types for machines offline tab component.
 *
 * Defines props for offline machines tab including data, locations,
 * pagination, sorting, and CRUD action handlers.
 */
import type { MachineData as SharedMachineData } from '@/shared/types/machines';
import type { MachineStats } from '@/lib/types/locationMachineStats';

// Use the shared MachineData type for consistency
export type MachineData = SharedMachineData;

export type MachinesOfflineTabProps = {
  // Data props
  offlineMachines: MachineData[];
  locations: { id: string; name: string; sasEnabled: boolean }[];
  machineStats: MachineStats | null;
  allOfflineMachines?: MachineData[]; // All offline machines for calculating critical/recent stats

  // Filter values
  searchTerm: string;
  selectedLocations: string[];
  selectedOfflineDuration: string;

  // Loading states
  offlineLoading: boolean;
  machineStatsLoading: boolean;

  // Pagination
  offlinePagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };

  // Sorting
  sortConfig: {
    key: keyof MachineData | 'offlineDurationHours';
    direction: 'asc' | 'desc';
  };

  // Actions
  onSearchChange: (value: string) => void;
  onLocationChange: (value: string[]) => void;
  onDurationChange: (value: string) => void;
  onSort: (key: keyof MachineData | 'offlineDurationHours') => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onExport: (format: 'pdf' | 'excel') => void;
  onEdit: (machine: MachineData) => void;
  onDelete: (machine: MachineData) => void;
};
