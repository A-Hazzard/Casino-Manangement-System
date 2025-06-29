import { gsap } from "gsap";
import type { CollectionDocument } from "@/lib/types/collections";
import { calculateSasGross, calculateVariation } from "@/lib/utils/metrics";

/**
 * Applies GSAP animation for desktop tab transitions
 * @param tabContentRef - React ref to the tab content element
 */
export function animateDesktopTabTransition(
  tabContentRef: React.RefObject<HTMLDivElement | null>
) {
  if (tabContentRef.current && window.innerWidth >= 1024) {
    gsap.fromTo(
      tabContentRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" }
    );
  }
}

/**
 * Calculates the total location value from collections
 * @param collections - Array of collection documents
 * @returns Total location value
 */
export function calculateLocationTotal(
  collections: CollectionDocument[]
): number {
  if (!collections || collections.length === 0) return 0;
  return collections.reduce((total, collection) => {
    const gross = (collection.metersOut || 0) - (collection.metersIn || 0);
    return total + gross;
  }, 0);
}

/**
 * Calculates SAS metrics totals from collections
 * @param collections - Array of collection documents
 * @returns SAS metrics totals object
 */
export function calculateSasMetricsTotals(collections: CollectionDocument[]) {
  const totalSasDrop = collections.reduce(
    (sum, col) => sum + (col.sasMeters?.drop || 0),
    0
  );
  const totalSasCancelled = collections.reduce(
    (sum, col) => sum + (col.sasMeters?.totalCancelledCredits || 0),
    0
  );
  const totalSasGross = totalSasDrop - totalSasCancelled;

  return {
    totalSasDrop,
    totalSasCancelled,
    totalSasGross,
  };
}

/**
 * Sorts collections by SAS drop amount in descending order
 * @param collections - Array of collection documents
 * @returns Sorted collections array
 */
export function sortCollectionsBySasDrop(
  collections: CollectionDocument[]
): CollectionDocument[] {
  return [...collections].sort(
    (a, b) => (b.sasMeters?.drop || 0) - (a.sasMeters?.drop || 0)
  );
}

/**
 * Calculates pagination for machine metrics
 * @param collections - Array of collection documents
 * @param page - Current page number (1-based)
 * @param itemsPerPage - Items per page
 * @returns Pagination data
 */
export function calculateMachinePagination(
  collections: CollectionDocument[],
  page: number,
  itemsPerPage: number
) {
  const sortedCollections = sortCollectionsBySasDrop(collections);
  const totalPages = Math.ceil(sortedCollections.length / itemsPerPage);
  const currentItems = sortedCollections.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return {
    sortedCollections,
    totalPages,
    currentItems,
  };
}

/**
 * Generates machine metrics content data
 * @param collections - Array of collection documents
 * @param page - Current page number
 * @param itemsPerPage - Items per page
 * @returns Machine metrics data for rendering
 */
export function generateMachineMetricsData(
  collections: CollectionDocument[],
  page: number,
  itemsPerPage: number
) {
  const { currentItems, totalPages } = calculateMachinePagination(
    collections,
    page,
    itemsPerPage
  );

  const metricsData = currentItems.map((col) => ({
    id: col._id,
    machineCustomName: col.machineCustomName,
    droppedCancelled: `${col.movement.metersIn} / ${col.movement.metersOut}`,
    metersGross: col.movement.gross,
    sasGross: calculateSasGross(col),
    variation: calculateVariation(col),
    sasStartTime: col.sasMeters?.sasStartTime || "-",
    sasEndTime: col.sasMeters?.sasEndTime || "-",
  }));

  return {
    metricsData,
    totalPages,
    hasData: currentItems.length > 0,
  };
}
