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

import CollectionReportPageContent from '@/components/collectionReport/CollectionReportPageContent';
import CollectionReportTableSkeleton from '@/components/collectionReport/CollectionReportTableSkeleton';
import CollectionReportCardSkeleton from '@/components/collectionReport/CollectionReportCardSkeleton';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Suspense } from 'react';

export default function CollectionReportPage() {
  return (
    <ProtectedRoute requiredPage="collection-report">
      <Suspense
        fallback={
          <div className="flex flex-col flex-1 p-4 md:p-6">
            <div className="hidden lg:block">
              <CollectionReportTableSkeleton />
            </div>
            <div className="lg:hidden">
              <CollectionReportCardSkeleton count={4} />
            </div>
          </div>
        }
      >
        <CollectionReportPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
