import type { MachineData as SharedMachineData } from '@/shared/types/machines';

// Use the shared MachineData type for consistency
export type MachineData = SharedMachineData;

export type MachinesOfflineTabProps = {
  // Data props
  offlineMachines: MachineData[];
  locations: { id: string; name: string; sasEnabled: boolean }[];

  // Loading states
  offlineLoading: boolean;

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
