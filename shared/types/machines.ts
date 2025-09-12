// Shared machine types used across frontend and backend
import type { TimePeriod } from "./common";

// Machine data structure from API (optimized)
export type MachineData = {
  machineId: string;
  serialNumber?: string;
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

// Machine overview statistics
export type MachineOverview = {
  totalMachines: number;
  onlineMachines: number;
  offlineMachines: number;
  totalNetWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalJackpot: number;
  averageHoldPercentage: number;
  topPerformingMachine?: MachineData;
};

// Machine comparison data
export type MachineComparison = {
  machineId: string;
  machineName: string;
  locationName: string;
  gameTitle: string;
  theoreticalHold: number;
  actualHold: number;
  holdDifference: number;
  performanceRating: "excellent" | "good" | "average" | "poor";
  netWin: number;
  gamesPlayed: number;
  avgBet: number;
};

// Machine filter options
export type MachineFilters = {
  searchTerm?: string;
  locationFilter?: string;
  machineTypeFilter?: string;
  manufacturerFilter?: string;
  onlineStatus?: "all" | "online" | "offline";
  sasStatus?: "all" | "sas" | "non-sas";
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

// Machine export data
export type MachineExportData = {
  title: string;
  subtitle: string;
  headers: string[];
  data: (string | number)[][];
  summary: Array<{
    label: string;
    value: string;
  }>;
  metadata: {
    generatedBy: string;
    generatedAt: string;
    dateRange: string;
  };
};

// Machine evaluation types
export type MachineEvaluation = {
  machineId: string;
  machineName: string;
  locationName: string;
  manufacturer: string;
  gameTitle: string;
  evaluationMetrics: {
    floorPositions: number;
    totalHandle: number;
    totalWin: number;
    totalDrop: number;
    totalCancelledCredits: number;
    totalGross: number;
  };
  performanceRating: "excellent" | "good" | "average" | "poor";
  contributionPercentage: number;
  theoreticalRtp: number;
  actualRtp: number;
  rtpVariance: number;
  lastEvaluationDate: string;
};

export type MachineEvaluationSummary = {
  totalMachines: number;
  contributingMachines: number;
  contributionPercentage: number;
  summary: string;
  topContributors: MachineEvaluation[];
  manufacturers: {
    name: string;
    machines: number;
    contribution: number;
    performance: number;
  }[];
  games: {
    name: string;
    machines: number;
    contribution: number;
    performance: number;
  }[];
};


export type MachineEvaluationFilters = {
  manufacturer?: string;
  gameType?: string;
  performanceRating?: string;
  contributionThreshold?: number;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
};

// Machine performance metrics
export type MachinePerformanceMetrics = {
  totalRevenue: number;
  totalMachines: number;
  onlineMachines: number;
  averageGrossPerMachine: number;
  topPerformingMachine?: string;
  revenueGrowth?: number;
  machineUtilization: number;
  averageHoldPercentage: number;
};

// Machine analytics query
export type MachineAnalyticsQuery = {
  timePeriod: TimePeriod;
  licensee?: string;
  location?: string;
  machine?: string;
  startDate?: Date;
  endDate?: Date;
  groupBy?: "day" | "week" | "month" | "location" | "machine";
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  page?: number;
};

// Machine status types
export type MachineStatus = "online" | "offline" | "maintenance" | "error";

// Machine type categories
export type MachineType =
  | "slot"
  | "roulette"
  | "blackjack"
  | "poker"
  | "bingo"
  | "other";

// Machine manufacturer types
export type MachineManufacturer =
  | "IGT"
  | "Scientific Games"
  | "NetEnt"
  | "Microgaming"
  | "Playtech"
  | "Aristocrat"
  | "Bally"
  | "WMS"
  | "Konami"
  | "Other";

// Machine performance rating
export type MachinePerformanceRating =
  | "excellent"
  | "good"
  | "average"
  | "poor";

// Machine hold analysis
export type MachineHoldAnalysis = {
  machineId: string;
  machineName: string;
  theoreticalHold: number;
  actualHold: number;
  holdDifference: number;
  performanceRating: MachinePerformanceRating;
  revenueImpact: number;
  recommendations: string[];
};
