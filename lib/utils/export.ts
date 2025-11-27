/**
 * Export Utility Functions
 *
 * Utility functions for exporting data to PDF and Excel formats.
 *
 * Features:
 * - PDF export with styling and logos
 * - Excel export functionality
 * - Monthly report exports
 * - Image handling for PDFs
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type {
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
} from '@/lib/types/componentProps';
import axios from 'axios';

// ============================================================================
// Image Helper Functions
// ============================================================================
/**
 * Loads an image from a URL and returns a base64 data URL.
 * @param url - The image URL (relative to public/).
 * @returns Promise<string> - The base64 data URL.
 */
async function getBase64FromUrl(url: string): Promise<string> {
  const response = await axios.get(url, { responseType: 'blob' });
  const blob = response.data;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Exports the monthly report summary and details as a styled PDF file, with logo at the top.
 * @param summary - The summary data for the report.
 * @param details - The details data for the report.
 * @param totalLocations - Total number of locations available.
 * @param currentLocationsCount - Number of locations in the current report.
 */
export async function exportMonthlyReportPDF(
  summary: MonthlyReportSummary,
  details: MonthlyReportDetailsRow[],
  totalLocations?: number,
  currentLocationsCount?: number
) {
  const doc = new jsPDF();
  // Add logo at the top (centered)
  try {
    const logoBase64 = await getBase64FromUrl(
      '/Evolution_one_Solutions_logo.png'
    );
    // Only specify width to preserve aspect ratio (no stretching)
    doc.addImage(logoBase64, 'PNG', 75, 6, 60, 0); // Centered, width=60, height auto
  } catch {
    // If logo fails to load, continue without it
    doc.setFontSize(10);
    doc.text('Evolution One Solutions', 14, 16);
  }
  doc.setFontSize(16);
  // Show total locations count if provided
  const titleText = totalLocations !== undefined && currentLocationsCount !== undefined
    ? `All (${currentLocationsCount}/${totalLocations}) Locations Total`
    : 'All Locations Total';
  doc.text(titleText, 14, 32);
  // Table colors: Tailwind buttonActive: #5119E9
  autoTable(doc, {
    startY: 36,
    head: [['DROP', 'CANCELLED CREDITS', 'GROSS', 'SAS GROSS']],
    body: [
      [summary.drop, summary.cancelledCredits, summary.gross, summary.sasGross],
    ],
    headStyles: { fillColor: [81, 25, 233] },
    styles: { fontStyle: 'bold' },
  });
  const lastY =
    (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable
      ?.finalY || 46;
  autoTable(doc, {
    startY: lastY + 10,
    head: [['LOCATION', 'DROP', 'WIN', 'GROSS', 'SAS GROSS']],
    body: details.map(row => [
      row.location,
      row.drop,
      row.win,
      row.gross,
      row.sasGross,
    ]),
    headStyles: { fillColor: [81, 25, 233] },
  });
  doc.save('monthly_report.pdf');
}

// ============================================================================
// Excel Export Functions
// ============================================================================
/**
 * Exports the monthly report summary and details as an Excel file, matching the PDF structure.
 * @param summary - The summary data for the report.
 * @param details - The details data for the report.
 * @param totalLocations - Total number of locations available.
 * @param currentLocationsCount - Number of locations in the current report.
 */
export function exportMonthlyReportExcel(
  summary: MonthlyReportSummary,
  details: MonthlyReportDetailsRow[],
  totalLocations?: number,
  currentLocationsCount?: number
) {
  // Add a title row and blank row for logo/title spacing
  // Show total locations count if provided
  const titleText = totalLocations !== undefined && currentLocationsCount !== undefined
    ? `All (${currentLocationsCount}/${totalLocations}) Locations Total`
    : 'All Locations Total';
  const summarySheet = [
    ['Evolution One Solutions'],
    [''],
    [titleText],
    ['DROP', 'CANCELLED CREDITS', 'GROSS', 'SAS GROSS'],
    [summary.drop, summary.cancelledCredits, summary.gross, summary.sasGross],
  ];
  const detailsSheet = [
    ['LOCATION', 'DROP', 'WIN', 'GROSS', 'SAS GROSS'],
    ...details.map(row => [
      row.location,
      row.drop,
      row.win,
      row.gross,
      row.sasGross,
    ]),
  ];
  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.aoa_to_sheet(summarySheet);
  const wsDetails = XLSX.utils.aoa_to_sheet(detailsSheet);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  XLSX.utils.book_append_sheet(wb, wsDetails, 'Details');
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([wbout], { type: 'application/octet-stream' }),
    'monthly_report.xlsx'
  );
}

// ============================================================================
// Meters Report Export Functions
// ============================================================================
/**
 * Exports the meters report as a styled PDF file, with logo at the top.
 * @param data - The meters report data array.
 * @param metadata - Metadata about the report (locations, date range, etc.).
 */
export async function exportMetersReportPDF(
  data: Array<{
    machineId: string;
    location: string;
    metersIn: number;
    metersOut: number;
    jackpot: number;
    billIn: number;
    voucherOut: number;
    attPaidCredits: number;
    gamesPlayed: number;
    createdAt: string;
    serialNumber?: string;
    origSerialNumber?: string;
  }>,
  metadata: {
    locations: string[];
    dateRange: string;
    searchTerm?: string;
    totalCount: number;
  }
) {
  const doc = new jsPDF();
  
  // Add logo at the top (centered)
  try {
    const logoBase64 = await getBase64FromUrl(
      '/Evolution_one_Solutions_logo.png'
    );
    // Only specify width to preserve aspect ratio (no stretching)
    doc.addImage(logoBase64, 'PNG', 75, 6, 60, 0); // Centered, width=60, height auto
  } catch {
    // If logo fails to load, continue without it
    doc.setFontSize(10);
    doc.text('Evolution One Solutions', 10, 16);
  }

  // Title
  doc.setFontSize(16);
  doc.text('Meters Report', 10, 32);

  // Metadata section
  let yPosition = 40;
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  
  if (metadata.locations.length > 0) {
    const locationText = metadata.locations.length === 1 
      ? `Location: ${metadata.locations[0]}`
      : `Locations: ${metadata.locations.length} selected`;
    doc.text(locationText, 10, yPosition);
    yPosition += 6;
  }

  doc.text(`Date Range: ${metadata.dateRange}`, 10, yPosition);
  yPosition += 6;

  doc.text(`Total Records: ${metadata.totalCount}`, 10, yPosition);
  yPosition += 6;

  if (metadata.searchTerm) {
    doc.text(`Search Filter: "${metadata.searchTerm}"`, 10, yPosition);
    yPosition += 6;
  }

  yPosition += 4; // Add spacing before table

  // Format numbers for display
  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Prepare table data
  const tableData = data.map(item => {
    // machineId: if custom.name exists, it contains only custom.name (not serialNumber)
    // Otherwise, it contains the computed machineId from the API
    const machineId = item.machineId;
    return [
      machineId,
      item.location,
      formatNumber(item.metersIn),
      formatNumber(item.metersOut),
      formatNumber(item.jackpot),
      formatNumber(item.billIn),
      formatNumber(item.voucherOut),
      formatNumber(item.attPaidCredits),
      item.gamesPlayed.toLocaleString(),
      new Date(item.createdAt).toLocaleDateString(),
    ];
  });

  // Table colors: Tailwind buttonActive: #5119E9 (RGB: 81, 25, 233)
  autoTable(doc, {
    startY: yPosition,
    head: [['Machine ID', 'Location', 'Meters In', 'Money Won', 'Jackpot', 'Bill In', 'Voucher Out', 'Hand Paid Cancelled Credits', 'Games Played', 'Date']],
    body: tableData,
    headStyles: { fillColor: [81, 25, 233], textColor: [255, 255, 255], fontStyle: 'bold' },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 30 }, // Machine ID
      1: { cellWidth: 25 }, // Location
      2: { cellWidth: 20, halign: 'right' }, // Meters In
      3: { cellWidth: 20, halign: 'right' }, // Money Won
      4: { cellWidth: 20, halign: 'right' }, // Jackpot
      5: { cellWidth: 20, halign: 'right' }, // Bill In
      6: { cellWidth: 20, halign: 'right' }, // Voucher Out
      7: { cellWidth: 25, halign: 'right' }, // Hand Paid Cancelled Credits
      8: { cellWidth: 20, halign: 'right' }, // Games Played
      9: { cellWidth: 20 }, // Date
    },
    margin: { left: 10, right: 10 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  });

  // Generate filename with date
  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`meters_report_${dateStr}.pdf`);
}

/**
 * Exports the meters report as an Excel file.
 * @param data - The meters report data array.
 * @param metadata - Metadata about the report (locations, date range, etc.).
 */
export function exportMetersReportExcel(
  data: Array<{
    machineId: string;
    location: string;
    metersIn: number;
    metersOut: number;
    jackpot: number;
    billIn: number;
    voucherOut: number;
    attPaidCredits: number;
    gamesPlayed: number;
    createdAt: string;
    serialNumber?: string;
    origSerialNumber?: string;
  }>,
  metadata: {
    locations: string[];
    dateRange: string;
    searchTerm?: string;
    totalCount: number;
  }
) {
  // Create header rows
  const headerRows = [
    ['Evolution One Solutions'],
    [''],
    ['Meters Report'],
    [''],
  ];

  // Add metadata
  if (metadata.locations.length > 0) {
    const locationText = metadata.locations.length === 1 
      ? `Location: ${metadata.locations[0]}`
      : `Locations: ${metadata.locations.join(', ')}`;
    headerRows.push([locationText]);
  }
  headerRows.push([`Date Range: ${metadata.dateRange}`]);
  headerRows.push([`Total Records: ${metadata.totalCount}`]);
  if (metadata.searchTerm) {
    headerRows.push([`Search Filter: "${metadata.searchTerm}"`]);
  }
  headerRows.push(['']); // Empty row before table

  // Create table headers
  const tableHeaders = [
    ['Machine ID', 'Location', 'Meters In', 'Money Won', 'Jackpot', 'Bill In', 'Voucher Out', 'Hand Paid Cancelled Credits', 'Games Played', 'Date'],
  ];

  // Create table data
  const tableData = data.map(item => {
    // machineId: if custom.name exists, it contains only custom.name (not serialNumber)
    // Otherwise, it contains the computed machineId from the API
    const machineId = item.machineId;
    return [
      machineId,
      item.location,
      item.metersIn,
      item.metersOut,
      item.jackpot,
      item.billIn,
      item.voucherOut,
      item.attPaidCredits,
      item.gamesPlayed,
      new Date(item.createdAt).toLocaleDateString(),
    ];
  });

  // Combine all rows
  const allRows = [...headerRows, ...tableHeaders, ...tableData];

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(allRows);
  XLSX.utils.book_append_sheet(wb, ws, 'Meters Report');

  // Generate filename with date
  const dateStr = new Date().toISOString().split('T')[0];
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  saveAs(
    new Blob([wbout], { type: 'application/octet-stream' }),
    `meters_report_${dateStr}.xlsx`
  );
}