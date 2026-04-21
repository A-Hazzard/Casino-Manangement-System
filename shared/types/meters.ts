import type { TimePeriod } from './common';
import type { CurrencyCode } from './currency';

/**
 * Parsed and validated request parameters for meters report
 */
export type ParsedMetersReportParams = {
  timePeriod: TimePeriod;
  customStartDate: Date | undefined;
  customEndDate: Date | undefined;
  page: number;
  limit: number;
  search: string;
  licencee: string | null;
  displayCurrency: CurrencyCode;
  includeHourlyData: boolean;
  requestedLocationList: string[];
  hourlyDataMachineIds?: string[];
  granularity?: 'hourly' | 'minute';
};

/**
 * Individual data record for meters report
 */
export type MetersReportData = {
  machineId: string;
  metersIn: number;
  metersOut: number;
  jackpot: number;
  billIn: number;
  voucherOut: number;
  attPaidCredits: number;
  gamesPlayed: number;
  netGross: number;
  includeJackpot: boolean;
  location: string;
  locationId: string;
  createdAt: string;
  machineDocumentId: string;
  // Optional fields for export logic
  customName?: string;
  serialNumber?: string;
  game?: string;
};

/**
 * Hourly/Minute chart data point
 */
export type MetersHourlyChartData = {
  day: string;
  hour: string;
  gamesPlayed: number;
  coinIn: number;
  coinOut: number;
};

/**
 * Standard response format for meters report API
 */
export type MetersReportResponse = {
  data: MetersReportData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  locations: string[];
  dateRange: {
    start: Date | string;
    end: Date | string;
  };
  timePeriod: TimePeriod;
  currency: CurrencyCode;
  converted: boolean;
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  hourlyChartData?: MetersHourlyChartData[];
};


