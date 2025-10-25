import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type {
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
} from '@/lib/types/componentProps';
import axios from 'axios';

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
 */
export async function exportMonthlyReportPDF(
  summary: MonthlyReportSummary,
  details: MonthlyReportDetailsRow[]
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
  doc.text('All Locations Total', 14, 32);
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

/**
 * Exports the monthly report summary and details as an Excel file, matching the PDF structure.
 * @param summary - The summary data for the report.
 * @param details - The details data for the report.
 */
export function exportMonthlyReportExcel(
  summary: MonthlyReportSummary,
  details: MonthlyReportDetailsRow[]
) {
  // Add a title row and blank row for logo/title spacing
  const summarySheet = [
    ['Evolution One Solutions'],
    [''],
    ['All Locations Total'],
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
