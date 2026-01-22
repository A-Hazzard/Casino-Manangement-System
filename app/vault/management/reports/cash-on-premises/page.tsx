/**
 * Vault Cash on Premises Page
 *
 * Cash on Premises report page for the Vault Management application.
 * This page displays total cash across all locations.
 *
 * Features:
 * - Total cash on premises tracking
 * - Location breakdown
 * - Summary statistics
 *
 * @module app/vault/management/reports/cash-on-premises/page
 */
'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import VaultUnauthorized from '@/components/VAULT/VaultUnauthorized';
import VaultCashOnPremisesPageContent from '@/components/VAULT/reports/cash-on-premises/VaultCashOnPremisesPageContent';
import { hasVaultAccess } from '@/lib/utils/vault/authorization';
import { useUserStore } from '@/lib/store/userStore';

/**
 * Vault Cash on Premises Page Content Wrapper
 * Handles authorization check and renders appropriate content
 */
function VaultCashOnPremisesPageContentWrapper() {
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
  return <VaultCashOnPremisesPageContent />;
}

/**
 * Vault Cash on Premises Page
 * Wrapper component with authentication and error handling
 */
export default function VaultCashOnPremisesPage() {
  return (
    <ProtectedRoute>
      <VaultCashOnPremisesPageContentWrapper />
    </ProtectedRoute>
  );
}
