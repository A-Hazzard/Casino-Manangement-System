/**
 * Location Utilities
 *
 * Central export point for location map and page utilities.
 *
 * Features:
 * - Location map utilities (center calculation, coordinate handling)
 * - Locations page utilities (coordinate validation, filtering)
 */

// Location map utilities
export { getMapCenterByLicensee } from './map';

// Locations page utilities
export { hasMissingCoordinates } from './page';
