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
'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import VaultUnauthorized from '@/components/VAULT/VaultUnauthorized';
import VaultPayoutsPageContent from '@/components/VAULT/cashier/payouts/VaultPayoutsPageContent';
import { hasCashierAccess } from '@/lib/utils/vault/authorization';
import { useUserStore } from '@/lib/store/userStore';

/**
 * Cashier Payouts Page Content Wrapper
 * Handles authorization check and renders appropriate content
 */
function CashierPayoutsPageContentWrapper() {
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
  return <VaultPayoutsPageContent />;
}

/**
 * Cashier Payouts Page
 * Wrapper component with authentication and error handling
 */
export default function CashierPayoutsPage() {
  return (
    <ProtectedRoute>
      <CashierPayoutsPageContentWrapper />
    </ProtectedRoute>
  );
}
