import type {
  ReportsLocationData,
  PaginationInfo,
  ReportsLocationsResponse,
} from "@shared/types/reports";
import type { KpiMetric, ChartDataPoint } from "@shared/types/analytics";
import type { MachinePerformanceRating } from "@shared/types/machines";

// Re-export shared types for convenience
export type {
  ReportsLocationData,
  PaginationInfo,
  ReportsLocationsResponse,
  KpiMetric,
  ChartDataPoint,
  MachinePerformanceRating,
};

// Machine evaluation data type (subset of MachineData with evaluation-specific properties)
export type MachineEvaluationData = {
  locationName: string;
  machineId: string;
  machineName: string;
  gameTitle: string;
  manufacturer: string;
  locationId: string;
  serialNumber: string;
  coinIn: number;
  drop: number;
  netWin: number;
  gross: number;
  avgBet: number;
  actualHold: number;
  theoreticalHold: number;
  holdDifference: number;
  performanceRating: string;
  gamesPlayed: number;
};

// Manufacturer aggregation data for evaluation charts
export type ManufacturerAggregationData = {
  name: string;
  machines: number;
  totalGross: number;
  totalGamesPlayed: number;
  avgHold: number;
  holdValues: number[];
};

// Frontend-specific report types
export type ReportFilters = {
  timePeriod: string;
  selectedLicencee?: string;
  customDateRange?: {
    start: Date;
    end: Date;
  };
  page?: number;
  limit?: number;
};

export type ReportExportOptions = {
  format: "pdf" | "csv" | "excel";
  includeSummary?: boolean;
  includeMetadata?: boolean;
};

// Report configuration type
export type ReportConfig = {
  title: string;
  reportType:
    | "locationPerformance"
    | "machineRevenue"
    | "fullFinancials"
    | "customerActivity";
  category: "operational" | "financial" | "analytical" | "compliance";
  dateRange: {
    start: Date;
    end: Date;
  };
  timeGranularity: "hourly" | "daily" | "weekly" | "monthly";
  fields: string[];
  filters: {
    locationIds?: string[];
    manufacturers?: string[];
    [key: string]: unknown;
  };
  chartType: "bar" | "line" | "table" | "pie";
  exportFormat: "pdf" | "csv" | "excel";
  includeCharts: boolean;
  includeSummary: boolean;
};

// Report data type
export type ReportData = {
  config: ReportConfig;
  summary: {
    totalRecords: number;
    dateGenerated: string;
    keyMetrics: Array<{
      label: string;
      value: number;
    }>;
  };
  tableData: Reportable[];
  chartData: Array<{
    label: string;
    value: number;
  }>;
  metadata: {
    generatedBy: string;
    generatedAt: string;
    executionTime: number;
    dataSourceLastUpdated: string;
    reportVersion: string;
    totalDataPoints: number;
  };
};

// Reportable row type for dynamic field mapping
export type Reportable = {
  [key: string]: string | number | boolean | null | undefined;
};

// Legacy types that are still being used
export type CasinoLocation = {
  id: string;
  name: string;
  region: string;
  address?: string;
  isActive: boolean;
  totalHandle: number;
  totalWin: number;
  actualHold: number;
  gamesPlayed: number;
  averageWager: number;
  totalJackpot: number;
  performance: "excellent" | "good" | "average" | "poor";
  coordinates?: {
    lat: number;
    lng: number;
  };
};

export type GamingMachine = {
  id: string;
  gameTitle: string;
  manufacturer: string;
  locationId: string;
  locationName?: string;
  totalHandle: number;
  totalWin: number;
  actualHold: number;
  gamesPlayed: number;
  isActive: boolean;
  installDate: string;
  lastActivity: string;
  avgBet?: number;
  averageWager?: number;
  coinIn: number;
  coinOut: number;
  totalCancelledCredits: number;
  totalHandPaidCancelledCredits: number;
  totalWonCredits: number;
  drop: number;
  jackpot: number;
  currentCredits: number;
  gamesWon: number;
};

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

// Machine Analytics type for API responses
export type MachineAnalytics = {
  _id: string;
  name: string;
  locationName: string;
  totalDrop: number;
  gross: number;
  isOnline: boolean;
  hasSas: boolean;
};

// Daily counts report type
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

// Machine movement record type
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
  cost?: number;
  createdAt: string;
  updatedAt: string;
};

// Report view types
export type ReportView = "dashboard" | "locations" | "machines" | "meters";

export type ReportTab = {
  id: ReportView;
  label: string;
  icon: string;
  description: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
};

// Report field types for report builder
export type ReportFieldCategory = "Location" | "Machine" | "Financial" | "Time";

export type ReportField = {
  id: string;
  label: string;
  dataType: "string" | "number" | "date" | "currency" | "percentage";
  category: ReportFieldCategory;
};

// Compliance metrics type
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

// Customer metrics type
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

// Real-time metrics type
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
  lastUpdated: string;
  alerts: Array<{
    type: string;
    message: string;
    timestamp: string;
    severity: string;
    acknowledged: boolean;
  }>;
};

// Voucher metrics type
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

// Dashboard widget type
export type DashboardWidget = {
  id: string;
  type: "kpi" | "chart" | "table" | "metric";
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config?: Record<string, unknown>;
  data?: unknown;
  isVisible: boolean;
  refreshInterval?: number;
};

// User report preferences type
export type UserReportPreferences = {
  defaultDateRange: {
    start: Date;
    end: Date;
  };
  defaultTimePeriod: "Today" | "last7days" | "last30days" | "Custom";
  defaultLocations: string[];
  defaultMachines: string[];
  dashboardLayout: DashboardWidget[];
  refreshInterval: number | null;
  autoRefresh: boolean;
  exportFormat: "pdf" | "csv" | "excel";
  includeCharts: boolean;
  includeSummary: boolean;
  theme: "light" | "dark" | "auto";
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
};

// Report generation status type
export type ReportGenerationStatus = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  downloadUrl?: string;
};

// Performance comparison type
export type PerformanceComparison = {
  id: string;
  name: string;
  description: string;
  baseline: {
    timePeriod: string;
    data: Record<string, number>;
  };
  comparison: {
    timePeriod: string;
    data: Record<string, number>;
  };
  metrics: string[];
  createdAt: string;
  createdBy: string;
};

// Report step type for wizard flow
export type ReportStep =
  | "selectType"
  | "configure"
  | "generate"
  | "complete"
  | "view";

// Active customers report type
export type ActiveCustomersReport = {
  id: string;
  title: string;
  description: string;
  dateRange: {
    start: Date;
    end: Date;
  };
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
  data: Array<{
    customerId: string;
    customerName: string;
    locationName: string;
    machineId: string;
    gameTitle: string;
    totalPlayTime: number;
    totalWagered: number;
    totalWon: number;
    netWin: number;
    lastActivity: Date;
    visitCount: number;
    averageSessionLength: number;
  }>;
  summary: {
    totalActiveCustomers: number;
    averagePlayTime: number;
    totalWagered: number;
    totalWon: number;
    averageSessionLength: number;
  };
  generatedAt: Date;
  generatedBy: string;
};

// Location stats report type
export type LocationStatsReport = {
  id: string;
  title: string;
  description: string;
  dateRange: {
    start: Date;
    end: Date;
  };
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
  data: Array<{
    locationId: string;
    locationName: string;
    totalMachines: number;
    onlineMachines: number;
    offlineMachines: number;
    totalRevenue: number;
    totalPayout: number;
    grossProfit: number;
    netWin: number;
    totalGamesPlayed: number;
    averageHoldPercentage: number;
    totalJackpot: number;
    averageSessionLength: number;
    uniquePlayers: number;
    totalVisits: number;
    lastActivity: Date;
  }>;
  summary: {
    totalLocations: number;
    totalMachines: number;
    totalRevenue: number;
    totalPayout: number;
    totalGrossProfit: number;
    averageHoldPercentage: number;
    totalGamesPlayed: number;
    totalUniquePlayers: number;
  };
  generatedAt: Date;
  generatedBy: string;
};

// Machine performance report type
export type MachinePerformanceReport = {
  id: string;
  title: string;
  description: string;
  dateRange: {
    start: Date;
    end: Date;
  };
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
  data: Array<{
    machineId: string;
    machineName: string;
    serialNumber: string;
    locationName: string;
    gameTitle: string;
    manufacturer: string;
    machineType: string;
    totalRevenue: number;
    totalPayout: number;
    netWin: number;
    grossProfit: number;
    totalGamesPlayed: number;
    averageWagerPerGame: number;
    actualHoldPercentage: number;
    theoreticalHoldPercentage: number;
    totalJackpot: number;
    totalDrop: number;
    totalCancelledCredits: number;
    isOnline: boolean;
    isSasEnabled: boolean;
    lastActivity: Date;
    uptimePercentage: number;
    averageSessionLength: number;
  }>;
  summary: {
    totalMachines: number;
    onlineMachines: number;
    offlineMachines: number;
    totalRevenue: number;
    totalPayout: number;
    totalNetWin: number;
    totalGrossProfit: number;
    totalGamesPlayed: number;
    averageHoldPercentage: number;
    totalJackpot: number;
  };
  generatedAt: Date;
  generatedBy: string;
};

// Cash balances report type
export type CashBalancesReport = {
  id: string;
  title: string;
  description: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  data: Array<{
    machineId: string;
    machineName: string;
    locationName: string;
    currentCashBalance: number;
    previousCashBalance: number;
    cashIn: number;
    cashOut: number;
    netCashFlow: number;
    dropAmount: number;
    jackpotAmount: number;
    cancelledCredits: number;
    lastCollectionDate: Date;
    lastCollectionAmount: number;
    collectionFrequency: string;
    isOverdue: boolean;
    overdueAmount: number;
    notes: string;
  }>;
  summary: {
    totalMachines: number;
    totalCurrentBalance: number;
    totalPreviousBalance: number;
    totalCashIn: number;
    totalCashOut: number;
    totalNetCashFlow: number;
    totalDropAmount: number;
    totalJackpotAmount: number;
    totalCancelledCredits: number;
    overdueCollections: number;
    totalOverdueAmount: number;
  };
  generatedAt: Date;
  generatedBy: string;
};

// Financial performance report type
export type FinancialPerformanceReport = {
  id: string;
  title: string;
  description: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  data: Array<{
    locationId: string;
    locationName: string;
    totalRevenue: number;
    totalPayout: number;
    grossProfit: number;
    netWin: number;
    totalGamesPlayed: number;
    averageWagerPerGame: number;
    actualHoldPercentage: number;
    theoreticalHoldPercentage: number;
    totalJackpot: number;
    totalDrop: number;
    totalCancelledCredits: number;
    totalVisits: number;
    uniquePlayers: number;
    averageSessionLength: number;
    revenuePerMachine: number;
    profitPerMachine: number;
    gamesPerMachine: number;
    lastActivity: Date;
  }>;
  summary: {
    totalLocations: number;
    totalRevenue: number;
    totalPayout: number;
    totalGrossProfit: number;
    totalNetWin: number;
    totalGamesPlayed: number;
    averageHoldPercentage: number;
    totalJackpot: number;
    totalDrop: number;
    totalCancelledCredits: number;
    totalVisits: number;
    totalUniquePlayers: number;
    averageRevenuePerLocation: number;
    averageProfitPerLocation: number;
  };
  generatedAt: Date;
  generatedBy: string;
};

// Terminal counts report type
export type TerminalCountsReport = {
  id: string;
  title: string;
  description: string;
  dateRange: {
    start: Date;
    end: Date;
  };
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
  data: Array<{
    locationId: string;
    locationName: string;
    totalTerminals: number;
    onlineTerminals: number;
    offlineTerminals: number;
    activeTerminals: number;
    inactiveTerminals: number;
    terminalsInUse: number;
    availableTerminals: number;
    maintenanceTerminals: number;
    lastActivity: Date;
    uptimePercentage: number;
    averageSessionLength: number;
    totalSessions: number;
    uniqueUsers: number;
  }>;
  summary: {
    totalLocations: number;
    totalTerminals: number;
    totalOnlineTerminals: number;
    totalOfflineTerminals: number;
    totalActiveTerminals: number;
    totalInactiveTerminals: number;
    totalTerminalsInUse: number;
    totalAvailableTerminals: number;
    totalMaintenanceTerminals: number;
    averageUptimePercentage: number;
    totalSessions: number;
    totalUniqueUsers: number;
  };
  generatedAt: Date;
  generatedBy: string;
};

// Scheduled Report types
export type ScheduledReport = {
  id: string;
  name: string;
  config: ReportConfig;
  schedule: {
    frequency: "daily" | "weekly" | "monthly";
    time: string;
    timezone: string;
    dayOfWeek?: number; // 0-6 for weekly schedules
    dayOfMonth?: number; // 1-31 for monthly schedules
    enabled: boolean;
  };
  recipients: Array<{
    email: string;
    role: string;
    deliveryMethod: "email" | "sms" | "webhook";
  }>;
  lastRun: string;
  nextRun: string;
  status: "active" | "paused" | "error";
  createdBy: string;
  createdAt: string;
};

export type SortConfig = {
  key: string;
  direction: 'asc' | 'desc';
};

export type MachineExportData = {
  machineId: string;
  machineName: string;
  gameTitle: string;
  locationName: string;
  manufacturer: string;
  netWin: number;
  drop: number;
  totalCancelledCredits: number;
  gamesPlayed: number;
  theoreticalHold?: number;
  isOnline: boolean;
  isSasEnabled: boolean;
};

export type LocationExportData = {
  location: string;
  locationName: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  totalMachines: number;
  onlineMachines: number;
  sasMachines: number;
  nonSasMachines: number;
  hasSasMachines: boolean;
  hasNonSasMachines: boolean;
  isLocalServer: boolean;
};

export type TopLocationData = {
  locationId: string;
  locationName: string;
};
