/**
 * Collection Report Export Utilities
 *
 * Serializes collection report data (machine metrics, location metrics, SAS metrics)
 * into CSV or JSON format with clearly sectioned output.
 *
 * @module lib/utils/export/collectionReportExport
 */

import type { CollectionReportData, LocationMetric, MachineMetric, SASMetric } from '@/lib/types/api';

// ============================================================================
// Type Definitions
// ============================================================================

type CollectionReportExportData = {
  reportId: string;
  locationName: string;
  collectionDate?: string;
  collector?: string;
  timeframeStart?: string;
  timeframeEnd?: string;
  machineMetrics: MachineMetric[];
  locationMetrics: LocationMetric | null;
  sasMetrics: SASMetric | null;
};

// ============================================================================
// CSV Serialization
// ============================================================================

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function machineMetricsToCSVRows(metrics: MachineMetric[]): string[] {
  const rows: string[] = [];
  rows.push('=== MACHINE METRICS ===');
  rows.push([
    'Machine ID',
    'Meters In',
    'Meters Out',
    'Prev In',
    'Prev Out',
    'Drop / Cancelled',
    'Machine Gross',
    'SAS Gross',
    'Variation',
    'SAS Start Time',
    'SAS End Time',
    'RAM Clear',
    'Notes',
  ].join(','));

  for (const m of metrics) {
    rows.push([
      csvEscape(m.machineId),
      csvEscape(m.metersIn ?? 0),
      csvEscape(m.metersOut ?? 0),
      csvEscape(m.prevIn ?? 0),
      csvEscape(m.prevOut ?? 0),
      csvEscape(m.dropCancelled || '0 / 0'),
      csvEscape(m.metersGross ?? 0),
      csvEscape(m.sasGross ?? ''),
      csvEscape(m.variation ?? ''),
      csvEscape(m.sasStartTime ? new Date(m.sasStartTime).toISOString() : ''),
      csvEscape(m.sasEndTime ? new Date(m.sasEndTime).toISOString() : ''),
      csvEscape(m.ramClear ? 'Yes' : 'No'),
      csvEscape(m.notes ?? ''),
    ].join(','));
  }

  rows.push('');
  return rows;
}

function locationMetricsToCSVRows(metrics: LocationMetric): string[] {
  const rows: string[] = [];
  rows.push('=== LOCATION METRICS ===');
  rows.push('Metric,Value');

  const fields: Array<{ label: string; value: unknown }> = [
    { label: 'Machines Number', value: metrics.machinesNumber },
    { label: 'Drop / Cancelled', value: metrics.droppedCancelled },
    { label: 'Machine Gross', value: metrics.metersGross },
    { label: 'Net Gross', value: metrics.netGross },
    { label: 'SAS Gross', value: metrics.sasGross },
    { label: 'Variation', value: metrics.variation },
    { label: 'Location Revenue', value: metrics.locationRevenue },
    { label: 'Amount Collected', value: metrics.collectedAmount },
    { label: 'Amount To Collect', value: metrics.amountToCollect },
    { label: 'Amount Uncollected', value: metrics.amountUncollected },
    { label: 'Reason For Shortage', value: metrics.reasonForShortage },
    { label: 'Taxes', value: metrics.taxes },
    { label: 'Advance', value: metrics.advance },
    { label: 'Previous Balance Owed', value: metrics.previousBalanceOwed },
    { label: 'Balance Correction', value: metrics.balanceCorrection },
    { label: 'Correction Reason', value: metrics.correctionReason },
    { label: 'Current Balance Owed', value: metrics.currentBalanceOwed },
    { label: 'Variance', value: metrics.variance },
    { label: 'Variance Reason', value: metrics.varianceReason },
  ];

  for (const field of fields) {
    const val = field.value as string | number | boolean | null | undefined;
    rows.push(`${csvEscape(field.label)},${csvEscape(val ?? '')}`);
  }

  rows.push('');
  return rows;
}

function sasMetricsToCSVRows(metrics: SASMetric): string[] {
  const rows: string[] = [];
  rows.push('=== SAS METRICS COMPARE ===');
  rows.push('Metric,Value');

  const fields: Array<{ label: string; value: number }> = [
    { label: 'SAS Drop Total', value: metrics.dropped },
    { label: 'SAS Cancelled Total', value: metrics.cancelled },
    { label: 'SAS Gross Total', value: metrics.gross },
  ];

  for (const field of fields) {
    const val = field.value as string | number | boolean | null | undefined;
    rows.push(`${csvEscape(field.label)},${csvEscape(val ?? '')}`);
  }

  rows.push('');
  return rows;
}

function generateCSV(data: CollectionReportExportData): string {
  const rows: string[] = [];

  // Report header
  rows.push(`Report ID,${csvEscape(data.reportId)}`);
  rows.push(`Location,${csvEscape(data.locationName)}`);
  if (data.collectionDate) rows.push(`Date,${csvEscape(data.collectionDate)}`);
  if (data.collector) rows.push(`Collector,${csvEscape(data.collector)}`);
  if (data.timeframeStart || data.timeframeEnd) {
    rows.push(`Timeframe,${csvEscape(data.timeframeStart ?? '')} → ${csvEscape(data.timeframeEnd ?? '')}`);
  }
  rows.push('');

  // Machine Metrics
  rows.push(...machineMetricsToCSVRows(data.machineMetrics));

  // Location Metrics
  if (data.locationMetrics) {
    rows.push(...locationMetricsToCSVRows(data.locationMetrics));
  }

  // SAS Metrics
  if (data.sasMetrics) {
    rows.push(...sasMetricsToCSVRows(data.sasMetrics));
  }

  return '\uFEFF' + rows.join('\r\n');
}

// ============================================================================
// JSON Serialization
// ============================================================================

function generateJSON(data: CollectionReportExportData): string {
  return JSON.stringify(data, null, 2);
}

// ============================================================================
// Download
// ============================================================================

/**
 * Downloads collection report data as a file.
 *
 * @param reportData - The full report data from the API
 * @param format - 'csv' or 'json'
 */
export function downloadCollectionReport(
  reportData: CollectionReportData,
  format: 'csv' | 'json'
): void {
  const exportData: CollectionReportExportData = {
    reportId: reportData.reportId,
    locationName: reportData.locationName,
    collectionDate: reportData.collectionDate,
    collector: reportData.collectorName || reportData.collector,
    timeframeStart: reportData.timeframeStart,
    timeframeEnd: reportData.timeframeEnd,
    machineMetrics: reportData.machineMetrics || [],
    locationMetrics: reportData.locationMetrics || null,
    sasMetrics: reportData.sasMetrics || null,
  };

  const content = format === 'csv' ? generateCSV(exportData) : generateJSON(exportData);
  const mimeType = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';
  const extension = format;
  const filename = `collection-report-${exportData.reportId}-${new Date().toISOString().split('T')[0]}.${extension}`;

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
