import type {
  QueryFilter,
  ParamsType,
  CustomDate,
  TimePeriod,
} from "@shared/types";
import { Alert, ReportView } from "./reports";

export type { QueryFilter };
export type { ParamsType };
export type { CustomDate };
export type { TimePeriod };

export * from "@/lib/types/movementRequests";

export type { LoginRequestBody, AuthResult } from "./auth";

// Dashboard types
export type dashboardData = {
  xValue: string;
  day: string;
  time: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  location?: string;
  machine?: string;
  geoCoords?: {
    latitude?: number;
    longitude?: number;
    longtitude?: number;
  };
};

export type DashboardTotals = {
  moneyIn: number;
  moneyOut: number;
  gross: number;
};

export type ActiveFilters = {
  Today: boolean;
  Yesterday: boolean;
  last7days: boolean;
  last30days: boolean;
  Custom: boolean;
};
export type ActiveTab = "locations" | "Cabinets";
export type dateRange = { startDate: Date; endDate: Date };
export type Location = { 
  _id: string; 
  name: string;
  locationName?: string;
  geoCoords?: {
    latitude?: number;
    longitude?: number;
    longtitude?: number;
  };
  totalMachines?: number;
  onlineMachines?: number;
};

export type locations = Array<Location>;
export type TimeFrames = {
  time: string;
  value: TimePeriod;
};
export type TopPerformingItem = {
  _id: string;
  name: string;
  total: number;
  performance: string;
  color: string;
  totalDrop: number;
  location?: string;
  machine?: string;
};

export type TopPerformingData = Array<TopPerformingItem>;

// Report types
export type RealTimeMetrics = {
  totalMachines: number;
  onlineMachines: number;
  totalRevenue: number;
  activeTerminals: number;
  currentPlayers: number;
  alerts: Alert[];
  lastUpdated: Date;
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
  theoreticalHold: number;
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
  gross: number;
  drop: number;
  cancelledCredits: number;
  onlineMachines: number;
  totalMachines: number;
};

export type DateRange = {
  start: Date;
  end: Date;
};

// Additional types for constants
export type licenceeOption = {
  label: string;
  value: string;
};

export type ReportTab = {
  id: ReportView;
  label: string;
  icon?: string;
  description?: string;
  requiredRoles?: string[];
  requiredPermissions?: string[];
};

export type ReportField = {
  id: string;
  label: string;
  dataType: string;
  category: string;
};

export type ReportFieldCategory = string;

export type ReportType = "locationPerformance" | "machineRevenue" | "fullFinancials" | "customerActivity";
