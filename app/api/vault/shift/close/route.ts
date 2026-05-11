/**
 * Vault Shift Close API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import {
  logRouteUpdate,
  extractUserFromRequest,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { getAttributionDate } from '@/app/api/lib/helpers/vault/gamingDay';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import {
  canCloseVaultShift,
  validateDenominations,
} from '@/lib/helpers/vault/calculations';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for closing a vault shift
 *
 * @body {string} vaultShiftId - REQUIRED. ID of the shift to close.
 * @body {number} closingBalance - REQUIRED. The confirmed closing balance.
 * @body {Object} denominations - REQUIRED. Denomination breakdown of the closing balance.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/shift/close';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: payload, userRoles }) => {
    try {
      const hasVaultAccess = userRoles
        .map(r => String(r).toLowerCase())
        .some(role =>
          ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
        );
      if (!hasVaultAccess) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/shift/close',
          'Insufficient permissions',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      const { vaultShiftId, closingBalance, denominations } =
        await request.json();
      if (!vaultShiftId || closingBalance === undefined || !denominations) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/shift/close',
          'Missing fields',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Missing fields' },
          { status: 400 }
        );
      }

      const validation = validateDenominations(denominations);
      if (!validation.valid) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/shift/close',
          'Invalid denominations',
          user
        );
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid denominations',
            details: validation.errors,
          },
          { status: 400 }
        );
      }

      const vaultShift = await VaultShiftModel.findOne({ _id: vaultShiftId });
      if (!vaultShift) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/shift/close',
          'Vault shift not found',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Vault shift not found' },
          { status: 404 }
        );
      }
      if (vaultShift.status === 'closed') {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/shift/close',
          'Shift already closed',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Shift already closed' },
          { status: 400 }
        );
      }
      if (!vaultShift.isReconciled) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/shift/close',
          'Must reconcile before closing',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Must reconcile before closing' },
          { status: 400 }
        );
      }

      const cashierShifts = await CashierShiftModel.find({ vaultShiftId });
      const closeVal = canCloseVaultShift(cashierShifts.map(s => s.toObject()));
      if (!closeVal.canClose) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/shift/close',
          closeVal.reason || 'Cannot close shift',
          user
        );
        return NextResponse.json(
          {
            success: false,
            error: closeVal.reason,
            active: closeVal.activeCashiers,
            pending: closeVal.pendingReviewCashiers,
          },
          { status: 400 }
        );
      }

      const now = new Date(),
        attrDate = await getAttributionDate(
          vaultShift.openedAt,
          vaultShift.locationId
        );
      const mappedDenoms = denominations.map(
        (d: {
          denomination: number | string;
          count?: number;
          quantity?: number;
        }) => ({
          denomination:
            typeof d.denomination === 'string'
              ? parseInt(d.denomination.replace('$', ''))
              : d.denomination,
          quantity: d.count ?? d.quantity ?? 0,
        })
      );

      vaultShift.status = 'closed';
      vaultShift.closedAt = attrDate;
      vaultShift.closingBalance = closingBalance;
      vaultShift.closingDenominations = mappedDenoms;
      vaultShift.updatedAt = now;
      await vaultShift.save();

      const txId = await generateMongoId();
      const transaction = await VaultTransactionModel.create({
        _id: txId,
        locationId: vaultShift.locationId,
        timestamp: attrDate,
        type: 'vault_close',
        from: { type: 'vault' },
        to: { type: 'external' },
        amount: closingBalance,
        denominations: mappedDenoms,
        vaultBalanceBefore: closingBalance,
        vaultBalanceAfter: 0,
        vaultShiftId,
        performedBy: payload._id,
        performedByName: payload.username,
        notes: 'Vault shift closed',
        isVoid: false,
        createdAt: now,
      });

      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'POST',
        '/api/vault/shift/close',
        1,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        vaultShift: vaultShift.toObject(),
        transaction: transaction.toObject(),
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to close vault shift';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/shift/close',
        errorMessage,
        user
      );
      console.error(
        '[Vault Close] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
