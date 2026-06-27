/**
 * Vault Cashier Operations Helpers
 *
 * Cashier creation, deletion, status management, password reset,
 * direct shift opening, and float issue/receive operations.
 *
 * Features:
 * - Create cashier with auto-generated passwords
 * - Delete cashier accounts
 * - Enable/disable cashier accounts
 * - Reset cashier passwords
 * - Direct open cashier shifts (skip request workflow)
 * - Issue float to cashier
 * - Receive float from cashier
 *
 * @module lib/helpers/vault/vaultCashierOps
 */

import { generateTempPassword } from '@/lib/helpers/vault/vaultCalculationHelpers';
import type { Denomination } from '@/shared/types/vault';

// ============================================================================
// Create Cashier
// ============================================================================

/**
 * Handle create cashier operation
 */
export async function handleCreateCashier(cashierData: {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  assignedLicencees?: string[];
  assignedLocations?: string[];
}): Promise<{ success: boolean; error?: string; tempPassword?: string }> {
  let data;
  let tempPassword = '';
  try {
    tempPassword = cashierData.password || generateTempPassword();

    const firstName = cashierData.firstName;
    const lastName = cashierData.lastName;
    const username = cashierData.username;

    const response = await fetch('/api/users', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username,
        emailAddress: cashierData.email,
        password: tempPassword,
        tempPassword: tempPassword,
        roles: ['cashier'],
        profile: {
          firstName,
          lastName,
        },
        assignedLicencees: cashierData.assignedLicencees || [],
        assignedLocations: cashierData.assignedLocations || [],
        isEnabled: true,
      }),
    });

    data = await response.json();
  } catch (error) {
    console.error('[handleCreateCashier] Error:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      error: 'An error occurred while creating cashier',
    };
  }

  return {
    success: data.success,
    error: data.error || data.message || 'Failed to create cashier',
    tempPassword: data.success ? tempPassword : undefined,
  };
}

// ============================================================================
// Delete Cashier
// ============================================================================

/**
 * Handle delete cashier operation
 */
export async function handleDeleteCashier(
  cashierId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ _id: cashierId }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || data.message || 'Failed to delete cashier',
    };
  } catch (error) {
    console.error('[handleDeleteCashier] Error:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      error: 'An error occurred while deleting cashier',
    };
  }
}

// ============================================================================
// Update Cashier Status
// ============================================================================

/**
 * Handle update cashier status operation (Enable/Disable)
 */
export async function handleUpdateCashierStatus(
  cashierId: string,
  isEnabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/users/${cashierId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isEnabled }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || data.message || 'Failed to update cashier status',
    };
  } catch (error) {
    console.error('[handleUpdateCashierStatus] Error:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      error: 'An error occurred while updating cashier status',
    };
  }
}

// ============================================================================
// Reset Cashier Password
// ============================================================================

/**
 * Handle reset cashier password operation
 */
export async function handleResetCashierPassword(
  cashierId: string
): Promise<{ success: boolean; error?: string; tempPassword?: string }> {
  try {
    const response = await fetch('/api/admin/cashiers/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cashierId }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to reset password',
      tempPassword: data.tempPassword,
    };
  } catch (error) {
    console.error('[handleResetCashierPassword] Error:', error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      error: 'An error occurred while resetting password',
    };
  }
}

// ============================================================================
// Direct Open Shift
// ============================================================================

/**
 * Direct open cashier shift (Skip request workflow)
 */
export async function handleDirectOpenShift(data: {
  locationId: string;
  cashierId: string;
  amount: number;
  denominations: Denomination[];
  notes?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/cashier-shift/direct-open', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    return {
      success: result.success,
      error: result.error || 'Failed to open cashier shift',
    };
  } catch (error) {
    console.error('[handleDirectOpenShift] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'An error occurred' };
  }
}

// ============================================================================
// Issue Float
// ============================================================================

/**
 * Handle issue float operation
 */
export async function handleIssueFloat(
  cashierId: string,
  amount: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/float-increase', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cashierId,
        amount,
        notes,
      }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to issue float',
    };
  } catch (error) {
    console.error('[handleIssueFloat] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'An error occurred' };
  }
}

// ============================================================================
// Receive Float
// ============================================================================

/**
 * Handle receive float operation
 */
export async function handleReceiveFloat(
  cashierId: string,
  amount: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/vault/float-decrease', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cashierId,
        amount,
        notes,
      }),
    });

    const data = await response.json();
    return {
      success: data.success,
      error: data.error || 'Failed to receive float',
    };
  } catch (error) {
    console.error('[handleReceiveFloat] Error:', error instanceof Error ? error.message : 'Unknown error');
    return { success: false, error: 'An error occurred' };
  }
}
