/**
 * Global Vault Overview API
 */

import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Meters } from '@/app/api/lib/models/meters';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  logRouteFetch,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';
import type { LocationDocument } from '@/lib/types/common';
import type {
  VaultShiftOverview,
  CashierShiftOverview,
  VaultTransactionOverview,
  EnrichedVaultTransactionOverview,
} from '@/shared/types/vault';
import type { UserOverview } from '@/shared/types/models';
import type {
  CashierShiftDocument,
  VaultShiftDocument,
  VaultTransactionDocument,
} from '@shared/types';

/**
 * Main GET handler for global vault overview.
 *
 * STEP 1: Authorization and permission check.
 * STEP 2: Parse query parameters (licenceeId, timePeriod, date range).
 * STEP 3: Fetch locations and build location maps.
 * STEP 4: Import models and fetch active shifts, transactions, and float requests.
 * STEP 5: Aggregation and processing of balanced/transaction data.
 * STEP 6: Return formatted global overview data.
 *
 * @param {NextRequest} request - The incoming Next.js request.
 * @param {string} request.url - URL containing searchParams:
 *   - licenceeId: Filter by licencee (or 'all').
 *   - timePeriod: Gaming day preset ('Today', 'Yesterday', etc.).
 *   - startDate: Custom range start (ISO string).
 *   - endDate: Custom range end (ISO string).
 * @returns {Promise<NextResponse>} Structured global vault overview data.
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/vault/overview/global';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ isAdminOrDev }) => {
    // ============================================================================
    // STEP 1: Check permissions
    // ============================================================================
    if (!isAdminOrDev) {
      logRouteError(
        functionName,
        'GET',
        '/api/vault/overview/global',
        'Insufficient permissions',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    try {
      // ============================================================================
      // STEP 2: Parse query params
      // ============================================================================
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

      // ============================================================================
      // STEP 3: Fetch locations
      // ============================================================================
      const locations = await GamingLocations.find(locationQuery, {
        _id: 1,
        name: 1,
        gameDayOffset: 1,
      }).lean<LocationDocument[]>();
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

      // ============================================================================
      // STEP 4: Fetch shifts and float requests
      // ============================================================================
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
        }).lean<VaultShiftDocument[]>(),
        CashierShiftModel.find({
          locationId: { $in: locationIds },
          status: 'pending_review',
        }).lean<CashierShiftDocument[]>(),
        CashierShiftModel.find({
          locationId: { $in: locationIds },
          status: { $in: ['active', 'pending_start'] },
        }).lean<CashierShiftDocument[]>(),
        FloatRequestModel.find({
          locationId: { $in: locationIds },
          status: 'pending',
        }).lean<Record<string, unknown>[]>(),
        VaultTransactionModel.find({ locationId: { $in: locationIds } })
          .sort({ timestamp: -1 })
          .limit(20)
          .lean<VaultTransactionDocument[]>(),
      ])) as unknown as [
        VaultShiftOverview[],
        CashierShiftOverview[],
        CashierShiftOverview[],
        Record<string, unknown>[],
        VaultTransactionOverview[],
      ];

      // ============================================================================
      // STEP 5: Process active vault shifts
      // ============================================================================
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

      // ============================================================================
      // STEP 6: Process transactions
      // ============================================================================
      let totalIn = 0,
        totalOut = 0,
        totalDiscrepancies = 0,
        payouts = 0,
        payoutsCount = 0;

      const filteredTransactions = (await VaultTransactionModel.find({
        locationId: { $in: locationIds },
        timestamp: { $gte: rangeStart, $lte: rangeEnd },
      }).lean<
        VaultTransactionDocument[]
      >()) as unknown as VaultTransactionOverview[];
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

      // ============================================================================
      // STEP 7: Process machine meters and discrepancies
      // ============================================================================
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

      // ============================================================================
      // STEP 8: Fetch user details
      // ============================================================================
      const userIds = new Set<string>();
      recentTransactions.forEach(tx => {
        if (tx.performedBy) userIds.add(tx.performedBy);
        if (tx.from?.type === 'cashier' && tx.from.id) userIds.add(tx.from.id);
        if (tx.to?.type === 'cashier' && tx.to.id) userIds.add(tx.to.id);
      });

      let userMap: Record<string, UserOverview> = {};
      if (userIds.size > 0) {
        const UserModel = (await import('@/app/api/lib/models/user')).default;
        const users = await UserModel.find(
          { _id: { $in: Array.from(userIds) } },
          { 'profile.firstName': 1, 'profile.lastName': 1, username: 1 }
        ).lean<UserOverview[]>();
        userMap = users.reduce(
          (acc, u) => {
            acc[String(u._id)] = u;
            return acc;
          },
          {} as Record<string, UserOverview>
        );
      }

      // ============================================================================
      // STEP 9: Format and return data
      // ============================================================================
      const formatTx = (
        tx: VaultTransactionOverview
      ): EnrichedVaultTransactionOverview => {
        const res = {
          ...tx,
          locationName: locationNameMap[tx.locationId],
        } as EnrichedVaultTransactionOverview;
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

      const duration = Date.now() - startTime;
      logRouteFetch(
        functionName,
        'GET',
        '/api/vault/overview/global',
        1,
        user,
        duration
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to fetch global vault overview';
      logRouteError(
        functionName,
        'GET',
        '/api/vault/overview/global',
        errorMessage,
        user
      );
      console.error('[Global Vault API] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
