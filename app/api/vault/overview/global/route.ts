/**
 * Global Vault Overview API
 * 
 * GET /api/vault/overview/global
 * 
 * Aggregates vault data across all membership-enabled locations.
 * restricted to Admin and Developer roles.
 * 
 * @module app/api/vault/overview/global/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Meters } from '@/app/api/lib/models/meters';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Authentication & Authorization
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userRoles = (userPayload?.roles as string[]) || [];
    const isAdminOrDev = userRoles.some(role =>
      ['developer', 'admin'].includes(role.toLowerCase())
    );

    if (!isAdminOrDev) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const licenseeId = searchParams.get('licenseeId');

    await connectDB();

    // ============================================================================
    // STEP 3: Identify locations to query
    // ============================================================================
    const locationQuery: Record<string, unknown> = {
      membershipEnabled: true,
      deletedAt: { $lt: new Date('2025-01-01') }
    };

    if (licenseeId && licenseeId !== 'all') {
      locationQuery['rel.licensee'] = licenseeId;
    }

    const locations = await GamingLocations.find(locationQuery, { _id: 1, name: 1, gameDayOffset: 1 }).lean();
    const locationIds = locations.map(loc => String(loc._id));
    const locationNameMap = locations.reduce((acc, loc) => {
      acc[String(loc._id)] = loc.name;
      return acc;
    }, {} as Record<string, string>);

    if (locationIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          vaultBalance: { balance: 0, denominations: [] },
          metrics: { totalCashIn: 0, totalCashOut: 0, netCashFlow: 0, discrepancies: 0, pendingReviews: 0 },
          transactions: [],
          pendingShifts: [],
          floatRequests: [],
          cashDesks: []
        }
      });
    }

    // ============================================================================
    // STEP 4: Parallel Data Fetching
    // ============================================================================
    const [
      activeVaultShifts,
      pendingCashierShifts,
      activeCashierShifts,
      pendingFloatRequests,
      recentTransactions
    ] = await Promise.all([
      VaultShiftModel.find({ locationId: { $in: locationIds }, status: 'active' }).lean(),
      CashierShiftModel.find({ locationId: { $in: locationIds }, status: 'pending_review' }).lean(),
      CashierShiftModel.find({ locationId: { $in: locationIds }, status: { $in: ['active', 'pending_start'] } }).lean(),
      FloatRequestModel.find({ locationId: { $in: locationIds }, status: 'pending' }).lean(),
      VaultTransactionModel.find({ locationId: { $in: locationIds } }).sort({ timestamp: -1 }).limit(20).lean()
    ]);

    // ============================================================================
    // STEP 5: Aggregate Balances & Metrics
    // ============================================================================

    // Total Balance and Denominations across all active shifts
    let totalBalance = 0;
    const aggregatedDenominations: Record<number, number> = {};

    interface DenominationQuantity {
      denomination: number;
      quantity: number;
    }
    interface BaseShift {
      closingBalance?: number;
      openingBalance?: number;
      currentDenominations?: DenominationQuantity[];
      openingDenominations?: DenominationQuantity[];
    }

    activeVaultShifts.forEach((shift: unknown) => {
      const s = shift as BaseShift;
      const balance = s.closingBalance ?? s.openingBalance ?? 0; // Simplified for global view
      totalBalance += balance;

      const denoms = (s.currentDenominations && s.currentDenominations.length > 0 ? s.currentDenominations : s.openingDenominations) || [];
      denoms.forEach((d: DenominationQuantity) => {
        aggregatedDenominations[d.denomination] = (aggregatedDenominations[d.denomination] || 0) + d.quantity;
      });
    });

    // Simple Metrics Aggregation (Today)
    // Use average gameDayOffset or just midnight for global view? 
    // Standardizing on UTC-4 midnight for simplicity in global view, or fetching per location is too expensive.
    // Let's iterate locations and get their today's metrics.

    // For performance, we'll just sum the metrics of current active shifts or transactions today.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    let totalIn = 0;
    let totalOut = 0;
    let totalDiscrepancies = 0;
    let payouts = 0;
    let payoutsCount = 0;

    // Use transactions to calculate global metrics for "today"
    const todayTransactions = await VaultTransactionModel.find({
      locationId: { $in: locationIds },
      timestamp: { $gte: startOfToday }
    }).lean();

    interface VaultTx {
      amount: number;
      type: string;
      to?: { type: string };
      from?: { type: string };
    }

    todayTransactions.forEach((tx: unknown) => {
      const vtx = tx as VaultTx;
      if (vtx.to?.type === 'vault') totalIn += vtx.amount;
      if (vtx.from?.type === 'vault') totalOut += vtx.amount;
      if (vtx.type === 'payout') {
        payouts += vtx.amount;
        payoutsCount += 1;
      }
    });

    // STEP 5.5: Calculate Cash on Premises (Machines & Cashiers)

    // A. All Active Cashier Floats sum (across all locations)
    const totalCashierFloats = activeCashierShifts.reduce((sum: number, s: unknown) => sum + ((s as { currentBalance?: number }).currentBalance || 0), 0) +
      pendingCashierShifts.reduce((sum: number, s: unknown) => sum + ((s as { currentBalance?: number }).currentBalance || 0), 0);

    // B. Machine Meter Drops (Theoretic) - Today's Gaming Day
    // Use a default 8 AM offset for global dashboard query or aggregate ranges?
    // For global overview performance, we'll use a standard global range based on 8 AM offset.
    const { rangeStart, rangeEnd } = getGamingDayRangeForPeriod('Today', 8);

    const machineMeters = await Meters.aggregate([
      {
        $match: {
          location: { $in: locationIds },
          readAt: {
            $gte: rangeStart,
            $lte: rangeEnd,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalMoneyIn: { $sum: { $ifNull: ['$movement.drop', 0] } },
        },
      },
    ]);
    const totalMachineMoneyIn = machineMeters.length > 0 ? machineMeters[0].totalMoneyIn : 0;

    pendingCashierShifts.forEach((shift: unknown) => {
      totalDiscrepancies += Math.abs((shift as { discrepancy?: number }).discrepancy || 0);
    });

    // ============================================================================
    // STEP 6: Format and Return Data
    // ============================================================================
    const formattedPendingShifts = pendingCashierShifts.map((shift: unknown) => ({
      ...(shift as Record<string, unknown>),
      locationName: locationNameMap[(shift as { locationId: string }).locationId]
    }));

    const formattedFloatRequests = pendingFloatRequests.map((req: unknown) => ({
      ...(req as Record<string, unknown>),
      locationName: locationNameMap[(req as { locationId: string }).locationId]
    }));

    const formattedCashDesks = activeCashierShifts.map((shift: unknown) => {
      const s = shift as {
        _id: string;
        locationId: string;
        cashierName?: string;
        cashierUsername?: string;
        cashierId: string;
        currentBalance?: number;
        openingBalance?: number;
        lastSyncedDenominations?: DenominationQuantity[];
        openingDenominations?: DenominationQuantity[];
        openedAt?: string | Date;
        createdAt: string | Date;
        status: string;
      };
      return {
        _id: s._id,
        locationId: s.locationId,
        locationName: locationNameMap[s.locationId],
        name: (s.cashierName || s.cashierUsername || `Cashier ${s.cashierId.substring(0, 4)}`),
        cashierName: s.cashierName || s.cashierUsername,
        balance: s.currentBalance ?? s.openingBalance ?? 0,
        denominations: s.lastSyncedDenominations ?? s.openingDenominations ?? [],
        lastAudit: new Date(s.openedAt || s.createdAt).toISOString(),
        status: s.status === 'pending_start' ? 'inactive' : 'active'
      };
    });

    type ExtendedTx = Record<string, unknown> & { locationName: string };
    const formattedTransactionsRaw: ExtendedTx[] = recentTransactions.map((tx: unknown) => ({
      ...(tx as Record<string, unknown>),
      locationName: locationNameMap[(tx as { locationId: string }).locationId]
    }));

    // Populate Names for Transactions
    const userIds = new Set<string>();
    formattedTransactionsRaw.forEach(tx => {
      if (tx.performedBy) userIds.add(tx.performedBy as string);
      if ((tx.from as { type?: string; id?: string } | undefined)?.type === 'cashier' && (tx.from as { id?: string }).id) userIds.add((tx.from as { id: string }).id);
      if ((tx.to as { type?: string; id?: string } | undefined)?.type === 'cashier' && (tx.to as { id?: string }).id) userIds.add((tx.to as { id: string }).id);
    });

    let formattedTransactions: ExtendedTx[] = formattedTransactionsRaw;
    if (userIds.size > 0) {
      const UserModel = (await import('@/app/api/lib/models/user')).default;
      const users = await UserModel.find(
        { _id: { $in: Array.from(userIds) } },
        { 'profile.firstName': 1, 'profile.lastName': 1, username: 1 }
      ).lean();

      interface PopulatedUser {
        _id: string;
        profile?: { firstName?: string; lastName?: string };
        username?: string;
      }

      const userMap = (users as unknown as PopulatedUser[]).reduce((acc: Record<string, PopulatedUser>, u: PopulatedUser) => {
        acc[String(u._id)] = u;
        return acc;
      }, {} as Record<string, PopulatedUser>);

      formattedTransactions = formattedTransactionsRaw.map(tx => {
        const updatedTx = { ...tx } as ExtendedTx;
        const performedBy = tx.performedBy as string;

        // Format Performer Name
        const perfUser = userMap[performedBy];
        if (perfUser && perfUser.profile?.firstName) {
          updatedTx.performedByName = `${perfUser.profile.firstName} ${perfUser.profile.lastName}`;
        }

        // Format Source (if Cashier)
        const from = tx.from as { type: string; id?: string } | undefined;
        if (from?.type === 'cashier' && from.id) {
          const cashier = userMap[from.id];
          if (cashier && cashier.profile?.firstName) {
            updatedTx.fromName = `Cashier (${cashier.profile.firstName} ${cashier.profile.lastName})`;
          }
        }

        // Format Destination (if Cashier)
        const to = tx.to as { type: string; id?: string } | undefined;
        if (to?.type === 'cashier' && to.id) {
          const cashier = userMap[to.id];
          if (cashier && cashier.profile?.firstName) {
            updatedTx.toName = `Cashier (${cashier.profile.firstName} ${cashier.profile.lastName})`;
          }
        }

        return updatedTx;
      });
    }

    const response = {
      success: true,
      data: {
        vaultBalance: {
          balance: totalBalance,
          denominations: Object.entries(aggregatedDenominations).map(([denom, qty]) => ({
            denomination: Number(denom),
            quantity: qty
          })),
          totalCashOnPremises: totalBalance + totalCashierFloats + totalMachineMoneyIn,
          machineMoneyIn: totalMachineMoneyIn,
          cashierFloats: totalCashierFloats
        },
        metrics: {
          totalCashIn: totalIn,
          totalCashOut: totalOut,
          netCashFlow: totalIn - totalOut,
          payouts,
          payoutsCount,
          discrepancies: totalDiscrepancies,
          pendingReviews: pendingCashierShifts.length
        },
        transactions: formattedTransactions,
        pendingShifts: formattedPendingShifts,
        floatRequests: formattedFloatRequests,
        cashDesks: formattedCashDesks,
        rangeStart: rangeStart.toISOString(),
        rangeEnd: rangeEnd.toISOString()
      }
    };

    const duration = Date.now() - startTime;
    console.log(`[Global Vault API] Fetched for ${locationIds.length} locations in ${duration}ms`);

    return NextResponse.json(response);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in Global Vault Overview API:', errorMessage);
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
