/**
 * Vault Metrics API
 */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Meters } from '@/app/api/lib/models/meters';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { TimePeriod } from '@/app/api/lib/types';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  getMoneyInScale,
  getMoneyOutAndJackpotScale,
} from '@/app/api/lib/utils/reviewerScale';
import { NextRequest, NextResponse } from 'next/server';
import type { LocationDocument } from '@/lib/types/common';
import type {
  CashierShiftDocument,
  VaultTransactionDocument,
} from '@shared/types';

/**
 * Main GET handler for vault metrics
 *
 * @param {string} locationId - ID of the location (REQUIRED)
 * @param {string} timePeriod - Named period ('Today', 'Yesterday', 'Last 7 Days', etc.)
 * @param {string} startDate - Manual ISO date start
 * @param {string} endDate - Manual ISO date end
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Parse and validate location
      // ============================================================================
      const { searchParams } = new URL(request.url);
      const locationId = searchParams.get('locationId');
      if (!locationId)
        return NextResponse.json(
          { success: false, error: 'Location ID is required' },
          { status: 400 }
        );

      // ============================================================================
      // STEP 2: Enforce permissions
      // ============================================================================
      const allowedLocationIds = await getUserLocationFilter(
        (userPayload?.assignedLicencees as string[]) || [],
        undefined,
        (userPayload?.assignedLocations as string[]) || [],
        userRoles
      );

      if (
        allowedLocationIds !== 'all' &&
        !allowedLocationIds.includes(locationId)
      ) {
        return NextResponse.json(
          { success: false, error: 'Access denied' },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 3: Process time range
      // ============================================================================
      const locationInfo = await GamingLocations.findOne(
        { _id: locationId },
        { gameDayOffset: 1 }
      ).lean<LocationDocument>();
      const gameDayOffset = locationInfo?.gameDayOffset ?? 8;
      const timePeriod = searchParams.get('timePeriod') || 'Today';
      const startDateParam = searchParams.get('startDate');
      const endDateParam = searchParams.get('endDate');

      const { rangeStart, rangeEnd } = getGamingDayRangeForPeriod(
        timePeriod as TimePeriod,
        gameDayOffset,
        startDateParam ? new Date(startDateParam) : undefined,
        endDateParam ? new Date(endDateParam) : undefined
      );

      // ============================================================================
      // STEP 4: Fetch metrics data
      // ============================================================================
      const [transactions, activeCashiersData, machineMeters] =
        await Promise.all([
          VaultTransactionModel.find({
            locationId,
            timestamp: { $gte: rangeStart, $lte: rangeEnd },
          }).lean<VaultTransactionDocument[]>(),
          CashierShiftModel.find(
            { locationId, status: { $in: ['active', 'pending_review'] } },
            { currentBalance: 1 }
          ).lean<CashierShiftDocument[]>(),
          Meters.aggregate([
            {
              $match: {
                location: locationId,
                readAt: { $gte: rangeStart, $lte: rangeEnd },
              },
            },
            {
              $group: {
                _id: null,
                totalMoneyIn: { $sum: { $ifNull: ['$movement.drop', 0] } },
              },
            },
          ]),
        ]);

      // ============================================================================
      // STEP 5: Calculate base metrics
      // ============================================================================
      let totalCashIn = 0,
        totalCashOut = 0,
        payouts = 0,
        expenses = 0,
        payoutsCount = 0;
      transactions.forEach(tx => {
        if (['vault_reconciliation', 'vault_open'].includes(tx.type)) return;
        if (tx.to && tx.to.type === 'vault') totalCashIn += tx.amount;
        if (tx.from && tx.from.type === 'vault') totalCashOut += tx.amount;
        if (tx.type === 'expense') expenses += tx.amount;
        if (tx.type === 'payout') {
          payouts += tx.amount;
          payoutsCount += 1;
        }
      });

      const totalCashierFloats = activeCashiersData.reduce(
        (sum, s) => sum + (s.currentBalance || 0),
        0
      );
      const totalMachineBalance =
        machineMeters.length > 0 ? machineMeters[0].totalMoneyIn : 0;

      const metrics = {
        totalCashIn,
        totalCashOut,
        netCashFlow: totalCashIn - totalCashOut,
        payouts,
        payoutsCount,
        totalMachineBalance,
        totalCashierFloats,
        expenses,
      };

      // ============================================================================
      // STEP 6: Apply reviewer scaling
      // ============================================================================
      const moneyInScale = getMoneyInScale(
        userPayload as {
          moneyInMultiplier?: number | null;
          roles?: string[];
          reviewerMultiplierStartTime?: Date | string | null;
        },
        rangeEnd
      );
      const moneyOutScale = getMoneyOutAndJackpotScale(
        userPayload as {
          moneyOutAndJackpotMultiplier?: number | null;
          roles?: string[];
          reviewerMultiplierStartTime?: Date | string | null;
        },
        rangeEnd
      );
      if (moneyInScale !== 1 || moneyOutScale !== 1) {
        metrics.totalCashIn *= moneyInScale;
        metrics.totalCashOut *= moneyOutScale;
        metrics.netCashFlow = metrics.totalCashIn - metrics.totalCashOut;
        metrics.payouts *= moneyOutScale;
        metrics.totalMachineBalance *= moneyOutScale;
        metrics.totalCashierFloats *= moneyOutScale;
        metrics.expenses *= moneyOutScale;
      }

      // ============================================================================
      // STEP 7: Return metrics
      // ============================================================================
      return NextResponse.json({
        success: true,
        metrics,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString(),
      });
    } catch (error: unknown) {
      console.error('[Vault Metrics API] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
