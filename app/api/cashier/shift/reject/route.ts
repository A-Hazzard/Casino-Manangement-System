/**
 * POST /api/cashier/shift/reject
 *
 * Allows a Vault Manager to reject a cashier shift that is awaiting review
 * ('pending_review'). Called when the VM determines the cashier's physical count
 * is unacceptable and the cashier should recount and resubmit. Reverts the shift
 * to 'active' status so the cashier can submit a new closing count. The VM's
 * rejection reason is stored on the shift but is not revealed to the cashier as
 * a discrepancy amount.
 *
 * Body fields:
 * @param shiftId {string} Required. The ID of the 'pending_review' cashier shift to reject.
 * @param reason  {string} Optional. The VM's explanation for the rejection; stored on the
 *   shift for audit purposes.
 *
 * @module app/api/cashier/shift/reject/route
 */
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import {
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/cashier/shift/reject';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const vaultManagerId = userPayload._id as string;

      // ============================================================================
      // STEP 1: Authorization check
      // ============================================================================
      const hasVMAccess = userRoles.some(role =>
        ['developer', 'admin', 'manager', 'vault-manager'].includes(
          role.toLowerCase()
        )
      );
      if (!hasVMAccess) {
        logRouteError(
          functionName,
          'POST',
          '/api/cashier/shift/reject',
          'Insufficient permissions',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 2: Parse and validate request body
      // ============================================================================
      const body = await request.json();
      const { shiftId, reason = '' } = body;

      if (!shiftId) {
        logRouteError(
          functionName,
          'POST',
          '/api/cashier/shift/reject',
          'Missing required field: shiftId',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Missing required field: shiftId' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Get cashier shift
      // ============================================================================
      const cashierShift = await CashierShiftModel.findOne({ _id: shiftId });

      if (!cashierShift) {
        logRouteError(
          functionName,
          'POST',
          '/api/cashier/shift/reject',
          'Cashier shift not found',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Cashier shift not found' },
          { status: 404 }
        );
      }

      if (cashierShift.status !== 'pending_review') {
        logRouteError(
          functionName,
          'POST',
          '/api/cashier/shift/reject',
          `Shift is not pending review (status: ${cashierShift.status})`,
          user
        );
        return NextResponse.json(
          {
            success: false,
            error: `Shift is not pending review (status: ${cashierShift.status})`,
          },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 4: Revert to Active
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

      // ============================================================================
      // STEP 5: Audit Activity
      // ============================================================================
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
          status: 'active',
        },
      });

      const duration = Date.now() - startTime;
      if (duration > 1000) console.warn(`[${functionName}] slow: ${duration}ms`);
      logRouteUpdate(
        functionName,
        'POST',
        '/api/cashier/shift/reject',
        1,
        user,
        duration
      );

      // ============================================================================
      // STEP 6: Update Vault Shift canClose status
      // ============================================================================
      await updateVaultCanClose(cashierShift.vaultShiftId);

      return NextResponse.json({
        success: true,
        message: 'Shift closure request rejected. Shift is now active again.',
        shift: cashierShift,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Internal server error';
      logRouteError(
        functionName,
        'POST',
        '/api/cashier/shift/reject',
        errorMessage,
        user
      );
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}

/**
 * Helper: Update vault shift canClose status based on cashier shifts
 */
async function updateVaultCanClose(vaultShiftId: string) {
  const cashierShifts = await CashierShiftModel.find({ vaultShiftId });

  const hasActiveOrPending = cashierShifts.some(
    shift => shift.status === 'active' || shift.status === 'pending_review'
  );

  const vaultUpdateResult = await VaultShiftModel.updateOne(
    { _id: vaultShiftId },
    { canClose: !hasActiveOrPending }
  );
  if (vaultUpdateResult.modifiedCount === 0) {
    console.warn(
      `[updateVaultCanClose] Vault shift ${vaultShiftId} not found or not modified`
    );
  }
}
