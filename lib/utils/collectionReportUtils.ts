/**
 * Collection Report Utilities
 *
 * Utility functions for filtering, sorting, and paginating collection reports.
 *
 * Features:
 * - Collection report filtering
 * - Location-based filtering
 * - Search functionality
 * - Uncollected filter
 * - Pagination calculations
 * - Sorting utilities
 */

import type { CollectionReportRow } from '@/lib/types/componentProps';
import type { LocationSelectItem } from '@/lib/types/location';

// ============================================================================
// Filtering Functions
// ============================================================================
/**
 * Filter collection reports based on location, search term, and uncollected filter
 */
export function filterCollectionReports(
  reports: CollectionReportRow[],
  selectedLocation: string,
  search: string,
  showUncollectedOnly: boolean,
  locations: LocationSelectItem[]
): CollectionReportRow[] {
  return reports.filter(report => {
    // Location filter
    if (selectedLocation !== 'all') {
      const location = locations.find(loc => loc._id === selectedLocation);
      if (location && report.location !== location.name) {
        return false;
      }
    }

    // Search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      const matchesSearch =
        report.location.toLowerCase().includes(searchLower) ||
        report.locationReportId.toLowerCase().includes(searchLower) ||
        report.collector.toLowerCase().includes(searchLower) ||
        report.time.toLowerCase().includes(searchLower);
      if (!matchesSearch) {
        return false;
      }
    }

    // Uncollected only filter - show only reports where uncollected > 0
    if (showUncollectedOnly) {
      const uncollectedStr = String(report.uncollected || '').trim();
      const uncollectedNum = Number(uncollectedStr);
      if (isNaN(uncollectedNum) || uncollectedNum <= 0) {
        return false;
      }
    }

    return true;
  });
}

// ============================================================================
// Pagination Functions
// ============================================================================
/**
 * Calculate pagination for collection reports
 */
export function calculatePagination<T>(
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
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = data.slice(startIndex, endIndex);

  return {
    currentItems,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}

// ============================================================================
// Date Range Functions
// ============================================================================
/**
 * Set date range to last month for monthly report
 */
export function setLastMonthDateRange(
  setMonthlyDateRange: (range: { from: Date; to: Date }) => void,
  setPendingRange: (range: { from: Date; to: Date }) => void
): void {
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  const lastMonthRange = {
    from: lastMonth,
    to: lastMonthEnd,
  };

  setMonthlyDateRange(lastMonthRange);
  setPendingRange(lastMonthRange);
}

/**
 * Create pagination handlers with animation
 */
export function createPaginationHandlers(
  currentPage: number,
  totalPages: number,
  setPage: (page: number) => void,
  onAnimate?: () => void
) {
  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setPage(pageNumber);
      if (onAnimate) {
        onAnimate();
      }
    }
  };

  const goToFirstPage = () => goToPage(1);
  const goToLastPage = () => goToPage(totalPages);
  const goToPrevPage = () => goToPage(currentPage - 1);
  const goToNextPage = () => goToPage(currentPage + 1);

  return {
    goToPage,
    goToFirstPage,
    goToLastPage,
    goToPrevPage,
    goToNextPage,
    canGoPrev: currentPage > 1,
    canGoNext: currentPage < totalPages,
  };
}

// ============================================================================
// Formatting Functions
// ============================================================================
/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Format date and time for display
 */
export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
