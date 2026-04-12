/**
 * Global Vault Overview API
 */

import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Meters } from '@/app/api/lib/models/meters';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { NextRequest, NextResponse } from 'next/server';
import type { LocationDocument } from '@/lib/types/common';

type VaultShiftDoc = {
  _id: string;
  locationId: string;
  closingBalance?: number;
  openingBalance?: number;
  currentDenominations?: Array<{ denomination: number; quantity: number }>;
  openingDenominations?: Array<{ denomination: number; quantity: number }>;
};

type CashierShiftDoc = {
  _id: string;
  locationId: string;
  cashierId: string;
  cashierName?: string;
  cashierUsername?: string;
  status: string;
  currentBalance?: number;
  openingBalance?: number;
  lastSyncedDenominations?: Array<{ denomination: number; quantity: number }>;
  openingDenominations?: Array<{ denomination: number; quantity: number }>;
  openedAt?: Date;
  createdAt: Date;
  discrepancy?: number;
};

type VaultTransactionDoc = {
  _id: string;
  locationId: string;
  performedBy?: string;
  from?: { type: string; id?: string };
  to?: { type: string; id?: string };
  type: string;
  amount: number;
  timestamp: Date;
};

type UserDoc = {
  _id: string;
  profile?: { firstName?: string; lastName?: string };
  username?: string;
};

type FormattedTransaction = VaultTransactionDoc & {
  locationName?: string;
  performedByName?: string;
  fromName?: string;
  toName?: string;
};

export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ isAdminOrDev }) => {
    if (!isAdminOrDev)
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );

    try {
      const { searchParams } = new URL(request.url);
      const licenceeId =
        searchParams.get('licenceeId') || searchParams.get('licencee');

      const locationQuery: Record<string, unknown> = {
        membershipEnabled: true,
        deletedAt: { $lt: new Date('2025-01-01') },
      };
      if (licenceeId && licenceeId !== 'all')
        locationQuery.$or = [
          { 'rel.licencee': licenceeId },
          { 'rel.licencee': licenceeId },
        ];

      const locations = (await GamingLocations.find(locationQuery, {
        _id: 1,
        name: 1,
        gameDayOffset: 1,
      }).lean()) as unknown as Pick<
        LocationDocument,
        '_id' | 'name' | 'gameDayOffset'
      >[];
      const locationIds = locations.map(loc => String(loc._id));
      const locationNameMap = locations.reduce(
        (acc, loc) => {
          acc[String(loc._id)] = loc.name;
          return acc;
        },
        {} as Record<string, string>
      );

      if (locationIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: {
            vaultBalance: { balance: 0, denominations: [] },
            metrics: {
              totalCashIn: 0,
              totalCashOut: 0,
              netCashFlow: 0,
              discrepancies: 0,
              pendingReviews: 0,
            },
            transactions: [],
            pendingShifts: [],
            floatRequests: [],
            cashDesks: [],
          },
        });
      }

      const [
        VaultShiftModel,
        CashierShiftModel,
        FloatRequestModel,
        VaultTransactionModel,
      ] = await Promise.all([
        import('@/app/api/lib/models/vaultShift').then(m => m.default),
        import('@/app/api/lib/models/cashierShift').then(m => m.default),
        import('@/app/api/lib/models/floatRequest').then(m => m.default),
        import('@/app/api/lib/models/vaultTransaction').then(m => m.default),
      ]);

      const [
        activeVaultShifts,
        pendingCashierShifts,
        activeCashierShifts,
        pendingFloatRequests,
        recentTransactions,
      ] = (await Promise.all([
        VaultShiftModel.find({
          locationId: { $in: locationIds },
          status: 'active',
        }).lean(),
        CashierShiftModel.find({
          locationId: { $in: locationIds },
          status: 'pending_review',
        }).lean(),
        CashierShiftModel.find({
          locationId: { $in: locationIds },
          status: { $in: ['active', 'pending_start'] },
        }).lean(),
        FloatRequestModel.find({
          locationId: { $in: locationIds },
          status: 'pending',
        }).lean(),
        VaultTransactionModel.find({ locationId: { $in: locationIds } })
          .sort({ timestamp: -1 })
          .limit(20)
          .lean(),
      ])) as unknown as [
        VaultShiftDoc[],
        CashierShiftDoc[],
        CashierShiftDoc[],
        Record<string, unknown>[],
        VaultTransactionDoc[],
      ];

      let totalBalance = 0;
      const aggregatedDenominations: Record<number, number> = {};
      activeVaultShifts.forEach(s => {
        totalBalance += s.closingBalance ?? s.openingBalance ?? 0;
        const denoms =
          (s.currentDenominations?.length
            ? s.currentDenominations
            : s.openingDenominations) || [];
        denoms.forEach(d => {
          aggregatedDenominations[d.denomination] =
            (aggregatedDenominations[d.denomination] || 0) + d.quantity;
        });
      });

      const timePeriod = searchParams.get('timePeriod') || 'Today';
      const startDateParam = searchParams.get('startDate');
      const endDateParam = searchParams.get('endDate');

      const { rangeStart, rangeEnd } = getGamingDayRangeForPeriod(
        timePeriod,
        8,
        startDateParam ? new Date(startDateParam) : undefined,
        endDateParam ? new Date(endDateParam) : undefined
      );

      let totalIn = 0,
        totalOut = 0,
        totalDiscrepancies = 0,
        payouts = 0,
        payoutsCount = 0;

      const filteredTransactions = (await VaultTransactionModel.find({
        locationId: { $in: locationIds },
        timestamp: { $gte: rangeStart, $lte: rangeEnd },
      }).lean()) as unknown as VaultTransactionDoc[];
      filteredTransactions.forEach(tx => {
        if (tx.to?.type === 'vault') totalIn += tx.amount;
        if (tx.from?.type === 'vault') totalOut += tx.amount;
        if (tx.type === 'payout') {
          payouts += tx.amount;
          payoutsCount += 1;
        }
      });

      const totalCashierFloats =
        activeCashierShifts.reduce(
          (sum, s) => sum + (s.currentBalance || 0),
          0
        ) +
        pendingCashierShifts.reduce(
          (sum, s) => sum + (s.currentBalance || 0),
          0
        );

      const machineMeters = await Meters.aggregate([
        {
          $match: {
            location: { $in: locationIds },
            readAt: { $gte: rangeStart, $lte: rangeEnd },
          },
        },
        {
          $group: {
            _id: null,
            totalMoneyIn: { $sum: { $ifNull: ['$movement.drop', 0] } },
          },
        },
      ]);
      const totalMachineMoneyIn =
        machineMeters.length > 0 ? machineMeters[0].totalMoneyIn : 0;

      pendingCashierShifts.forEach(s => {
        totalDiscrepancies += Math.abs(s.discrepancy || 0);
      });

      const userIds = new Set<string>();
      recentTransactions.forEach(tx => {
        if (tx.performedBy) userIds.add(tx.performedBy);
        if (tx.from?.type === 'cashier' && tx.from.id) userIds.add(tx.from.id);
        if (tx.to?.type === 'cashier' && tx.to.id) userIds.add(tx.to.id);
      });

      let userMap: Record<string, UserDoc> = {};
      if (userIds.size > 0) {
        const UserModel = (await import('@/app/api/lib/models/user')).default;
        const users = await UserModel.find(
          { _id: { $in: Array.from(userIds) } },
          { 'profile.firstName': 1, 'profile.lastName': 1, username: 1 }
        ).lean();
        userMap = (users as UserDoc[]).reduce(
          (acc, u) => {
            acc[String(u._id)] = u;
            return acc;
          },
          {} as Record<string, UserDoc>
        );
      }

      const formatTx = (tx: VaultTransactionDoc): FormattedTransaction => {
        const res = {
          ...tx,
          locationName: locationNameMap[tx.locationId],
        } as FormattedTransaction;
        const perfUser = userMap[tx.performedBy || ''];
        if (perfUser?.profile?.firstName)
          res.performedByName = `${perfUser.profile.firstName} ${perfUser.profile.lastName}`;
        if (tx.from?.type === 'cashier' && tx.from.id) {
          const cash = userMap[tx.from.id];
          if (cash?.profile?.firstName)
            res.fromName = `Cashier (${cash.profile.firstName} ${cash.profile.lastName})`;
        }
        if (tx.to?.type === 'cashier' && tx.to.id) {
          const cash = userMap[tx.to.id];
          if (cash?.profile?.firstName)
            res.toName = `Cashier (${cash.profile.firstName} ${cash.profile.lastName})`;
        }
        return res;
      };

      return NextResponse.json({
        success: true,
        data: {
          vaultBalance: {
            balance: totalBalance,
            denominations: Object.entries(aggregatedDenominations).map(
              ([d, q]) => ({ denomination: Number(d), quantity: q })
            ),
            totalCashOnPremises:
              totalBalance + totalCashierFloats + totalMachineMoneyIn,
            machineMoneyIn: totalMachineMoneyIn,
            cashierFloats: totalCashierFloats,
          },
          metrics: {
            totalCashIn: totalIn,
            totalCashOut: totalOut,
            netCashFlow: totalIn - totalOut,
            payouts,
            payoutsCount,
            discrepancies: totalDiscrepancies,
            pendingReviews: pendingCashierShifts.length,
          },
          transactions: recentTransactions.map(formatTx),
          pendingShifts: pendingCashierShifts.map(s => ({
            ...s,
            locationName: locationNameMap[s.locationId],
          })),
          floatRequests: pendingFloatRequests.map(r => ({
            ...r,
            locationName: locationNameMap[r.locationId as string],
          })),
          cashDesks: activeCashierShifts.map(s => ({
            _id: s._id,
            locationId: s.locationId,
            locationName: locationNameMap[s.locationId],
            name:
              s.cashierName ||
              s.cashierUsername ||
              `Cashier ${s.cashierId.substring(0, 4)}`,
            balance: s.currentBalance ?? s.openingBalance ?? 0,
            denominations:
              s.lastSyncedDenominations ?? s.openingDenominations ?? [],
            lastAudit: new Date(s.openedAt || s.createdAt).toISOString(),
            status: s.status === 'pending_start' ? 'inactive' : 'active',
          })),
          rangeStart: rangeStart.toISOString(),
          rangeEnd: rangeEnd.toISOString(),
        },
      });
    } catch (error: unknown) {
      console.error('[Global Vault API] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
