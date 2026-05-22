/**
 * Soft Counts Page
 *
 * Page for Vault Managers to record soft count cash removals.
 *
 * @module app/vault/management/soft-counts/page
 */

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import SoftCountsPageContent from '@/components/VAULT/soft-counts/SoftCountsPageContent';

export default function SoftCountsPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <SoftCountsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
