import type { CollectionMetersHistoryEntry } from './common';
import type { GamingMachine } from './entities';

/**
 * Payload structure for creating or updating a gaming machine.
 */
export type MachinePayload = Omit<GamingMachine, '_id' | 'createdAt' | 'updatedAt'> & {
  collectionSettings?: {
    lastCollectionTime?: string;
    lastMetersIn?: string;
    lastMetersOut?: string;
  };
};

// Shared machine types used across frontend and backend
// Machine data structure from API (optimized)
export type MachineData = {
  machineId: string;
  serialNumber?: string;
  customName?: string;
  machineName: string;
  locationName: string;
  locationId: string;
  gameTitle: string;
  manufacturer: string;
  machineType: string;
  isOnline: boolean;
  isSasEnabled: boolean;
  drop: number;
  totalCancelledCredits: number;
  jackpot: number;
  coinIn: number;
  coinOut: number;
  gamesPlayed: number;
  theoreticalHold: number;
  netWin: number;
  gross: number;
  lastActivity: string;
  installDate?: string;
  avgBet?: number;
  averageWager?: number;
  totalHandPaidCancelledCredits?: number;
  includeJackpot?: boolean;
  // Frontend-calculated fields (not from API)
  actualHold?: number;
  totalWonCredits?: number;
  currentCredits?: number;
  gamesWon?: number;
  offlineDurationHours?: number; // Calculated from lastActivity for offline machines
  offlineTimeLabel?: string;
  actualOfflineTime?: string;
};

// Machine statistics for dashboard cards
export type MachineStats = {
  onlineCount?: number;
  offlineCount?: number;
  totalCount?: number;
  totalMachines?: number;
  onlineMachines?: number;
  offlineMachines?: number;
  criticalOffline?: number;
  recentOffline?: number;
  totalGross?: number;
  totalDrop?: number;
  totalCancelledCredits?: number;
  totalLocations?: number;
  onlineLocations?: number;
  offlineLocations?: number;
};

// Machine API response
export type MachinesApiResponse = {
  data: MachineData[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

// Machine stats API response
export type MachineStatsApiResponse = {
  onlineCount: number;
  offlineCount: number;
  totalCount: number;
  totalGross: number;
  totalDrop: number;
  totalCancelledCredits: number;
};

/**
 * Machine document with collection meters history
 * Used for operations that require machine data with its collection history
 */
export type MachineWithHistory = {
  _id: string;
  serialNumber?: string;
  origSerialNumber?: string;
  custom?: { name?: string };
  collectionMetersHistory: Array<CollectionMetersHistoryEntry>;
};

/**
 * Machine document with optional collection meters history
 * Used when history may or may not be present
 */
export type MachineWithOptionalHistory = {
  _id: string;
  serialNumber?: string;
  origSerialNumber?: string;
  custom?: { name?: string };
  collectionMetersHistory?: Array<CollectionMetersHistoryEntry>;
};

