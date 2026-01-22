import DashboardPageContent from '@/components/CMS/dashboard/DashboardPageContent';
import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';
export default function DashboardPage() {
  return (
    <ProtectedRoute requiredPage="dashboard">
      <PageErrorBoundary>
        <DashboardPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
