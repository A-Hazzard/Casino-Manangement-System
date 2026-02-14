/**
 * Vault Activity Log Page
 *
 * Displays comprehensive activity log for vault operations with filtering capabilities.
 *
 * @module app/vault/management/activity-log/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultActivityLogPageContent from '@/components/VAULT/activity/VaultActivityLogPageContent';

export default function VaultActivityLogPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <VaultActivityLogPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
