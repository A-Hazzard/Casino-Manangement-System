/**
 * Vault Transactions Page
 *
 * Transactions page for the Vault Management application.
 * This page will display a comprehensive list of all vault transactions.
 *
 * Features:
 * - Transaction history
 * - Filtering and sorting
 * - Export functionality
 *
 * @module app/vault/management/transactions/page
 */
'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import VaultUnauthorized from '@/components/VAULT/VaultUnauthorized';
import VaultTransactionsPageContent from '@/components/VAULT/transactions/VaultTransactionsPageContent';
import { hasVaultAccess } from '@/lib/utils/vault/authorization';
import { useUserStore } from '@/lib/store/userStore';

/**
 * Vault Transactions Page Content Wrapper
 * Handles authorization check and renders appropriate content
 */
function VaultTransactionsPageContentWrapper() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { user } = useUserStore();

  // ============================================================================
  // Authorization Check
  // ============================================================================
  // Check if user has VAULT access
  if (!hasVaultAccess(user?.roles)) {
    return <VaultUnauthorized />;
  }

  // ============================================================================
  // Render
  // ============================================================================
  return <VaultTransactionsPageContent />;
}

/**
 * Vault Transactions Page
 * Wrapper component with authentication and error handling
 */
export default function VaultTransactionsPage() {
  return (
    <ProtectedRoute>
      <VaultTransactionsPageContentWrapper />
    </ProtectedRoute>
  );
}
