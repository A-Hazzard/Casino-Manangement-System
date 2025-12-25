/**
 * Utility functions for Locations Tab
 * 
 * Contains helper functions for pagination, data transformation, and calculations
 */

import { AggregatedLocation } from '@/lib/types/location';
import { LocationMetrics, TopLocation } from '@/shared/types';

/**
 * Calculate paginated items from accumulated locations
 */
export function calculatePaginatedItems(
  accumulatedLocations: AggregatedLocation[],
  currentPage: number,
  itemsPerPage: number,
  pagesPerBatch: number
): AggregatedLocation[] {
  const positionInBatch = (currentPage % pagesPerBatch) * itemsPerPage;
  const startIndex = positionInBatch;
  const endIndex = startIndex + itemsPerPage;
  return accumulatedLocations.slice(startIndex, endIndex);
}

/**
 * Calculate total pages from accumulated locations
 */
export function calculateTotalPages(
  accumulatedLocations: AggregatedLocation[],
  itemsPerPage: number
): number {
  const totalItems = accumulatedLocations.length;
  const totalPagesFromItems = Math.ceil(totalItems / itemsPerPage);
  return totalPagesFromItems > 0 ? totalPagesFromItems : 1;
}

/**
 * Calculate batch number from page number
 */
export function calculateBatchNumber(
  page: number,
  pagesPerBatch: number
): number {
  return Math.floor(page / pagesPerBatch) + 1;
}

/**
 * Transform location data to TopLocation format
 */
export function transformToTopLocations(
  locations: AggregatedLocation[],
  limit = 5
): TopLocation[] {
  return locations
    .sort(
      (a, b) =>
        ((b.gross as number) || 0) - ((a.gross as number) || 0)
    )
    .slice(0, limit)
    .map(loc => ({
      locationId: (loc.location || loc._id) as string,
      locationName: (loc.locationName ||
        loc.name ||
        loc.location ||
        'Unknown') as string,
      gross: (loc.gross || 0) as number,
      drop: (loc.moneyIn || 0) as number,
      cancelledCredits: (loc.moneyOut || 0) as number,
      onlineMachines: (loc.onlineMachines || 0) as number,
      totalMachines: (loc.totalMachines || 0) as number,
      performance: 'average' as const,
      sasEnabled: (loc.hasSasMachines ||
        (loc.sasMachines as number) > 0) as boolean,
      coordinates: undefined,
      holdPercentage:
        (loc.moneyIn as number) > 0
          ? ((loc.gross as number) / (loc.moneyIn as number)) * 100
          : 0,
    }));
}

/**
 * Calculate location metrics from location data
 */
export function calculateLocationMetrics(
  locations: AggregatedLocation[]
): LocationMetrics {
  return locations.reduce(
    (acc, loc) => ({
      totalGross: acc.totalGross + ((loc.gross as number) || 0),
      totalDrop: acc.totalDrop + ((loc.moneyIn as number) || 0),
      totalCancelledCredits:
        acc.totalCancelledCredits + ((loc.moneyOut as number) || 0),
      onlineMachines: acc.onlineMachines + (loc.onlineMachines || 0),
      totalMachines: acc.totalMachines + (loc.totalMachines || 0),
    }),
    {
      totalGross: 0,
      totalDrop: 0,
      totalCancelledCredits: 0,
      onlineMachines: 0,
      totalMachines: 0,
    }
  );
}

