// Comprehensive types for the Evolution1 Casino Reports Module

export type ReportStep = "selectType" | "configure" | "view";

// Location types
export type CasinoLocation = {
  id: string;
  name: string;
  region: string;
  address: string;
  isActive: boolean;
  totalHandle: number;
  totalWin: number;
  actualHold: number;
  gamesPlayed: number;
  averageWager: number;
  totalJackpot: number;
  performance: PerformanceStatus;
  coordinates?: {
    lat: number;
    lng: number;
  };
  trend: "up" | "down" | "stable";
  trendPercentage: number;
};

// Gaming machine types
export type GamingMachine = {
  id: string;
  locationId: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  assetNumber: string;
  status: "active" | "inactive" | "maintenance";
  lastActivity: string;
  coinIn: number;
  coinOut: number;
  jackpot: number;
  gamesPlayed: number;
  drop: number;
  totalCancelledCredits: number;
  totalHandPaidCancelledCredits: number;
  isOnline: boolean;
  hasSas: boolean;
};

// Logistics types
export type LogisticsEntry = {
  id: string;
  machineId: string;
  machineName: string;
  fromLocationId: string | null;
  fromLocationName: string | null;
  toLocationId: string;
  toLocationName: string;
  moveDate: string;
  reason: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  movedBy: string;
  notes?: string;
};

// Extended report types based on casino management requirements
export type ReportType =
  | "locationPerformance"
  | "machineRevenue"
  | "fullFinancials"
  | "customerActivity";

export type PerformanceStatus = "excellent" | "good" | "average" | "poor";

export type TimePeriod = "Today" | "last7days" | "last30days" | "Custom";

export type DateRange = {
  start: Date;
  end: Date;
};

export type ReportCategory =
  | "financial"
  | "operational"
  | "compliance"
  | "analytics"
  | "audit";

export type ReportFieldCategory =
  | "Location"
  | "Machine"
  | "Financial"
  | "Time"
  | "Customer"
  | "Voucher"
  | "Compliance";

export type ReportField = {
  id: string;
  label: string;
  category: ReportFieldCategory;
  required?: boolean;
  dataType: "number" | "string" | "date" | "percentage" | "currency";
};

export type ChartType =
  | "bar"
  | "line"
  | "pie"
  | "table"
  | "heatmap"
  | "gauge"
  | "area";

export type TimeGranularity =
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "quarterly"
  | "yearly";

export type ReportConfig = {
  title: string;
  reportType: ReportType;
  category: ReportCategory;
  dateRange: {
    start: Date;
    end: Date;
  };
  timeGranularity: TimeGranularity;
  filters: {
    locationIds?: string[];
    machineIds?: string[];
    manufacturers?: string[];
    gameTypes?: string[];
    customerTiers?: string[];
    minAmount?: number;
    maxAmount?: number;
    complianceStatus?: string[];
  };
  fields: string[]; // Array of ReportField ids
  chartType: ChartType;
  exportFormat: "pdf" | "csv" | "excel" | "json";
  includeCharts: boolean;
  includeSummary: boolean;
  scheduleOptions?: {
    frequency: "daily" | "weekly" | "monthly";
    recipients: string[];
    enabled: boolean;
  };
};

export type ReportData = {
  config: ReportConfig;
  summary: ReportSummary;
  tableData: Reportable[];
  chartData: ChartDataPoint[];
  metadata: ReportMetadata;
};

export type ReportSummary = {
  totalRecords: number;
  dateGenerated: string;
  keyMetrics: Array<{
    label: string;
    value: string | number;
    change?: number;
    trend?: "up" | "down" | "stable";
    icon?: string;
  }>;
  alerts?: Array<{
    type: "warning" | "error" | "info";
    message: string;
    severity: "low" | "medium" | "high";
  }>;
};

export type ReportMetadata = {
  generatedBy: string;
  generatedAt: string;
  executionTime: number;
  dataSourceLastUpdated: string;
  reportVersion: string;
  totalDataPoints: number;
};

export type ChartDataPoint = {
  date?: string;
  label: string;
  value: number;
  category?: string;
  color?: string;
  metadata?: Record<string, unknown>;
};

export type Reportable = Record<string, string | number | boolean>;

// Dashboard-specific types
export type KpiMetric = {
  title: string;
  value: number;
  previousValue?: number;
  format: "currency" | "percentage" | "number";
  change?: number;
  trend?: "up" | "down" | "stable" | "neutral";
  icon?: string;
};

export type DashboardWidget = {
  id: string;
  title: string;
  type: "kpi" | "chart" | "table" | "map" | "gauge";
  size: "small" | "medium" | "large";
  data: unknown;
  refreshInterval?: number;
  lastUpdated: string;
};

export type DashboardLayout = {
  widgets: DashboardWidget[];
  layout: Array<{
    widgetId: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
};

// Customer activity tracking types
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

// Voucher tracking types
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

// Machine movement tracking types
export type MachineMovementRecord = {
  id: string;
  machineId: string;
  machineName: string;
  fromLocationId: string | null;
  fromLocationName: string | null;
  toLocationId: string;
  toLocationName: string;
  moveDate: string;
  reason: string;
  status: "pending" | "in-progress" | "completed" | "cancelled";
  notes?: string;
  movedBy: string;
  approvedBy?: string;
  cost?: number;
  downtime?: number; // in hours
  performanceImpact?: {
    beforeRevenue: number;
    afterRevenue: number;
    improvementPercentage: number;
  };
  createdAt: string;
  updatedAt: string;
};

// Performance comparison types
export type PerformanceComparison = {
  type: "location" | "machine" | "timeperiod";
  items: Array<{
    id: string;
    name: string;
    metrics: Record<string, number>;
    rank: number;
    percentileRank: number;
    trend: "improving" | "declining" | "stable";
  }>;
  benchmarks: {
    industry: Record<string, number>;
    internal: Record<string, number>;
  };
};

// Compliance and audit types
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
    status: "on-track" | "at-risk" | "overdue";
  }>;
};

// Export formats and options
export type ExportOptions = {
  format: "pdf" | "csv" | "excel" | "json" | "xml";
  includeCharts: boolean;
  includeSummary: boolean;
  includeRawData: boolean;
  compression?: "none" | "zip" | "gzip";
  password?: string;
  watermark?: string;
};

// Report scheduling types
export type ScheduledReport = {
  id: string;
  name: string;
  config: ReportConfig;
  schedule: {
    frequency: "daily" | "weekly" | "monthly" | "quarterly";
    time: string; // HH:MM format
    timezone: string;
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    enabled: boolean;
  };
  recipients: Array<{
    email: string;
    role: string;
    deliveryMethod: "email" | "portal" | "both";
  }>;
  lastRun?: string;
  nextRun: string;
  status: "active" | "paused" | "error";
  errorMessage?: string;
  createdBy: string;
  createdAt: string;
};

// Report template types
export type ReportTemplate = {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
  config: Partial<ReportConfig>;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  usageCount: number;
  rating: number;
  tags: string[];
};

// Advanced analytics types
export type PredictiveAnalytics = {
  forecast: Array<{
    date: string;
    predicted: number;
    confidence: number;
    upperBound: number;
    lowerBound: number;
  }>;
  trends: Array<{
    metric: string;
    direction: "increasing" | "decreasing" | "stable";
    strength: number; // 0-1
    significance: number; // 0-1
  }>;
  anomalies: Array<{
    date: string;
    metric: string;
    expected: number;
    actual: number;
    severity: "low" | "medium" | "high";
  }>;
};

// Real-time monitoring types
export type RealTimeMetrics = {
  currentPlayers: number;
  activeTerminals: number;
  totalRevenue: number;
  averageHold: number;
  topPerformingMachine: {
    id: string;
    name: string;
    revenue: number;
  };
  alerts: Array<{
    type: "performance" | "technical" | "security" | "compliance";
    message: string;
    timestamp: string;
    severity: "low" | "medium" | "high" | "critical";
    acknowledged: boolean;
  }>;
  lastUpdated: string;
};

// Report view types
export type ReportView =
  | "dashboard"
  | "locations"
  | "machines"
  | "customers"
  | "vouchers"
  | "movements"
  | "compliance"
  | "analytics"
  | "templates"
  | "scheduled";

export type ReportTab = {
  id: ReportView;
  label: string;
  icon: string;
  description: string;
  requiredPermissions?: string[];
};

// Filter types for advanced filtering
export type AdvancedFilter = {
  field: string;
  operator:
    | "equals"
    | "not_equals"
    | "greater_than"
    | "less_than"
    | "contains"
    | "between"
    | "in"
    | "not_in";
  value: unknown;
  logicalOperator?: "AND" | "OR";
};

export type FilterGroup = {
  filters: AdvancedFilter[];
  logicalOperator: "AND" | "OR";
};

// Data source types
export type DataSource = {
  id: string;
  name: string;
  type: "database" | "api" | "file" | "external";
  connection: {
    host?: string;
    database?: string;
    table?: string;
    apiEndpoint?: string;
    filePath?: string;
  };
  lastSync: string;
  status: "connected" | "disconnected" | "error";
  recordCount: number;
};

// Report generation status
export type ReportGenerationStatus = {
  id: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  startTime: string;
  endTime?: string;
  error?: string;
  downloadUrl?: string;
  expiresAt?: string;
};

// User preferences for reports
export type UserReportPreferences = {
  defaultTimeRange: {
    start: string;
    end: string;
  };
  defaultLocations: string[];
  favoriteReports: string[];
  dashboardLayout: DashboardLayout;
  notifications: {
    emailReports: boolean;
    alertThresholds: Record<string, number>;
    frequency: "immediate" | "daily" | "weekly";
  };
  exportPreferences: ExportOptions;
};

// Export utility types
export type ExportTableData = (string | number)[][];

export type ExportSummaryItem = {
  label: string;
  value: string | number;
};

export type ExportMetadata = {
  generatedBy: string;
  generatedAt: string;
  dateRange?: string;
};

export type ExportDataStructure = {
  title: string;
  subtitle?: string;
  headers: string[];
  data: ExportTableData;
  summary?: ExportSummaryItem[];
  metadata?: ExportMetadata;
};

export type MachineExportData = {
  id: string;
  gameTitle: string;
  manufacturer: string;
  locationName: string;
  totalHandle: number;
  totalWin: number;
  actualHold: number;
  gamesPlayed: number;
  isActive: boolean;
};

export type LocationExportData = {
  id: string;
  name: string;
  region: string;
  totalHandle: number;
  totalWin: number;
  actualHold: number;
  gamesPlayed: number;
  isActive: boolean;
};

// --- Evolution One Custom Analytics Types ---

/**
 * Analytics summary for a single location (used in LocationsTab)
 */
export type LocationPerformance = {
  id: string;
  name: string;
  totalDrop: number;
  cancelledCredits: number;
  gross: number;
  machineCount: number;
  onlineMachines: number;
  sasMachines: number;
  coordinates?: [number, number];
  trend: "up" | "down" | "stable";
  trendPercentage: number;
};

/**
 * Analytics summary for a single machine (used in MachinesTab and LocationsTab)
 */
export type MachinePerformance = {
  id: string;
  name: string;
  locationName: string;
  locationId: string;
  totalDrop: number;
  cancelledCredits: number;
  gross: number;
  isOnline: boolean;
  hasSas: boolean;
  lastActivity: string;
};

/**
 * Global stats for the dashboard/overview (used in LocationsTab)
 */
export type GlobalStats = {
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
  totalMachines: number;
  onlineMachines: number;
  sasMachines: number;
};

// ChartDataPoint for analytics charts (override if needed)
export type AnalyticsChartDataPoint = {
  date: string;
  totalDrop: number;
  cancelledCredits: number;
  gross: number;
};

export type MachineAnalytics = {
  _id: string;
  name: string;
  locationName: string;
  totalDrop: number;
  gross: number;
  isOnline: boolean;
  hasSas: boolean;
};

export type MachineStats = {
  totalMachines: number;
  onlineMachines: number;
  sasMachines: number;
  totalDrop: number;
  totalGross: number;
  totalCancelledCredits: number;
};
