/**
 * Vault Transfer Operations Helpers
 *
 * Inter-location transfer submission, approval, rejection, and sorting utilities.
 *
 * Features:
 * - Submit new inter-location transfers
 * - Approve/reject pending transfers
 * - Sort transfers by various fields
 *
 * @module lib/helpers/vault/vaultTransfers
 */

import type { Denomination, InterLocationTransfer } from '@/shared/types/vault';
import { sortTransfers } from '@/lib/helpers/vault/vaultCalculationHelpers';

// ============================================================================
// Re-export sortTransfers from calculation helpers
// ============================================================================

export { sortTransfers };

// ============================================================================
// Transfer Submission
// ============================================================================

/**
 * Handle inter-location transfer submission
 */
export async function handleTransferSubmit(
  fromLocation: string,
  toLocation: string,
  amount: number,
  denominations: Denomination[],
  notes?: string
): Promise<{
  success: boolean;
  error?: string;
  transfer?: InterLocationTransfer;
}> {
  try {
    const response = await fetch('/api/vault/transfers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fromLocationId: fromLocation,
        toLocationId: toLocation,
        amount,
        denominations,
        notes,
      }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to submit transfer',
      transfer: data.transfer,
    };
  } catch (error) {
    console.error('[handleTransferSubmit] Error:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      error: 'An error occurred while submitting transfer',
    };
  }
}

// ============================================================================
// Transfer Approval
// ============================================================================

/**
 * Handle approve transfer action
 */
export async function handleApproveTransfer(
  transferId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/transfers/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transferId, approved: true }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to approve transfer',
    };
  } catch (error) {
    console.error('[handleApproveTransfer] Error:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      error: 'An error occurred while approving transfer',
    };
  }
}

// ============================================================================
// Transfer Rejection
// ============================================================================

/**
 * Handle reject transfer action
 */
export async function handleRejectTransfer(
  transferId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/transfers/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transferId, approved: false }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to reject transfer',
    };
  } catch (error) {
    console.error('[handleRejectTransfer] Error:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      error: 'An error occurred while rejecting transfer',
    };
  }
}