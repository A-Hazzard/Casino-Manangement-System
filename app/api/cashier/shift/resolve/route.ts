/**
 * POST /api/cashier/shift/resolve
 *
 * Allows a Vault Manager to finalize and close a cashier shift that is awaiting
 * review ('pending_review'). Called after the VM has verified the cashier's
 * physical count; the VM may override the closing balance (e.g. to correct a
 * discrepancy) and must supply an audit comment explaining any adjustment.
 * Closing the shift creates a 'cashier_shift_close' vault transaction returning
 * the confirmed float to the vault, and increments the vault shift's canClose
 * flag if no other shifts remain open.
 *
 * Body fields:
 * @param shiftId       {string}   Required. The ID of the 'pending_review' cashier shift to resolve.
 * @param finalBalance  {number}   Required. The VM-confirmed closing balance (may differ from
 *   cashier's physical count if an override is applied).
 * @param auditComment  {string}   Optional. Mandatory justification when the VM overrides the
 *   balance; stored permanently on the shift for compliance audits.
 * @param denominations {object[]} Optional. VM-adjusted denomination breakdown matching
 *   finalBalance; overwrites the cashier's submitted denominations if provided.
 *
 * @module app/api/cashier/shift/resolve/route
 */
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { generateMongoId } from '@/lib/utils/id';
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
    const { shiftId, finalBalance, auditComment = '', denominations } = body;

    if (!shiftId || finalBalance === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (shiftId, finalBalance)' },
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
    // STEP 5: Resolve and Close Shift
    // ============================================================================
    const now = new Date();

    cashierShift.status = 'closed';
    cashierShift.closingBalance = finalBalance;
    if (denominations && denominations.length > 0) {
      cashierShift.closingDenominations = denominations;
      cashierShift.vmAdjustedDenominations = denominations;
    }
    cashierShift.vmAdjustedBalance = finalBalance;
    cashierShift.vmReviewNotes = auditComment;
    cashierShift.reviewedBy = vaultManagerId;
    cashierShift.reviewedAt = now;
    cashierShift.discrepancyResolved = true;
    cashierShift.updatedAt = now;

    await cashierShift.save();

    // ============================================================================
    // STEP 6: Create Closing Transaction
    // ============================================================================
    // Return the final confirmed float amount to vault
    const transactionId = await generateMongoId();
    await VaultTransactionModel.create({
      _id: transactionId,
      locationId: cashierShift.locationId,
      timestamp: now,
      type: 'cashier_shift_close',
      from: { type: 'cashier', id: cashierShift.cashierId },
      to: { type: 'vault' },
      amount: finalBalance,
      denominations: denominations || [], // Use adjusted denominations if provided
      cashierBalanceBefore: finalBalance,
      cashierBalanceAfter: 0,
      vaultShiftId: cashierShift.vaultShiftId,
      cashierShiftId: shiftId,
      performedBy: vaultManagerId,
      notes: `Shift resolved by VM. Comment: ${auditComment}`,
      isVoid: false,
      createdAt: now,
    });


    
    // STEP 8: Audit Activity
    await logActivity({
      userId: vaultManagerId as string,
      username: userPayload.username as string,
      action: 'update',
      details: `Resolved shift discrepancy. Final Balance: $${finalBalance}. Comment: ${auditComment}`,
      metadata: {
        resource: 'cashier_shift',
        resourceId: shiftId,
        resourceName: 'Cashier Shift',
        transactionId,
        vaultShiftId: cashierShift.vaultShiftId,
        vmAdjustedBalance: finalBalance,
        comment: auditComment,
      },
    });

    // ============================================================================
    // STEP 9: Update Vault Shift canClose status
    // ============================================================================
    await updateVaultCanClose(cashierShift.vaultShiftId);

    return NextResponse.json({
      success: true,
      message: 'Shift resolved and closed successfully',
      shift: cashierShift,
    });
  } catch (error) {
    console.error('Error resolving cashier shift:', error);
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
