/**
 * Vault Management Page
 *
 * Main entry point for the Vault Management application.
 * Displays vault overview dashboard with balance, cash desks, and transactions.
 *
 * Features:
 * - Vault balance card
 * - Cash desk status
 * - Performance/stats overview
 * - Transaction table
 * - Quick actions (Add Cash, Remove Cash, Record Expense)
 *
 * @module app/vault/management/page
 */

/**
 * Vault Management Page
 *
 * Main entry point for the Vault Management application.
 * Displays vault overview dashboard with balance, cash desks, and transactions.
 *
 * Features:
 * - Vault balance card
 * - Cash desk status
 * - Performance/stats overview
 * - Transaction table
 * - Quick actions (Add Cash, Remove Cash, Record Expense)
 *
 * @module app/vault/management/page
 */
'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import VaultUnauthorized from '@/components/VAULT/VaultUnauthorized';
import VaultOverviewPageContent from '@/components/VAULT/overview/VaultOverviewPageContent';
import { hasVaultAccess } from '@/lib/utils/vault/authorization';
import { useUserStore } from '@/lib/store/userStore';

/**
 * Vault Management Page Content
 * Handles authorization check and renders appropriate content
 */
function VaultManagementPageContent() {
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
  // Render - Vault Overview Dashboard
  // ============================================================================
  return <VaultOverviewPageContent />;
}

/**
 * Vault Management Page
 * Wrapper component with authentication and error handling
 */
export default function VaultManagementPage() {
  return (
    <ProtectedRoute>
      <VaultManagementPageContent />
    </ProtectedRoute>
  );
}
