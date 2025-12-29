import { ReportView } from './reports';
import { DateRange } from '@/lib/utils/dateUtils';
import { TimePeriod } from '@/shared/types/common';

export * from '@/shared/types/entities';

// Re-export date types
export type { DateRange };

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

// Report types
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
  jackpot?: number; // Added for Top Machines table (ME3-2.5)
  averageWager?: number; // Added for Top Machines table (ME3-2.3)
};

export type ReportTab = {
  id: ReportView;
  label: string;
  icon?: string;
  description?: string;
};

// Top performing data types
export type TopLocationData = {
  locationId: string;
  locationName: string;
  gross: number;
  drop: number;
  cancelledCredits: number;
  onlineMachines: number;
  totalMachines: number;
};

export type TopPerformingData = TopPerformingItem[];

export type TopPerformingItem = {
  id: string;
  _id?: string;
  name: string;
  performance: number;
  revenue: number;
  location?: string;
  locationId?: string;
  machineId?: string;
  game?: string;
  customName?: string;
  color?: string;
  totalDrop?: number;
};

// Export data types
export type LocationExportData = {
  locationName: string;
  totalMachines: number;
  onlineMachines: number;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  performance: string;
  sasMachines: number;
  nonSasMachines: number;
  hasSasMachines: boolean;
  hasNonSasMachines: boolean;
  isLocalServer: boolean;
};

// Dashboard filter types
export type dateRange = {
  from?: Date;
  to?: Date;
  startDate?: Date;
  endDate?: Date;
  start?: Date;
  end?: Date;
  [key: string]: any;
};

// Location types
export type locations = Array<{
  _id: string;
  name: string;
  totalMachines?: number;
  onlineMachines?: number;
  moneyIn?: number;
  moneyOut?: number;
  gross?: number;
}>;

// Dashboard filter types
export type ActiveTab = 'overview' | 'sas-evaluation' | 'revenue-analysis' | 'machines' | 'Cabinets' | 'locations';

export type ActiveFilters = {
  timePeriod?: string;
  licencee?: string;
  locationIds?: string[];
  customDateRange?: dateRange;
  Today?: boolean;
  Yesterday?: boolean;
  last7days?: boolean;
  last30days?: boolean;
  Custom?: boolean;
};

// Re-export TimePeriod
export type { TimePeriod };
