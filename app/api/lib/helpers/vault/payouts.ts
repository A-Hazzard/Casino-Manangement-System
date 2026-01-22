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
import type {
  PayoutDocument,
  UpdatePayoutRequest,
} from '@/app/api/lib/types/vault';

/**
 * Get payout by ID
 * @param id - Payout ID
 * @returns Payout document or null
 */
export async function getPayoutById(
  id: string
): Promise<PayoutDocument | null> {
  const payout = await CashDeskPayout.findOne({ _id: id }).lean();
  return payout as unknown as PayoutDocument | null;
}

/**
 * Update payout
 * @param id - Payout ID
 * @param updateData - Update data
 * @returns Updated payout document or null
 */
export async function updatePayout(
  id: string,
  updateData: UpdatePayoutRequest
): Promise<PayoutDocument | null> {
  const updated = await CashDeskPayout.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        ...updateData,
        updatedAt: new Date(),
      },
    },
    { new: true }
  ).lean();

  return updated as unknown as PayoutDocument | null;
}

/**
 * Transform payout for API response
 * @param payout - Payout document
 * @returns Transformed payout object
 */
export function transformPayoutForResponse(
  payout: PayoutDocument
): Record<string, unknown> {
  return {
    _id: payout._id,
    cashierId: payout.cashierId,
    cashierName: payout.cashierName,
    amount: payout.amount,
    shiftId: payout.shiftId,
    locationId: payout.locationId,
    status: payout.status,
    notes: payout.notes,
    createdAt: payout.createdAt,
    updatedAt: payout.updatedAt,
  };
}
