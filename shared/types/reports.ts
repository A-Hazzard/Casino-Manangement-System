// Shared analytics types used across frontend and backend
import type { DateRange, PerformanceStatus } from "./common";

// Metrics filters for analytics queries
export type MetricsFilters = {
  dateRange?: DateRange;
  locationIds?: string[];
  machineIds?: string[];
  manufacturers?: string[];
  gameTypes?: string[];
  timePeriod?: "Today" | "last7days" | "last30days" | "Custom";
};

// Aggregated metrics structure
export type AggregatedMetrics = {
  totalHandle: number;
  totalWin: number;
  totalJackpots: number;
  totalGamesPlayed: number;
  actualHoldPercentage: number;
  averageBetPerGame: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalHandPaidCancelledCredits: number;
  totalWonCredits: number;
  voucherOut: number;
  moneyWon: number;
};

// Location metrics response
export type LocationMetricsResponse = {
  locationId: string;
  locationName: string;
  metrics: AggregatedMetrics;
  performance: PerformanceStatus;
  coordinates?: {
    lat: number;
    lng: number;
  };
};

// Machine metrics response
export type MachineMetricsResponse = {
  machineId: string;
  locationId: string;
  locationName: string;
  manufacturer: string;
  gameTitle: string;
  metrics: {
    coinIn: number;
    coinOut: number;
    totalCancelledCredits: number;
    totalHandPaidCancelledCredits: number;
    totalWonCredits: number;
    drop: number;
    jackpot: number;
    currentCredits: number;
    gamesPlayed: number;
    gamesWon: number;
    actualHold: number;
    averageWager: number;
    voucherOut: number;
    moneyWon: number;
  };
  isActive: boolean;
  installDate: string;
};

// Time series data point
export type TimeSeriesData = {
  date: string;
  value: number;
  label?: string;
};

// Comparison request structure
export type ComparisonRequest = {
  type: "locations" | "machines";
  ids: string[];
  dateRange: DateRange;
  metrics: string[];
};

// Comparison response structure
export type ComparisonResponse = {
  type: "locations" | "machines";
  data: Array<{
    id: string;
    name: string;
    metrics: Record<string, number>;
    timeSeries: Record<string, TimeSeriesData[]>;
  }>;
  summary: {
    bestPerformer: {
      id: string;
      name: string;
      metric: string;
      value: number;
    };
    averages: Record<string, number>;
  };
};

// Logistics types
export type LogisticsRequest = {
  machineId: string;
  toLocationId: string;
  moveDate: string;
  reason: string;
  notes?: string;
  movedBy: string;
};

export type LogisticsResponse = {
  id: string;
  machineId: string;
  machineName: string;
  fromLocationId: string | null;
  fromLocationName: string | null;
  toLocationId: string;
  toLocationName: string;
  moveDate: string;
  reason: string;
  status: "pending" | "completed" | "cancelled";
  notes?: string;
  movedBy: string;
  createdAt: string;
  updatedAt: string;
};

// Report generation types
export type ReportGenerationRequest = {
  title: string;
  fields: string[];
  filters: MetricsFilters;
  chartType: "line" | "bar" | "pie" | "table";
  exportFormat: "pdf" | "csv" | "excel";
};

export type ReportGenerationResponse = {
  reportId: string;
  downloadUrl: string;
  generatedAt: string;
  expiresAt: string;
};
