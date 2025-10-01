/**
 * Cabinets page helper functions for managing section changes, filtering, and data loading
 */

import type { CabinetSection } from "@/lib/constants/cabinets";
import type { GamingMachine as Cabinet } from "@/shared/types/entities";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/**
 * Gets the active section from URL search parameters
 * @param searchParams - Current search parameters
 * @returns The active cabinet section
 */
export function getActiveSectionFromURL(searchParams: URLSearchParams): CabinetSection {
  const section = searchParams.get("section");
  if (section === "movement-requests") return "movement";
  if (section === "smib-firmware") return "firmware";
  if (section === "smib") return "smib";
  return "cabinets";
}

/**
 * Handles section changes with URL updates
 * @param section - The new section to switch to
 * @param searchParams - Current search parameters
 * @param pathname - Current pathname
 * @param router - Next.js router instance
 */
export function handleSectionChange(
  section: CabinetSection,
  searchParams: URLSearchParams,
  pathname: string,
  router: AppRouterInstance
) {
  // Update URL based on section
  const params = new URLSearchParams(searchParams.toString());
  if (section === "cabinets") {
    params.delete("section"); // Default section, no param needed
  } else if (section === "movement") {
    params.set("section", "movement-requests");
  } else if (section === "firmware") {
    params.set("section", "smib-firmware");
  } else if (section === "smib") {
    params.set("section", "smib");
  }

  const newURL = params.toString()
    ? `${pathname}?${params.toString()}`
    : pathname;
  router.push(newURL, { scroll: false });
}

/**
 * Filters cabinets based on search term and selected location
 * @param cabinets - Array of cabinets to filter
 * @param search - Search term
 * @param selectedLocation - Selected location filter
 * @returns Filtered array of cabinets
 */
export function filterCabinets(
  cabinets: Cabinet[],
  search: string,
  selectedLocation: string
): Cabinet[] {
  let filtered = [...cabinets];

  // Filter by location if a specific location is selected
  if (selectedLocation !== "all") {
    filtered = filtered.filter(
      (cab) => cab.locationId === selectedLocation
    );
  }

  // Filter by search term
  if (search.trim()) {
    const searchLower = search.toLowerCase();
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
