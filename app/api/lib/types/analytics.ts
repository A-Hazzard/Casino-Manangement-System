// API-specific analytics types for Evolution1 CMS
import type { AggregatedMetrics, LocationMetricsResponse } from "@shared/types";

// Re-export shared types for convenience
export type {
  ApiResponse,
  MetricsFilters,
  AggregatedMetrics,
  LocationMetricsResponse,
  MachineMetricsResponse,
} from "@shared/types";

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

// Re-export shared types for convenience
export type {
  LogisticsRequest,
  LogisticsResponse,
  ReportGenerationRequest,
  ReportGenerationResponse,
} from "@shared/types";

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

// Re-export shared types for convenience
export type {
  TimeSeriesData,
  ComparisonRequest,
  ComparisonResponse,
} from "@shared/types";
