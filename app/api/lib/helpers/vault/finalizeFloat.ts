/**
 * Finalize Float Request Helper
 * 
 * Shared logic for finalizing float requests.
 * Updates balances, creates transactions, and manages statuses.
 */

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import CashierShiftModel from '@/app/api/lib/models/cashierShift';
import FloatRequestModel from '@/app/api/lib/models/floatRequest';
import VaultShiftModel from '@/app/api/lib/models/vaultShift';
import VaultTransactionModel from '@/app/api/lib/models/vaultTransaction';
import { updateDenominationInventory } from '@/lib/helpers/vault/calculations';
import { generateMongoId } from '@/lib/utils/id';

export async function finalizeFloatRequest(
  requestId: string,
  userId: string,
  username: string,
  customNotes?: string
) {
  const floatRequest = await FloatRequestModel.findOne({ _id: requestId });
  if (!floatRequest) throw new Error('Float request not found');

  const now = new Date();
  const finalAmount = floatRequest.approvedAmount;
  const finalDenominations = floatRequest.approvedDenominations;

  // Fetch Entities
  const vaultShift = await VaultShiftModel.findOne({ _id: floatRequest.vaultShiftId });
  const cashierShift = await CashierShiftModel.findOne({ _id: floatRequest.cashierShiftId });

  if (!vaultShift || !cashierShift) {
    throw new Error('Associated shifts not found');
  }

  const currentVaultBalance = vaultShift.closingBalance !== undefined ? vaultShift.closingBalance : vaultShift.openingBalance;

  // LEDGER UPDATES (Moving cash)
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
  const isOutflow = isIncrease; 

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
  const transactionId = await generateMongoId();
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
    notes: customNotes || `Workflow finalized. ${floatRequest.vmNotes || ''}`,
    isVoid: false,
    createdAt: now,
  });

  // D. Finalize Float Request
  floatRequest.status = 'approved';
  floatRequest.transactionId = transactionId;
  if (floatRequest.auditLog) {
    floatRequest.auditLog.push({
      action: 'confirmed',
      performedBy: userId,
      timestamp: now,
      notes: customNotes || 'Confirmed and finalized'
    });
  }

  // Save All
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
    details: `Finalized float request receipt: $${finalAmount}`,
    metadata: {
      resource: 'vault',
      resourceId: floatRequest.locationId,
      floatRequestId: requestId,
      transactionId,
      status: 'approved',
    },
  });

  return {
    floatRequest,
    cashierShift
  };
}
