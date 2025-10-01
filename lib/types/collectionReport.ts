import type {
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
  CollectionReportRow,
} from "@/lib/types/componentProps";

export type UseCollectionReportDataProps = {
  selectedLicencee: string;
  activeMetricsFilter: string | null;
  customDateRange: { startDate: Date; endDate: Date } | null;
};

export type UseCollectionReportDataReturn = {
  // Data states
  monthlyReportSummary: MonthlyReportSummary | null;
  monthlyReportDetails: MonthlyReportDetailsRow[];
  collectionReports: CollectionReportRow[];
  locationNames: string[];
  
  // Loading states
  loadingSummary: boolean;
  loadingDetails: boolean;
  loadingReports: boolean;
  loadingLocations: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  refreshData: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  refreshDetails: () => Promise<void>;
  refreshReports: () => Promise<void>;
};
