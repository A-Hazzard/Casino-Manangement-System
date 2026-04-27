import { type MachineData, type MachineStats } from './machines';
import type { AggregatedLocation } from '@/shared/types/entities';
export type { MachineData, MachineStats, AggregatedLocation };

export type ReportView = 'machines' | 'locations' | 'meters' | 'sas-evaluation' | 'revenue-analysis' | 'Cabinets' | 'overview';

export type DashboardTotals = {
  moneyIn: number;
  moneyOut: number;
  gross: number;
  jackpot?: number;
  netGross?: number;
};

export type TopPerformingTab = 'locations' | 'Cabinets';

export type ReportTab = {
  id: ReportView;
  label: string;
  icon?: string;
  description?: string;
  available?: boolean;
};

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

export type MachineAnalytics = {
  _id: string;
  name: string;
  locationName: string;
  totalDrop: number;
  gross: number;
  isOnline: boolean;
  hasSas: boolean;
};

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

export type ReportData = {
  config: ReportConfig;
  summary: {
    totalRecords: number;
    dateGenerated: string;
    keyMetrics: Array<{ label: string; value: number }>;
  };
  tableData: Record<string, unknown>[];
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

export type MachineEvaluationData = {
  locationName: string;
  locationId: string;
  machineId: string;
  machineName: string;
  gameTitle: string;
  manufacturer: string;
  drop: number;
  netWin: number;
  coinIn: number;
  avgBet: number;
  actualHold: number;
  theoreticalHold: number;
  gamesPlayed: number;
  gross: number;
  cancelledCredits: number;
  jackpot?: number;
  averageWager?: number;
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

export type DashboardWidget = {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'alert';
  title: string;
  config: Record<string, unknown>;
  data: unknown;
  position: { x: number; y: number; w: number; h: number };
  visible: boolean;
};

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

export type LocationTrendPoint = {
  day: string;
  time?: string;
  [locationId: string]:
    | {
        handle: number;
        winLoss: number;
        jackpot: number;
        plays: number;
        drop: number;
        totalCancelledCredits: number;
        gross: number;
        netGross?: number;
      }
    | string
    | undefined;
};

export type LocationTrendsResponse = {
  trends: LocationTrendPoint[];
  totals: Record<
    string,
    {
      handle: number;
      winLoss: number;
      jackpot: number;
      plays: number;
      drop: number;
      gross: number;
      netGross: number;
    }
  >;
  locations: string[];
  locationNames?: Record<string, string>;
  isHourly?: boolean;
};

export type SASReportResult = {
  metricsTotals: DashboardTotals | null;
  locations: AggregatedLocation[];
  topMachines: MachineData[];
  bottomMachines: MachineData[];
  trendData: LocationTrendsResponse | null;
};


export type MachineSortKey = keyof MachineData | 'offlineDurationHours' | string;

export type ReportsMachinesOverviewProps = {
  overviewMachines: MachineData[];
  allMachines?: MachineData[];
  machineStats: MachineStats | null;
  manufacturerData?: Array<Record<string, unknown>>;
  gamesData?: Array<Record<string, unknown>>;
  locations: Array<{ id: string; name: string; sasEnabled: boolean }>;
  searchTerm: string;
  selectedLocation: string;
  onlineStatusFilter: string;
  overviewLoading: boolean;
  statsLoading: boolean;
  manufacturerLoading?: boolean;
  gamesLoading?: boolean;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  sortConfig: {
    key: MachineSortKey;
    direction: 'asc' | 'desc';
  };
  onSearchChange: (val: string) => void;
  onLocationChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onSort: (key: MachineSortKey) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onExport: (format: 'pdf' | 'excel') => void;
  onEdit: (machine: MachineData) => void;
  onDelete: (machine: MachineData) => void;
};

export type VerificationDetails = {
  metricName: string;
  totalMachines: number;
  machinesWithData: number;
  topMachines: Array<{
    machineId: string;
    machineName: string;
    value: number;
    cumulative: number;
    percentageOfTotal: number;
  }>;
  allMachinesWithData: Array<{
    machineId: string;
    machineName: string;
    locationName: string;
    locationId: string;
    manufacturer: string;
    gameTitle: string;
    value: number;
    percentageOfTotal: number;
    coinIn?: number;
    netWin?: number;
    gamesPlayed?: number;
    drop?: number;
    gross?: number;
  }>;
  totalValue: number;
  cumulativeValue: number;
  machinePercentage: number;
  metricPercentage: number;
};

export type PerformanceMetrics = {
  coinIn: number;
  netWin: number;
  drop: number;
  gross: number;
  cancelledCredits: number;
  gamesPlayed: number;
};

export type ManufacturerPerformanceData = {
  manufacturer: string;
  floorPositions: number;
  totalHandle: number;
  totalWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
  totalGamesPlayed: number;
  rawTotals?: PerformanceMetrics;
  totalMetrics?: PerformanceMetrics;
  machineCount?: number;
  totalMachinesCount?: number;
};

export type GamesPerformanceData = {
  gameName: string;
  floorPositions: number;
  totalHandle: number;
  totalWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
  totalGamesPlayed: number;
  rawTotals?: PerformanceMetrics;
  totalMetrics?: PerformanceMetrics;
  machineCount?: number;
  totalMachinesCount?: number;
};

export type ReportsMachinesEvaluationProps = {
  evaluationData: MachineEvaluationData[];
  allMachines: MachineEvaluationData[];
  manufacturerData: ManufacturerPerformanceData[];
  gamesData: GamesPerformanceData[];
  locations: Array<{ id: string; name: string; sasEnabled: boolean }>;
  selectedLocationIds: string[];
  evaluationLoading: boolean;
  topMachinesSortKey: TopMachinesCriteria;
  topMachinesSortDirection: 'asc' | 'desc';
  bottomMachinesSortKey: TopMachinesCriteria;
  bottomMachinesSortDirection: 'asc' | 'desc';
  summaryCalculations: {
    handleStatement: string;
    winStatement: string;
    gamesPlayedStatement: string;
    handleDetails: VerificationDetails | undefined;
    winDetails: VerificationDetails | undefined;
    gamesPlayedDetails: VerificationDetails | undefined;
  };
  topMachines: MachineEvaluationData[];
  bottomMachines: MachineEvaluationData[];
  onLocationChange: (ids: string[]) => void;
  onTopMachinesSort: (key: TopMachinesCriteria) => void;
  onBottomMachinesSort: (key: TopMachinesCriteria) => void;
  onRefresh: () => void;
  onExport: (format: 'pdf' | 'excel') => void;
};

export type ReportsMachinesEvaluationSummaryProps = {
  handleStatement: string;
  winStatement: string;
  gamesPlayedStatement: string;
  handleDetails?: VerificationDetails;
  winDetails?: VerificationDetails;
  gamesPlayedDetails?: VerificationDetails;
};

export type ReportsMachinesOfflineProps = {
  offlineMachines: MachineData[];
  allOfflineMachines?: MachineData[];
  locations: Array<{ id: string; name: string; sasEnabled: boolean }>;
  searchTerm: string;
  selectedLocations: string[];
  selectedOfflineDuration: string;
  offlineLoading: boolean;
  machineStats: MachineStats | null;
  machineStatsLoading: boolean;
  offlinePagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  sortConfig: {
    key: MachineSortKey;
    direction: 'asc' | 'desc';
  };
  onSearchChange: (val: string) => void;
  onLocationChange: (val: string[]) => void;
  onDurationChange: (val: string) => void;
  onSort: (key: MachineSortKey) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onExport: (format: 'pdf' | 'excel') => void;
  onEdit: (machine: MachineData) => void;
  onDelete: (machine: MachineData) => void;
};

export type TopMachinesCriteria =
  | 'gross'
  | 'drop'
  | 'netWin'
  | 'averageBet'
  | 'coinIn'
  | 'actualHold'
  | 'locationName'
  | 'machineId';

export type RealTimeMetrics = {
  totalMachines: number;
  onlineMachines: number;
  totalRevenue: number;
  activeTerminals: number;
  currentPlayers: number;
  alerts: Alert[];
  lastUpdated: Date;
};

export type CollectionData = {
  _id: string;
  machineId?: string;
  machineCustomName?: string;
  metersIn: number;
  metersOut: number;
  prevIn: number;
  prevOut: number;
  timestamp: Date;
  collectionTime?: Date | string;
  locationReportId?: string;
  ramClear?: boolean;
  ramClearCoinIn?: number;
  ramClearCoinOut?: number;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  movement?: Record<string, number>;
  sasMeters?: {
    machine?: string;
    sasStartTime?: string;
    sasEndTime?: string;
    drop?: number;
    totalCancelledCredits?: number;
    gross?: number;
    gamesPlayed?: number;
    jackpot?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type HistoryEntry = {
  _id: string;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  prevIn?: number;
  prevOut?: number;
  timestamp: Date | string;
  locationReportId: string;
};

export type FixResults = {
  reportId?: string;
  collectionsProcessed: number;
  issuesFixed: {
    sasTimesFixed: number;
    prevMetersFixed: number;
    movementCalculationsFixed: number;
    machineHistoryFixed: number;
    historyEntriesFixed: number;
    machineCollectionMetersFixed: number;
  };
  errors: Array<{
    collectionId: string;
    machineId?: string;
    machineCustomName?: string;
    phase?: string;
    error: string;
  }>;
};
