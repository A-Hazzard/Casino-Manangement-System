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

import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
import VaultCashOnPremisesPageContent from '@/components/VAULT/reports/cash-on-premises/VaultCashOnPremisesPageContent';

export default function VaultCashOnPremisesPage() {
  return (
    <ProtectedRoute requiredPage="vault-management">
      <PageErrorBoundary>
        <VaultCashOnPremisesPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
