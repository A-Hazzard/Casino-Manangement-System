/**
 * Vault Transfers Page
 *
 * Transfers page for the Vault Management application.
 * This page displays and manages vault transfers.
 *
 * Features:
 * - Transfer history
 * - Create new transfers
 * - Transfer approvals
 *
 * @module app/vault/management/transfers/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultTransfersPageContent from '@/components/VAULT/transfers/VaultTransfersPageContent';

export default function VaultTransfersPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <VaultTransfersPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
