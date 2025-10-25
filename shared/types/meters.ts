// Meters report types
export type MetersReportData = {
  machineId: string;
  metersIn: number;
  metersOut: number;
  jackpot: number;
  billIn: number;
  voucherOut: number;
  attPaidCredits: number;
  gamesPlayed: number;
  location: string;
  createdAt: string;
};

export type MetersReportResponse = {
  data: MetersReportData[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  locations: string[];
  dateRange: {
    start: string;
    end: string;
  };
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
};

export type MetersReportFilters = {
  locations: string[];
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  search?: string;
};
