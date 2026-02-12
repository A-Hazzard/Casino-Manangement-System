/**
 * Cashier Shift Close API
 *
 * POST /api/cashier/shift/close
 *
 * Close cashier shift with BLIND CLOSING feature (C-4).
 *
 * CRITICAL SECURITY FEATURE:
 * - Cashier enters physical count WITHOUT seeing expected balance
 * - If match: Close shift successfully
 * - If mismatch: Lock to "pending_review", alert VM, DO NOT show discrepancy to cashier
 *
 * @module app/api/cashier/shift/close/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import {
    calculateExpectedBalance,
    validateDenominations,
} from '@/lib/helpers/vault/calculations';
import type {
    CloseCashierShiftRequest,
    CloseCashierShiftResponse,
} from '@/shared/types/vault';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/cashier/shift/close
 *
 * Close cashier shift with blind closing
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
    const username = userPayload.username as string;
    const userRoles = (userPayload?.roles as string[]) || [];

    const hasCashierAccess = userRoles.some((role: string) =>
      ['developer', 'admin', 'manager', 'cashier'].includes(role.toLowerCase())
    );

    if (!hasCashierAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // STEP 2: Parse and validate request
    const body: CloseCashierShiftRequest = await request.json();
    const { shiftId, physicalCount, denominations } = body;

    if (!shiftId || physicalCount === undefined || !denominations) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Missing required fields: shiftId, physicalCount, denominations',
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

    if (denominationValidation.total !== physicalCount) {
      return NextResponse.json(
        {
          success: false,
          error: `Denomination total ($${denominationValidation.total}) does not match physical count ($${physicalCount})`,
        },
        { status: 400 }
      );
    }

    // STEP 4: Connect to database
    await connectDB();

    // STEP 5: Get cashier shift
    const cashierShift = await CashierShiftModel.findOne({ _id: shiftId });

    if (!cashierShift) {
      return NextResponse.json(
        { success: false, error: 'Cashier shift not found' },
        { status: 404 }
      );
    }

    // Verify this shift belongs to the logged-in cashier
    if (cashierShift.cashierId !== userId) {
      return NextResponse.json(
        { success: false, error: 'You can only close your own shift' },
        { status: 403 }
      );
    }

    if (cashierShift.status !== 'active') {
      return NextResponse.json(
        {
          success: false,
          error: `Shift is already ${cashierShift.status}`,
        },
        { status: 400 }
      );
    }

    // STEP 6: Calculate expected balance
    const expectedBalance = calculateExpectedBalance(
      cashierShift.openingBalance,
      cashierShift.payoutsTotal,
      cashierShift.floatAdjustmentsTotal
    );

    // STEP 7: Compare with cashier's physical count
    const discrepancy = physicalCount - expectedBalance;
    const isMatch = Math.abs(discrepancy) < 0.01; // Allow for floating point precision

    const now = new Date();

    // STEP 8: ALWAYS flag for review (C-4 CRITICAL)
    cashierShift.cashierEnteredBalance = physicalCount;
    cashierShift.cashierEnteredDenominations = denominations;
    cashierShift.expectedClosingBalance = expectedBalance;
    cashierShift.closedAt = now;
    cashierShift.updatedAt = now;
    cashierShift.status = 'pending_review';
    cashierShift.discrepancy = discrepancy;
    cashierShift.discrepancyResolved = false;
    cashierShift.vmReviewNotes = undefined; // Clear any previous rejection notes

    await cashierShift.save();

    // Update vault shift canClose status (cannot close with pending review)
    await updateVaultCanClose(cashierShift.vaultShiftId);

    // Create notification for VM (Phase 4)
    try {
      const { createShiftReviewNotification } = await import('@/lib/helpers/vault/notifications');
      const vaultShift = await VaultShiftModel.findOne({ _id: cashierShift.vaultShiftId });
      if (vaultShift?.vaultManagerId) {
        await createShiftReviewNotification(
          shiftId,
          cashierShift.locationId,
          username, // This is the cashier's username
          userId,   // This is the cashier's user ID
          discrepancy,
          vaultShift.vaultManagerId
        );
      }
    } catch (notifError) {
      console.error('Failed to create shift review notification:', notifError);
    }

    const response: CloseCashierShiftResponse = {
      success: true,
      status: 'pending_review',
      message: isMatch
        ? 'Shift submitted for review. Your count matches the system records. Please wait for manager confirmation.'
        : 'Shift submitted for review. There is a discrepancy in your count. Please wait for manager confirmation.',
    };

    // Audit Activity
    await logActivity({
      userId,
      username,
      action: 'update',
      details: isMatch 
        ? `Closed shift (Matched, await review). Closing Balance: $${physicalCount}`
        : `Closed shift with discrepancy. Physical: $${physicalCount}, Expected: $${expectedBalance}, Diff: $${discrepancy}`,
      metadata: {
        resource: 'cashier_shift',
        resourceId: shiftId,
        resourceName: 'Cashier Shift',
        vaultShiftId: cashierShift.vaultShiftId,
        status: 'pending_review',
        discrepancy,
        isMatch
      },
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error closing cashier shift:', error);
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

/**
 * Helper: Update vault shift canClose status based on cashier shifts
 */
async function updateVaultCanClose(vaultShiftId: string) {
  const cashierShifts = await CashierShiftModel.find({ vaultShiftId });

  const hasActiveOrPending = cashierShifts.some(
    shift => shift.status === 'active' || shift.status === 'pending_review'
  );

  await VaultShiftModel.updateOne(
    { _id: vaultShiftId },
    { canClose: !hasActiveOrPending }
  );
}
