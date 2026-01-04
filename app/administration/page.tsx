/**
 * Administration Page
 * Main entry point for the administration section.
 *
 * This page handles management of users, licensees, system activity logs,
 * and user feedback. It delegates core logic to AdministrationPageContent.
 *
 * @module app/administration/page
 */

import AdministrationPageContent from '@/components/administration/AdministrationPageContent';
import { AdministrationUserTableSkeleton } from '@/components/administration/skeletons/AdministrationUserTableSkeleton';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { Suspense } from 'react';

export default function AdministrationPage() {
  return (
    <ProtectedRoute requiredPage="administration">
      <Suspense fallback={<AdministrationUserTableSkeleton />}>
        <AdministrationPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
