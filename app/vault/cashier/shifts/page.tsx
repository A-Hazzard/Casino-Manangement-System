/**
 * Cashier Shifts Page
 *
 * Shifts page for the Cashier interface in the Vault Management application.
 * This page displays and manages cashier shifts.
 *
 * Features:
 * - Shift history
 * - Shift management
 * - Shift reporting
 *
 * @module app/vault/cashier/shifts/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageLayout from '@/components/shared/layout/PageLayout';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';

function CashierShiftsPageContent() {
  return (
    <PageLayout showHeader={false}>
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Shifts</h1>
          <p className="mt-2 text-gray-600">
            This page will be implemented in a future update.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}

export default function CashierShiftsPage() {
  return (
    <ProtectedRoute requiredPage="vault-cashier">
      <PageErrorBoundary>
        <CashierShiftsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
