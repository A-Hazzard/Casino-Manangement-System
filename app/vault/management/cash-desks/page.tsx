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

function VaultCashDesksPageContent() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Cash Desks</h1>
        <p className="mt-2 text-gray-600">
          This page will be implemented in a future update.
        </p>
      </div>
    </div>
  );
}

export default function VaultCashDesksPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <VaultCashDesksPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
