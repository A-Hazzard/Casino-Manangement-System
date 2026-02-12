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

import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { MachineCollectionModel } from '@/app/api/lib/models/machineCollection';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import { getGamingDayRange } from '@/lib/utils/gamingDayRange';

/**
 * End of Day Report Data Structure matching Frontend Expectations
 */
export type EndOfDayReport = {
  locationId: string;
  date: Date;
  totalCash: number;
  denominationBreakdown: Record<string, number>;
  transactions?: Array<Record<string, unknown>>;
  
  // Detailed sections required by UI
  vaultBalance: {
    systemBalance: number;
    physicalCount: number;
    variance: number;
    status?: string;
  };
  cashierFloats: Array<{
    _id: string;
    cashierName: string;
    status: string;
    balance: number;
  }>;
  slotCounts: Array<{
    machineId: string;
    location: string;
    closingCount: number;
  }>;
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
  const { rangeStart, rangeEnd } = getGamingDayRange(date, gameDayOffset);
  
  // ============================================================================
  // 1. Vault Data (Closing Float)
  // ============================================================================
  // Find the vault shift that was ACTIVE or CLOSED during this period.
  // Ideally, for a specific date, we look for a shift that *closed* in that day,
  // OR if it's today, the active shift.
  // We prioritize 'closed' shifts intersecting the day.
  const vaultShift = await VaultShiftModel.findOne({
    locationId,
    $or: [
      { 
        status: 'closed', 
        closedAt: { $gte: rangeStart, $lte: rangeEnd } 
      },
      { 
        status: 'active',
        // For active, we only include if the requested date covers "now" (implied by lack of closedAt check relative to range, but practically means "latest active")
        // However, we should be careful not to pick an active shift for a historical date query.
        // But for "End of Day", usually implies closing.
        // If checking a past date and no closed shift exists, maybe there was no activity?
        // We will allow picking active if it started before rangeEnd (safety).
        openedAt: { $lt: rangeEnd } 
      }
    ]
  }).sort({ closedAt: -1, openedAt: -1 });

  let vaultSystemBalance = 0;
  let vaultPhysicalCount = 0;
  const vaultVariance = 0;
  let vaultDenominations: any[] = [];
  let status = 'closed';

  if (vaultShift) {
    status = vaultShift.status;
    // If closed, use closing figures. If active, use current/opening.
    if (vaultShift.status === 'closed') {
      vaultSystemBalance = vaultShift.closingBalance || 0; // The validated balance
      // Physical count isn't explicitly stored as a separate field in schema shown, 
      // but usually closingBalance IS the physical count in a happy path, or verified.
      // Reconciliations track adjustments.
      // For report, we use closingBalance.
      vaultPhysicalCount = vaultShift.closingBalance || 0; 
      vaultDenominations = vaultShift.closingDenominations || [];
    } else {
      // Active
      vaultSystemBalance = vaultShift.currentBalance ?? vaultShift.openingBalance;
      vaultPhysicalCount = vaultSystemBalance; // Assuming matched for active
      vaultDenominations = vaultShift.currentDenominations ?? vaultShift.openingDenominations ?? [];
    }
  }

  // Transform denominations array to Record<string, count>
  // Schema: [{ denomination: 100, quantity: 5 }] -> { "100": 5 }
  const denominationBreakdown: Record<string, number> = {};
  vaultDenominations.forEach((d: { denomination: number; quantity: number }) => {
    const key = String(d.denomination);
    denominationBreakdown[key] = (denominationBreakdown[key] || 0) + (d.quantity || 0);
  });

  // ============================================================================
  // 2. Cashier Floats
  // ============================================================================
  // Find shifts that were active or closed during the day range
  const cashierShifts = await CashierShiftModel.find({
    locationId,
    $or: [
      { 
        openedAt: { $gte: rangeStart, $lte: rangeEnd } 
      },
      {
        closedAt: { $gte: rangeStart, $lte: rangeEnd }
      },
      {
        status: 'active',
        openedAt: { $lte: rangeEnd }
      }
    ]
  }).lean();

  const cashierFloats = cashierShifts.map((shift: any) => ({
    _id: shift._id,
    cashierName: shift.cashierName || shift.cashierUsername || 'Unknown',
    status: shift.status,
    balance: shift.status === 'closed' ? (shift.closingBalance || 0) : (shift.currentBalance || shift.openingBalance || 0),
  }));

  const totalCashierFloat = cashierFloats.reduce((sum, c) => sum + c.balance, 0);

  // ============================================================================
  // 3. Slot Machine Counts
  // ============================================================================
  // Find collections performed in range
  const machineCollections = await MachineCollectionModel.find({
    locationId,
    collectedAt: { $gte: rangeStart, $lte: rangeEnd }
  }).lean();

  const slotCounts = machineCollections.map((mc: any) => ({
    machineId: mc.machineId,
    location: mc.machineName || 'Floor', // Use machineName if available
    closingCount: mc.amount || 0
  }));
  
  const totalMachineBalance = slotCounts.reduce((sum, s) => sum + s.closingCount, 0);

  // ============================================================================
  // 4. Aggregations
  // ============================================================================
  
  // Total Cash on Premises = Vault + Cashiers + Machines (Drops not yet in vault? Or drops already in vault?)
  // Usually Machine Collection -> Vault. If so, don't double count.
  // But MachineCollection usually tracks "money collected from machine".
  // If it's not yet in vault (e.g. drop box), it counts.
  // If it's processed into vault, it's in Vault Balance.
  // "Closing Slot Count" implies drops for the day.
  // "Closing Float" implies vault holding.
  // We'll sum them for "Total Cash" unless logic dictates otherwise.
  // Simplest interpretation: Sum of components.
  const totalCash = vaultSystemBalance + totalCashierFloat + totalMachineBalance;

  return {
    locationId,
    date,
    totalCash,
    denominationBreakdown,
    transactions: [],
    
    // Detailed sections
    vaultBalance: {
      systemBalance: vaultSystemBalance,
      physicalCount: vaultPhysicalCount,
      variance: vaultVariance,
      status
    },
    cashierFloats,
    slotCounts
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

  // Summary
  lines.push('Summary');
  lines.push(`Total Cash on Premises,${report.totalCash}`);
  lines.push(`Vault Balance,${report.vaultBalance.systemBalance}`);
  lines.push('');

  // Denomination breakdown
  lines.push('Vault Denomination Breakdown');
  lines.push('Denomination,Count,Value');
  for (const [value, count] of Object.entries(report.denominationBreakdown)) {
    lines.push(`${value},${count},${Number(value) * count}`);
  }
  lines.push('');

  // Cashier Floats
  lines.push('Cashier Floats');
  lines.push('Cashier,Status,Balance');
  report.cashierFloats.forEach(c => {
    lines.push(`${c.cashierName},${c.status},${c.balance}`);
  });
  lines.push('');

  // Machines
  lines.push('Machine Collections');
  lines.push('Machine ID,Location,Amount');
  report.slotCounts.forEach(s => {
    lines.push(`${s.machineId},${s.location},${s.closingCount}`);
  });

  return lines.join('\n');
}
