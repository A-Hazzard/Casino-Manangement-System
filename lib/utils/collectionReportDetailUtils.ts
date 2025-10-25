import type { CollectionDocument } from '@/lib/types/collections';

/**
 * Generate machine metrics data with pagination
 */
export function generateMachineMetricsData(
  collections: CollectionDocument[],
  currentPage: number,
  itemsPerPage: number
): {
  metricsData: Array<{
    id: string;
    machineCustomName: string;
    droppedCancelled: string;
    metersGross: string;
    sasGross: string;
    variation: string;
    sasStartTime: string;
    sasEndTime: string;
  }>;
  totalPages: number;
  hasData: boolean;
} {
  if (!collections || collections.length === 0) {
    return {
      metricsData: [],
      totalPages: 0,
      hasData: false,
    };
  }

  const metricsData = collections.map(collection => ({
    id: collection._id || collection.machineId || '',
    machineCustomName:
      collection.machineCustomName || collection.machineId || 'Unknown',
    droppedCancelled: `${collection.movement?.metersIn || 0} / ${
      collection.movement?.metersOut || 0
    }`,
    metersGross: (collection.movement?.gross ?? 0).toLocaleString(),
    sasGross: (collection.sasMeters?.gross ?? 0).toLocaleString(),
    variation:
      !collection.sasMeters ||
      collection.sasMeters.gross === undefined ||
      collection.sasMeters.gross === null ||
      collection.sasMeters.gross === 0
        ? 'No SAS Data'
        : (
            (collection.movement?.gross ?? 0) -
            (collection.sasMeters?.gross ?? 0)
          ).toLocaleString(),
    sasStartTime: collection.sasMeters?.sasStartTime || '-',
    sasEndTime: collection.sasMeters?.sasEndTime || '-',
  }));

  const totalPages = Math.ceil(metricsData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = metricsData.slice(startIndex, endIndex);

  return {
    metricsData: paginatedData,
    totalPages,
    hasData: true,
  };
}

/**
 * Calculate location total from collections
 */
export function calculateLocationTotal(
  collections: CollectionDocument[]
): number {
  return collections.reduce((total, collection) => {
    return total + (collection.movement?.gross || 0);
  }, 0);
}

/**
 * Calculate SAS metrics totals from collections
 */
export function calculateSasMetricsTotals(collections: CollectionDocument[]): {
  totalSasDrop: number;
  totalSasCancelled: number;
  totalSasGross: number;
} {
  return collections.reduce(
    (totals, collection) => ({
      totalSasDrop: totals.totalSasDrop + (collection.sasMeters?.drop || 0),
      totalSasCancelled:
        totals.totalSasCancelled +
        (collection.sasMeters?.totalCancelledCredits || 0),
      totalSasGross: totals.totalSasGross + (collection.sasMeters?.gross || 0),
    }),
    { totalSasDrop: 0, totalSasCancelled: 0, totalSasGross: 0 }
  );
}

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
 * Validate collection report data
 */
export function validateCollectionReportData(
  data: Record<string, unknown>
): boolean {
  return !!(
    data &&
    typeof data === 'object' &&
    data.reportId &&
    data.locationName &&
    (data.locationMetrics || data.sasMetrics || data.machineMetrics)
  );
}

/**
 * Create pagination handlers for machine metrics
 */
export function createMachineMetricsPagination(
  currentPage: number,
  totalPages: number,
  setPage: (page: number) => void
) {
  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setPage(pageNumber);
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
