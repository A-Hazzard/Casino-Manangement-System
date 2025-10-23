import type {
  CollectionReportRow,
  SchedulerTableRow,
} from "@/lib/types/componentProps";
import type { CollectionView } from "@/lib/types/collection";
import type { CollectionDocument } from "@/lib/types/collections";
import { formatDateString } from "@/lib/utils/dateUtils";
import { fetchSchedulersWithFilters } from "@/lib/helpers/schedulers";
import type { LocationSelectItem } from "@/lib/types/location";
import type { DateRange as RDPDateRange } from "react-day-picker";
import { parse } from 'date-fns';

/**
 * Collection report page helper functions V2 - CSS-based animations instead of GSAP
 */

/**
 * Handles tab changes and URL updates
 */
export function handleTabChange(
  value: string,
  setActiveTab: (tab: CollectionView) => void,
  pushToUrl: (tab: CollectionView) => void
) {
  const newTab = value as CollectionView;
  setActiveTab(newTab);
  pushToUrl(newTab);
}

/**
 * Synchronizes state with URL changes for browser back/forward navigation
 */
export function syncStateWithURL(
  searchParams: URLSearchParams | null,
  activeTab: CollectionView,
  setActiveTab: (tab: CollectionView) => void
) {
  const section = searchParams?.get("section");
  if (section === "monthly" && activeTab !== "monthly") {
    setActiveTab("monthly");
  } else if (section === "manager" && activeTab !== "manager") {
    setActiveTab("manager");
  } else if (section === "collector" && activeTab !== "collector") {
    setActiveTab("collector");
  } else if (section === "collection" && activeTab !== "collection") {
    setActiveTab("collection");
  } else if (!section && activeTab !== "collection") {
    setActiveTab("collection");
  }
}

/**
 * Handles pagination with CSS animation
 */
export function handlePaginationWithAnimation(
  pageNumber: number,
  setPage: (page: number) => void,
  activeTab: CollectionView,
  paginationRef: React.RefObject<HTMLDivElement | null>,
  animatePagination: (ref: React.RefObject<HTMLDivElement | null>) => void
) {
  setPage(pageNumber);
  if (activeTab === "collection") {
    animatePagination(paginationRef);
  }
}

/**
 * Resets all scheduler filters to default values
 */
export function resetSchedulerFilters(
  setSelectedSchedulerLocation: (location: string) => void,
  setSelectedCollector: (collector: string) => void,
  setSelectedStatus: (status: string) => void
) {
  setSelectedSchedulerLocation("all");
  setSelectedCollector("all");
  setSelectedStatus("all");
}

/**
 * Resets all collector filters to default values
 */
export function resetCollectorFilters(
  setSelectedCollectorLocation: (location: string) => void,
  setSelectedCollectorFilter: (filter: string) => void,
  setSelectedCollectorStatus: (status: string) => void
) {
  setSelectedCollectorLocation("all");
  setSelectedCollectorFilter("all");
  setSelectedCollectorStatus("all");
}

/**
 * Applies CSS animation to pagination controls
 */
export function animatePagination(
  ref: React.RefObject<HTMLDivElement | null>
) {
  if (ref.current) {
    // Add CSS animation class
    ref.current.classList.add('animate-pulse');
    
    // Remove animation class after animation completes
    setTimeout(() => {
      if (ref.current) {
        ref.current.classList.remove('animate-pulse');
      }
    }, 300);
  }
}

/**
 * Applies CSS animation to table rows
 */
export function animateTableRows(
  tableRef: React.RefObject<HTMLDivElement | null>
) {
  if (tableRef.current) {
    const tableRows = tableRef.current.querySelectorAll("tbody tr");
    
    // Add staggered animation classes
    tableRows.forEach((row, index) => {
      const element = row as HTMLElement;
      element.style.opacity = '0';
      element.style.transform = 'translateY(15px)';
      element.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      
      // Stagger the animations
      setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }, index * 50);
    });
  }
}

/**
 * Applies CSS animation to card elements
 */
export function animateCards(cardsRef: React.RefObject<HTMLDivElement | null>) {
  if (cardsRef.current) {
    const cards = cardsRef.current.querySelectorAll(".card-item");
    
    // Add staggered animation classes
    cards.forEach((card, index) => {
      const element = card as HTMLElement;
      element.style.opacity = '0';
      element.style.transform = 'scale(0.95) translateY(15px)';
      element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      
      // Stagger the animations
      setTimeout(() => {
        element.style.opacity = '1';
        element.style.transform = 'scale(1) translateY(0)';
      }, index * 50);
    });
  }
}

/**
 * Applies CSS animation to content transitions
 */
export function animateContentTransition(
  contentRef: React.RefObject<HTMLDivElement | null>
) {
  if (contentRef.current) {
    const element = contentRef.current;
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px)';
    element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    
    // Trigger animation
    requestAnimationFrame(() => {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }
}

/**
 * Filters collection reports based on location, search, uncollected status, and date range.
 */
export function filterCollectionReports(
  reports: CollectionReportRow[],
  selectedLocation: string,
  search: string,
  showUncollectedOnly: boolean,
  locations: LocationSelectItem[],
  dateRange?: RDPDateRange
): CollectionReportRow[] {
  console.warn('[filterCollectionReports] Starting filter process');
  console.warn(`[filterCollectionReports] selectedLocation: "${selectedLocation}"`);
  console.warn(`[filterCollectionReports] search: "${search}"`);
  console.warn(`[filterCollectionReports] showUncollectedOnly: ${showUncollectedOnly}`);
  console.warn(`[filterCollectionReports] locations count: ${locations.length}`);
  console.warn(`[filterCollectionReports] reports count: ${reports.length}`);

  const filtered = reports.filter((r, index) => {
    // Location matching logic
    const isAllLocations = selectedLocation === "all";
    const foundLocation = locations.find((l) => l._id === selectedLocation);
    const locationName = foundLocation?.name;
    const matchesLocation = isAllLocations || r.location === locationName;

    // Log first few reports for debugging
    if (index < 3) {
      console.warn(`[filterCollectionReports] Report ${index + 1}:`);
      console.warn(`  - Report location: "${r.location}"`);
      console.warn(`  - Selected location: "${selectedLocation}"`);
      console.warn(`  - Is all locations: ${isAllLocations}`);
      console.warn(`  - Found location name: "${locationName}"`);
      console.warn(`  - Matches location: ${matchesLocation}`);
    }

    const matchesSearch =
      !search ||
      r.collector.toLowerCase().includes(search.toLowerCase()) ||
      r.location.toLowerCase().includes(search.toLowerCase());
    const uncollectedStr = String(r.uncollected).trim();
    const matchesUncollected =
      !showUncollectedOnly || Number(uncollectedStr) > 0;

    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) {
      let reportDate: Date | null = null;
      try {
        reportDate = parse(r.time, 'dd LLL yyyy, hh:mm:ss a', new Date());
        if (isNaN(reportDate.getTime())) reportDate = null;
      } catch {
        reportDate = null;
      }
      if (reportDate) {
        matchesDate = reportDate >= dateRange.from && reportDate <= dateRange.to;
      } else {
        matchesDate = true;
      }
    }

    const finalMatch = matchesLocation && matchesSearch && matchesUncollected && matchesDate;
    
    if (index < 3) {
      console.warn(`  - Final match: ${finalMatch} (location: ${matchesLocation}, search: ${matchesSearch}, uncollected: ${matchesUncollected}, date: ${matchesDate})`);
    }

    return finalMatch;
  });

  console.warn(`[filterCollectionReports] Filtered ${filtered.length} reports from ${reports.length} total`);
  return filtered;
}

/**
 * Calculates pagination data for a given page and items per page
 */
export function calculatePagination<T>(
  items: T[],
  page: number,
  itemsPerPage: number
) {
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const lastItemIndex = page * itemsPerPage;
  const firstItemIndex = lastItemIndex - itemsPerPage;
  const currentItems = items.slice(firstItemIndex, lastItemIndex);

  return {
    totalPages,
    currentItems,
    firstItemIndex,
    lastItemIndex,
  };
}

/**
 * Fetches and formats scheduler data with filters
 */
export async function fetchAndFormatSchedulers(
  selectedSchedulerLocation: string,
  selectedCollector: string,
  selectedStatus: string,
  locations: LocationSelectItem[]
): Promise<{
  schedulers: SchedulerTableRow[];
  collectors: string[];
}> {
  const locationName =
    selectedSchedulerLocation !== "all"
      ? locations.find((loc) => loc._id === selectedSchedulerLocation)?.name
      : undefined;

  const data = await fetchSchedulersWithFilters({
    location: locationName,
    collector: selectedCollector !== "all" ? selectedCollector : undefined,
    status: selectedStatus !== "all" ? selectedStatus : undefined,
  });

  const uniqueCollectors = Array.from(
    new Set(data.map((item) => item.collector))
  ).filter(Boolean);

  const formattedData: SchedulerTableRow[] = data.map((item) => ({
    id: item._id,
    collector: item.collector,
    location: item.location,
    creator: item.creator,
    visitTime: formatDateString(item.startTime),
    createdAt: formatDateString(item.createdAt),
    status: item.status,
  }));

  return {
    schedulers: formattedData,
    collectors: uniqueCollectors,
  };
}

/**
 * Calculates the total location value from collections
 */
export function calculateLocationTotal(
  collections: CollectionDocument[]
): number {
  if (!collections || collections.length === 0) return 0;
  return collections.reduce((total, collection) => {
    const gross = (collection.metersIn || 0) - (collection.metersOut || 0);
    return total + gross;
  }, 0);
}

/**
 * Calculates SAS metrics totals from collections
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
 */
export function sortCollectionsBySasDrop(
  collections: CollectionDocument[]
): CollectionDocument[] {
  return [...collections].sort(
    (a, b) => (b.sasMeters?.drop || 0) - (a.sasMeters?.drop || 0)
  );
}

/**
 * Sets date range to last month
 */
export function setLastMonthDateRange(
  setDateRange: (range: { from: Date; to: Date }) => void,
  setPendingRange: (range: { from: Date; to: Date }) => void
) {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const last = new Date(now.getFullYear(), now.getMonth(), 0);
  const range = { from: first, to: last };

  setPendingRange(range);
  setDateRange(range);
}

/**
 * Triggers a search animation state
 */
export function triggerSearchAnimation(
  setIsSearching: (searching: boolean) => void,
  duration = 500
) {
  setIsSearching(true);
  setTimeout(() => {
    setIsSearching(false);
  }, duration);
}
