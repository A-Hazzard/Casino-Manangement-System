/**
 * Get Vault Balance API
 *
 * GET /api/vault/balance
 *
 * Retrieves the current balance and status of the vault for a given location.
 *
 * @module app/api/vault/balance/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Machine } from '@/app/api/lib/models/machines';
import { Meters } from '@/app/api/lib/models/meters';
import UserModel from '@/app/api/lib/models/user';
import { VaultCollectionSession } from '@/app/api/lib/models/vault-collection-session';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type {
    VaultBalance,
    VaultShift,
    VaultTransaction,
} from '@/shared/types/vault';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
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
    const hasVaultAccess = userRoles.some(role =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(
        role.toLowerCase()
      )
    );
    if (!hasVaultAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get('locationId');
    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'locationId is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Fetch active vault shift and latest transaction
    // ============================================================================
    await connectDB();
    const activeShift = await VaultShiftModel.findOne({
      locationId,
      status: 'active',
    }).lean<VaultShift | null>();

    if (!activeShift) {
      // Find the most recently closed shift for this location to get the suggested opening balance
      const lastClosedShift = await VaultShiftModel.findOne({
        locationId,
        status: 'closed',
      }).sort({ closedAt: -1 }).lean<VaultShift | null>();

      const lastReconTime = lastClosedShift?.reconciliations?.length 
        ? new Date(Math.max(...lastClosedShift.reconciliations.map(r => new Date(r.timestamp).getTime())))
        : null;
      
      const lastAuditTime = lastClosedShift?.closedAt 
        ? (lastReconTime && lastReconTime > lastClosedShift.closedAt ? lastReconTime : lastClosedShift.closedAt)
        : (lastReconTime || null);

      const response: VaultBalance & { isInitial: boolean } = {
        balance: lastClosedShift?.closingBalance ?? 0,
        denominations: lastClosedShift?.closingDenominations ?? [],
        activeShiftId: undefined,
        lastReconciliation: lastReconTime || undefined,
        lastAudit: lastAuditTime ? lastAuditTime.toISOString() : 'Never',
        canClose: false,
        isInitial: !lastClosedShift,
        managerOnDuty: 'None'
      };
      return NextResponse.json({ success: true, data: response });
    }

    const lastTransaction = await VaultTransactionModel.findOne({
      vaultShiftId: activeShift._id,
    })
      .sort({ timestamp: -1 })
      .lean<VaultTransaction | null>();

    const lastReconTime =
      activeShift.reconciliations?.length > 0
        ? new Date(Math.max(...activeShift.reconciliations.map(r => new Date(r.timestamp).getTime())))
        : null;

    const lastAuditTime = activeShift.openedAt 
      ? (lastReconTime && lastReconTime > activeShift.openedAt ? lastReconTime : activeShift.openedAt)
      : (lastReconTime || null);

    // Fetch Manager on Duty name
    const vaultManager = await UserModel.findOne({ _id: activeShift.vaultManagerId }, { profile: 1, username: 1 }).lean() as { 
      profile?: { firstName: string; lastName: string }; 
      username: string 
    } | null;

    const managerName = vaultManager?.profile?.firstName && vaultManager?.profile?.lastName 
      ? `${vaultManager.profile.firstName} ${vaultManager.profile.lastName}`
      : vaultManager?.username || 'Unknown';

    // ============================================================================
    // STEP 4.5: Calculate Cash on Premises (Machines & Cashiers)
    // ============================================================================
    // A. Check if can close (BR-01) - needed for the button state
    const activeCashierShifts = await CashierShiftModel.countDocuments({
      vaultShiftId: activeShift._id,
      status: { $in: ['active', 'pending_review', 'pending_start'] }
    });
    
    // B. All Active Cashier Floats sum
    const activeCashiersData = await CashierShiftModel.find({
        locationId,
        status: { $in: ['active', 'pending_review'] }
    }, { currentBalance: 1 }).lean();
    const totalCashierFloats = activeCashiersData.reduce((sum: number, s: any) => sum + (s.currentBalance || 0), 0);

    // 2. Machine Money In (Drops) - Use Today's Gaming Day
    const locationInfo = await GamingLocations.findOne({ _id: locationId }, { gameDayOffset: 1 }).lean();
    const gameDayOffset = (locationInfo as any)?.gameDayOffset ?? 8;
    const gamingDayRange = getGamingDayRangeForPeriod('Today', gameDayOffset);

    // Get all machine IDs for this location
    const machines = await Machine.find({ gamingLocation: locationId }, { _id: 1 }).lean();
    const machineIds = machines.map(m => String(m._id));

    const machineMeters = await Meters.aggregate([
        {
          $match: {
            machine: { $in: machineIds },
            readAt: {
              $gte: gamingDayRange.rangeStart,
              $lte: gamingDayRange.rangeEnd,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalMoneyIn: { $sum: '$movement.drop' },
          },
        },
    ]);
    const totalMachineMoneyIn = machineMeters.length > 0 ? machineMeters[0].totalMoneyIn : 0;

    const vaultBalanceVal = lastTransaction?.vaultBalanceAfter ?? activeShift.openingBalance;

    // Check if collection is done
    const isCollectionDone = await VaultCollectionSession.exists({
      vaultShiftId: activeShift._id,
      status: 'completed'
    });

    // ============================================================================
    // STEP 5: Construct and return response
    // ============================================================================
    const response: VaultBalance & { 
        totalCashOnPremises: number;
        machineMoneyIn: number;
        cashierFloats: number;
        isCollectionDone: boolean;
    } = {
      balance: vaultBalanceVal,
      // Prefer currentDenominations if set, otherwise fallback to opening
      denominations:
        activeShift.currentDenominations &&
        activeShift.currentDenominations.length > 0
          ? activeShift.currentDenominations
          : activeShift.openingDenominations,
      activeShiftId: activeShift._id,
      lastReconciliation: lastReconTime || undefined,
      lastAudit: lastAuditTime ? lastAuditTime.toISOString() : 'Never',
      managerOnDuty: managerName,
      canClose: activeCashierShifts === 0,
      blockReason: activeCashierShifts > 0 
        ? `Cannot close vault while ${activeCashierShifts} cashier shift(s) are still Active or Pending Review.` 
        : undefined,
      // Premise metrics
      totalCashOnPremises: vaultBalanceVal + totalCashierFloats + totalMachineMoneyIn,
      machineMoneyIn: totalMachineMoneyIn,
      cashierFloats: totalCashierFloats,
      openingBalance: activeShift.openingBalance,
      isReconciled: activeShift.isReconciled || false,
      isCollectionDone: !!isCollectionDone
    };

    return NextResponse.json({ success: true, data: response });
  } catch (error) {
    console.error('Error fetching vault balance:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
