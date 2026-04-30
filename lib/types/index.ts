import { DateRange } from '../utils/date/ranges';
import { TimePeriod } from '@/shared/types/common';
import { ReportTab, MachineEvaluationData, ReportView, DashboardTotals } from '@/shared/types/reports';

export * from '@/shared/types/entities';

export type { DateRange, TimePeriod };

export type dashboardData = {
  xValue: string;
  day: string;
  time: string;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  jackpot?: number;
  netGross?: number;
  location?: string;
  machine?: string;
  geoCoords?: {
    latitude?: number;
    longitude?: number;
    longtitude?: number;
  };
};

export type { MachineEvaluationData, ReportTab, ReportView, DashboardTotals };

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

export type dateRange = {
  from?: Date;
  to?: Date;
  startDate?: Date;
  endDate?: Date;
  start?: Date;
  end?: Date;
  [key: string]: unknown;
};

export type locations = Array<{
  _id: string;
  name: string;
  totalMachines?: number;
  onlineMachines?: number;
  moneyIn?: number;
  moneyOut?: number;
  gross?: number;
}>;

export type ActiveTab = ReportView;

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
