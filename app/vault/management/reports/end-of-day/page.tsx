/**
 * Vault End-of-Day Reports Page
 *
 * End-of-Day Reports page for the Vault Management application.
 * This page displays end-of-day closing reports.
 *
 * Features:
 * - Generate report functionality
 * - Daily activity summary
 * - Closing balances and counts
 * - Export and print capabilities
 *
 * @module app/vault/management/reports/end-of-day/page
 */
'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import VaultUnauthorized from '@/components/VAULT/VaultUnauthorized';
import VaultEndOfDayReportsPageContent from '@/components/VAULT/reports/end-of-day/VaultEndOfDayReportsPageContent';
import { hasVaultAccess } from '@/lib/utils/vault/authorization';
import { useUserStore } from '@/lib/store/userStore';

/**
 * Vault End-of-Day Reports Page Content Wrapper
 * Handles authorization check and renders appropriate content
 */
function VaultEndOfDayReportsPageContentWrapper() {
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
  return <VaultEndOfDayReportsPageContent />;
}

/**
 * Vault End-of-Day Reports Page
 * Wrapper component with authentication and error handling
 */
export default function VaultEndOfDayReportsPage() {
  return (
    <ProtectedRoute>
      <VaultEndOfDayReportsPageContentWrapper />
    </ProtectedRoute>
  );
}
