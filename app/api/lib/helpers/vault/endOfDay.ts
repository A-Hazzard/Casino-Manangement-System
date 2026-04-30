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
import type {
  CashierShiftDocument,
  GamingLocationDocument,
  GamingMachine,
  SoftCountDocument,
  VaultShiftDocument,
  VaultTransactionDocument,
} from '@/shared/types';
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
  if (!locationId || typeof locationId !== 'string' || !date || !(date instanceof Date)) {
    console.error('[generateEndOfDayReport] locationId (string) and date (Date) are required');
    throw new Error('Invalid parameters provided');
  }

  // Fetch location to get gameDayOffset
  const location = await GamingLocations.findOne({ _id: locationId }).select('gameDayOffset').lean<GamingLocationDocument | null>();
  const gameDayOffset = location?.gameDayOffset ?? 8; // Default to 8 AM if not set

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
  }).sort({ openedAt: 1 }).lean<VaultShiftDocument[]>();

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
    const latestShiftDoc = latestShift as VaultShiftDocument & { currentBalance?: number; currentDenominations?: Array<{ denomination: number; quantity: number }> };
    if (latestShift.status === 'closed') {
      vaultSystemBalance = latestShift.closingBalance || 0;
    } else {
      vaultSystemBalance = latestShiftDoc.currentBalance ?? latestShift.openingBalance ?? 0;
    }
    vaultPhysicalCount = vaultSystemBalance;

    // Aggregate denominations and variance from all relevant shifts
    vaultDenominations = latestShift.status === 'closed'
      ? (latestShift.closingDenominations || []).map(d => ({ denomination: d.denomination, quantity: d.quantity }))
      : (latestShiftDoc.currentDenominations || (latestShift.openingDenominations || []).map(d => ({ denomination: d.denomination, quantity: d.quantity })));

    // Sum variance from all shifts in the range
    vaultShifts.forEach(s => {
      (s.reconciliations || []).forEach(r => {
        vaultVariance += (r.newBalance - r.previousBalance);
      });
    });
  } else {
    // If no shift found for this day, check if previous day is still active
    const prevActive = await VaultShiftModel.findOne({
      locationId,
      status: 'active',
      openedAt: { $lt: rangeStart }
    }).select('openedAt').lean<VaultShiftDocument | null>();

    if (prevActive) {
      previousShiftActive = true;
      previousShiftDate = prevActive.openedAt as Date;
    }
  }

  // Transform denominations
  const denominationBreakdown: Record<string, number> = {};
  vaultDenominations.forEach((denomItem: { denomination: number; quantity: number }) => {
    const key = String(denomItem.denomination);
    denominationBreakdown[key] = (denominationBreakdown[key] || 0) + (denomItem.quantity || 0);
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
  }).lean<CashierShiftDocument[]>();

  type CashierShiftWithName = CashierShiftDocument & { cashierName?: string; cashierUsername?: string };
  const cashierFloats = cashierShifts.map((shift) => {
    const shiftWithName = shift as CashierShiftWithName;
    return {
      _id: String(shift._id),
      cashierName: shiftWithName.cashierName || shiftWithName.cashierUsername || 'Unknown',
      status: shift.status,
      balance: shift.status === 'closed' ? (shift.closingBalance || 0) : (shift.currentBalance || shift.openingBalance || 0),
    };
  });

const totalCashierFloat = cashierFloats.reduce((sum, cashierFloatItem) => sum + cashierFloatItem.balance, 0);

// ============================================================================
// 3. Machine Counts (Drops)
// ============================================================================
const machinesMatchQuery = {
    gamingLocation: locationId,
    deletedAt: { $exists: false }
  };
  const allMachines = await Machine.find(machinesMatchQuery).select('_id assetNumber custom.name').lean<GamingMachine[]>();

  const machineIds = allMachines.map(machine => String(machine._id));

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
  }).sort({ countedAt: 1 }).lean<SoftCountDocument[]>();

  const midDaySoftCounts: EndOfDayReport['midDaySoftCounts'] = [];
  const endOfDaySoftCounts: EndOfDayReport['endOfDaySoftCounts'] = [];

  softCounts.forEach((softCount) => {
    const machineId = softCount.machineId;
    if (!machineId) return;
    const machine = allMachines.find((machineItem) => machineItem._id === machineId);
    if (!machine) return;

    const machineDrop = dropMap.get(machineId) || 0;
    const variance = softCount.amount - machineDrop;

    const entry = {
      machineId: machineId,
      location: (machine.custom?.name as string | undefined) || machine.assetNumber || 'Floor',
      amount: softCount.amount,
      countedAt: softCount.countedAt as Date,
      variance
    };

    if (softCount.isEndOfDay) {
      endOfDaySoftCounts.push(entry);
    } else {
      midDaySoftCounts.push(entry);
    }
  });

  const totalMachineBalance = endOfDaySoftCounts.reduce((sum, endItem) => sum + endItem.amount, 0) +
    midDaySoftCounts.reduce((sum, midItem) => sum + midItem.amount, 0);

  // ============================================================================
  // 4. Aggregations & Metrics (Sum all shifts for the day)
  // ============================================================================
  const transactions = await VaultTransactionModel.find({
    locationId,
    timestamp: {
      $gte: rangeStart,
      $lte: rangeEnd
    },
  }).lean<VaultTransactionDocument[]>();

  let totalCashIn = 0;
  let totalCashOut = 0;
  let totalPayouts = 0;
  let expenses = 0;

  transactions.forEach((vaultTransaction) => {
    if ((vaultTransaction.type as string) === 'vault_reconciliation') return;

    if (vaultTransaction.to?.type === 'vault') {
      totalCashIn += vaultTransaction.amount;
    }
    if (vaultTransaction.from?.type === 'vault') {
      totalCashOut += vaultTransaction.amount;
    }
    if (vaultTransaction.type === 'expense') {
      expenses += vaultTransaction.amount;
    }
    if (vaultTransaction.type === 'payout') {
      totalPayouts += vaultTransaction.amount;
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
  if (!report || typeof report !== 'object') {
    console.error('[exportReportToCSV] report is required and must be an object');
    return '';
  }

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
