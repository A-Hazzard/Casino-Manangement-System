/**
 * Cashier Payouts Page
 *
 * Payouts page for the Cashier interface in the Vault Management application.
 * This page displays player payout management for cashiers.
 *
 * Features:
 * - Player payout processing
 * - Payout history
 * - Payout verification
 *
 * @module app/vault/cashier/payouts/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultPayoutsPageContent from '@/components/VAULT/cashier/payouts/VaultPayoutsPageContent';

export default function CashierPayoutsPage() {
  return (
    <ProtectedRoute requiredPage="vault-cashier">
      <PageErrorBoundary>
        <VaultPayoutsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
