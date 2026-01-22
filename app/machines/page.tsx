/**
 * Machines Page
 * Main entry point for the machines management section.
 *
 * This page provides a high-level view of machines, movement requests,
 * and device management. It delegates core logic to MachinesPageContent.
 *
 * @module app/machines/page
 */

export const dynamic = 'force-dynamic';

import CabinetsCabinetTableSkeleton from '@/components/CMS/cabinets/CabinetsCabinetTableSkeleton';
import MachinesPageContent from '@/components/CMS/machines/MachinesPageContent';
import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import { Suspense } from 'react';

export default function MachinesPage() {
  return (
    <ProtectedRoute requiredPage="machines">
      <Suspense fallback={<CabinetsCabinetTableSkeleton />}>
        <MachinesPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}

