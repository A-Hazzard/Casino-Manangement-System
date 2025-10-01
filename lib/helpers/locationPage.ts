import type { GamingMachine as Cabinet } from "@/shared/types/entities";
type CabinetSortOption = "assetNumber" | "locationName" | "moneyIn" | "moneyOut" | "jackpot" | "gross" | "cancelledCredits" | "game" | "smbId" | "serialNumber" | "lastOnline";
import {
  fetchAllGamingLocations,
  fetchLocationDetailsById,
} from "@/lib/helpers/locations";
import { fetchCabinetsForLocation } from "@/lib/helpers/cabinets";
import { filterAndSortCabinets as filterAndSortCabinetsUtil } from "@/lib/utils/ui";

/**
 * Handles filtering and sorting of cabinets
 */
export const applyFiltersAndSort = (
  allCabinets: Cabinet[],
  searchTerm: string,
  sortOption: CabinetSortOption,
  sortOrder: "asc" | "desc"
) => {
  const filtered = filterAndSortCabinetsUtil(
    allCabinets,
    searchTerm,
    sortOption,
    sortOrder
  );
  return filtered;
};

/**
 * Handles location dropdown change navigation
 */
export const handleLocationChange = (
  locationId: string,
  locationName: string,
  currentSlug: string,
  router: { push: (url: string) => void },
  setSelectedLocation: (name: string) => void,
  setIsLocationDropdownOpen: (open: boolean) => void
) => {
  setSelectedLocation(locationName);
  setIsLocationDropdownOpen(false);
  if (locationId !== "all" && locationId !== currentSlug) {
    router.push(`/locations/${locationId}`);
  }
};

/**
 * Pagination helper functions
 */
export const createPaginationHandlers = (
  totalPages: number,
  setCurrentPage: (page: number) => void
) => ({
  handleFirstPage: () => setCurrentPage(0),
  handleLastPage: () => setCurrentPage(totalPages - 1),
  handlePrevPage: (currentPage: number) =>
    currentPage > 0 && setCurrentPage(currentPage - 1),
  handleNextPage: (currentPage: number) =>
    currentPage < totalPages - 1 && setCurrentPage(currentPage + 1),
});

/**
 * Handles cabinet status filtering
 */
export const handleFilterChange = (
  status: "All" | "Online" | "Offline",
  allCabinets: Cabinet[],
  setSelectedStatus: (status: "All" | "Online" | "Offline") => void,
  setFilteredCabinets: (cabinets: Cabinet[]) => void
) => {
  setSelectedStatus(status);

  if (!allCabinets) return;

  if (status === "All") {
    setFilteredCabinets(allCabinets);
  } else if (status === "Online") {
    setFilteredCabinets(
      allCabinets.filter((cabinet) => cabinet.online === true)
    );
  } else if (status === "Offline") {
    setFilteredCabinets(
      allCabinets.filter((cabinet) => cabinet.online === false)
    );
  }
};

/**
 * Consolidated data fetching function
 */
export const fetchLocationData = async (
  locationId: string,
  selectedLicencee: string | undefined,
  activeMetricsFilter: string,
  hasFetchedOnce: boolean,
  setLocations: (locations: { id: string; name: string }[]) => void,
  setLocationName: (name: string) => void,
  setAllCabinets: (cabinets: Cabinet[]) => void,
  setError: (error: string | null) => void
) => {
  const errors: string[] = [];

  try {
    // On initial load, fetch locations only ONCE
    if (!hasFetchedOnce) {
      try {
        const formattedLocations = await fetchAllGamingLocations();
        setLocations(formattedLocations);
      } catch {
        errors.push("Failed to load locations.");
      }
    }

    // Fetch location details
    try {
      const locationData = await fetchLocationDetailsById(locationId);
      setLocationName(locationData.name);
    } catch {
      setLocationName("Location"); // Default name on error
      errors.push("Failed to load location details.");
    }

    // Fetch cabinets data
    try {
      const cabinetsData = await fetchCabinetsForLocation(
        locationId,
        selectedLicencee,
        activeMetricsFilter
      );
      setAllCabinets(cabinetsData);
    } catch {
      setAllCabinets([]);
      errors.push("Failed to load cabinets.");
    }

    if (errors.length > 0) {
      setError(errors.join(" ") + " Please try again later.");
    }
  } catch {
    setError("An unexpected error occurred. Please try again later.");
  }
};

/**
 * Refresh data function
 */
export const refreshLocationData = async (
  locationId: string,
  selectedLicencee: string | undefined,
  activeMetricsFilter: string,
  setLocationName: (name: string) => void,
  setAllCabinets: (cabinets: Cabinet[]) => void,
  setError: (error: string | null) => void
) => {
  const errors: string[] = [];

  try {
    // Fetch location details
    try {
      const locationData = await fetchLocationDetailsById(locationId);
      setLocationName(locationData.name);
    } catch {
      setLocationName("Location"); // Default name on error
      errors.push("Failed to load location details.");
    }

    // Fetch cabinets data
    try {
      const cabinetsData = await fetchCabinetsForLocation(
        locationId,
        selectedLicencee,
        activeMetricsFilter
      );
      setAllCabinets(cabinetsData);
    } catch {
      setAllCabinets([]);
      errors.push("Failed to refresh cabinets.");
    }

    if (errors.length > 0) {
      setError(errors.join(" ") + " Please try again later.");
    }
  } catch {
    setError(
      "An unexpected error occurred during refresh. Please try again later."
    );
  }
};

/**
 * Navigation helper
 */
export const handleBackToLocations = (router: {
  push: (url: string) => void;
}) => {
  router.push("/locations");
};
