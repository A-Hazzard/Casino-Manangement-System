/**
 * Collection Report Page
 * Main entry point for the collection report management section.
 *
 * This page provides a comprehensive interface for managing collection reports,
 * including daily, monthly, and schedule-based views. It delegates core logic
 * to CollectionReportPageContent.
 *
 * @module app/collection-report/page
 */

import CollectionReportPageContent from '@/components/CMS/collectionReport/CollectionReportPageContent';
import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import { Suspense } from 'react';

export default function CollectionReportPage() {
  return (
    <ProtectedRoute requiredPage="collection-report">
      <Suspense fallback={null}>
        <CollectionReportPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}

