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
import VaultExpensesPageContent from '@/components/VAULT/expenses/VaultExpensesPageContent';

export default function VaultExpensesPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <VaultExpensesPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}

