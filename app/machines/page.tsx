/**
 * Machines Page
 * Main entry point for the machines management section.
 *
 * This page provides a high-level view of machines, movement requests,
 * and device management. It delegates core logic to MachinesPageContent.
 *
 * @module app/machines/page
 */

import MachinesPageContent from '@/components/machines/MachinesPageContent';
import CabinetsCabinetTableSkeleton from '@/components/cabinets/CabinetsCabinetTableSkeleton';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
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
