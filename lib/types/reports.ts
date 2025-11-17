import type {
  ReportsLocationData,
  PaginationInfo,
  ReportsLocationsResponse,
} from '@shared/types/reports';

// Re-export shared types for convenience
export type { ReportsLocationData, PaginationInfo, ReportsLocationsResponse };

// Backend-specific report types
export type ReportQuery = {
  timePeriod: string;
  licencee?: string;
  locationIds?: string[];
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
};

export type ReportGenerationRequest = {
  reportType: string;
  filters: ReportQuery;
  format: 'pdf' | 'csv' | 'excel';
  userId: string;
};

// Logistics entry type for movement/logistics tracking
export type LogisticsEntry = {
  id: string;
  machineId: string;
  machineName: string;
  fromLocationName?: string;
  toLocationName: string;
  moveDate: string | Date;
  status: 'completed' | 'pending' | 'in-progress' | 'cancelled';
  movedBy: string;
  reason: string;
};

// Machine analytics type for performance reporting
export type MachineAnalytics = {
  _id: string;
  name: string;
  locationName: string;
  totalDrop: number;
  gross: number;
  isOnline: boolean;
  hasSas: boolean;
};

// Report configuration type for report generation
export type ReportConfig = {
  title: string;
  reportType: 'locationPerformance' | 'machineRevenue' | 'fullFinancials';
  category: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  timeGranularity: string;
  fields: string[];
  filters: {
    locationIds?: string[];
    manufacturers?: string[];
  };
  chartType: 'bar' | 'line' | 'table';
  exportFormat: string;
  includeCharts: boolean;
  includeSummary: boolean;
};

export type MachineMovementRecord = {
  _id: string;
  machineId: string;
  machineName: string;
  fromLocationId?: string;
  fromLocationName?: string;
  toLocationId: string;
  toLocationName: string;
  moveDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  movedBy: string;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
};

// Report export types
export type DailyCountsReport = {
  locationId: string;
  locationName: string;
  date: string;
  meterReadings: Array<{
    machineId: string;
    machineName: string;
    openingReading: number;
    closingReading: number;
    netRevenue: number;
    variance: number;
  }>;
  voucherData: {
    issued: number;
    redeemed: number;
    outstanding: number;
  };
  physicalCounts: {
    expectedCash: number;
    actualCash: number;
    variance: number;
  };
};

export type ActiveCustomersReport = {
  totalRegistered: number;
  activeToday: number;
  activeThisWeek: number;
  activeThisMonth: number;
  locationBreakdown: Array<{
    locationId: string;
    locationName: string;
    activeCustomers: number;
    signInRecords: number;
  }>;
};

export type LocationStatsReport = {
  locationId: string;
  locationName: string;
  machineCount: number;
  onlineMachines: number;
  offlineMachines: number;
  dailyIntake: number;
  dailyPayouts: number;
  netRevenue: number;
  uptime: number;
  performance: string;
};

export type MachinePerformanceReport = {
  machineId: string;
  machineName: string;
  locationName: string;
  moneyIn: number;
  moneyOut: number;
  playCount: number;
  averagePlayDuration: number;
  totalIncome: number;
  holdPercentage: number;
  payoutRatio: number;
  manufacturer: string;
  gameType: string;
};

export type TerminalCountsReport = {
  manufacturer: string;
  gameType: string;
  totalTerminals: number;
  onlineTerminals: number;
  offlineTerminals: number;
  locations: Array<{
    locationId: string;
    locationName: string;
    count: number;
  }>;
};

// Additional report types for analytics store
export type KpiMetric = {
  id: string;
  label: string;
  name: string;
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  trend?: 'up' | 'down' | 'neutral';
  format: 'currency' | 'percentage' | 'number';
  description?: string;
};

export type CasinoLocation = {
  _id: string;
  name: string;
  region: string;
  totalMachines: number;
  onlineMachines: number;
  revenue: number;
  performance: 'good' | 'average' | 'poor';
  lastUpdated: Date;
};

export type GamingMachine = {
  _id: string;
  locationId: string;
  manufacturer: string;
  gameTitle: string;
  lastActivity: string;
  coinIn: number;
  coinOut: number;
  drop: number;
  totalCancelledCredits: number;
  jackpot: number;
  gamesPlayed: number;
  performance: 'good' | 'average' | 'poor';
  isOnline: boolean;
};

export type ChartDataPoint = {
  label: string;
  value: number;
  date?: Date;
  category?: string;
  metadata?: Record<string, unknown>;
};

// Report store types
export type ReportType =
  | 'locationPerformance'
  | 'machineRevenue'
  | 'fullFinancials'
  | 'customerActivity'
  | 'dailyCounts'
  | 'activeCustomers'
  | 'locationStats'
  | 'machinePerformance'
  | 'terminalCounts';

export type ReportStep = {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  progress: number;
  message?: string;
  data?: unknown;
};

export type ScheduledReport = {
  id: string;
  name: string;
  config: {
    title: string;
    reportType: 'machineRevenue' | 'locationPerformance' | 'customerActivity';
    category: string;
    dateRange: {
      start: Date;
      end: Date;
    };
    timeGranularity: 'daily' | 'weekly' | 'monthly';
    filters: Record<string, unknown>;
    fields: string[];
    chartType: 'table' | 'bar' | 'line';
    exportFormat: 'pdf' | 'excel' | 'csv';
    includeCharts: boolean;
    includeSummary: boolean;
  };
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    timezone: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    enabled: boolean;
  };
  recipients: Array<{
    email: string;
    role: string;
    deliveryMethod: 'email';
  }>;
  lastRun: string;
  nextRun: string;
  status: 'active' | 'paused' | 'error';
  createdBy: string;
  createdAt: string;
};

// Customer analytics types
export type CustomerMetrics = {
  totalCustomers: number;
  activeCustomers: number;
  newCustomers: number;
  returningCustomers: number;
  averageSessionTime: number;
  averageSpend: number;
  topSpenders: Array<{
    customerId: string;
    totalSpend: number;
    visits: number;
  }>;
};

export type CustomerDemographic = {
  ageGroup: string;
  count: number;
  percentage: number;
};

export type LoyaltyTier = {
  tier: string;
  count: number;
  percentage: number;
  color: string;
};

export type VoucherMetrics = {
  totalVouchersIssued: number;
  totalVouchersRedeemed: number;
  totalVoucherValue: number;
  redemptionRate: number;
  averageVoucherValue: number;
  expiredVouchers: number;
  fraudulentVouchers: number;
  vouchersByLocation: Array<{
    locationId: string;
    locationName: string;
    issued: number;
    redeemed: number;
    value: number;
  }>;
};

export type Alert = {
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp?: Date;
  locationId?: string;
  machineId?: string;
};

export type ReportData = {
  config: ReportConfig;
  summary: {
    totalRecords: number;
    dateGenerated: string;
    keyMetrics: Array<{ label: string; value: number }>;
  };
  tableData: Reportable[];
  chartData: Array<{ label: string; value: number }>;
  metadata: {
    generatedBy: string;
    generatedAt: string;
    executionTime: number;
    dataSourceLastUpdated: string;
    reportVersion: string;
    totalDataPoints: number;
  };
};

export type Reportable = Record<string, unknown>;

// Report navigation types
export type ReportView = 'machines' | 'locations' | 'meters';

export type ReportTab = {
  id: ReportView;
  label: string;
  icon?: string;
  description?: string;
};

// Compliance types
export type ComplianceMetrics = {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  pendingChecks: number;
  complianceScore: number;
  criticalIssues: number;
  resolvedIssues: number;
  pendingIssues: number;
  averageResolutionTime: number;
  upcomingDeadlines: Array<{
    requirement: string;
    deadline: string;
    status: string;
  }>;
};

export type ComplianceCategory = {
  category: string;
  score: number;
  checksPassed: number;
  totalChecks: number;
  pendingChecks: number;
};

export type RecentAudit = {
  id: string;
  type: string;
  status: string;
  severity: string;
  date: string;
  auditor: string;
  findings: number;
};

// Dashboard widget types
export type DashboardWidget = {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'alert';
  title: string;
  config: Record<string, unknown>;
  data: unknown;
  position: { x: number; y: number; w: number; h: number };
  visible: boolean;
};

// User report preferences
export type UserReportPreferences = {
  userId: string;
  defaultView: ReportView;
  favoriteReports: string[];
  dashboardLayout: DashboardWidget[];
  notificationSettings: {
    emailReports: boolean;
    scheduledReports: boolean;
    alerts: boolean;
  };
  exportPreferences: {
    defaultFormat: 'pdf' | 'excel' | 'csv';
    includeCharts: boolean;
    includeSummary: boolean;
  };
};

// Report generation status
export type ReportGenerationStatus = {
  id: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
  message?: string;
  startTime: Date;
  endTime?: Date;
  result?: {
    downloadUrl?: string;
    error?: string;
  };
};

// Performance comparison types
export type PerformanceComparison = {
  baseline: {
    period: string;
    metrics: Record<string, number>;
  };
  current: {
    period: string;
    metrics: Record<string, number>;
  };
  changes: Record<
    string,
    {
      value: number;
      percentage: number;
      trend: 'up' | 'down' | 'neutral';
    }
  >;
};

// Real-time metrics type
export type RealTimeMetrics = {
  totalMachines: number;
  onlineMachines: number;
  totalRevenue: number;
  activeTerminals: number;
  currentPlayers: number;
  alerts: Alert[];
  lastUpdated: Date;
};
