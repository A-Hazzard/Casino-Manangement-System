import type { CollectionMetersHistoryEntry } from './common';
import type { GamingMachine } from './entities';

export type MachinePayload = Omit<
  GamingMachine,
  '_id' | 'createdAt' | 'updatedAt' | 'gameConfig'
> & {
  gameConfig?: {
    accountingDenomination?: number | string;
    theoreticalRtp?: number | string;
    maxBet?: string;
    payTableId?: string;
    additionalId?: string;
    gameOptions?: string;
    progressiveGroup?: string;
  };
  locationId?: string;
  relayId?: string;
  installedGame?: string;
  status?: string;
  collectionMultiplier?: number;
  collectionTime?: string;
  collectionMeters?: { metersIn: number; metersOut: number };
  manuf?: string;
  collectionSettings?: {
    lastCollectionTime?: string;
    lastMetersIn?: string;
    lastMetersOut?: string;
  };
  is_sas_machine?: boolean;
  sas_version?: string;
  current_session?: string;
  logged_in?: boolean;
  last_activity?: string | Date;
  last_sas_meter_at?: string | Date;
  last_bill_meter_at?: string | Date;
  sasMeters?: GamingMachine['sasMeters'] & {
    total_cancelled_credits?: number;
    games_played?: number;
    money_out?: number;
    slot_door_opened?: number;
    power_reset?: number;
    total_hand_paid_cancelled_credits?: number;
    coin_in?: number;
    coin_out?: number;
    total_won_credits?: number;
    current_credits?: number;
    games_won?: number;
  };
  billMeters?: GamingMachine['billMeters'] & {
    dollar_1?: number;
    dollar_2?: number;
    dollar_5?: number;
    dollar_10?: number;
    dollar_20?: number;
    dollar_50?: number;
    dollar_100?: number;
    dollar_500?: number;
    dollar_1000?: number;
    dollar_2000?: number;
    dollar_5000?: number;
    dollar_total?: number;
    dollar_total_unknown?: number;
  };
  machineMembershipSettings?: GamingMachine['machineMembershipSettings'] & {
    is_points_allowed?: boolean;
    is_free_play_allowed?: boolean;
    points_award_method?: string;
    free_play_amount?: number;
    free_play_credits_timeout?: number;
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
