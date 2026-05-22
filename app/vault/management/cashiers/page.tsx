/**
 * Cashier Management Page
 *
 * Page for Vault Managers to manage cashier accounts.
 * Provides interface for creating, viewing, and resetting cashier passwords.
 *
 * @module app/vault/management/cashiers/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import CashierManagementPageContent from '@/components/VAULT/admin/CashierManagementPageContent';

export default function CashierManagementPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <CashierManagementPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
