/**
 * Vault Cash Desks Page
 *
 * Cash desks page for the Vault Management application.
 * This page displays and manages cash desks.
 *
 * Features:
 * - Cash desk management
 * - Cash desk status
 * - Cash desk history
 *
 * @module app/vault/management/cash-desks/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultCashDesksPageContent from '@/components/VAULT/cash-desks/VaultCashDesksPageContent';

export default function VaultCashDesksPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <VaultCashDesksPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
