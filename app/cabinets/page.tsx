/**
 * Cabinets Page
 * Main entry point for the cabinets management section.
 *
 * This page provides tools for managing cabinets/machines, tracking movement requests,
 * and system firmware updates. It delegates core logic to CabinetsPageContent.
 *
 * @module app/cabinets/page
 */

import CabinetsPageContent from '@/components/cabinets/CabinetsPageContent';
import CabinetsCabinetTableSkeleton from '@/components/cabinets/CabinetsCabinetTableSkeleton';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
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
