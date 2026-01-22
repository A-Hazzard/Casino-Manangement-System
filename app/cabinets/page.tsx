/**
 * Cabinets Page
 * Main entry point for the cabinets management section.
 *
 * This page provides tools for managing cabinets/machines, tracking movement requests,
 * and system firmware updates. It delegates core logic to CabinetsPageContent.
 *
 * @module app/cabinets/page
 */

export const dynamic = 'force-dynamic';

import CabinetsCabinetTableSkeleton from '@/components/CMS/cabinets/CabinetsCabinetTableSkeleton';
import CabinetsPageContent from '@/components/CMS/cabinets/CabinetsPageContent';
import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import { Suspense } from 'react';

export default function CabinetsPage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <Suspense fallback={<CabinetsCabinetTableSkeleton />}>
        <CabinetsPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}