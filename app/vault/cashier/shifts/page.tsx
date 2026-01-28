/**
 * Cashier Shifts Page
 *
 * Shifts page for the Cashier interface in the Vault Management application.
 * This page displays and manages cashier shifts using the CashierDashboardPageContent component.
 *
 * @module app/vault/cashier/shifts/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import CashierDashboardPageContent from '@/components/VAULT/cashier/CashierDashboardPageContent';

export default function CashierShiftsPage() {
  return (
    <ProtectedRoute requiredPage="vault-cashier">
      <PageErrorBoundary>
        <CashierDashboardPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
