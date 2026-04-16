/**
 * Vault Shift Close API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
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

export async function POST(request: NextRequest) {
  return withApiAuth(request, async ({ user: payload, userRoles }) => {
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

      const { vaultShiftId, closingBalance, denominations } =
        await request.json();
      if (!vaultShiftId || closingBalance === undefined || !denominations)
        return NextResponse.json(
          { success: false, error: 'Missing fields' },
          { status: 400 }
        );

      const validation = validateDenominations(denominations);
      if (!validation.valid)
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid denominations',
            details: validation.errors,
          },
          { status: 400 }
        );

      const vaultShift = await VaultShiftModel.findOne({ _id: vaultShiftId });
      if (!vaultShift)
        return NextResponse.json(
          { success: false, error: 'Vault shift not found' },
          { status: 404 }
        );
      if (vaultShift.status === 'closed')
        return NextResponse.json(
          { success: false, error: 'Shift already closed' },
          { status: 400 }
        );
      if (!vaultShift.isReconciled)
        return NextResponse.json(
          { success: false, error: 'Must reconcile before closing' },
          { status: 400 }
        );

      const cashierShifts = await CashierShiftModel.find({ vaultShiftId });
      const closeVal = canCloseVaultShift(cashierShifts.map(s => s.toObject()));
      if (!closeVal.canClose)
        return NextResponse.json(
          {
            success: false,
            error: closeVal.reason,
            active: closeVal.activeCashiers,
            pending: closeVal.pendingReviewCashiers,
          },
          { status: 400 }
        );

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

      return NextResponse.json({
        success: true,
        vaultShift: vaultShift.toObject(),
        transaction: transaction.toObject(),
      });
    } catch (e: unknown) {
      console.error('[Vault Close] Error:', e);
      const message = e instanceof Error ? e.message : 'Unknown error';
      return NextResponse.json(
        { success: false, error: message },
        { status: 500 }
      );
    }
  });
}
