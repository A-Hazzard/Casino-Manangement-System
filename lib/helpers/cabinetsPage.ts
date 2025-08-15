import { gsap } from "gsap";
import { fetchCabinetLocations, fetchCabinets } from "@/lib/helpers/cabinets";
import type {
  Cabinet,
  CabinetProps,
  CabinetSortOption,
} from "@/lib/types/cabinets";
import type { TimePeriod } from "@/app/api/lib/types";

/**
 * Loads locations for cabinet filtering
 * @param selectedLicencee - Selected licensee ID
 * @returns Promise resolving to array of locations
 */
export async function loadCabinetLocations(
  selectedLicencee?: string
): Promise<{ _id: string; name: string }[]> {
  try {
    const locationsData = await fetchCabinetLocations(selectedLicencee);
    if (Array.isArray(locationsData)) {
      return locationsData;
    } else {
      console.error("Locations data is not an array:", locationsData);
      return [];
    }
  } catch (err) {
    console.error("Failed to fetch locations:", err);
    return [];
  }
}

/**
 * Filters cabinets based on search term and selected location
 * @param cabinets - Array of cabinet data
 * @param searchTerm - Search term to filter by
 * @param selectedLocation - Selected location ID ("all" for no filter)
 * @returns Filtered array of cabinets
 */
export function filterCabinets(
  cabinets: Cabinet[],
  searchTerm: string,
  selectedLocation: string
): Cabinet[] {
  let filtered = [...cabinets];

  // Filter by location if a specific location is selected
  if (selectedLocation !== "all") {
    filtered = filtered.filter((cab) => cab.locationId === selectedLocation);
  }

  // Filter by search term
  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (cab) =>
        cab.assetNumber?.toLowerCase().includes(searchLower) ||
        cab.smbId?.toLowerCase().includes(searchLower) ||
        cab.locationName?.toLowerCase().includes(searchLower) ||
        cab.serialNumber?.toLowerCase().includes(searchLower)
    );
  }

  return filtered;
}

/**
 * Loads cabinet data with error handling
 * @param selectedLicencee - Selected licensee ID
 * @param activeMetricsFilter - Active time period filter
 * @returns Promise resolving to array of cabinets
 */
export async function loadCabinetsData(
  selectedLicencee?: string,
  activeMetricsFilter?: TimePeriod
): Promise<Cabinet[]> {
  try {
    const cabinetsData = await fetchCabinets(
      selectedLicencee,
      activeMetricsFilter
    );

    if (!Array.isArray(cabinetsData)) {
      console.error("Cabinets data is not an array:", cabinetsData);
      return [];
    }

    return cabinetsData;
  } catch (err) {
    console.error("Error fetching cabinet data:", err);
    return [];
  }
}

/**
 * Sorts cabinets based on sort option and order
 * @param cabinets - Array of cabinets to sort
 * @param sortOption - Property to sort by
 * @param sortOrder - Sort direction
 * @returns Sorted array of cabinets
 */
export function sortCabinets(
  cabinets: Cabinet[],
  sortOption: CabinetSortOption,
  sortOrder: "asc" | "desc"
): Cabinet[] {
  return [...cabinets].sort((a, b) => {
    const order = sortOrder === "desc" ? -1 : 1;
    const aValue = a[sortOption] || 0;
    const bValue = b[sortOption] || 0;
    return (aValue > bValue ? 1 : -1) * order;
  });
}

/**
 * Paginates cabinet data
 * @param cabinets - Array of cabinets to paginate
 * @param currentPage - Current page number (0-based)
 * @param itemsPerPage - Number of items per page
 * @returns Paginated cabinet data
 */
export function paginateCabinets(
  cabinets: Cabinet[],
  currentPage: number,
  itemsPerPage = 10
): {
  paginatedCabinets: Cabinet[];
  totalPages: number;
} {
  const totalPages = Math.ceil(cabinets.length / itemsPerPage);
  const paginatedCabinets = cabinets.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  return {
    paginatedCabinets,
    totalPages,
  };
}

/**
 * Converts Cabinet to CabinetProps for component compatibility
 * @param cabinet - Cabinet data
 * @param onEdit - Edit callback function
 * @param onDelete - Delete callback function
 * @returns CabinetProps object
 */
export function mapToCabinetProps(
  cabinet: Cabinet,
  onEdit: (cabinet: Cabinet) => void,
  onDelete: (cabinet: Cabinet) => void
): CabinetProps {
  return {
    _id: cabinet._id,
    locationId: cabinet.locationId || "",
    locationName: cabinet.locationName || "",
    assetNumber: cabinet.assetNumber || "",
    smbId: cabinet.smbId || cabinet.smibBoard || cabinet.relayId || "",
    moneyIn: cabinet.moneyIn || cabinet.sasMeters?.drop || 0,
    moneyOut: cabinet.moneyOut || cabinet.sasMeters?.totalCancelledCredits || 0,
    gross:
      cabinet.gross ||
      (cabinet.moneyIn || cabinet.sasMeters?.drop || 0) -
        (cabinet.moneyOut || cabinet.sasMeters?.totalCancelledCredits || 0),
    jackpot: cabinet.jackpot || cabinet.sasMeters?.jackpot || 0,
    lastOnline: cabinet.lastOnline
      ? cabinet.lastOnline.toString()
      : cabinet.lastActivity
      ? cabinet.lastActivity.toString()
      : "",
    installedGame: cabinet.installedGame || cabinet.game || "",
    accountingDenomination:
      cabinet.accountingDenomination ||
      cabinet.gameConfig?.accountingDenomination?.toString() ||
      "",
    collectionMultiplier: cabinet.collectionMultiplier || "",
    status: cabinet.status || cabinet.assetStatus || "",
    gameType: cabinet.gameType,
    isCronosMachine: cabinet.isCronosMachine,
    cabinetType: cabinet.cabinetType,
    onEdit: () => onEdit(cabinet),
    onDelete: () => onDelete(cabinet),
  };
}

/**
 * Applies GSAP animation to table rows
 * @param tableRef - React ref to table element
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
 * Applies GSAP animation to cabinet cards
 * @param cardsRef - React ref to cards container element
 */
export function animateCabinetCards(
  cardsRef: React.RefObject<HTMLDivElement | null>
) {
  if (cardsRef.current) {
    const cards = Array.from(cardsRef.current.children);
    gsap.fromTo(
      cards,
      { opacity: 0, scale: 0.95, y: 15 },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.4,
        stagger: 0.08,
        ease: "back.out(1.5)",
      }
    );
  }
}

/**
 * Handles column sorting logic
 * @param currentSortOption - Current sort option
 * @param currentSortOrder - Current sort order
 * @param newColumn - New column to sort by
 * @returns New sort configuration
 */
export function handleColumnSort(
  currentSortOption: CabinetSortOption,
  currentSortOrder: "asc" | "desc",
  newColumn: CabinetSortOption
): {
  sortOption: CabinetSortOption;
  sortOrder: "asc" | "desc";
} {
  if (currentSortOption === newColumn) {
    return {
      sortOption: newColumn,
      sortOrder: currentSortOrder === "desc" ? "asc" : "desc",
    };
  } else {
    return {
      sortOption: newColumn,
      sortOrder: "desc",
    };
  }
}
