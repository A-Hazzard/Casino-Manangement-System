/**
 * Cashier Shifts Page
 *
 * Shifts page for the Cashier interface in the Vault Management application.
 * This page will display and manage cashier shifts.
 *
 * Features:
 * - Shift history
 * - Shift management
 * - Shift reporting
 *
 * @module app/vault/cashier/shifts/page
 */
'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import { hasCashierAccess } from '@/lib/utils/vault/authorization';
import { useUserStore } from '@/lib/store/userStore';
import VaultUnauthorized from '@/components/VAULT/VaultUnauthorized';
import PageLayout from '@/components/shared/layout/PageLayout';

/**
 * Cashier Shifts Page Content
 * Handles authorization check and renders appropriate content
 */
function CashierShiftsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { user } = useUserStore();

  // ============================================================================
  // Authorization Check
  // ============================================================================
  // Check if user has cashier access
  if (!hasCashierAccess(user?.roles)) {
    return <VaultUnauthorized />;
  }

  // ============================================================================
  // Render - Placeholder
  // ============================================================================
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

/**
 * Cashier Shifts Page
 * Wrapper component with authentication and error handling
 */
export default function CashierShiftsPage() {
  return (
    <ProtectedRoute>
      <CashierShiftsPageContent />
    </ProtectedRoute>
  );
}
