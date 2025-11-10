/**
 * Types for Fix Report API
 *
 * Author: Aaron Hazzard - Senior Software Engineer
 * Last Updated: January 17th, 2025
 */

export interface FixResults {
  reportId: string;
  collectionsProcessed: number;
  issuesFixed: {
    sasTimesFixed: number;
    movementCalculationsFixed: number;
    prevMetersFixed: number;
    machineCollectionMetersFixed: number;
    historyEntriesFixed: number;
    machineHistoryFixed: number;
  };
  errors: Array<{
    collectionId: string;
    machineId?: string;
    machineCustomName?: string;
    phase?: string;
    error: string;
    details?: string;
  }>;
}

export interface CollectionData {
  _id: string;
  machineId: string;
  machineCustomName?: string;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  timestamp: string | Date;
  collectionTime?: string | Date;
  locationReportId: string;
  isCompleted?: boolean;
  sasMeters?: {
    sasStartTime?: string;
    sasEndTime?: string;
    machine?: string;
    [key: string]: unknown;
  };
  movement?: {
    metersIn: number;
    metersOut: number;
    gross: number;
  };
  ramClear?: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  ramClearCoinIn?: number;
  ramClearCoinOut?: number;
  [key: string]: unknown;
}

export interface HistoryEntry {
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  timestamp: string | Date;
  locationReportId: string;
  [key: string]: unknown;
}

export interface MachineData {
  _id: string;
  collectionMetersHistory?: HistoryEntry[];
  [key: string]: unknown;
}
