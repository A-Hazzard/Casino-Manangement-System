/**
 * Vault Transfers Page
 *
 * Transfers page for the Vault Management application.
 * This page will display and manage vault transfers.
 *
 * Features:
 * - Transfer history
 * - Create new transfers
 * - Transfer approvals
 *
 * @module app/vault/management/transfers/page
 */
'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import VaultUnauthorized from '@/components/VAULT/VaultUnauthorized';
import VaultTransfersPageContent from '@/components/VAULT/transfers/VaultTransfersPageContent';
import { hasVaultAccess } from '@/lib/utils/vault/authorization';
import { useUserStore } from '@/lib/store/userStore';

/**
 * Vault Transfers Page Content Wrapper
 * Handles authorization check and renders appropriate content
 */
function VaultTransfersPageContentWrapper() {
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
  return <VaultTransfersPageContent />;
}

/**
 * Vault Transfers Page
 * Wrapper component with authentication and error handling
 */
export default function VaultTransfersPage() {
  return (
    <ProtectedRoute>
      <VaultTransfersPageContentWrapper />
    </ProtectedRoute>
  );
}
