// Export format types
export type ExportFormat = "pdf" | "csv" | "excel" | "json";

// Export data type
export type ExportData = {
  headers: string[];
  rows: unknown[][];
  filename: string;
  format: ExportFormat;
};

// Legacy export data type for backward compatibility
export type LegacyExportData = {
  data: unknown[];
  headers?: string[];
  filename?: string;
};

// Backend-specific export types
export type ExportJob = {
  id: string;
  userId: string;
  format: ExportFormat;
  data: LegacyExportData;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  error?: string;
  downloadUrl?: string;
}; 
