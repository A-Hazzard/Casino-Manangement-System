/**
 * Location Details Page
 *
 * This page displays detailed information for a specific gaming location.
 * It acts as a lean wrapper around the LocationsDetailsPageContent component.
 *
 * @module app/locations/[slug]/page
 */

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import LocationsDetailsPageContent from '@/components/locations/LocationsDetailsPageContent';
import { Suspense } from 'react';
import { MachinesOverviewSkeleton } from '@/components/ui/skeletons/ReportsSkeletons';

export default function LocationPage() {
  return (
    <ProtectedRoute requiredPage="locations">
      <Suspense fallback={<MachinesOverviewSkeleton />}>
        <LocationsDetailsPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
