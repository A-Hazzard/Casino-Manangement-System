/**
 * Cabinets Page Helper Functions
 *
 * Provides helper functions for managing the cabinets page, including section navigation,
 * URL parameter handling, and cabinet filtering with smart alphabetical and numerical sorting.
 * It handles section changes, search functionality, and location-based filtering.
 *
 * Features:
 * - Manages section navigation (cabinets, movement requests, SMIB firmware, SMIB).
 * - Handles URL parameter updates for section changes.
 * - Filters cabinets by search term and selected location.
 * - Sorts cabinets alphabetically and numerically for proper ordering.
 */

import type { CabinetSection } from '@/lib/constants';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// ============================================================================
// Section Navigation
// ============================================================================

/**
 * Gets the active section from URL search parameters
 *
 * @param searchParams - Current search parameters
 * @returns The active cabinet section
 */
export function getActiveSectionFromURL(
  searchParams: URLSearchParams
): CabinetSection {
  const section = searchParams.get('section');
  if (section === 'movement-requests') return 'movement';
  if (section === 'smib-firmware') return 'firmware';
  if (section === 'smib') return 'smib';
  return 'cabinets';
}

/**
 * Handles section changes with URL updates
 * @param section - The new section to switch to
 * @param searchParams - Current search parameters
 * @param pathname - Current pathname
 * @param router - Next.js router instance
 */
export function handleSectionChange(
  section: CabinetSection,
  searchParams: URLSearchParams,
  pathname: string,
  router: AppRouterInstance
) {
  // Update URL based on section
  const params = new URLSearchParams(searchParams.toString());
  if (section === 'cabinets') {
    params.delete('section'); // Default section, no param needed
  } else if (section === 'movement') {
    params.set('section', 'movement-requests');
  } else if (section === 'firmware') {
    params.set('section', 'smib-firmware');
  } else if (section === 'smib') {
    params.set('section', 'smib');
  }

  const newURL = params.toString()
    ? `${pathname}?${params.toString()}`
    : pathname;
  router.push(newURL, { scroll: false });
}


