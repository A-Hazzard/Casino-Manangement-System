/**
 * Vault Cash Desks Page
 *
 * Cash desks page for the Vault Management application.
 * This page will display and manage cash desks.
 *
 * Features:
 * - Cash desk management
 * - Cash desk status
 * - Cash desk history
 *
 * @module app/vault/management/cash-desks/page
 */
'use client';

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import VaultUnauthorized from '@/components/VAULT/VaultUnauthorized';
import { hasVaultAccess } from '@/lib/utils/vault/authorization';
import { useUserStore } from '@/lib/store/userStore';

/**
 * Vault Cash Desks Page Content
 * Handles authorization check and renders appropriate content
 */
function VaultCashDesksPageContent() {
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
  // Render - Placeholder
  // ============================================================================
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Cash Desks</h1>
        <p className="mt-2 text-gray-600">
          This page will be implemented in a future update.
        </p>
      </div>
    </div>
  );
}

/**
 * Vault Cash Desks Page
 * Wrapper component with authentication and error handling
 */
export default function VaultCashDesksPage() {
  return (
    <ProtectedRoute>
      <VaultCashDesksPageContent />
    </ProtectedRoute>
  );
}
