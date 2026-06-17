/**
 * Dashboard Page
 *
 * Root page wrapper that renders the main dashboard with financial metrics,
 * charts, and key performance indicators. Handles authentication via ProtectedRoute,
 * maintenance mode checks, and error boundary wrapping.
 */

import DashboardPageContent from '@/components/CMS/dashboard/DashboardPageContent';
import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import MaintenanceWrapper from '@/components/shared/maintenance/MaintenanceWrapper';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
export default function DashboardPage() {
  return (
    <ProtectedRoute requiredPage="dashboard">
      <MaintenanceWrapper pageKey="dashboard">
        <PageErrorBoundary>
          <DashboardPageContent />
        </PageErrorBoundary>
      </MaintenanceWrapper>
    </ProtectedRoute>
  );
}
