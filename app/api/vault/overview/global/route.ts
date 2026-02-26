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
    const locationQuery: Record<string, any> = {
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

    activeVaultShifts.forEach((shift: any) => {
      const balance = shift.closingBalance ?? shift.openingBalance ?? 0; // Simplified for global view
      totalBalance += balance;
      
      const denoms = (shift.currentDenominations?.length > 0 ? shift.currentDenominations : shift.openingDenominations) || [];
      denoms.forEach((d: any) => {
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

    todayTransactions.forEach((tx: any) => {
      if (tx.to?.type === 'vault') totalIn += tx.amount;
      if (tx.from?.type === 'vault') totalOut += tx.amount;
      if (tx.type === 'payout') {
        payouts += tx.amount;
        payoutsCount += 1;
      }
    });

    // STEP 5.5: Calculate Cash on Premises (Machines & Cashiers)
    
    // A. All Active Cashier Floats sum (across all locations)
    const totalCashierFloats = activeCashierShifts.reduce((sum: number, s: any) => sum + (s.currentBalance || 0), 0) + 
                             pendingCashierShifts.reduce((sum: number, s: any) => sum + (s.currentBalance || 0), 0);

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

    pendingCashierShifts.forEach((shift: any) => {
      totalDiscrepancies += Math.abs(shift.discrepancy || 0);
    });

    // ============================================================================
    // STEP 6: Format and Return Data
    // ============================================================================
    const formattedPendingShifts = pendingCashierShifts.map((shift: any) => ({
      ...shift,
      locationName: locationNameMap[shift.locationId]
    }));

    const formattedFloatRequests = pendingFloatRequests.map((req: any) => ({
      ...req,
      locationName: locationNameMap[req.locationId]
    }));

    const formattedCashDesks = activeCashierShifts.map((shift: any) => ({
      _id: shift._id,
      locationId: shift.locationId,
      locationName: locationNameMap[shift.locationId],
      name: (shift.cashierName || shift.cashierUsername || `Cashier ${shift.cashierId.substring(0, 4)}`),
      cashierName: shift.cashierName || shift.cashierUsername,
      balance: shift.currentBalance ?? shift.openingBalance ?? 0,
      denominations: shift.lastSyncedDenominations ?? shift.openingDenominations ?? [],
      lastAudit: new Date(shift.openedAt || shift.createdAt).toISOString(),
      status: shift.status === 'pending_start' ? 'inactive' : 'active'
    }));

    const formattedTransactionsRaw = recentTransactions.map((tx: any) => ({
      ...tx,
      locationName: locationNameMap[tx.locationId]
    }));

    // Populate Names for Transactions
    const userIds = new Set<string>();
    formattedTransactionsRaw.forEach(tx => {
        if (tx.performedBy) userIds.add(tx.performedBy);
        if (tx.from?.type === 'cashier' && tx.from.id) userIds.add(tx.from.id);
        if (tx.to?.type === 'cashier' && tx.to.id) userIds.add(tx.to.id);
    });

    let formattedTransactions = formattedTransactionsRaw;
    if (userIds.size > 0) {
        const UserModel = (await import('@/app/api/lib/models/user')).default;
        const users = await UserModel.find(
            { _id: { $in: Array.from(userIds) } }, 
            { 'profile.firstName': 1, 'profile.lastName': 1, username: 1 }
        ).lean();

        const userMap = users.reduce((acc: Record<string, any>, u: any) => {
            acc[String(u._id)] = u;
            return acc;
        }, {} as Record<string, any>);

        formattedTransactions = formattedTransactionsRaw.map(tx => {
            const updatedTx = { ...tx };
            
            // Format Performer Name
            const perfUser = userMap[tx.performedBy];
            if (perfUser && perfUser.profile?.firstName) {
                updatedTx.performedByName = `${perfUser.profile.firstName} ${perfUser.profile.lastName}`;
            }

            // Format Source (if Cashier)
            if (tx.from?.type === 'cashier' && tx.from.id) {
                const cashier = userMap[tx.from.id];
                if (cashier && cashier.profile?.firstName) {
                    updatedTx.fromName = `Cashier (${cashier.profile.firstName} ${cashier.profile.lastName})`;
                }
            }

            // Format Destination (if Cashier)
            if (tx.to?.type === 'cashier' && tx.to.id) {
                const cashier = userMap[tx.to.id];
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

  } catch (error) {
    console.error('Error in Global Vault Overview API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
