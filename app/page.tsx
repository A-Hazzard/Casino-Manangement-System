/**
 * Dashboard Page
 * Main entry point for the dashboard section.
 *
 * Features:
 * - Protected route access
 * - Centralized state management via DashboardPageContent
 */

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardPageContent from '@/components/dashboard/DashboardPageContent';
import PageErrorBoundary from '@/components/ui/errors/PageErrorBoundary';

/**
 * Dashboard Page Component
 */
export default function DashboardPage() {
  return (
    <ProtectedRoute requiredPage="dashboard">
      <PageErrorBoundary>
        <DashboardPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
