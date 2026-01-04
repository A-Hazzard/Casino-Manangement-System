'use client';

import { Suspense } from 'react';

// Components
import ReportsPageContent from '@/components/reports/ReportsPageContent';
import { ReportsPageSkeleton } from '@/components/ui/skeletons/ReportsSkeletons';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

/**
 * Reports Page
 * Main entry point for the reports section with comprehensive analytics and reporting
 *
 * Features:
 * - Multi-tab interface (Locations, Machines, Meters)
 * - Role-based access control and permissions
 * - Real-time data updates and filtering
 * - Responsive design for desktop and mobile
 * - Advanced filtering and export capabilities
 * - Currency conversion for Admin/Developer viewing "All Licensees"
 */
export default function ReportsPage() {
  return (
    <ProtectedRoute requiredPage="reports">
      <Suspense fallback={<ReportsPageSkeleton />}>
        <ReportsPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
