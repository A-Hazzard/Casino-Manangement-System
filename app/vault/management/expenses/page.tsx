/**
 * Vault Expenses Page
 *
 * Expenses page for the Vault Management application.
 * This page will display and manage vault expenses.
 *
 * Features:
 * - Expense history
 * - Expense categories
 * - Expense reporting
 *
 * @module app/vault/management/expenses/page
 */
'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import VaultUnauthorized from '@/components/VAULT/VaultUnauthorized';
import { hasVaultAccess } from '@/lib/utils/vault/authorization';
import { useUserStore } from '@/lib/store/userStore';

/**
 * Vault Expenses Page Content
 * Handles authorization check and renders appropriate content
 */
function VaultExpensesPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { user } = useUserStore();

  // ============================================================================
  // Authorization Check
  // ============================================================================
  // Check if user has VAULT access
  if (!hasVaultAccess(user?.roles)) {
    return <VaultUnauthorized />;
  }

  // ============================================================================
  // Render - Placeholder
  // ============================================================================
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
        <p className="mt-2 text-gray-600">
          This page will be implemented in a future update.
        </p>
      </div>
    </div>
  );
}

/**
 * Vault Expenses Page
 * Wrapper component with authentication and error handling
 */
export default function VaultExpensesPage() {
  return (
    <ProtectedRoute>
      <VaultExpensesPageContent />
    </ProtectedRoute>
  );
}
