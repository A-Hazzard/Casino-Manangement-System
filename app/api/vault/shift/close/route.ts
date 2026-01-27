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

import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import {
  canCloseVaultShift,
  validateDenominations,
} from '@/lib/helpers/vault/calculations';
import type { CloseVaultShiftRequest } from '@/shared/types/vault';
import { nanoid } from 'nanoid';
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

    const userId = userPayload.userId;
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

    if (denominationValidation.total !== closingBalance) {
      return NextResponse.json(
        {
          success: false,
          error: `Denomination total ($${denominationValidation.total}) does not match closing balance ($${closingBalance})`,
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
    vaultShift.status = 'closed';
    vaultShift.closedAt = now;
    vaultShift.closingBalance = closingBalance;
    vaultShift.closingDenominations = denominations;
    vaultShift.updatedAt = now;
    await vaultShift.save();

    // STEP 8: Create transaction record
    const transactionId = nanoid();
    const transaction = await VaultTransactionModel.create({
      _id: transactionId,
      locationId: vaultShift.locationId,
      timestamp: now,
      type: 'vault_close',
      from: { type: 'vault' },
      to: { type: 'external' },
      amount: closingBalance,
      denominations,
      vaultBalanceBefore: closingBalance,
      vaultBalanceAfter: 0,
      vaultShiftId,
      performedBy: userId,
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
  } catch (error) {
    console.error('Error closing vault shift:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
