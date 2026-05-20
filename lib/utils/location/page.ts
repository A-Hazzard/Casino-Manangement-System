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
  const iframe = location.googleMapsIframe;
  const mapUrl = location.googleMapsLink;
  
  // 1. Is the iframe missing?
  const isIframeMissing = !iframe || iframe.trim() === '';
  
  // 2. Is the map URL missing?
  const isMapUrlMissing = !mapUrl || mapUrl.trim() === '';
  
  // 3. Are the longitude & latitude together missing?
  const geoCoords = location.geoCoords;
  const hasLatitude =
    geoCoords &&
    geoCoords.latitude !== undefined &&
    geoCoords.latitude !== null &&
    geoCoords.latitude !== 0;
  const hasLongitude =
    geoCoords &&
    ((geoCoords.longitude !== undefined &&
      geoCoords.longitude !== null &&
      geoCoords.longitude !== 0) ||
      ((geoCoords as { longtitude?: number }).longtitude !== undefined &&
        (geoCoords as { longtitude?: number }).longtitude !== null &&
        (geoCoords as { longtitude?: number }).longtitude !== 0));

  // Together they are missing if both are not present/zero
  const areCoordsTogetherMissing = !hasLatitude && !hasLongitude;

  // Missing coordinates means EITHER iframe is missing, OR map url is missing, OR coordinates together are missing
  return isIframeMissing || isMapUrlMissing || areCoordsTogetherMissing;
}
