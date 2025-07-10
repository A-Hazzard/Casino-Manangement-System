// API-specific analytics types for Evolution1 CMS

// Define missing types locally
export type AggregatedMetrics = {
  totalHandle: number;
  totalWin: number;
  actualHold: number;
  totalMachines: number;
  onlineMachines: number;
  totalGamesPlayed: number;
  averageWager: number;
};

export type LocationMetricsResponse = {
  locationId: string;
  locationName: string;
  metrics: AggregatedMetrics;
  performance: "excellent" | "good" | "average" | "poor";
};

export type MachineMetricsResponse = {
  machineId: string;
  machineName: string;
  locationName: string;
  metrics: AggregatedMetrics;
  status: "online" | "offline" | "maintenance";
};

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type MetricsFilters = {
  dateRange?: {
    start: Date;
    end: Date;
  };
  locationIds?: string[];
  machineIds?: string[];
  timePeriod?: string;
};

export type DashboardMetricsResponse = {
  totalMetrics: AggregatedMetrics;
  locationMetrics: LocationMetricsResponse[];
  topPerformingMachines: Array<{
    machineId: string;
    machineName: string;
    locationName: string;
    metric: number;
    metricType: string;
  }>;
  performanceTrends: Array<{
    date: string;
    totalHandle: number;
    totalWin: number;
    actualHold: number;
  }>;
};

// Define other missing types
export type LogisticsRequest = {
  machineId: string;
  fromLocationId: string;
  toLocationId: string;
  reason: string;
  scheduledDate: Date;
};

export type LogisticsResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export type ReportGenerationRequest = {
  reportType: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, unknown>;
};

export type ReportGenerationResponse = {
  success: boolean;
  data?: unknown;
  error?: string;
};

export type MachineContributionResponse = {
  locationId: string;
  locationName: string;
  totalMachines: number;
  contributionAnalysis: {
    topPerformers: {
      percentage: number;
      machineCount: number;
      handleContribution: number;
      winContribution: number;
      gamesPlayedContribution: number;
    };
    averagePerformers: {
      percentage: number;
      machineCount: number;
      handleContribution: number;
      winContribution: number;
      gamesPlayedContribution: number;
    };
    underPerformers: {
      percentage: number;
      machineCount: number;
      handleContribution: number;
      winContribution: number;
      gamesPlayedContribution: number;
    };
  };
};

// Define time series and comparison types
export type TimeSeriesData = {
  date: string;
  value: number;
  label?: string;
};

export type ComparisonRequest = {
  baselinePeriod: {
    start: Date;
    end: Date;
  };
  comparisonPeriod: {
    start: Date;
    end: Date;
  };
  metrics: string[];
};

export type ComparisonResponse = {
  success: boolean;
  data?: {
    baseline: Record<string, number>;
    comparison: Record<string, number>;
    changes: Record<string, number>;
  };
  error?: string;
};
