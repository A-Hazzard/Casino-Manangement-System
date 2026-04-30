import type { CollectionMetersHistoryEntry } from './common';
import type { GamingMachine } from './entities';

export type MachinePayload = Omit<GamingMachine, '_id' | 'createdAt' | 'updatedAt'> & {
  collectionSettings?: {
    lastCollectionTime?: string;
    lastMetersIn?: string;
    lastMetersOut?: string;
  };
};

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
  actualHold?: number;
  totalWonCredits?: number;
  currentCredits?: number;
  gamesWon?: number;
  offlineDurationHours?: number;
  offlineTimeLabel?: string;
  actualOfflineTime?: string;
};

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

export type MachineStatsApiResponse = {
  onlineCount: number;
  offlineCount: number;
  totalCount: number;
  totalGross: number;
  totalDrop: number;
  totalCancelledCredits: number;
};

export type MachineWithHistory = {
  _id: string;
  serialNumber?: string;
  origSerialNumber?: string;
  custom?: { name?: string };
  collectionMetersHistory: Array<CollectionMetersHistoryEntry>;
};

export type MachineWithOptionalHistory = {
  _id: string;
  serialNumber?: string;
  origSerialNumber?: string;
  custom?: { name?: string };
  collectionMetersHistory?: Array<CollectionMetersHistoryEntry>;
};

