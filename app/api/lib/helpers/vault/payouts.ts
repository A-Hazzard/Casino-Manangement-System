/**
 * Payout Helper Functions
 *
 * This file contains helper functions for payout operations.
 * It supports:
 * - Fetching payouts
 * - Getting payout by ID
 * - Updating payouts
 * - Transforming payout for API response
 *
 * @module app/api/lib/helpers/vault/payouts
 */

import { CashDeskPayout } from '@/app/api/lib/models/cashDeskPayouts';
import { type UpdatePayoutRequest } from '@/shared/types/vault';
import { type PayoutDocument } from '@/shared/types/models';

/**
 * Get payout by ID
 * @param {string} id - Payout ID
 * @returns {Promise<PayoutDocument | null>} Payout document or null
 */
export async function getPayoutById(
  id: string
): Promise<PayoutDocument | null> {
  if (!id) {
    console.error('[getPayoutById] id is required');
    return null;
  }
  return await CashDeskPayout.findOne({ _id: id }).lean<PayoutDocument>();
}

/**
 * Update payout
 * @param {string} id - Payout ID
 * @param {UpdatePayoutRequest} updateData - Update data
 * @returns {Promise<PayoutDocument | null>} Updated payout document or null
 */
export async function updatePayout(
  id: string,
  updateData: UpdatePayoutRequest
): Promise<PayoutDocument | null> {
  if (!id || !updateData) {
    console.error('[updatePayout] id and updateData are required');
    return null;
  }
  const updated = await CashDeskPayout.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        ...updateData,
        updatedAt: new Date(),
      },
    },
    { new: true }
  ).lean<PayoutDocument>();

  return updated;
}

/**
 * Transform payout for API response
 * @param {PayoutDocument} payout - Payout document
 * @returns {Record<string, unknown>} Transformed payout object
 */
export function transformPayoutForResponse(
  payout: PayoutDocument
): Record<string, unknown> {
  if (!payout) {
    console.error('[transformPayoutForResponse] payout is required');
    return {};
  }
  return {
    _id: payout._id,
    cashierId: payout.cashierId,
    cashierName: payout.cashierName,
    amount: payout.amount,
    shiftId: payout.cashierShiftId,
    locationId: payout.locationId,
    status: payout.status,
    notes: payout.notes,
    createdAt: payout.createdAt,
    updatedAt: payout.updatedAt,
  };
}
