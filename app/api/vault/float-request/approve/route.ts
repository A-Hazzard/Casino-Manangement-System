/**
 * Vault Float Request Approval API
 */

import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
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
  return withApiAuth(request, async ({ user: userPayload, userRoles }) => {
    try {
      const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
      const hasVaultAccess = normalizedRoles.some(role =>
        ['developer', 'admin', 'manager', 'vault-manager'].includes(role)
      );
      if (!hasVaultAccess)
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions' },
          { status: 403 }
        );

      const {
        requestId,
        status,
        approvedAmount,
        approvedDenominations,
        vmNotes,
      } = await request.json();
      if (!requestId || !status)
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );

      const floatRequest = await FloatRequestModel.findOne({ _id: requestId });
      if (!floatRequest)
        return NextResponse.json(
          { success: false, error: 'Float request not found' },
          { status: 404 }
        );
      if (floatRequest.status !== 'pending')
        return NextResponse.json(
          { success: false, error: `Invalid status: ${floatRequest.status}` },
          { status: 400 }
        );

      const now = new Date();
      floatRequest.processedBy = userPayload._id;
      floatRequest.processedAt = now;
      floatRequest.vmNotes = vmNotes;
      floatRequest.status = status;
      floatRequest.updatedAt = now;

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
        return NextResponse.json({
          success: true,
          status: 'denied',
          floatRequest: floatRequest.toObject(),
        });
      }

      if (status === 'approved' || status === 'edited') {
        const vaultShift = await VaultShiftModel.findOne({
          _id: floatRequest.vaultShiftId,
        });
        if (!vaultShift)
          return NextResponse.json(
            { success: false, error: 'Vault shift not found' },
            { status: 404 }
          );

        let finalAmount = floatRequest.requestedAmount;
        let finalDenoms = floatRequest.requestedDenominations;

        if (status === 'edited') {
          if (approvedAmount === undefined || !approvedDenominations)
            return NextResponse.json(
              { success: false, error: 'Missing edited data' },
              { status: 400 }
            );
          const val = validateDenominations(approvedDenominations);
          if (!val.valid || val.total !== approvedAmount)
            return NextResponse.json(
              { success: false, error: 'Invalid edited denoms' },
              { status: 400 }
            );
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
          if (!validateVaultBalance(finalAmount, currentVaultBal).valid)
            return NextResponse.json(
              { success: false, error: 'Insufficient vault funds' },
              { status: 400 }
            );
          const vDenoms = vaultShift.currentDenominations?.length
            ? vaultShift.currentDenominations
            : vaultShift.openingDenominations;
          if (!validateVaultDenominations(finalDenoms, vDenoms || []).valid)
            return NextResponse.json(
              { success: false, error: 'Vault missing denominations' },
              { status: 400 }
            );
        }

        await floatRequest.save();

        if (floatRequest.type === 'decrease') {
          const { finalizeFloatRequest } =
            await import('@/app/api/lib/helpers/vault/finalizeFloat');
          const res = await finalizeFloatRequest(
            requestId,
            userPayload._id,
            userPayload.username as string,
            vmNotes || ''
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

        try {
          const VaultNotificationModel = (
            await import('@/app/api/lib/models/vaultNotification')
          ).default;
          await VaultNotificationModel.updateMany(
            { relatedEntityId: requestId, relatedEntityType: 'float_request' },
            { $set: { 'metadata.entityStatus': 'approved_vm' } }
          );
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
        return NextResponse.json({
          success: true,
          status: 'approved_vm',
          floatRequest: floatRequest.toObject(),
        });
      }

      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    } catch (e) {
      console.error('[Float Approve API] Error:', e instanceof Error ? e.message : 'Unknown error');
      return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
  });
}
