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

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { validateDenominations } from '@/lib/helpers/vault/calculations';
import { nanoid } from 'nanoid';
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
      // If it was a shift open request, we should probably close/cancel the pending shift too
      if (floatRequest.cashierShiftId) {
        const shift = await CashierShiftModel.findById(floatRequest.cashierShiftId);
        if (shift && shift.status === 'pending_start') {
           shift.status = 'closed'; // Or deleted? 'closed' effectively kills it.
           shift.closedAt = now;
           shift.notes = 'Shift denied by VM';
           await shift.save();
        }
      }

      await floatRequest.save();
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
      }

      // Handle Linked Cashier Shift
      const cashierShift = await CashierShiftModel.findById(floatRequest.cashierShiftId);
      if (!cashierShift) {
        return NextResponse.json(
            { success: false, error: 'Linked cashier shift not found' },
            { status: 404 }
        );
      }

      let transactionType = 'float_increase';

      if (cashierShift.status === 'pending_start') {
        // === ACTIVATE SHIFT ===
        cashierShift.status = 'active';
        cashierShift.openedAt = now;
        cashierShift.openingBalance = finalAmount;
        cashierShift.openingDenominations = finalDenominations;
        // Reset metrics just in case
        cashierShift.payoutsTotal = 0;
        cashierShift.floatAdjustmentsTotal = 0;
        
        transactionType = 'cashier_shift_open';
        
        // Mark vault as having active cashiers
        await VaultShiftModel.updateOne(
            { _id: floatRequest.vaultShiftId },
            { canClose: false }
        );
      } else if (cashierShift.status === 'active') {
        // === MID-SHIFT ADJUSTMENT ===
        if (floatRequest.type === 'increase') {
            cashierShift.floatAdjustmentsTotal += finalAmount;
        } else {
            cashierShift.floatAdjustmentsTotal -= finalAmount;
        }
        // transactionType stays float_increase/decrease
        transactionType = floatRequest.type === 'increase' ? 'float_increase' : 'float_decrease';
      }

      await cashierShift.save();

      // Create Transaction
      const transactionId = nanoid();
      const isIncrease = floatRequest.type === 'increase';
      
      await VaultTransactionModel.create({
        _id: transactionId,
        locationId: floatRequest.locationId,
        timestamp: now,
        type: transactionType,
        from: isIncrease ? { type: 'vault' } : { type: 'cashier', id: floatRequest.cashierId },
        to: isIncrease ? { type: 'cashier', id: floatRequest.cashierId } : { type: 'vault' },
        amount: finalAmount,
        denominations: finalDenominations,
        vaultShiftId: floatRequest.vaultShiftId,
        cashierShiftId: cashierShift._id,
        floatRequestId: floatRequest._id,
        performedBy: vmUserId,
        notes: vmNotes || (transactionType === 'cashier_shift_open' ? 'Shift opened via float approval' : 'Float adjustment approved'),
        isVoid: false,
        createdAt: now,
      });

      floatRequest.transactionId = transactionId;
      await floatRequest.save();

      return NextResponse.json(
        {
          success: true,
          status: status,
          floatRequest: floatRequest.toObject(),
          cashierShift: cashierShift.toObject(),
        },
        { status: 200 }
      );
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
