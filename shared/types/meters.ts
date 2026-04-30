import type { TimePeriod } from './common';
import type { CurrencyCode } from './currency';

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
  customName?: string;
  serialNumber?: string;
  game?: string;
};

export type MetersHourlyChartData = {
  day: string;
  hour: string;
  gamesPlayed: number;
  coinIn: number;
  coinOut: number;
};

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


