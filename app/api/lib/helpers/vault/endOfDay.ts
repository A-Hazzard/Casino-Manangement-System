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
import { SoftCountModel } from '@/app/api/lib/models/softCount';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { getGamingDayRange } from '@/lib/utils/gamingDayRange';
import mongoose from 'mongoose';
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
  previousShiftDate?: Date | string;

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
  midDaySoftCounts: Array<{
    machineId: string;
    location: string;
    amount: number;
    countedAt: Date;
    variance: number;
  }>;
  endOfDaySoftCounts: Array<{
    machineId: string;
    location: string;
    amount: number;
    countedAt: Date;
    variance: number;
  }>;
  metrics?: {
    totalCashIn: number;
    totalCashOut: number;
    netCashFlow: number;
    payouts: number;
    totalMachineBalance: number;
    totalCashierFloats: number;
    expenses: number;
  };
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
  const gameDayOffset = (location as Record<string, unknown> | null)?.gameDayOffset as number ?? 8; // Default to 8 AM if not set

  // Calculate start and end of day using gaming day logic
  const { rangeStart, rangeEnd } = getGamingDayRange(date, gameDayOffset);

  // ============================================================================
  // 1. Vault Data (Aggregate all shifts for the day)
  // ============================================================================
  const vaultShifts = await VaultShiftModel.find({
    locationId,
    $or: [
      {
        status: 'closed',
        closedAt: { $gte: rangeStart, $lte: rangeEnd }
      },
      {
        status: 'active',
        openedAt: { $gte: rangeStart, $lte: rangeEnd }
      }
    ]
  }).sort({ openedAt: 1 }).lean();

  let vaultSystemBalance = 0;
  let vaultPhysicalCount = 0;
  let vaultVariance = 0;
  let vaultDenominations: Array<{ denomination: number; quantity: number }> = [];
  let shiftStatus: 'not_started' | 'active' | 'closed' = 'not_started';
  let previousShiftActive = false;
  let previousShiftDate: Date | string | undefined = undefined;

  if (vaultShifts.length > 0) {
    // Determine overall shift status for the day
    // If ANY shift is active, the day's status is 'active'
    const hasActiveShift = vaultShifts.some(s => s.status === 'active');
    shiftStatus = hasActiveShift ? 'active' : 'closed';

    // The current/latest system balance is from the newest shift (last in sorted array)
    const latestShift = vaultShifts[vaultShifts.length - 1];
    if (latestShift.status === 'closed') {
      vaultSystemBalance = latestShift.closingBalance || 0;
    } else {
      vaultSystemBalance = latestShift.currentBalance ?? latestShift.openingBalance;
    }
    vaultPhysicalCount = vaultSystemBalance; // For EOD, we report the consolidated balance

    // Aggregate denominations and variance from all relevant shifts
    vaultDenominations = latestShift.status === 'closed'
      ? (latestShift.closingDenominations || [])
      : (latestShift.currentDenominations || latestShift.openingDenominations || []);

    // Sum variance from all shifts in the range
    vaultShifts.forEach(s => {
      ((s as { reconciliations?: Array<{ newBalance: number; previousBalance: number }> }).reconciliations || []).forEach(r => {
        vaultVariance += (r.newBalance - r.previousBalance);
      });
    });
  } else {
    // If no shift found for this day, check if previous day is still active
    const prevActive = await VaultShiftModel.findOne({
      locationId,
      status: 'active',
      openedAt: { $lt: rangeStart }
    }).select('openedAt').lean();

    if (prevActive) {
      previousShiftActive = true;
      previousShiftDate = (prevActive as Record<string, unknown>).openedAt as Date;
    }
  }

  // Transform denominations
  const denominationBreakdown: Record<string, number> = {};
  vaultDenominations.forEach((d: { denomination: number; quantity: number }) => {
    const key = String(d.denomination);
    denominationBreakdown[key] = (denominationBreakdown[key] || 0) + (d.quantity || 0);
  });

  // ============================================================================
  // 2. Cashier Floats
  // ============================================================================
  const cashierShifts = await CashierShiftModel.find({
    locationId,
    $or: [
      { openedAt: { $gte: rangeStart, $lte: rangeEnd } },
      { closedAt: { $gte: rangeStart, $lte: rangeEnd } },
      { status: 'active', openedAt: { $gte: rangeStart, $lte: rangeEnd } }
    ]
  }).lean();

  const cashierFloats = cashierShifts.map((shift: Record<string, unknown>) => ({
    _id: String(shift._id),
    cashierName: (shift.cashierName as string) || (shift.cashierUsername as string) || 'Unknown',
    status: shift.status as string,
    balance: shift.status === 'closed' ? (shift.closingBalance as number || 0) : (shift.currentBalance as number || shift.openingBalance as number || 0),
  }));

  const totalCashierFloat = cashierFloats.reduce((sum, c) => sum + c.balance, 0);

  // ============================================================================
  // 3. Machine Counts (Drops)
  // ============================================================================
  // Robust machine query matching both string and ObjectId
  const locationIdObj = mongoose.Types.ObjectId.isValid(locationId)
    ? new mongoose.Types.ObjectId(locationId)
    : locationId;

  const allMachines = await Machine.find({
    $or: [
      { gamingLocation: locationId },
      { gamingLocation: locationIdObj }
    ],
    deletedAt: { $exists: false }
  }).select('_id assetNumber custom.name').lean();

  const machineIds = allMachines.map(m => String(m._id));

  const machineMeters = await Meters.aggregate([
    {
      $match: {
        machine: { $in: machineIds },
        readAt: { $gte: rangeStart, $lte: rangeEnd },
      },
    },
    {
      $group: {
        _id: '$machine',
        totalDrop: { $sum: '$movement.drop' },
      },
    },
  ]);

  const dropMap = new Map(machineMeters.map(m => [m._id, m.totalDrop]));

  const softCounts = await SoftCountModel.find({
    locationId,
    countedAt: { $gte: rangeStart, $lte: rangeEnd }
  }).sort({ countedAt: 1 }).lean();

  const midDaySoftCounts: EndOfDayReport['midDaySoftCounts'] = [];
  const endOfDaySoftCounts: EndOfDayReport['endOfDaySoftCounts'] = [];

  softCounts.forEach((sc: Record<string, unknown>) => {
    const mId = sc.machineId as string;
    const machine = allMachines.find((m: Record<string, unknown>) => String(m._id) === mId);
    if (!machine) return;

    const machineDrop = dropMap.get(mId) || 0;
    const variance = (sc.amount as number) - machineDrop;

    const entry = {
      machineId: mId,
      location: ((machine.custom as Record<string, unknown>)?.name as string || machine.assetNumber as string || 'Floor'),
      amount: sc.amount as number,
      countedAt: sc.countedAt as Date,
      variance
    };

    if (sc.isEndOfDay) {
      endOfDaySoftCounts.push(entry);
    } else {
      midDaySoftCounts.push(entry);
    }
  });

  const totalMachineBalance = endOfDaySoftCounts.reduce((sum, s) => sum + s.amount, 0) +
    midDaySoftCounts.reduce((sum, s) => sum + s.amount, 0);

  // ============================================================================
  // 4. Aggregations & Metrics (Sum all shifts for the day)
  // ============================================================================
  const transactions = await VaultTransactionModel.find({
    locationId,
    timestamp: {
      $gte: rangeStart,
      $lte: rangeEnd
    },
  }).lean();

  let totalCashIn = 0;
  let totalCashOut = 0;
  let totalPayouts = 0;
  let expenses = 0;

  transactions.forEach((tx) => {
    const vtx = tx as unknown as { type: string; amount: number; to?: { type: string }; from?: { type: string } };
    if (vtx.type === 'vault_reconciliation') return;

    if (vtx.to?.type === 'vault') {
      totalCashIn += vtx.amount;
    }
    if (vtx.from?.type === 'vault') {
      totalCashOut += vtx.amount;
    }
    if (vtx.type === 'expense') {
      expenses += vtx.amount;
    }
    if (vtx.type === 'payout') {
      totalPayouts += vtx.amount;
    }
  });

  const totalCash = vaultSystemBalance + totalCashierFloat + totalMachineBalance;

  return {
    locationId,
    date,
    totalCash,
    denominationBreakdown,
    transactions: [],
    shiftStatus,
    previousShiftActive,
    previousShiftDate,
    vaultBalance: {
      systemBalance: vaultSystemBalance,
      physicalCount: vaultPhysicalCount,
      variance: vaultVariance
    },
    cashierFloats,
    midDaySoftCounts,
    endOfDaySoftCounts,
    metrics: {
      totalCashIn,
      totalCashOut,
      netCashFlow: totalCashIn - totalCashOut,
      payouts: totalPayouts,
      totalMachineBalance,
      totalCashierFloats: totalCashierFloat,
      expenses
    }
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

  // Machines - Mid Day
  lines.push('Mid-Day Soft Counts');
  lines.push('Machine ID,Location,Amount,Variance');
  report.midDaySoftCounts.forEach(s => {
    lines.push(`${s.machineId},${s.location},${s.amount},${s.variance}`);
  });
  lines.push('');

  // Machines - End of Day
  lines.push('End-of-Day Soft Counts');
  lines.push('Machine ID,Location,Amount,Variance');
  report.endOfDaySoftCounts.forEach(s => {
    lines.push(`${s.machineId},${s.location},${s.amount},${s.variance}`);
  });

  return lines.join('\n');
}
