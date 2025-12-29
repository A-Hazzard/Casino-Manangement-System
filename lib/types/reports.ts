/**
 * Reports Types
 * Comprehensive types for report generation, views, and data structures.
 *
 * Includes types for:
 * - Report queries and filters
 * - Report generation requests
 * - Dashboard widgets and configurations
 * - Various report views (dashboard, locations, machines, logistics)
 * - Financial and performance metrics
 * - Report scheduling and export
 * - User preferences and settings
 * Re-exports shared report types from shared/types/reports.
 */
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
