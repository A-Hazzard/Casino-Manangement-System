/**
 * Cashier Activity Page
 *
 * Page for cashiers to view their historical float requests and payouts.
 *
 * @module app/vault/cashier/activity/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import CashierActivityPageContent from '@/components/VAULT/cashier/activity/CashierActivityPageContent';

export default function CashierActivityPage() {
  return (
    <ProtectedRoute requiredPage="vault-cashier">
      <PageErrorBoundary>
        <CashierActivityPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
