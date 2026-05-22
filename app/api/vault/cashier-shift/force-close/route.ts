/**
 * Force Close Cashier Shift API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import { calculateExpectedBalance } from '@/lib/helpers/vault/calculations';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vault/collection-session/finalize
 *
 * @body {string} sessionId - ID of the session to finalize (REQUIRED)
 * @body {string} locationId - ID of the location (REQUIRED)
 * @body {string} vaultShiftId - ID of the active vault shift (REQUIRED)
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/cashier-shift/force-close';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: payload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Check permissions
      // ============================================================================
      const hasVMAccess = userRoles
        .map(r => String(r).toLowerCase())
        .some(role =>
          ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
        );
      if (!hasVMAccess) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/cashier-shift/force-close',
          'Insufficient permissions',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 2: Parse request
      // ============================================================================
      const {
        cashierId,
        shiftId,
        locationId,
        denominations,
        physicalCount,
        notes,
      } = await request.json();
      if (
        !locationId ||
        physicalCount === undefined ||
        (!cashierId && !shiftId)
      ) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/cashier-shift/force-close',
          'Missing fields',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Missing fields' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Validate cashier shift
      // ============================================================================
      const activeStatuses = ['active', 'pending_start'];
      const cashierShift = shiftId
        ? await CashierShiftModel.findOne({
            _id: shiftId,
            status: { $in: activeStatuses },
          })
        : await CashierShiftModel.findOne({
            cashierId,
            locationId,
            status: { $in: activeStatuses },
          });
      if (!cashierShift) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/cashier-shift/force-close',
          'No active shift found',
          user
        );
        return NextResponse.json(
          { success: false, error: 'No active shift found' },
          { status: 404 }
        );
      }

      // ============================================================================
      // STEP 4: Close shift and calculate discrepancy
      // ============================================================================
      const expected = calculateExpectedBalance(
        cashierShift.openingBalance,
        cashierShift.payoutsTotal,
        cashierShift.floatAdjustmentsTotal
      );
      const now = new Date(),
        discrepancy = physicalCount - expected;

      cashierShift.status = 'pending_review';
      cashierShift.closedAt = now;
      cashierShift.cashierEnteredBalance = physicalCount;
      cashierShift.cashierEnteredDenominations = denominations;
      cashierShift.expectedClosingBalance = expected;
      cashierShift.discrepancy = discrepancy;
      cashierShift.discrepancyResolved = false;
      cashierShift.vmReviewNotes = `Force closed by VM (${payload.username}). Notes: ${notes || 'No notes'}`;
      cashierShift.updatedAt = now;
      await cashierShift.save();

      // ============================================================================
      // STEP 5: Update vault state and log
      // ============================================================================
      const allShifts = await CashierShiftModel.find({
        vaultShiftId: cashierShift.vaultShiftId,
      });
      const hasBlocking = allShifts.some(
        s => s.status === 'active' || s.status === 'pending_review'
      );
      const vaultCloseResult = await VaultShiftModel.updateOne(
        { _id: cashierShift.vaultShiftId },
        { canClose: !hasBlocking }
      );
      if (vaultCloseResult.modifiedCount === 0) {
        console.warn(
          `[force-close] Vault shift ${cashierShift.vaultShiftId} not found or not modified`
        );
      }

      await logActivity({
        userId: payload._id,
        username: payload.username as string,
        action: 'update',
        details: `Force closed shift for ${cashierId}. Phys: ${physicalCount}, Exp: ${expected}`,
        metadata: { resourceId: cashierShift._id, cashierId, notes },
      });

      // ============================================================================
      // STEP 6: Return response
      // ============================================================================
      const duration = Date.now() - startTime;
      logRouteUpdate(
        functionName,
        'POST',
        '/api/vault/cashier-shift/force-close',
        1,
        user,
        duration
      );

      return NextResponse.json({
        success: true,
        message: 'Shift force closed',
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to force close shift';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/cashier-shift/force-close',
        errorMessage,
        user
      );
      console.error(
        '[Cashier Force Close] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
