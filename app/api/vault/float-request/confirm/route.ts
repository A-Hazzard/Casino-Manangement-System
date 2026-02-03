/**
 * Vault Float Request Confirmation API
 * 
 * POST /api/vault/float-request/confirm
 * 
 * Allows a Cashier to confirm receipt of cash after a Vault Manager has approved their float request.
 * This finalizes the transaction, updates the ledger, and activates/adjusts the shift.
 * 
 * @module app/api/vault/float-request/confirm/route
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users/users';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { updateDenominationInventory } from '@/lib/helpers/vault/calculations';
import { nanoid } from 'nanoid';
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '../../../lib/middleware/db';

export async function POST(request: NextRequest) {
  try {
    // STEP 1: Authentication
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userId = userPayload._id as string;
    const username = userPayload.username as string;

    // STEP 2: Parse request
    const body = await request.json();
    const { requestId } = body;

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: 'Missing requestId' },
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

    // SECURITY: Ensure correct party is confirming
    const isVM = ((userPayload.roles as string[]) || []).some(r => ['admin', 'manager', 'vault-manager'].includes(r.toLowerCase()));
    
    const canConfirm = (
      (floatRequest.type === 'decrease' && isVM) || 
      (floatRequest.type === 'increase' && floatRequest.cashierId === userId) ||
      (!floatRequest.type && floatRequest.cashierId === userId) || // initial float is increase
      ((userPayload.roles as string[]) || []).includes('admin')
    );

    if (!canConfirm) {
      return NextResponse.json(
        { success: false, error: 'You are not authorized to confirm this request' },
        { status: 403 }
      );
    }

    if (floatRequest.status !== 'approved_vm') {
      return NextResponse.json(
        { success: false, error: `Request cannot be confirmed in current status: ${floatRequest.status}` },
        { status: 400 }
      );
    }

    const now = new Date();
    const finalAmount = floatRequest.approvedAmount;
    const finalDenominations = floatRequest.approvedDenominations;

    // STEP 4: Fetch Entities
    const vaultShift = await VaultShiftModel.findOne({ _id: floatRequest.vaultShiftId });
    const cashierShift = await CashierShiftModel.findOne({ _id: floatRequest.cashierShiftId });

    if (!vaultShift || !cashierShift) {
      return NextResponse.json(
        { success: false, error: 'Associated shifts not found' },
        { status: 404 }
      );
    }

    const currentVaultBalance = vaultShift.closingBalance !== undefined ? vaultShift.closingBalance : vaultShift.openingBalance;

    // STEP 5: LEDGER UPDATES (Moving cash)
    let transactionType = 'float_increase';
    const isIncrease = floatRequest.type === 'increase' || !floatRequest.type; // initial shift is technically an increase

    // A. Update Cashier Shift
    if (cashierShift.status === 'pending_start') {
      cashierShift.status = 'active';
      cashierShift.openedAt = now;
      cashierShift.openingBalance = finalAmount;
      cashierShift.openingDenominations = finalDenominations;
      cashierShift.currentBalance = finalAmount;
      cashierShift.lastSyncedDenominations = finalDenominations;
      transactionType = 'cashier_shift_open';
      
      await VaultShiftModel.updateOne(
          { _id: floatRequest.vaultShiftId },
          { canClose: false }
      );
    } else {
      if (floatRequest.type === 'increase') {
          cashierShift.floatAdjustmentsTotal += finalAmount;
          cashierShift.currentBalance += finalAmount;
          transactionType = 'float_increase';
      } else {
          cashierShift.floatAdjustmentsTotal -= finalAmount;
          cashierShift.currentBalance -= finalAmount;
          transactionType = 'float_decrease';
      }
      cashierShift.lastSyncedDenominations = finalDenominations;
    }

    // B. Update Vault Shift
    let vaultBalanceAfter = currentVaultBalance;
    let vaultDenominationsAfter = (vaultShift.currentDenominations?.length > 0)
        ? vaultShift.currentDenominations
        : vaultShift.openingDenominations;

    vaultDenominationsAfter = [...(vaultDenominationsAfter || [])];

    // Outflow from vault if: it's an increase OR cashier_shift_open
    const isOutflow = isIncrease; // Note: floatRequest.type is 'increase' or undefined for open

    if (isOutflow) {
        vaultBalanceAfter = currentVaultBalance - finalAmount;
        vaultDenominationsAfter = updateDenominationInventory(
          vaultDenominationsAfter,
          finalDenominations,
          'subtract'
        );
    } else {
        vaultBalanceAfter = currentVaultBalance + finalAmount;
        vaultDenominationsAfter = updateDenominationInventory(
          vaultDenominationsAfter,
          finalDenominations,
          'add'
        );
    }

    vaultShift.closingBalance = vaultBalanceAfter;
    vaultShift.currentDenominations = vaultDenominationsAfter;

    // C. Create Transaction
    const transactionId = nanoid();
    await VaultTransactionModel.create({
      _id: transactionId,
      locationId: floatRequest.locationId,
      timestamp: now,
      type: transactionType,
      from: isOutflow ? { type: 'vault' } : { type: 'cashier', id: floatRequest.cashierId },
      to: isOutflow ? { type: 'cashier', id: floatRequest.cashierId } : { type: 'vault' },
      amount: finalAmount,
      denominations: finalDenominations,
      vaultBalanceBefore: currentVaultBalance,
      vaultBalanceAfter: vaultBalanceAfter,
      vaultShiftId: floatRequest.vaultShiftId,
      cashierShiftId: cashierShift._id,
      floatRequestId: floatRequest._id,
      performedBy: userId,
      notes: `Confirmed by Cashier. ${floatRequest.vmNotes || ''}`,
      isVoid: false,
      createdAt: now,
    });

    // STEP 6: Finalize Float Request
    floatRequest.status = 'approved';
    floatRequest.transactionId = transactionId;
    if (floatRequest.auditLog) {
      floatRequest.auditLog.push({
        action: 'confirmed',
        performedBy: userId,
        timestamp: now,
        notes: 'Confirmed by cashier'
      });
    }

    // STEP 7: Save All
    await Promise.all([
      cashierShift.save(),
      vaultShift.save(),
      floatRequest.save(),
    ]);

    // Mark notification as actioned
    try {
      const { markNotificationAsActionedByEntity } = await import('@/lib/helpers/vault/notifications');
      await markNotificationAsActionedByEntity(requestId, 'float_request');
    } catch (notifError) {
      console.error('Failed to update notification status:', notifError);
    }

    // AUDIT LOG
    await logActivity({
      userId,
      username,
      action: 'update',
      details: `Confirmed float request receipt: $${finalAmount}`,
      metadata: {
        resource: 'vault',
        resourceId: floatRequest.locationId,
        floatRequestId: requestId,
        transactionId,
        status: 'approved',
      },
    });

    return NextResponse.json({
      success: true,
      floatRequest: floatRequest.toObject(),
      cashierShift: cashierShift.toObject(),
    });

  } catch (error) {
    console.error('Error confirming float request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
