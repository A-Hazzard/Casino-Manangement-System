import type { ExportFormat, ExportData, LegacyExportData } from "@shared/types/export";

// Re-export shared types for convenience
export type { ExportFormat, ExportData, LegacyExportData };

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
