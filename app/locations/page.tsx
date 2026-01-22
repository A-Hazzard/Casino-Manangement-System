/**
 * Locations Page
 * Main entry point for the gaming locations management section.
 *
 * This page displays a comprehensive list of gaming locations with financial
 * metrics, machine status, and management tools. It delegates core logic
 * to LocationsPageContent.
 *
 * @module app/locations/page
 */

import LocationsPageContent from '@/components/CMS/locations/LocationsPageContent';
import ProtectedRoute from '@/components/shared/auth/ProtectedRoute';
import PageErrorBoundary from '@/components/shared/ui/errors/PageErrorBoundary';

export const dynamic = 'force-dynamic';

export default function LocationsPage() {
  return (
    <ProtectedRoute requiredPage="locations">
      <PageErrorBoundary>
        <LocationsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}

