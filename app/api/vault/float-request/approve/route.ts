/**
 * Vault Float Request Approval API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import {
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import { validateDenominations } from '@/lib/helpers/vault/calculations';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main POST handler for approving a float request
 *
 * @body {string} requestId - REQUIRED. ID of the request to approve.
 * @body {string} status - REQUIRED. Target status ('approved' or 'rejected').
 * @body {number} approvedAmount - Amount being approved.
 * @body {Object} approvedDenominations - Denomination breakdown for the approval.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'POST /api/vault/float-request/approve';
  const user = extractUserFromRequest(request);

  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      // ============================================================================
      // STEP 1: Check permissions
      // ============================================================================
      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const hasVaultAccess = normalizedRoles.some(role =>
        ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
      );
      if (!hasVaultAccess) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/float-request/approve',
          'Insufficient permissions',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );
      }

      // ============================================================================
      // STEP 2: Parse request body
      // ============================================================================
      const {
        requestId,
        status,
        approvedAmount,
        approvedDenominations,
        vmNotes,
      } = await request.json();
      if (!requestId || !status) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/float-request/approve',
          'Missing required fields',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      // ============================================================================
      // STEP 3: Validate request existence and status
      // ============================================================================
      const floatRequest = await FloatRequestModel.findOne({ _id: requestId });
      if (!floatRequest) {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/float-request/approve',
          'Float request not found',
          user
        );
        return NextResponse.json(
          { success: false, error: 'Float request not found' },
          { status: 404 }
        );
      }
      if (floatRequest.status !== 'pending') {
        logRouteError(
          functionName,
          'POST',
          '/api/vault/float-request/approve',
          `Invalid status: ${floatRequest.status}`,
          user
        );
        return NextResponse.json(
          { success: false, error: `Invalid status: ${floatRequest.status}` },
          { status: 400 }
        );
      }

      const now = new Date();
      floatRequest.processedBy = userPayload._id;
      floatRequest.processedAt = now;
      floatRequest.vmNotes = vmNotes;
      floatRequest.status = status;
      floatRequest.updatedAt = now;

      // ============================================================================
      // STEP 4: Handle denied status
      // ============================================================================
      if (status === 'denied') {
        if (floatRequest.cashierShiftId) {
          const shift = await CashierShiftModel.findOne({
            _id: floatRequest.cashierShiftId,
          });
          if (shift?.status === 'pending_start') {
            shift.status = 'cancelled';
            shift.closedAt = now;
            shift.notes = `Denied: ${vmNotes || 'No reason'}`;
            await shift.save();
          }
        }
        await floatRequest.save();
        try {
          const { markNotificationAsActionedByEntity } =
            await import('@/lib/helpers/vault/notifications');
          await markNotificationAsActionedByEntity(requestId, 'float_request');
        } catch (e) {
          console.error('Notification fix failed:', e);
        }

        await logActivity({
          userId: userPayload._id,
          username: userPayload.username as string,
          action: 'update',
          details: `Denied float ${requestId}`,
          metadata: {
            resource: 'vault',
            resourceId: floatRequest.locationId,
            floatRequestId: requestId,
          },
        });
        const duration = Date.now() - startTime;
        logRouteUpdate(
          functionName,
          'POST',
          '/api/vault/float-request/approve',
          1,
          user,
          duration
        );
        return NextResponse.json({
          success: true,
          status: 'denied',
          floatRequest: floatRequest.toObject(),
        });
      }

      // ============================================================================
      // STEP 5: Validate vault shift
      // ============================================================================
      if (status === 'approved' || status === 'edited') {
        const vaultShift = await VaultShiftModel.findOne({
          _id: floatRequest.vaultShiftId,
        });
        if (!vaultShift) {
          logRouteError(
            functionName,
            'POST',
            '/api/vault/float-request/approve',
            'Vault shift not found',
            user
          );
          return NextResponse.json(
            { success: false, error: 'Vault shift not found' },
            { status: 404 }
          );
        }

        let finalAmount = floatRequest.requestedAmount;
        let finalDenoms = floatRequest.requestedDenominations;

        // ============================================================================
        // STEP 6: Process approved or edited status
        // ============================================================================
        if (status === 'edited') {
          if (approvedAmount === undefined || !approvedDenominations) {
            logRouteError(
              functionName,
              'POST',
              '/api/vault/float-request/approve',
              'Missing edited data',
              user
            );
            return NextResponse.json(
              { success: false, error: 'Missing edited data' },
              { status: 400 }
            );
          }
          const val = validateDenominations(approvedDenominations);
          if (!val.valid || val.total !== approvedAmount) {
            logRouteError(
              functionName,
              'POST',
              '/api/vault/float-request/approve',
              'Invalid edited denoms',
              user
            );
            return NextResponse.json(
              { success: false, error: 'Invalid edited denoms' },
              { status: 400 }
            );
          }
          finalAmount = approvedAmount;
          finalDenoms = approvedDenominations;
          floatRequest.approvedAmount = finalAmount;
          floatRequest.approvedDenominations = finalDenoms;
        } else {
          floatRequest.approvedAmount = floatRequest.requestedAmount;
          floatRequest.approvedDenominations =
            floatRequest.requestedDenominations;
        }

        const currentVaultBal =
          vaultShift.closingBalance ?? vaultShift.openingBalance;
        if (floatRequest.type === 'increase' || !floatRequest.type) {
          const { validateVaultBalance, validateVaultDenominations } =
            await import('@/lib/helpers/vault/validation');
          if (!validateVaultBalance(finalAmount, currentVaultBal).valid) {
            logRouteError(
              functionName,
              'POST',
              '/api/vault/float-request/approve',
              'Insufficient vault funds',
              user
            );
            return NextResponse.json(
              { success: false, error: 'Insufficient vault funds' },
              { status: 400 }
            );
          }
          const vDenoms = vaultShift.currentDenominations?.length
            ? vaultShift.currentDenominations
            : vaultShift.openingDenominations;
          if (!validateVaultDenominations(finalDenoms, vDenoms || []).valid) {
            logRouteError(
              functionName,
              'POST',
              '/api/vault/float-request/approve',
              'Vault missing denominations',
              user
            );
            return NextResponse.json(
              { success: false, error: 'Vault missing denominations' },
              { status: 400 }
            );
          }
        }

        await floatRequest.save();

        // ============================================================================
        // STEP 7: Handle decrease float type
        // ============================================================================
        if (floatRequest.type === 'decrease') {
          const { finalizeFloatRequest } =
            await import('@/app/api/lib/helpers/vault/finalizeFloat');
          const res = await finalizeFloatRequest(
            requestId,
            userPayload._id,
            userPayload.username as string,
            vmNotes || ''
          );
          const duration = Date.now() - startTime;
          logRouteUpdate(
            functionName,
            'POST',
            '/api/vault/float-request/approve',
            1,
            user,
            duration
          );
          return NextResponse.json({
            success: true,
            status: 'approved',
            floatRequest: res.floatRequest.toObject(),
            cashierShift: res.cashierShift.toObject(),
          });
        }

        floatRequest.status = 'approved_vm';
        floatRequest.auditLog.push({
          action: status,
          performedBy: userPayload._id,
          timestamp: now,
          notes: vmNotes || '',
          metadata: { approvedAmount: finalAmount },
        });
        await floatRequest.save();

        // ============================================================================
        // STEP 8: Log activity and return response
        // ============================================================================
        try {
          const VaultNotificationModel = (
            await import('@/app/api/lib/models/vaultNotification')
          ).default;
          const notifUpdateResult = await VaultNotificationModel.updateMany(
            { relatedEntityId: requestId, relatedEntityType: 'float_request' },
            { $set: { 'metadata.entityStatus': 'approved_vm' } }
          );
          if (notifUpdateResult.modifiedCount === 0) {
            console.warn(
              `[float-request/approve] No notifications updated for requestId: ${requestId}`
            );
          }
        } catch (e) {
          console.error('Notification fix failed:', e);
        }

        await logActivity({
          userId: userPayload._id,
          username: userPayload.username as string,
          action: 'update',
          details: `${status} float $${finalAmount}`,
          metadata: {
            resource: 'vault',
            resourceId: floatRequest.locationId,
            floatRequestId: requestId,
            status: 'approved_vm',
          },
        });
        const duration = Date.now() - startTime;
        logRouteUpdate(
          functionName,
          'POST',
          '/api/vault/float-request/approve',
          1,
          user,
          duration
        );
        return NextResponse.json({
          success: true,
          status: 'approved_vm',
          floatRequest: floatRequest.toObject(),
        });
      }

      logRouteError(
        functionName,
        'POST',
        '/api/vault/float-request/approve',
        'Invalid status',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Failed to approve float request';
      logRouteError(
        functionName,
        'POST',
        '/api/vault/float-request/approve',
        errorMessage,
        user
      );
      console.error(
        '[Float Approve API] Error:',
        e instanceof Error ? e.message : 'Unknown error'
      );
      return NextResponse.json(
        { success: false, error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}
