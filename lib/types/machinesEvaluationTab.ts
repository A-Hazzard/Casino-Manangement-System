/**
 * Machines Evaluation Tab Types
 * Types for machines evaluation tab component.
 *
 * Defines props for evaluation tab including machine data, locations,
 * loading states, sorting configuration, and action handlers.
 */
import type { MachineData as SharedMachineData } from '@/shared/types/machines';

// Use the shared MachineData type for consistency
export type MachineData = SharedMachineData;

export type MachinesEvaluationTabProps = {
  // Data props
  evaluationData: MachineData[];
  locations: { id: string; name: string; sasEnabled: boolean }[];

  // Loading states
  evaluationLoading: boolean;

  // Sorting
  sortConfig: {
    key: keyof MachineData;
    direction: 'asc' | 'desc';
  };

  // Actions
  onSort: (key: keyof MachineData) => void;
  onRefresh: () => void;
  onExport: () => void;
};
