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

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultEndOfDayReportsPageContent from '@/components/VAULT/reports/end-of-day/VaultEndOfDayReportsPageContent';

export default function VaultEndOfDayReportsPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <VaultEndOfDayReportsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
