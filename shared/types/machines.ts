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
  onlineCount: number;
  offlineCount: number;
  totalCount: number;
  totalGross: number;
  totalDrop: number;
  totalCancelledCredits: number;
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

