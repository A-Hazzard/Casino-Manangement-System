import type { ExportFormat, ExportData, LegacyExportData } from "@shared/types/export";

// Re-export shared types for convenience
export type { ExportFormat, ExportData, LegacyExportData };

// Frontend-specific export types
export type ExportUtils = {
  exportToPDF: (data: LegacyExportData) => Promise<void>;
  exportToCSV: (data: LegacyExportData) => void;
  exportToExcel: (data: LegacyExportData) => void;
  exportData: (data: LegacyExportData, format: ExportFormat) => Promise<void>;
}; 