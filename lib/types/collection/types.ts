/**
 * Collection Types
 * Types for collection modal, machine data, and collection operations.
 *
 * Includes types for:
 * - Collection modal state and data
 * - Machine financial data (meters in/out, money in/out)
 * - Location and machine selection
 * - Collection time management
 * - Collection history and records
 * - Collection views and tabs
 */
export type CollectionReportMachineEntry = {
  machineId: string;
  machineName: string;
  collectionTime: string; // Should be ISO string e.g., new Date().toISOString()
  metersIn: number | string;
  metersOut: number | string;
  notes?: string;
  useCustomTime: boolean;
  selectedDate: string; // Store date as string e.g. YYYY-MM-DD
  timeHH: string;
  timeMM: string;
  ramClear?: boolean;
  ramClearCoinIn?: number;
  ramClearCoinOut?: number;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
};

export type CollectionSasMeters = {
  machine: string;
  drop: number;
  totalCancelledCredits: number;
  gross: number;
  gamesPlayed: number;
  jackpot: number;
  sasStartTime: string;
  sasEndTime: string;
};

export type CollectionMovement = {
  metersIn: number;
  metersOut: number;
  gross: number;
};

export type CollectionDocument = {
  _id: string;
  isCompleted: boolean;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  softMetersIn: number;
  softMetersOut: number;
  notes: string;
  timestamp: Date;
  collectionTime?: Date;
  location: string;
  collector: string;
  locationReportId: string;
  sasMeters: CollectionSasMeters;
  movement: CollectionMovement;
  machineCustomName: string;
  machineId: string;
  machineName: string;
  game?: string;
  ramClear?: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  serialNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
};

// Collection Creation Types
export type CreateCollectionPayload = {
  machineId: string;
  location: string;
  collector: string;
  metersIn: number;
  metersOut: number;
  // CRITICAL: Include prevIn and prevOut for proper meter tracking
  prevIn?: number;
  prevOut?: number;
  timestamp?: Date | string;
  collectionTime?: Date | string;
  sasStartTime?: Date;
  sasEndTime?: Date;
  notes?: string;
  locationReportId?: string;
  machineCustomName?: string;
  machineName?: string;
  serialNumber?: string;
  isCompleted?: boolean;
  ramClear?: boolean;
  ramClearCoinIn?: number;
  ramClearCoinOut?: number;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
};

export type SasMetricsCalculation = {
  drop: number;
  totalCancelledCredits: number;
  gross: number;
  sasStartTime: string;
  sasEndTime: string;
  gamesPlayed: number;
  jackpot: number;
};

export type MovementCalculation = {
  metersIn: number;
  metersOut: number;
  gross: number;
};

export type PreviousCollectionMeters = {
  metersIn: number;
  metersOut: number;
  collectionTime?: Date;
};

// Collection view and tab types
export type CollectionView = 'collection' | 'monthly' | 'manager' | 'collector';

export type CollectionTab = {
  id: CollectionView;
  label: string;
  icon: string;
  description?: string;
};