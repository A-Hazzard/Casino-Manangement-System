/**
 * Vault Float Management Page
 *
 * Float management page for the Vault Management application.
 * This page displays and manages cash desk floats.
 *
 * Features:
 * - Float management
 * - Float adjustments
 * - Float history
 *
 * @module app/vault/management/floats/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultFloatTransactionsPageContent from '@/components/VAULT/floats/VaultFloatTransactionsPageContent';

export default function VaultFloatManagementPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <VaultFloatTransactionsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
