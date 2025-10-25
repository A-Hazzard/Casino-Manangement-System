// Reports types for shared use
export type ReportsLocationData = {
  _id: string;
  name: string;
  totalMachines: number;
  onlineMachines: number;
  moneyIn: number;
  moneyOut: number;
  gross: number;
  performance: string;
};

export type PaginationInfo = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type ReportsLocationsResponse = {
  data: ReportsLocationData[];
  pagination: PaginationInfo;
  success: boolean;
  message?: string;
};

// Backend-specific report types
export type ReportQuery = {
  timePeriod: string;
  licencee?: string;
  locationIds?: string[];
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
};

export type ReportGenerationRequest = {
  reportType: string;
  filters: ReportQuery;
  format: 'pdf' | 'csv' | 'excel';
  userId: string;
};
