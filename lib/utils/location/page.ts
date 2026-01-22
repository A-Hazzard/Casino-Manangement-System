/**
 * Locations Page Utilities
 *
 * Utility functions for filtering and sorting locations on the locations page.
 *
 * Features:
 * - Location filtering by SMIB status
 * - Location sorting
 * - Pagination utilities
 */

import type { AggregatedLocation } from '@/lib/types/location';

// ============================================================================
// Filtering Functions
// ============================================================================
/**
 * Helper function to check if a location has missing coordinates
 */
export function hasMissingCoordinates(location: AggregatedLocation): boolean {
  const geoCoords = location.geoCoords;
  if (!geoCoords) return true;

  // Check if latitude or longitude is missing
  const hasLatitude =
    geoCoords.latitude !== undefined && geoCoords.latitude !== null;
  const hasLongitude =
    geoCoords.longitude !== undefined && geoCoords.longitude !== null;

  // Also check for the typo variant (longtitude)
  const hasLongtitude =
    (geoCoords as { longtitude?: number }).longtitude !== undefined &&
    (geoCoords as { longtitude?: number }).longtitude !== null;

  // Location has missing coords if neither longitude nor longtitude is present, or latitude is missing
  return !hasLatitude || (!hasLongitude && !hasLongtitude);
}


