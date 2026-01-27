/**
 * Vault Float Request Approval API
 *
 * POST /api/vault/float-request/approve
 *
 * Allows a Vault Manager to approve, deny, or edit a cashier's float request.
 * Approving the request creates the cashier shift and the corresponding transaction.
 *
 * @module app/api/vault/float-request/approve/route
 */

import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import { connectDB } from '@/app/api/lib/middleware/db';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { validateDenominations } from '@/lib/helpers/vault/calculations';
import type { ApproveFloatRequest } from '@/shared/types/vault';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/vault/float-request/approve
 *
 * Approve, deny, or edit a float request.
 */
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
    const vmUserId = userPayload.userId;
    const userRoles = (userPayload?.roles as string[]) || [];

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

    // ============================================================================
    // STEP 2: Parse and validate request body
    // ============================================================================
    const body: ApproveFloatRequest = await request.json();
    const {
      floatRequestId,
      status,
      approvedAmount,
      approvedDenominations,
      vmNotes,
    } = body;

    if (!floatRequestId || !status) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: floatRequestId, status',
        },
        { status: 400 }
      );
    }

    if (
      status === 'edited' &&
      (approvedAmount === undefined || !approvedDenominations)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Edited requests require approvedAmount and approvedDenominations',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to DB and find the float request
    // ============================================================================
    await connectDB();
    const floatRequest = await FloatRequestModel.findOne({
      _id: floatRequestId,
    });

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

    // ============================================================================
    // STEP 4: Process based on status
    // ============================================================================
    if (status === 'denied') {
      await floatRequest.save();
      return NextResponse.json({
        success: true,
        floatRequest: floatRequest.toObject(),
      });
    }

    if (status === 'approved' || status === 'edited') {
      const finalAmount =
        status === 'edited' ? approvedAmount! : floatRequest.requestedAmount;
      const finalDenominations =
        status === 'edited'
          ? approvedDenominations!
          : floatRequest.requestedDenominations;

      if (status === 'edited') {
        const validation = validateDenominations(finalDenominations);
        if (!validation.valid || validation.total !== finalAmount) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid edited denominations or amount mismatch.',
            },
            { status: 400 }
          );
        }
        floatRequest.approvedAmount = finalAmount;
        floatRequest.approvedDenominations = finalDenominations;
      }

      // Create Cashier Shift
      const cashierShiftId = nanoid();
      const cashierShift = await CashierShiftModel.create({
        _id: cashierShiftId,
        locationId: floatRequest.locationId,
        cashierId: floatRequest.cashierId,
        vaultShiftId: floatRequest.vaultShiftId,
        status: 'active',
        openedAt: now,
        openingBalance: finalAmount,
        openingDenominations: finalDenominations,
        createdAt: now,
        updatedAt: now,
      });

      // Create Transaction
      const transactionId = nanoid();
      await VaultTransactionModel.create({
        _id: transactionId,
        locationId: floatRequest.locationId,
        timestamp: now,
        type: 'cashier_shift_open',
        from: { type: 'vault' },
        to: { type: 'cashier', id: floatRequest.cashierId },
        amount: finalAmount,
        denominations: finalDenominations,
        vaultShiftId: floatRequest.vaultShiftId,
        cashierShiftId,
        floatRequestId,
        performedBy: vmUserId,
        notes: 'Cashier shift opened',
        isVoid: false,
        createdAt: now,
      });

      floatRequest.transactionId = transactionId;
      await floatRequest.save();

      // Mark vault as having active cashiers
      await VaultShiftModel.updateOne(
        { _id: floatRequest.vaultShiftId },
        { canClose: false }
      );

      return NextResponse.json(
        {
          success: true,
          status: 'approved',
          floatRequest: floatRequest.toObject(),
          cashierShift: cashierShift.toObject(),
        },
        { status: 201 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Invalid status provided' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error approving float request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
