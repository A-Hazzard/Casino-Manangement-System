/**
 * Get Vault Balance API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import { Meters } from '@/app/api/lib/models/meters';
import UserModel from '@/app/api/lib/models/user';
import { VaultCollectionSession } from '@/app/api/lib/models/vault-collection-session';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import { getGamingDayRangeForPeriod } from '@/lib/utils/gamingDayRange';
import type { VaultShift, VaultReconciliation } from '@/shared/types/vault';
import { NextRequest, NextResponse } from 'next/server';
import { isShiftStaleBackend } from '../../lib/helpers/vault/gamingDay';
import { GamingLocations } from '../../lib/models/gaminglocations';

/**
 * Main GET handler for fetching vault balance
 *
 * @param {string} locationId - ID of the location to fetch balance for (REQUIRED)
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ userRoles }) => {
    try {
      const hasVaultAccess = userRoles
        .map(r => String(r).toLowerCase())
        .some(role =>
          ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
        );
      if (!hasVaultAccess)
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );

      const { searchParams } = new URL(request.url);
      const locationId = searchParams.get('locationId');
      if (!locationId)
        return NextResponse.json(
          { success: false, error: 'locationId is required' },
          { status: 400 }
        );

      const activeShift = (await VaultShiftModel.findOne({
        locationId,
        status: 'active',
      }).lean()) as unknown as VaultShift | null;

      if (!activeShift) {
        const lastClosed = (await VaultShiftModel.findOne({
          locationId,
          status: 'closed',
        })
          .sort({ closedAt: -1 })
          .lean()) as unknown as VaultShift | null;
        const lastReconTime = lastClosed?.reconciliations?.length
          ? new Date(
              Math.max(
                ...lastClosed.reconciliations.map(r => {
                  const ts = (r as VaultReconciliation).timestamp;
                  return ts ? new Date(ts).getTime() : 0;
                })
              )
            )
          : null;
        const lastAuditTime = lastClosed?.closedAt
          ? lastReconTime && lastReconTime > lastClosed.closedAt
            ? lastReconTime
            : lastClosed.closedAt
          : lastReconTime || null;

        return NextResponse.json({
          success: true,
          data: {
            balance: lastClosed?.closingBalance ?? 0,
            denominations: lastClosed?.closingDenominations ?? [],
            activeShiftId: undefined,
            lastReconciliation: lastReconTime || undefined,
            lastAudit: lastAuditTime ? lastAuditTime.toISOString() : 'Never',
            canClose: false,
            isInitial: !lastClosed,
            managerOnDuty: 'None',
          },
        });
      }

      const lastReconTime =
        activeShift.reconciliations && activeShift.reconciliations.length > 0
          ? new Date(
              Math.max(
                ...activeShift.reconciliations.map(r =>
                  new Date(r.timestamp ?? 0).getTime()
                )
              )
            )
          : null;
      const lastAuditTime = activeShift.openedAt
        ? lastReconTime && lastReconTime > activeShift.openedAt
          ? lastReconTime
          : activeShift.openedAt
        : lastReconTime || null;

      const vaultManager = (await UserModel.findOne(
        { _id: activeShift.vaultManagerId },
        { profile: 1, username: 1 }
      ).lean()) as unknown as {
        profile?: { firstName?: string; lastName?: string };
        username?: string;
      } | null;
      const managerName = vaultManager?.profile?.firstName
        ? `${vaultManager.profile.firstName} ${vaultManager.profile.lastName}`
        : vaultManager?.username || 'Unknown';

      const activeCashierShifts = await CashierShiftModel.countDocuments({
        vaultShiftId: activeShift._id,
        status: { $in: ['active', 'pending_review', 'pending_start'] },
      });
      const activeCashiersData = (await CashierShiftModel.find(
        { locationId, status: { $in: ['active', 'pending_review'] } },
        { currentBalance: 1 }
      ).lean()) as unknown as Array<{ currentBalance?: number }>;
      const totalCashierFloats = activeCashiersData.reduce(
        (sum, s) => sum + (s.currentBalance || 0),
        0
      );

      const locationInfo = (await GamingLocations.findOne(
        { _id: locationId },
        { gameDayOffset: 1 }
      ).lean()) as unknown as { gameDayOffset?: number } | null;
      const { rangeStart, rangeEnd } = getGamingDayRangeForPeriod(
        'Today',
        locationInfo?.gameDayOffset ?? 8
      );

      const machineMeters = await Meters.aggregate([
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
      ]);
      const totalMachineMoneyIn =
        machineMeters.length > 0 ? machineMeters[0].totalMoneyIn : 0;

      const isCollectionDone = await VaultCollectionSession.exists({
        vaultShiftId: activeShift._id,
        status: 'completed',
        isEndOfDay: true,
      });

      const vaultBalanceVal =
        activeShift.closingBalance ?? activeShift.openingBalance ?? 0;

      return NextResponse.json({
        success: true,
        data: {
          balance: vaultBalanceVal,
          denominations: activeShift.currentDenominations?.length
            ? activeShift.currentDenominations
            : activeShift.openingDenominations,
          activeShiftId: activeShift._id,
          lastReconciliation: lastReconTime || undefined,
          lastAudit: lastAuditTime ? lastAuditTime.toISOString() : 'Never',
          managerOnDuty: managerName,
          canClose: activeCashierShifts === 0,
          blockReason:
            activeCashierShifts > 0
              ? `Still active: ${activeCashierShifts} cashier shifts`
              : undefined,
          totalCashOnPremises:
            vaultBalanceVal + totalCashierFloats + totalMachineMoneyIn,
          machineMoneyIn: totalMachineMoneyIn,
          cashierFloats: totalCashierFloats,
          openingBalance: activeShift.openingBalance,
          isReconciled: !!activeShift.isReconciled,
          isCollectionDone: !!isCollectionDone,
          openedAt: activeShift.openedAt,
          isStale: await isShiftStaleBackend(activeShift.openedAt!, locationId),
        },
      });
    } catch (error: unknown) {
      console.error('[Vault Balance] Error:', error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
