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

import LocationsPageContent from '@/components/locations/LocationsPageContent';
import PageErrorBoundary from '@/components/ui/errors/PageErrorBoundary';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function LocationsPage() {
  return (
    <ProtectedRoute requiredPage="locations">
      <PageErrorBoundary>
        <LocationsPageContent />
      </PageErrorBoundary>
    </ProtectedRoute>
  );
}
