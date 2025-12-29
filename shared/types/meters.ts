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
  locationId: string;
  createdAt: string;
  machineDocumentId: string; // MongoDB document ID for the machine
  // Optional fields for export logic
  customName?: string;
  serialNumber?: string;
  game?: string;
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

