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
