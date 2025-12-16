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

import React from 'react';
import type { AggregatedLocation } from '@/lib/types/location';
import type { LocationFilter, LocationSortOption } from '@/lib/types/location';

// ============================================================================
// Filtering Functions
// ============================================================================
/**
 * Filter locations based on selected filters
 */
/**
 * Helper function to check if a location has missing coordinates
 */
export function hasMissingCoordinates(location: AggregatedLocation): boolean {
  const geoCoords = location.geoCoords;
  if (!geoCoords) return true;
  
  // Check if latitude or longitude is missing
  const hasLatitude = geoCoords.latitude !== undefined && geoCoords.latitude !== null;
  const hasLongitude = geoCoords.longitude !== undefined && geoCoords.longitude !== null;
  
  // Also check for the typo variant (longtitude)
  const hasLongtitude = (geoCoords as { longtitude?: number }).longtitude !== undefined && 
                        (geoCoords as { longtitude?: number }).longtitude !== null;
  
  // Location has missing coords if neither longitude nor longtitude is present, or latitude is missing
  return !hasLatitude || (!hasLongitude && !hasLongtitude);
}

/**
 * Helper function to check if a location has coordinates
 */
export function hasCoordinates(location: AggregatedLocation): boolean {
  return !hasMissingCoordinates(location);
}

export function filterLocations(
  locations: AggregatedLocation[],
  selectedFilters: LocationFilter[]
): AggregatedLocation[] {
  if (selectedFilters.length === 0) return locations;

  return locations.filter(loc => {
    return selectedFilters.some(filter => {
      if (filter === 'LocalServersOnly' && loc.isLocalServer) return true;
      if (filter === 'SMIBLocationsOnly' && !loc.noSMIBLocation) return true;
      if (filter === 'NoSMIBLocation' && loc.noSMIBLocation === true)
        return true;
      if (filter === 'MissingCoordinates' && hasMissingCoordinates(loc))
        return true;
      if (filter === 'HasCoordinates' && hasCoordinates(loc))
        return true;
      return false;
    });
  });
}

// ============================================================================
// Sorting Functions
// ============================================================================
/**
 * Sort locations based on sort option and order
 */
export function sortLocations(
  locations: AggregatedLocation[],
  sortOption: LocationSortOption,
  sortOrder: 'asc' | 'desc'
): AggregatedLocation[] {
  return [...locations].sort((a, b) => {
    const valA = a[sortOption] ?? 0;
    const valB = b[sortOption] ?? 0;

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    } else if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    } else {
      // Fallback for mixed types or other types
      return 0;
    }
  });
}

/**
 * Calculate totals from filtered locations
 */
export function calculateLocationTotals(locations: AggregatedLocation[]): {
  totalOnline: number;
  totalOffline: number;
  totalMachines: number;
} {
  const totalOnline = locations.reduce(
    (sum, loc) => sum + (loc.onlineMachines || 0),
    0
  );
  const totalMachines = locations.reduce(
    (sum, loc) => sum + (loc.totalMachines || 0),
    0
  );
  const totalOffline = totalMachines - totalOnline;

  return { totalOnline, totalOffline, totalMachines };
}

/**
 * Create pagination for locations
 */
export function createLocationsPagination<T>(
  data: T[],
  currentPage: number,
  itemsPerPage: number
): {
  currentItems: T[];
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
} {
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = currentPage * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = data.slice(startIndex, endIndex);

  return {
    currentItems,
    totalPages,
    hasNextPage: currentPage < totalPages - 1,
    hasPrevPage: currentPage > 0,
  };
}

/**
 * Create pagination handlers for locations
 */
export function createLocationsPaginationHandlers(
  currentPage: number,
  totalPages: number,
  setPage: (page: number) => void
) {
  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 0 && pageNumber < totalPages) {
      setPage(pageNumber);
    }
  };

  const goToFirstPage = () => goToPage(0);
  const goToLastPage = () => goToPage(totalPages - 1);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  return {
    goToPage,
    goToFirstPage,
    goToLastPage,
    goToPrevPage,
    goToNextPage,
    canGoPrev: currentPage > 0,
    canGoNext: currentPage < totalPages - 1,
  };
}

/**
 * Debounce hook for search optimization
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
