/**
 * Administration Page
 * Main entry point for the administration section.
 *
 * This page handles management of users, licencees, system activity logs,
 * and user feedback. It delegates core logic to AdministrationPageContent.
 *
 * @module app/administration/page
 */

import AdministrationPageContent from '@/components/CMS/administration/AdministrationPageContent';
import { AdministrationUserTableSkeleton } from '@/components/CMS/administration/skeletons/AdministrationUserTableSkeleton';
import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import MaintenanceWrapper from '@/components/shared/maintenance/MaintenanceWrapper';
import { Suspense } from 'react';

export default function AdministrationPage() {
  return (
    <ProtectedRoute requiredPage="administration">
      <MaintenanceWrapper pageKey="administration">
        <Suspense fallback={<AdministrationUserTableSkeleton />}>
          <AdministrationPageContent />
        </Suspense>
      </MaintenanceWrapper>
    </ProtectedRoute>
  );
}

