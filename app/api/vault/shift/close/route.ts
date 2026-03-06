/**
 * Vault Shift Close API
 *
 * POST /api/vault/shift/close
 *
 * Close vault manager shift with BR-01 validation.
 * Cannot close if any cashier shifts are active or pending review.
 *
 * @module app/api/vault/shift/close/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { getAttributionDate } from '@/app/api/lib/helpers/vault/gamingDay';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import {
  canCloseVaultShift,
  validateDenominations,
} from '@/lib/helpers/vault/calculations';
import { generateMongoId } from '@/lib/utils/id';
import type { CloseVaultShiftRequest } from '@/shared/types/vault';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vault/shift/close
 *
 * Close vault shift
 */
export async function POST(request: NextRequest) {
  try {
    // STEP 1: Authentication & Authorization
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = userPayload._id as string;
    const userRoles = (userPayload?.roles as string[]) || [];

    const hasVaultAccess = userRoles.some((role: string) =>
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

    // STEP 2: Parse and validate request
    const body: CloseVaultShiftRequest = await request.json();
    const { vaultShiftId, closingBalance, denominations } = body;

    if (!vaultShiftId || closingBalance === undefined || !denominations) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: vaultShiftId, closingBalance, denominations',
        },
        { status: 400 }
      );
    }

    // STEP 3: Validate denominations
    const denominationValidation = validateDenominations(denominations);
    if (!denominationValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid denominations',
          details: denominationValidation.errors,
        },
        { status: 400 }
      );
    }

    // STEP 4: Connect to database
    await connectDB();

    // STEP 5: Get vault shift
    const vaultShift = await VaultShiftModel.findOne({ _id: vaultShiftId });

    if (!vaultShift) {
      return NextResponse.json(
        { success: false, error: 'Vault shift not found' },
        { status: 404 }
      );
    }

    if (vaultShift.status === 'closed') {
      return NextResponse.json(
        { success: false, error: 'Vault shift is already closed' },
        { status: 400 }
      );
    }

    // BR: Ensure vault is reconciled before closing
    if (!vaultShift.isReconciled) {
      return NextResponse.json(
        { success: false, error: 'Vault must be reconciled before closing the shift' },
        { status: 400 }
      );
    }

    // STEP 6: Check BR-01 - Cannot close if cashiers active/pending
    const cashierShifts = await CashierShiftModel.find({ vaultShiftId });
    const closeValidation = canCloseVaultShift(
      cashierShifts.map(s => s.toObject())
    );

    if (!closeValidation.canClose) {
      return NextResponse.json(
        {
          success: false,
          error: closeValidation.reason,
          activeCashiers: closeValidation.activeCashiers,
          pendingReviewCashiers: closeValidation.pendingReviewCashiers,
        },
        { status: 400 }
      );
    }

    // STEP 7: Update vault shift
    const now = new Date();
    const attributionDate = await getAttributionDate(
      vaultShift.openedAt,
      vaultShift.locationId
    );

    vaultShift.status = 'closed';
    vaultShift.closedAt = attributionDate;
    vaultShift.closingBalance = closingBalance;
    interface VaultDenomination {
      denomination: string | number;
      count?: number;
      quantity?: number;
    }
    vaultShift.closingDenominations = denominations.map((d: VaultDenomination) => ({
      denomination: typeof d.denomination === 'string'
        ? parseInt(d.denomination.replace('$', ''))
        : d.denomination,
      quantity: d.count ?? d.quantity ?? 0
    }));
    vaultShift.updatedAt = now;
    await vaultShift.save();

    // STEP 8: Create transaction record
    const transactionId = await generateMongoId();
    const transaction = await VaultTransactionModel.create({
      _id: transactionId,
      locationId: vaultShift.locationId,
      timestamp: attributionDate,
      type: 'vault_close',
      from: { type: 'vault' },
      to: { type: 'external' },
      amount: closingBalance,
      denominations: denominations.map((d: VaultDenomination) => ({
        denomination: typeof d.denomination === 'string'
          ? parseInt(d.denomination.replace('$', ''))
          : d.denomination,
        quantity: d.count ?? d.quantity ?? 0
      })),
      vaultBalanceBefore: closingBalance,
      vaultBalanceAfter: 0,
      vaultShiftId,
      performedBy: userId,
      performedByName: userPayload.username,
      notes: 'Vault shift closed',
      isVoid: false,
      createdAt: now,
    });

    // STEP 9: Return success response
    return NextResponse.json(
      {
        success: true,
        vaultShift: vaultShift.toObject(),
        transaction: transaction.toObject(),
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error closing vault shift:', errorMessage);
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
