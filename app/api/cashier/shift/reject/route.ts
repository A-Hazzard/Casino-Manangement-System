/**
 * Cashier Shift Reject API
 *
 * POST /api/cashier/shift/reject
 *
 * Allows a Vault Manager to reject a "pending_review" cashier shift.
 * This puts the shift back into "active" status so the cashier can continue or re-submit.
 *
 * @module app/api/cashier/shift/reject/route
 */
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
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
    const vaultManagerId = userPayload._id as string;
    const userRoles = (userPayload?.roles as string[]) || [];
    const hasVMAccess = userRoles.some(role =>
      ['developer', 'admin', 'manager', 'vault-manager'].includes(
        role.toLowerCase()
      )
    );
    if (!hasVMAccess) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const body = await request.json();
    const { shiftId, reason } = body;

    if (!shiftId || !reason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (shiftId, reason)' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Database connection
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Get cashier shift
    // ============================================================================
    const cashierShift = await CashierShiftModel.findOne({ _id: shiftId });

    if (!cashierShift) {
      return NextResponse.json(
        { success: false, error: 'Cashier shift not found' },
        { status: 404 }
      );
    }

    if (cashierShift.status !== 'pending_review') {
      return NextResponse.json(
        {
          success: false,
          error: `Shift is not pending review (status: ${cashierShift.status})`,
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 5: Revert to Active
    // ============================================================================
    const now = new Date();

    cashierShift.status = 'active';
    cashierShift.vmReviewNotes = reason;
    cashierShift.reviewedBy = vaultManagerId;
    cashierShift.reviewedAt = now;
    cashierShift.updatedAt = now;
    
    // We keep the entered closing data so the cashier can see what they entered vs expected
    // It will be overwritten when they re-submit.

    await cashierShift.save();

    // STEP 6: Audit Activity
    await logActivity({
      userId: vaultManagerId as string,
      username: userPayload.username as string,
      action: 'update',
      details: `Rejected shift review. Reverted to active. Reason: ${reason}`,
      metadata: {
        resource: 'cashier_shift',
        resourceId: shiftId,
        resourceName: 'Cashier Shift',
        vaultShiftId: cashierShift.vaultShiftId,
        reason,
        status: 'active'
      },
    });

    // ============================================================================
    // STEP 7: Update Vault Shift canClose status
    // ============================================================================
    await updateVaultCanClose(cashierShift.vaultShiftId);

    return NextResponse.json({
      success: true,
      message: 'Shift closure request rejected. Shift is now active again.',
      shift: cashierShift,
    });
  } catch (error) {
    console.error('Error rejecting cashier shift review:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
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
