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
import { Machine } from '../../models/machines';
import { Meters } from '../../models/meters';

/**
 * End of Day Report Data Structure matching Frontend Expectations
 */
export type EndOfDayReport = {
  locationId: string;
  date: Date;
  totalCash: number;
  denominationBreakdown: Record<string, number>;
  transactions?: Array<Record<string, unknown>>;
  
  // Status flags
  shiftStatus: 'not_started' | 'active' | 'closed';
  previousShiftActive: boolean;

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
    collected: boolean;
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
        // Only include an active shift if it belongs to this gaming day (started within the range)
        openedAt: { $gte: rangeStart, $lt: rangeEnd } 
      }
    ]
  }).sort({ closedAt: -1, openedAt: -1 });

  // Fallback: If no shift found in strictly defined range, and we are looking at "Active" data...
  // But user specifically wants "Nothing showing if not started".
  // So strictly enforcing rangeStart is correct.


  let vaultSystemBalance = 0;
  let vaultPhysicalCount = 0;
  const vaultVariance = 0;
  let vaultDenominations: any[] = [];
  let status = 'closed';
  
  let shiftStatus: 'not_started' | 'active' | 'closed' = 'not_started';
  let previousShiftActive = false;

  if (vaultShift) {
    status = vaultShift.status;
    shiftStatus = vaultShift.status as 'active' | 'closed';
    
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
  } else {
    // If no shift found for this day, check if previous day is still active
    const prevActive = await VaultShiftModel.findOne({
      locationId,
      status: 'active',
      openedAt: { $lt: rangeStart }
    });
    if (prevActive) {
      previousShiftActive = true;
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
        openedAt: { $gte: rangeStart, $lte: rangeEnd }
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

  // 3. Machine Counts (Drops)
  // Fetch ALL machines for this location
  const allMachines = await Machine.find({ 
    gamingLocation: locationId,
    deletedAt: { $exists: false } 
  }).select('_id assetNumber custom.name').lean();
  
  const machineIds = allMachines.map(m => String(m._id));

  // Calculate Machine Drops from Meters (Soft Count)
  // This matches the logic from balance/route.ts to ensure consistency
  const machineMeters = await Meters.aggregate([
    {
      $match: {
        machine: { $in: machineIds },
        readAt: {
          $gte: rangeStart,
          $lte: rangeEnd,
        },
      },
    },
    {
      $group: {
        _id: '$machine',
        totalDrop: { $sum: '$movement.drop' },
      },
    },
  ]);

  // Create a map of drops for easy lookup
  const dropMap = new Map(machineMeters.map(m => [m._id, m.totalDrop]));

  // Find collections performed in range (Physical Count/Hard Count - if available)
  // Note: Collections might not happen daily. If no collection, we use 0 or Soft Count?
  // User asked for "Machines' Soft Count" in balance card, here it is "Closing Slot Count".
  // If we want to show the daily drop, we should use the Meter data (Soft Count).
  const machineCollections = await MachineCollectionModel.find({
    locationId,
    collectedAt: { $gte: rangeStart, $lte: rangeEnd }
  }).lean();

  const collectionMap = new Map(machineCollections.map(mc => [mc.machineId, mc]));

  const slotCounts: EndOfDayReport['slotCounts'] = allMachines.map((machine: any) => {
    const mId = machine._id.toString();
    const softCount = dropMap.get(mId) || 0;
    const collection = collectionMap.get(mId);
    
    // Use Soft Count (Meters) as the primary "Closing Count" for End of Day report
    // unless a physical collection occurred, which might override or be a separate column.
    // For now, mapping "Closing Count" to the calculate drop from meters.
    return {
      machineId: mId,
      location: (machine.custom?.name || machine.assetNumber || 'Floor') as string,
      closingCount: softCount, 
      collected: !!collection
    };
  });
  
  const totalMachineBalance = slotCounts.reduce((sum, s) => sum + s.closingCount, 0);

  // ============================================================================
  // 4. Aggregations
  // ============================================================================
  
  // Total Cash on Premises = Vault + Cashiers + Machines
  const totalCash = vaultSystemBalance + totalCashierFloat + totalMachineBalance;

  return {
    locationId,
    date,
    totalCash,
    denominationBreakdown,
    transactions: [],
    
    // Status flags
    shiftStatus,
    previousShiftActive,
    
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
  lines.push('Machine ID,Location,Amount,Collected');
  report.slotCounts.forEach(s => {
    lines.push(`${s.machineId},${s.location},${s.closingCount},${s.collected ? 'YES' : 'NO'}`);
  });

  return lines.join('\n');
}
