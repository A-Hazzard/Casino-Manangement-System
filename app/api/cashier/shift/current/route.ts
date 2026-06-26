/**
 * GET /api/cashier/shift/current
 *
 * Returns the calling cashier's current open or pending shift. Called on every
 * cashier dashboard load to determine session state (no shift, pending approval,
 * active, or pending review). Also returns whether the location has an active
 * reconciled vault shift (needed to enable the shift-open button) and any
 * pending float requests associated with the current shift.
 *
 * No query parameters — shift is resolved entirely from the authenticated user's session.
 *
 * @module app/api/cashier/shift/current/route
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { isShiftStaleBackend } from '@/app/api/lib/helpers/vault/gamingDay';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import { calculateExpectedBalance } from '@/lib/helpers/vault/calculations';
import {
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'GET /api/cashier/shift/current';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload }) => {
    try {
      const userId = userPayload._id as string;

      // ============================================================================
      // STEP 1: Find latest relevant shift
      // ============================================================================
      const shift = await CashierShiftModel.findOne({
        cashierId: userId,
        status: { $in: ['active', 'pending_start', 'pending_review'] },
      }).sort({ createdAt: -1 });

      // ============================================================================
      // STEP 2: Check for active vault shift at user's location
      // ============================================================================
      const locationId = (userPayload.assignedLocations as string[])?.[0];
      let hasActiveVaultShift = false;
      let isVaultReconciled = false;
      if (locationId) {
        const activeVaultShift = await VaultShiftModel.findOne({
          locationId,
          status: 'active',
        });
        hasActiveVaultShift = !!activeVaultShift;
        isVaultReconciled = activeVaultShift?.isReconciled || false;
      }

      if (!shift) {
        return NextResponse.json({
          success: true,
          shift: null,
          hasActiveVaultShift,
          isVaultReconciled,
        });
      }

      // ============================================================================
      // STEP 3: Get current balance tracking
      // ============================================================================
      let currentBalance = 0;
      if (shift.status === 'active') {
        currentBalance =
          shift.currentBalance ||
          calculateExpectedBalance(
            shift.openingBalance,
            shift.payoutsTotal,
            shift.floatAdjustmentsTotal
          );
      }

      // ============================================================================
      // STEP 4: Check for pending float movements (dual-approval flow)
      // ============================================================================
      const pendingVmApproval = await FloatRequestModel.findOne({
        cashierId: userId,
        cashierShiftId: shift._id,
        status: 'approved_vm',
      }).sort({ updatedAt: -1 });

      const pendingRequest = await FloatRequestModel.findOne({
        cashierId: userId,
        cashierShiftId: shift._id,
        status: 'pending',
      }).sort({ createdAt: -1 });

      const duration = Date.now() - startTime;
      if (duration > 1000) console.warn(`[${functionName}] slow: ${duration}ms`);

      return NextResponse.json({
        success: true,
        shift: shift.toObject(),
        currentBalance, // Only relevant for active shifts
        status: shift.status,
        hasActiveVaultShift,
        isVaultReconciled,
        isStale: await isShiftStaleBackend(shift.openedAt, locationId),
        pendingVmApproval: pendingVmApproval
          ? pendingVmApproval.toObject()
          : null,
        pendingRequest: pendingRequest ? pendingRequest.toObject() : null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Internal server error';
      logRouteError(
        functionName,
        'GET',
        '/api/cashier/shift/current',
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
