/**
 * Collection Report Detail Page
 *
 * This page displays detailed information about a specific collection report.
 * It acts as a lean wrapper around the CollectionReportDetailsPageContent component.
 *
 * @module app/collection-report/report/[reportId]/page
 */

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import CollectionReportDetailsPageContent from '@/components/collectionReport/details/CollectionReportDetailsPageContent';

export default function LocationReportDetailPage() {
  return (
    <ProtectedRoute requiredPage="collection-report">
      <CollectionReportDetailsPageContent />
    </ProtectedRoute>
  );
}
