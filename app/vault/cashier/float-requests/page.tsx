/**
 * Cashier Float Requests Page
 *
 * Float requests page for the Cashier interface in the Vault Management application.
 * This page displays float request management for cashiers.
 *
 * Features:
 * - Pending float requests
 * - Request approval/rejection
 * - Request history
 *
 * @module app/vault/cashier/float-requests/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultFloatRequestsPageContent from '@/components/VAULT/cashier/float-requests/VaultFloatRequestsPageContent';

export default function CashierFloatRequestsPage() {
  return (
    <ProtectedRoute requiredPage="vault-cashier">
      <PageErrorBoundary>
        <VaultFloatRequestsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
