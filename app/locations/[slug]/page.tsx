/**
 * Location Details Page
 *
 * This page displays detailed information for a specific gaming location.
 * It acts as a lean wrapper around the LocationsDetailsPageContent component.
 *
 * @module app/locations/[slug]/page
 */

export const dynamic = 'force-dynamic';

import LocationsDetailsPageContent from '@/components/CMS/locations/LocationsDetailsPageContent';
import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import { MachinesOverviewSkeleton } from '@/components/shared/ui/skeletons/ReportsSkeletons';
import { Suspense } from 'react';

export default function LocationPage() {
  return (
    <ProtectedRoute requiredPage="locations">
      <Suspense fallback={<MachinesOverviewSkeleton />}>
        <LocationsDetailsPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
