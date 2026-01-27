/**
 * Vault Expenses Page
 *
 * Expenses page for the Vault Management application.
 * This page displays and manages vault expenses.
 *
 * Features:
 * - Expense history
 * - Expense categories
 * - Expense reporting
 *
 * @module app/vault/management/expenses/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';

function VaultExpensesPageContent() {
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

export default function VaultExpensesPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <VaultExpensesPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
