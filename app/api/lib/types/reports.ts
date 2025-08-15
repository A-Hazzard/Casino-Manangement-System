import type { ReportsLocationData, PaginationInfo, ReportsLocationsResponse } from "@shared/types/reports";

// Re-export shared types for convenience
export type { ReportsLocationData, PaginationInfo, ReportsLocationsResponse };

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
  format: "pdf" | "csv" | "excel";
  userId: string;
}; 
