/**
 * Vault Float Management Page
 *
 * Float management page for the Vault Management application.
 * This page will display and manage cash desk floats.
 *
 * Features:
 * - Float management
 * - Float adjustments
 * - Float history
 *
 * @module app/vault/management/floats/page
 */
'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import VaultUnauthorized from '@/components/VAULT/VaultUnauthorized';
import VaultFloatTransactionsPageContent from '@/components/VAULT/floats/VaultFloatTransactionsPageContent';
import { hasVaultAccess } from '@/lib/utils/vault/authorization';
import { useUserStore } from '@/lib/store/userStore';

/**
 * Vault Float Management Page Content Wrapper
 * Handles authorization check and renders appropriate content
 */
function VaultFloatManagementPageContentWrapper() {
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
  return <VaultFloatTransactionsPageContent />;
}

/**
 * Vault Float Management Page
 * Wrapper component with authentication and error handling
 */
export default function VaultFloatManagementPage() {
  return (
    <ProtectedRoute>
      <VaultFloatManagementPageContentWrapper />
    </ProtectedRoute>
  );
}
