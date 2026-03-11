/**
 * Reports Types
 *
 * Central export point for reports-related type definitions.
 *
 * Features:
 * - Main reports types
 * - Machines overview tab types
 * - Machines offline tab types
 * - Machines evaluation tab types
 */

// Main reports types
export * from './types';

// Machines tab types
// Note: MachineData is exported from multiple files, but they all use the same shared type
// Export from machinesOverview as the primary export
export * from './machinesEvaluation';
export * from './machinesOffline';
export type {
  MachineData,
  MachineStats,
  ReportsMachinesOverviewProps,
} from './machinesOverview';

// Report fix types
// Note: fix.ts has its own MachineData type that includes collectionMetersHistory
// This is different from the shared MachineData type
export * from './fix';
