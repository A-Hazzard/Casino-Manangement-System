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
import PageLayout from '@/components/shared/layout/PageLayout';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';

function VaultCashDesksPageContent() {
  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
        <VaultManagerHeader 
          title="Cash Desks" 
          description="Manage and monitor cashier stations" 
        />
        
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 p-8">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">Feature Coming Soon</h2>
            <p className="mt-2 text-gray-600 max-w-md">
              The Cash Desk management interface is currently under development. 
              In the meantime, you can monitor desk balances from the Vault Dashboard.
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
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
