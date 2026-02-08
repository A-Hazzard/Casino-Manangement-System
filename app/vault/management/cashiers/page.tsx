/**
 * Cashier Management Page
 *
 * Page for Vault Managers to manage cashier accounts.
 * Provides interface for creating, viewing, and resetting cashier passwords.
 *
 * @module app/vault/management/cashiers/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageLayout from '@/components/shared/layout/PageLayout';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import CashierManagementPanel from '@/components/VAULT/admin/CashierManagementPanel';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';

export default function CashierManagementPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <PageLayout pageTitle="Cashier Management">
          <div className="space-y-6">
            <VaultManagerHeader />

            <CashierManagementPanel />
          </div>
        </PageLayout>
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}