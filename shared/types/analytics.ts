// Shared analytics types used across frontend and backend
import type { TimePeriod } from "./common";

// Dashboard data types
export type DashboardData = {
  xValue?: string;
  day: string;
  time?: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  location?: string;
  locationName?: string;
  machine?: string;
  geoCoords?: {
    latitude: number;
    longitude: number;
    name?: string;
  }[];
};

// Metrics types
export type Meter = {
  _id: string;
  machine: string;
  location: string;
  movement: {
    coinIn: number;
    coinOut: number;
    drop: number;
    totalCancelledCredits: number;
    gamesPlayed: number;
    jackpot: number;
  };
  coinIn: number;
  coinOut: number;
  drop: number;
  totalCancelledCredits: number;
  gamesPlayed: number;
  jackpot: number;
  createdAt: Date;
  updatedAt: Date;
  readAt: Date;
};

export type Metrics = {
  day: string;
  time?: string;
  drop: number;
  totalCancelledCredits: number;
  gross: number;
  location?: string;
  locationName?: string;
  machine?: string;
  geoCoords?: DashboardData["geoCoords"];
};

// Top performing data
export type TopPerformingData = {
  location?: string;
  machine?: string;
  totalDrop: number;
  totalGamesPlayed: number;
  totalJackpot: number;
  color?: string;
};

// Analytics filtersChartData
export type ActiveFilters = {
  Today: boolean;
  Yesterday: boolean;
  last7days: boolean;
  last30days: boolean;
  Custom: boolean;
};

export type TimeFrames = {
  time: string;
  value: TimePeriod;
};

// Chart data types
export type ChartDataPoint = {
  label: string;
  value: number;
  color?: string;
  percentage?: number;
};

export type KpiMetric = {
  label: string;
  value: number | string;
  change?: number;
  trend?: "up" | "down" | "stable";
  format?: "currency" | "number" | "percentage" | "text";
};

// Report data types
export type ReportData = {
  id: string;
  title: string;
  description?: string;
  data: unknown[];
  metadata?: {
    generatedAt: Date;
    timeRange?: string;
    filters?: Record<string, unknown>;
  };
};

export type ReportField = {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "currency" | "percentage";
  sortable?: boolean;
  filterable?: boolean;
  format?: string;
};

// Export data types
export type ExportDataStructure = {
  headers: string[];
  data: unknown[][];
  metadata?: {
    title: string;
    generatedAt: Date;
    filters?: Record<string, unknown>;
  };
};

export type MachineExportData = {
  serialNumber: string;
  location: string;
  game: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  jackpot: number;
  gamesPlayed: number;
  lastActivity: Date;
};

export type LocationExportData = {
  locationName: string;
  totalMachines: number;
  onlineMachines: number;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  performance: "good" | "average" | "poor";
};

// Performance metrics
export type PerformanceMetrics = {
  totalRevenue: number;
  totalMachines: number;
  onlineMachines: number;
  averageGrossPerMachine: number;
  topPerformingLocation?: string;
  topPerformingMachine?: string;
  revenueGrowth?: number;
  machineUtilization: number;
};

// Analytics query types
export type AnalyticsQuery = {
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
};

// Activity log types
export type ActivityLog = {
  _id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}; 