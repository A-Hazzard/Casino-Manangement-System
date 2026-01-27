/**
 * Vault Transactions Page
 *
 * Transactions page for the Vault Management application.
 * This page displays a comprehensive list of all vault transactions.
 *
 * Features:
 * - Transaction history
 * - Filtering and sorting
 * - Export functionality
 *
 * @module app/vault/management/transactions/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultTransactionsPageContent from '@/components/VAULT/transactions/VaultTransactionsPageContent';

export default function VaultTransactionsPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <VaultTransactionsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
