/**
 * Vault Management Page
 *
 * Main entry point for the Vault Management application.
 * Displays vault overview dashboard with balance, cash desks, and transactions.
 *
 * Features:
 * - Vault balance card
 * - Cash desk status
 * - Performance/stats overview
 * - Transaction table
 * - Quick actions (Add Cash, Remove Cash, Record Expense)
 *
 * @module app/vault/management/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultOverviewPageContent from '@/components/VAULT/overview/VaultOverviewPageContent';

export default function VaultManagementPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <VaultOverviewPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
