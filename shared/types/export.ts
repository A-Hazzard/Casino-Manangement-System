export type ExportFormat = "pdf" | "csv" | "excel";

export type ExportData = {
  overview: any[];
  sasEvaluation: any[];
  revenueAnalysis: any[];
  machines: any[];
  metadata: {
    generatedAt: Date;
    timePeriod: string;
    selectedLocations: string[];
    selectedLicencee?: string;
  };
};

export type LegacyExportData = {
  title: string;
  subtitle?: string;
  headers: string[];
  data: (string | number)[][];
  summary?: {
    label: string;
    value: string | number;
  }[];
  metadata?: {
    generatedBy: string;
    generatedAt: string;
    dateRange?: string;
  };
}; 