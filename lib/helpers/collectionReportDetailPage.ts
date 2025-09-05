import { gsap } from "gsap";
import type { CollectionDocument } from "@/lib/types/collections";

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
  if (!collections || collections.length === 0) return [];
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
  if (!collections || collections.length === 0) {
    return {
      metricsData: [],
      totalPages: 0,
      hasData: false,
    };
  }

  // Transform each collection into a machine metric entry
  const metricsData = collections.map((col, index) => {
    // Get machine identifier with priority: serialNumber -> machineName -> machineId -> machineCustomName
    const machineId =
      col.serialNumber ||
      col.machineName ||
      col.machineId ||
      col.machineCustomName ||
      `Machine ${index + 1}`;

    // Get drop and cancelled from sasMeters
    const drop = col.sasMeters?.drop || 0;
    const cancelled = col.sasMeters?.totalCancelledCredits || 0;

    // Get meters gross from movement
    const metersGross = col.movement?.gross || 0;

    // Get SAS gross from sasMeters
    const sasGross = col.sasMeters?.gross || 0;

    // Calculate variation (difference between meters gross and SAS gross)
    const variation = metersGross - sasGross;

    // Get SAS times from sasMeters
    const sasStartTime = col.sasMeters?.sasStartTime || "-";
    const sasEndTime = col.sasMeters?.sasEndTime || "-";

    return {
      id: col._id || `machine-${index}`,
      machineId: machineId,
      droppedCancelled: `${drop} / ${cancelled}`,
      metersGross: metersGross.toLocaleString(),
      sasGross: sasGross.toLocaleString(),
      variation: variation.toLocaleString(),
      sasStartTime: sasStartTime === "-" ? "-" : formatSasTime(sasStartTime),
      sasEndTime: sasEndTime === "-" ? "-" : formatSasTime(sasEndTime),
    };
  });

  // Calculate pagination
  const totalPages = Math.ceil(metricsData.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = metricsData.slice(startIndex, endIndex);

  return {
    metricsData: paginatedData,
    totalPages,
    hasData: metricsData.length > 0,
  };
}

// Helper function to format SAS time
function formatSasTime(timeString: string): string {
  if (!timeString || timeString === "-") return "-";

  try {
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return "-";

    return date
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(",", ",");
  } catch {
    return "-";
  }
}
