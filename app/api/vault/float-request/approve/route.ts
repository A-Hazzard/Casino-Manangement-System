/**
 * Vault Float Request Approval API
 * 
 * POST /api/vault/float-request/approve
 * 
 * Allows a Vault Manager to approve, deny, or edit a cashier's float request.
 * - If approving an "Initial Shift" request (pending_start), it activates the shift.
 * - If approving a mid-shift request, it adjusts the float balance.
 * 
 * @module app/api/vault/float-request/approve/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import { validateDenominations } from '@/lib/helpers/vault/calculations';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/middleware/db';

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
    const vmUserId = userPayload._id as string;
    const vmUsername = userPayload.username as string;
    const userRoles = (userPayload.roles as string[]) || [];

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

    // STEP 2: Parse request
    // Note: Adapting to the type definition which uses 'approved' boolean
    // But logically we want 'status' support for 'edited'.
    // We'll accept a broader body structure to support 'edited'.
    const body = await request.json();
    const {
      requestId,
      status, // 'approved' | 'denied' | 'edited'
      approvedAmount,
      approvedDenominations,
      vmNotes,
    } = body;

    if (!requestId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: requestId, status',
        },
        { status: 400 }
      );
    }

    // STEP 3: Connect to DB and find request
    await connectDB();
    const floatRequest = await FloatRequestModel.findOne({ _id: requestId });

    if (!floatRequest) {
      return NextResponse.json(
        { success: false, error: 'Float request not found' },
        { status: 404 }
      );
    }

    if (floatRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: `Request is already ${floatRequest.status}` },
        { status: 400 }
      );
    }

    const now = new Date();
    floatRequest.processedBy = vmUserId;
    floatRequest.processedAt = now;
    floatRequest.vmNotes = vmNotes;
    floatRequest.status = status;
    floatRequest.updatedAt = now;

    // STEP 4: Handle DENY
    if (status === 'denied') {
      const finalNotes = vmNotes || 'Insufficient vault balance';
      floatRequest.vmNotes = finalNotes;
      
      // If it was a shift open request, we should probably close/cancel the pending shift too
      if (floatRequest.cashierShiftId) {
        const shift = await CashierShiftModel.findOne({ _id: floatRequest.cashierShiftId });
        if (shift && shift.status === 'pending_start') {
           shift.status = 'cancelled'; // Use cancelled for denied start requests
           shift.closedAt = now;
           shift.notes = `Shift denied by VM: ${finalNotes}`;
           await shift.save();
        }
      }

      await floatRequest.save(); // Save the denied float request

      // Mark notification as actioned
      try {
        const { markNotificationAsActionedByEntity } = await import('@/lib/helpers/vault/notifications');
        await markNotificationAsActionedByEntity(requestId, 'float_request');
      } catch (notifError) {
        console.error('Failed to update notification status during deny:', notifError);
      }

      // AUDIT DENY
      await logActivity({
        userId: vmUserId,
        username: vmUsername,
        action: 'update',
        details: `Denied float request: ${requestId}`,
        metadata: {
          resource: 'vault',
          resourceId: floatRequest.locationId,
          resourceName: 'Float Request Denied',
          floatRequestId: requestId,
        },
      });

      return NextResponse.json({
        success: true,
        status: 'denied',
        floatRequest: floatRequest.toObject(),
      });
    }

    // STEP 5: Handle APPROVE or EDIT
    if (status === 'approved' || status === 'edited') {
      let finalAmount = floatRequest.requestedAmount;
      let finalDenominations = floatRequest.requestedDenominations;

      // === 1. Fetch Active Vault Shift for Balance Check ===
      const vaultShift = await VaultShiftModel.findOne({ _id: floatRequest.vaultShiftId });
      if (!vaultShift) {
        return NextResponse.json(
          { success: false, error: 'Associated vault shift not found or closed' },
          { status: 404 }
        );
      }
      
      const currentVaultBalance = vaultShift.closingBalance !== undefined ? vaultShift.closingBalance : vaultShift.openingBalance;

      if (status === 'edited') {
        if (approvedAmount === undefined || !approvedDenominations) {
          return NextResponse.json(
            { success: false, error: 'Edited requests require approvedAmount and approvedDenominations' },
            { status: 400 }
          );
        }
        
        const validation = validateDenominations(approvedDenominations);
        if (!validation.valid || validation.total !== approvedAmount) {
           return NextResponse.json(
            { success: false, error: 'Invalid denominations in approval' },
            { status: 400 }
          );
        }

        finalAmount = approvedAmount;
        finalDenominations = approvedDenominations;
        
        floatRequest.approvedAmount = finalAmount;
        floatRequest.approvedDenominations = finalDenominations;
      } else {
        // Simple approval - copy requested to approved
        floatRequest.approvedAmount = floatRequest.requestedAmount;
        floatRequest.approvedDenominations = floatRequest.requestedDenominations;
      }

      // === 2. Validate Vault Balance (if money leaving vault) ===
      const isMoneyLeavingVault = (floatRequest.type === 'increase' || !floatRequest.type); 
      
      if (isMoneyLeavingVault) {
        const { validateVaultDenominations, validateVaultBalance } = await import('@/lib/helpers/vault/validation');
        const balanceCheck = validateVaultBalance(finalAmount, currentVaultBalance);
        if (!balanceCheck.valid) {
          return NextResponse.json(
            { success: false, error: `Insufficient vault funds. Balance: $${currentVaultBalance}, Req: $${finalAmount}` },
            { status: 400 }
          );
        }

        const vaultDenoms = (vaultShift.currentDenominations?.length > 0)
          ? vaultShift.currentDenominations
          : vaultShift.openingDenominations;

        const denomCheck = validateVaultDenominations(finalDenominations, vaultDenoms || []);
        if (!denomCheck.valid) {
          return NextResponse.json(
            { success: false, error: 'Vault does not have the specific denominations requested.', details: denomCheck.insufficientDenominations },
            { status: 400 }
          );
        }
      }

      // SET INTERMEDIATE STATUS
      floatRequest.status = 'approved_vm';

      if (floatRequest.auditLog) {
        floatRequest.auditLog.push({
          action: status === 'approved' ? 'approved' : 'edited',
          performedBy: vmUserId,
          timestamp: now,
          notes: vmNotes || (status === 'approved' ? 'Approved by VM - Awaiting cashier confirmation' : 'Edited by VM - Awaiting cashier confirmation'),
          metadata: { approvedAmount: finalAmount }
        });
      }
      
      await floatRequest.save();

      // AUDIT LOG
      await logActivity({
        userId: vmUserId,
        username: vmUsername,
        action: 'update',
        details: `${status === 'approved' ? 'Approved' : 'Edited'} float request: $${finalAmount}. Awaiting cashier confirmation.`,
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

  } catch (error) {
    console.error('Error approving float request:', error);
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