/**
 * End of Day Helper Functions
 *
 * This file contains helper functions for end of day report operations.
 * It supports:
 * - Generating end of day reports
 * - Exporting reports to CSV
 *
 * @module app/api/lib/helpers/vault/endOfDay
 */

import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { getGamingDayRange } from '@/lib/utils/gamingDayRange';
import { calculateTotalCashOnPremises } from './cashMonitoring';

/**
 * End of day report data structure
 */
export type EndOfDayReport = {
  locationId: string;
  date: Date;
  totalCash: number;
  denominationBreakdown: Record<string, number>;
  transactions?: Array<Record<string, unknown>>;
};

/**
 * Generate end of day report for a location
 * @param locationId - Location ID
 * @param date - Report date
 * @returns End of day report
 */
export async function generateEndOfDayReport(
  locationId: string,
  date: Date
): Promise<EndOfDayReport> {
  // Fetch location to get gameDayOffset
  const location = await GamingLocations.findById(locationId).select('gameDayOffset').lean();
  const gameDayOffset = (location as any)?.gameDayOffset ?? 8; // Default to 8 AM if not set

  // Calculate start and end of day using gaming day logic
  // This ensures we capture the full operational day (e.g., 8 AM to 8 AM next day)
  const { rangeStart, rangeEnd } = getGamingDayRange(date, gameDayOffset);

  // Get cash on premises
  const cashData = await calculateTotalCashOnPremises(locationId, {
    start: rangeStart,
    end: rangeEnd,
  });

  return {
    locationId,
    date,
    totalCash: cashData.totalCash,
    denominationBreakdown: cashData.denominationBreakdown,
    transactions: [],
  };
}

/**
 * Export report to CSV format
 * @param report - End of day report
 * @returns CSV string
 */
export function exportReportToCSV(report: EndOfDayReport): string {
  const lines: string[] = [];

  // Header
  lines.push('End of Day Report');
  lines.push(`Location ID: ${report.locationId}`);
  lines.push(`Date: ${report.date.toISOString().split('T')[0]}`);
  lines.push('');

  // Total cash
  lines.push(`Total Cash,${report.totalCash}`);
  lines.push('');

  // Denomination breakdown
  lines.push('Denomination Breakdown');
  lines.push('Value,Amount');
  for (const [value, amount] of Object.entries(report.denominationBreakdown)) {
    lines.push(`${value},${amount}`);
  }

  return lines.join('\n');
}
