/**
 * Machines Evaluation Tab Types
 * Types for machines evaluation tab component.
 *
 * Defines props for evaluation tab including machine data, locations,
 * loading states, sorting configuration, and action handlers.
 */
import type { MachineEvaluationData } from '@/lib/types';
import type { VerificationDetails } from '@/lib/helpers/machines';

export type TopMachinesCriteria =
  | 'locationName'
  | 'machineId'
  | 'gameTitle'
  | 'manufacturer'
  | 'coinIn'
  | 'netWin'
  | 'gross'
  | 'gamesPlayed'
  | 'actualHold'
  | 'theoreticalHold'
  | 'averageWager'
  | 'jackpot';

export type ReportsMachinesEvaluationProps = {
  // Data props
  evaluationData: MachineEvaluationData[];
  allMachines: MachineEvaluationData[];
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
  selectedLocationIds: string[];

  // Loading states
  evaluationLoading: boolean;

  // Sorting
  topMachinesSortKey: TopMachinesCriteria;
  topMachinesSortDirection: 'asc' | 'desc';
  bottomMachinesSortKey: TopMachinesCriteria;
  bottomMachinesSortDirection: 'asc' | 'desc';

  // Summary
  summaryCalculations: {
    handleStatement: string;
    winStatement: string;
    gamesPlayedStatement: string;
    handleDetails: VerificationDetails | undefined;
    winDetails: VerificationDetails | undefined;
    gamesPlayedDetails: VerificationDetails | undefined;
  };

  // Top/Bottom Machines
  topMachines: MachineEvaluationData[];
  bottomMachines: MachineEvaluationData[];

  // Actions
  onLocationChange: (locationIds: string[]) => void;
  onTopMachinesSort: (key: TopMachinesCriteria) => void;
  onBottomMachinesSort: (key: TopMachinesCriteria) => void;
  onRefresh: () => void;
  onExport: (format: 'pdf' | 'excel') => void;
};

