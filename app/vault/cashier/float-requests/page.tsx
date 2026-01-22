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
'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import VaultUnauthorized from '@/components/VAULT/VaultUnauthorized';
import VaultFloatRequestsPageContent from '@/components/VAULT/cashier/float-requests/VaultFloatRequestsPageContent';
import { hasCashierAccess } from '@/lib/utils/vault/authorization';
import { useUserStore } from '@/lib/store/userStore';

/**
 * Cashier Float Requests Page Content Wrapper
 * Handles authorization check and renders appropriate content
 */
function CashierFloatRequestsPageContentWrapper() {
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
  // Render
  // ============================================================================
  return <VaultFloatRequestsPageContent />;
}

/**
 * Cashier Float Requests Page
 * Wrapper component with authentication and error handling
 */
export default function CashierFloatRequestsPage() {
  return (
    <ProtectedRoute>
      <CashierFloatRequestsPageContentWrapper />
    </ProtectedRoute>
  );
}
