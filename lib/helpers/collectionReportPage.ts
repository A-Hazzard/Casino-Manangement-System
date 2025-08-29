import { gsap } from "gsap";
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
 * Collection report page helper functions for managing tab changes and state synchronization
 */

/**
 * Handles tab changes and URL updates
 * @param value - The new tab value
 * @param setActiveTab - Function to update active tab state
 * @param pushToUrl - Function to update URL
 * @returns void
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
 * @param searchParams - Current search parameters
 * @param activeTab - Current active tab
 * @param setActiveTab - Function to update active tab state
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
 * Handles pagination with animation
 * @param pageNumber - New page number
 * @param setPage - Function to update page state
 * @param activeTab - Current active tab
 * @param paginationRef - Reference to pagination element
 * @param animatePagination - Animation function
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
 * @param setSelectedSchedulerLocation - Function to update scheduler location
 * @param setSelectedCollector - Function to update collector
 * @param setSelectedStatus - Function to update status
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
 * @param setSelectedCollectorLocation - Function to update collector location
 * @param setSelectedCollectorFilter - Function to update collector filter
 * @param setSelectedCollectorStatus - Function to update collector status
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
 * Applies GSAP animation to pagination controls
 * @param ref - React ref to the pagination element
 * @param duration - Animation duration in seconds
 */
export function animatePagination(
  ref: React.RefObject<HTMLDivElement | null>,
  duration = 0.3
) {
  if (ref.current) {
    gsap.fromTo(
      ref.current,
      { scale: 0.95, opacity: 0.8 },
      {
        scale: 1,
        opacity: 1,
        duration,
        ease: "back.out(1.7)",
      }
    );
  }
}

/**
 * Applies GSAP animation to table rows
 * @param tableRef - React ref to the table element
 */
export function animateTableRows(
  tableRef: React.RefObject<HTMLDivElement | null>
) {
  if (tableRef.current) {
    const tableRows = tableRef.current.querySelectorAll("tbody tr");
    gsap.fromTo(
      tableRows,
      { opacity: 0, y: 15 },
      {
        opacity: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.05,
        ease: "power2.out",
      }
    );
  }
}

/**
 * Applies GSAP animation to card elements
 * @param cardsRef - React ref to the cards container
 */
export function animateCards(cardsRef: React.RefObject<HTMLDivElement | null>) {
  if (cardsRef.current) {
    const cards = Array.from(
      cardsRef.current?.querySelectorAll(".card-item") || []
    );
    gsap.fromTo(
      cards,
      { opacity: 0, scale: 0.95, y: 15 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.3,
        stagger: 0.05,
        ease: "back.out(1.5)",
      }
    );
  }
}

/**
 * Applies GSAP animation to content transitions
 * @param contentRef - React ref to the content element
 */
export function animateContentTransition(
  contentRef: React.RefObject<HTMLDivElement | null>
) {
  if (contentRef.current) {
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }
    );
  }
}

/**
 * Filters collection reports based on location, search, uncollected status, and date range.
 * See collection-report-implementation-guide.md for filtering contract and details.
 *
 * Date parsing fix: Handles '10 Jun 2025, 11:00:50 am' format robustly using date-fns.
 */
export function filterCollectionReports(
  reports: CollectionReportRow[],
  selectedLocation: string,
  search: string,
  showUncollectedOnly: boolean,
  locations: LocationSelectItem[],
  dateRange?: RDPDateRange
): CollectionReportRow[] {
  return reports.filter((r) => {
    const matchesLocation =
      selectedLocation === "all" ||
      r.location === locations.find((l) => l._id === selectedLocation)?.name;
    const matchesSearch =
      !search ||
      r.collector.toLowerCase().includes(search.toLowerCase()) ||
      r.location.toLowerCase().includes(search.toLowerCase());
    const uncollectedStr = String(r.uncollected).trim();
    const matchesUncollected =
      !showUncollectedOnly || Number(uncollectedStr) > 0;

    let matchesDate = true;
    if (dateRange?.from && dateRange?.to) {
      // Robustly parse the time string using date-fns
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
        // If parsing fails, include the item (fail open)
        matchesDate = true;
      }
    }

    return matchesLocation && matchesSearch && matchesUncollected && matchesDate;
  });
}

/**
 * Calculates pagination data for a given page and items per page
 * @param items - Array of items to paginate
 * @param page - Current page number (1-based)
 * @param itemsPerPage - Number of items per page
 * @returns Pagination data object
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
 * @param selectedSchedulerLocation - Selected location ID
 * @param selectedCollector - Selected collector
 * @param selectedStatus - Selected status
 * @param locations - Array of location options
 * @returns Promise resolving to formatted scheduler data and collectors
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

  // Extract unique collectors for filter dropdown
  const uniqueCollectors = Array.from(
    new Set(data.map((item) => item.collector))
  ).filter(Boolean);

  // Format scheduler data for table
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
 * Sets date range to last month
 * @param setDateRange - Function to set the date range
 * @param setPendingRange - Function to set the pending range
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
 * @param setIsSearching - Function to set searching state
 * @param duration - Duration in milliseconds
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
