/**
 * Vault Metrics API
 */

import { getUserLocationFilter } from '@/app/api/lib/helpers/licenceeFilter';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Meters } from '@/app/api/lib/models/meters';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import {
  getGamingDayRange,
  getGamingDayRangeForPeriod,
} from '@/lib/utils/gamingDayRange';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { NextRequest, NextResponse } from 'next/server';
import type { LocationDocument } from '@/lib/types/common';

export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const { searchParams } = new URL(request.url);
      const locationId = searchParams.get('locationId');
      const dateStr = searchParams.get('date');
      if (!locationId)
        return NextResponse.json(
          { success: false, error: 'Location ID is required' },
          { status: 400 }
        );

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

      const locationInfo = (await GamingLocations.findOne(
        { _id: locationId },
        { gameDayOffset: 1 }
      ).lean()) as Pick<LocationDocument, 'gameDayOffset'> | null;
      const gameDayOffset = locationInfo?.gameDayOffset ?? 8;
      const { rangeStart, rangeEnd } = dateStr
        ? getGamingDayRange(new Date(dateStr), gameDayOffset)
        : getGamingDayRangeForPeriod('Today', gameDayOffset);

      const [transactions, activeCashiersData, machineMeters] =
        await Promise.all([
          VaultTransactionModel.find({
            locationId,
            timestamp: { $gte: rangeStart, $lte: rangeEnd },
          }).lean(),
          CashierShiftModel.find(
            { locationId, status: { $in: ['active', 'pending_review'] } },
            { currentBalance: 1 }
          ).lean(),
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

      let totalCashIn = 0,
        totalCashOut = 0,
        payouts = 0,
        expenses = 0,
        payoutsCount = 0;
      transactions.forEach(tx => {
        if (['vault_reconciliation', 'vault_open'].includes(tx.type)) return;
        if (tx.to.type === 'vault') totalCashIn += tx.amount;
        if (tx.from.type === 'vault') totalCashOut += tx.amount;
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

      return NextResponse.json({
        success: true,
        metrics: {
          totalCashIn,
          totalCashOut,
          netCashFlow: totalCashIn - totalCashOut,
          payouts,
          payoutsCount,
          totalMachineBalance,
          totalCashierFloats,
          expenses,
        },
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
