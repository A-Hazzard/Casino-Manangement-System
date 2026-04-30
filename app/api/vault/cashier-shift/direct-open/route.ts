/**
 * Vault Manager Direct Cashier Shift Open API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import {
  updateDenominationInventory,
  validateDenominations,
} from '@/lib/helpers/vault/calculations';
import {
  validateVaultBalance,
  validateVaultDenominations,
} from '@/lib/helpers/vault/validation';
import { generateMongoId } from '@/lib/utils/id';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vault/cashier-shift/direct-open
 *
 * @body {string} locationId - ID of the location (REQUIRED)
 * @body {string} cashierId - ID of the cashier to open shift for (REQUIRED)
 * @body {number} amount - Opening float amount (REQUIRED)
 * @body {Array} denominations - Denomination breakdown (REQUIRED)
 * @body {string} notes - Transaction notes
 */
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

      const { locationId, cashierId, amount, denominations, notes } =
        await request.json();
      if (!locationId || !cashierId || amount === undefined || !denominations)
        return NextResponse.json(
          { success: false, error: 'Missing fields' },
          { status: 400 }
        );

      const validation = validateDenominations(denominations);
      if (!validation.valid || validation.total !== amount)
        return NextResponse.json(
          {
            success: false,
            error: `Denomination mismatch: $${validation.total} vs $${amount}`,
          },
          { status: 400 }
        );

      const vaultShift = await VaultShiftModel.findOne({
        locationId,
        status: 'active',
      });
      if (!vaultShift)
        return NextResponse.json(
          { success: false, error: 'No active vault shift' },
          { status: 400 }
        );
      if (!vaultShift.isReconciled)
        return NextResponse.json(
          { success: false, error: 'Vault not reconciled' },
          { status: 403 }
        );

      const currentBalance =
        vaultShift.closingBalance !== undefined
          ? vaultShift.closingBalance
          : vaultShift.openingBalance;
      if (!validateVaultBalance(amount, currentBalance).valid)
        return NextResponse.json(
          { success: false, error: 'Insufficient funds' },
          { status: 400 }
        );
      if (
        !validateVaultDenominations(
          denominations,
          vaultShift.currentDenominations || []
        ).valid
      )
        return NextResponse.json(
          { success: false, error: 'Insufficient denominations in vault' },
          { status: 400 }
        );

      if (
        await CashierShiftModel.findOne({
          cashierId,
          status: { $in: ['active', 'pending_start', 'pending_review'] },
        })
      ) {
        return NextResponse.json(
          { success: false, error: 'Cashier already has active/pending shift' },
          { status: 409 }
        );
      }

      const shiftId = await generateMongoId(),
        reqId = await generateMongoId(),
        txId = await generateMongoId(),
        now = new Date();
      const cashierShift = await CashierShiftModel.create({
        _id: shiftId,
        locationId,
        cashierId,
        vaultShiftId: vaultShift._id,
        status: 'active',
        openedAt: now,
        openingBalance: amount,
        openingDenominations: denominations,
        currentBalance: amount,
        lastSyncedDenominations: denominations,
        payoutsTotal: 0,
        payoutsCount: 0,
        floatAdjustmentsTotal: 0,
        createdAt: now,
        updatedAt: now,
      });

      await FloatRequestModel.create({
        _id: reqId,
        locationId,
        cashierId,
        cashierShiftId: shiftId,
        vaultShiftId: vaultShift._id,
        type: 'increase',
        requestedAmount: amount,
        requestedDenominations: denominations,
        approvedAmount: amount,
        approvedDenominations: denominations,
        requestNotes: notes || 'Direct shift open',
        vmNotes: 'Direct open approval',
        requestedAt: now,
        processedBy: payload._id,
        processedAt: now,
        status: 'approved',
        transactionId: txId,
        createdAt: now,
        updatedAt: now,
      });

      vaultShift.closingBalance = currentBalance - amount;
      vaultShift.currentDenominations = updateDenominationInventory(
        vaultShift.currentDenominations || [],
        denominations,
        'subtract'
      );
      vaultShift.canClose = false;
      await vaultShift.save();

      await VaultTransactionModel.create({
        _id: txId,
        locationId,
        timestamp: now,
        type: 'cashier_shift_open',
        from: { type: 'vault' },
        to: { type: 'cashier', id: cashierId },
        amount,
        denominations,
        vaultBalanceBefore: currentBalance,
        vaultBalanceAfter: vaultShift.closingBalance,
        vaultShiftId: vaultShift._id,
        cashierShiftId: shiftId,
        performedBy: payload._id,
        notes: notes || 'Direct shift open',
        createdAt: now,
      });

      await logActivity({
        userId: payload._id,
        username: payload.username as string,
        action: 'create',
        details: `Directly opened cashier shift for ${cashierId} ($${amount})`,
        metadata: { resourceId: shiftId, locationId, cashierId },
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Shift opened',
          shift: cashierShift.toObject(),
        },
        { status: 201 }
      );
    } catch (e) {
      console.error('[Cashier Direct Open] Error:', e instanceof Error ? e.message : 'Unknown error');
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
  });
}
