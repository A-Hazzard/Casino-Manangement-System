/**
 * Vault Event Handler Helpers
 *
 * Event handlers for float actions, cash operations, expenses, reconciliation,
 * shift resolution, and transaction approvals.
 *
 * Features:
 * - Approve/deny float requests
 * - Confirm float requests (final receipt)
 * - Add/remove cash from vault
 * - Record expenses
 * - Reconcile vault balance
 * - Resolve cashier shifts
 * - Approve/reject float transactions
 *
 * @module lib/helpers/vault/vaultEventHandlers
 */

import type { Denomination } from '@/shared/types/vault';

// ============================================================================
// Float Request Actions
// ============================================================================

/**
 * Approve a float request
 */
export async function handleFloatAction(
  requestId: string,
  status: 'approved' | 'denied' | 'edited',
  data?: {
    approvedAmount?: number;
    approvedDenominations?: Denomination[];
    vmNotes?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/float-request/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        status,
        ...data,
      }),
    });

    const result = await response.json();
    return {
      success: result.success,
      error: result.error || 'Failed to process float request',
    };
  } catch (error) {
    console.error('[handleFloatAction] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Confirm a float request (final receipt)
 */
export async function handleFloatConfirm(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/float-request/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId }),
    });

    const result = await response.json();
    return {
      success: result.success,
      error: result.error || 'Failed to confirm float request',
    };
  } catch (error) {
    console.error('[handleFloatConfirm] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'An error occurred' };
  }
}

// ============================================================================
// Cash Operations
// ============================================================================

/**
 * Handle add cash operation
 */
export async function handleAddCash(data: {
  source: string;
  breakdown: {
    hundred: number;
    fifty: number;
    twenty: number;
    ten: number;
    five: number;
    one: number;
  };
  totalAmount: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const denominations = [
      { denomination: 100, quantity: data.breakdown.hundred },
      { denomination: 50, quantity: data.breakdown.fifty },
      { denomination: 20, quantity: data.breakdown.twenty },
      { denomination: 10, quantity: data.breakdown.ten },
      { denomination: 5, quantity: data.breakdown.five },
      { denomination: 1, quantity: data.breakdown.one },
    ].filter(denomination => denomination.quantity > 0);

    const response = await fetch('/api/vault/add-cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: data.source,
        amount: data.totalAmount,
        denominations,
        notes: data.notes,
      }),
    });

    const resData = await response.json();
    return {
      success: resData.success,
      error: resData.error || 'Failed to add cash',
    };
  } catch (error) {
    console.error('[handleAddCash] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Handle remove cash operation
 */
export async function handleRemoveCash(data: {
  destination: string;
  breakdown: {
    hundred: number;
    fifty: number;
    twenty: number;
    ten: number;
    five: number;
    one: number;
  };
  totalAmount: number;
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const denominations = [
      { denomination: 100, quantity: data.breakdown.hundred },
      { denomination: 50, quantity: data.breakdown.fifty },
      { denomination: 20, quantity: data.breakdown.twenty },
      { denomination: 10, quantity: data.breakdown.ten },
      { denomination: 5, quantity: data.breakdown.five },
      { denomination: 1, quantity: data.breakdown.one },
    ].filter(denomination => denomination.quantity > 0);

    const response = await fetch('/api/vault/remove-cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: data.destination,
        amount: data.totalAmount,
        denominations,
        notes: data.notes,
      }),
    });

    const resData = await response.json();
    return {
      success: resData.success,
      error: resData.error || 'Failed to remove cash',
    };
  } catch (error) {
    console.error('[handleRemoveCash] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Handle record expense operation
 */
export async function handleRecordExpense(data: {
  category: string;
  amount: number;
  description: string;
  date: Date;
  denominations?: Denomination[];
  file?: File;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('category', data.category);
    formData.append('amount', data.amount.toString());
    formData.append('description', data.description);
    formData.append('date', data.date.toISOString());

    if (data.denominations && data.denominations.length > 0) {
      formData.append('denominations', JSON.stringify(data.denominations));
    }

    if (data.file) {
      formData.append('file', data.file);
    }

    const response = await fetch('/api/vault/expense', {
      method: 'POST',
      body: formData,
    });

    const resData = await response.json();
    return {
      success: resData.success,
      error: resData.error || 'Failed to record expense',
    };
  } catch (error) {
    console.error('[handleRecordExpense] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'An error occurred' };
  }
}

// ============================================================================
// Reconciliation & Shift Resolution
// ============================================================================

/**
 * Handle vault reconcile operation
 */
export async function handleReconcile(
  data: {
    newBalance: number;
    denominations: Denomination[];
    reason: string;
    comment: string;
  },
  vaultShiftId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!vaultShiftId) {
      return { success: false, error: 'No active vault shift found' };
    }

    const response = await fetch('/api/vault/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vaultShiftId,
        newBalance: data.newBalance,
        denominations: data.denominations,
        reason: data.reason,
        comment: data.comment,
      }),
    });

    const resData = await response.json();
    return {
      success: resData.success,
      error: resData.error || 'Failed to reconcile',
    };
  } catch (error) {
    console.error('[handleReconcile] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Handle shift resolution
 */
export async function handleShiftResolve(
  shiftId: string,
  finalBalance: number,
  auditComment: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/cashier/shift/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shiftId,
        finalBalance,
        auditComment,
      }),
    });

    const resData = await response.json();
    return {
      success: resData.success,
      error: resData.error || 'Failed to resolve shift',
    };
  } catch (error) {
    console.error('[handleShiftResolve] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'An error occurred' };
  }
}

// ============================================================================
// Float Transaction Approval
// ============================================================================

/**
 * Handle approve float transaction
 */
export async function handleApproveFloatTransaction(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/transactions/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, approved: true }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to approve transaction',
    };
  } catch (error) {
    console.error('[handleApproveFloatTransaction] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'An error occurred' };
  }
}

/**
 * Handle reject float transaction
 */
export async function handleRejectFloatTransaction(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/transactions/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId, approved: false }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to reject transaction',
    };
  } catch (error) {
    console.error('[handleRejectFloatTransaction] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'An error occurred' };
  }
}