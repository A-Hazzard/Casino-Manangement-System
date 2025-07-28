// UI-related utility functions

import { gsap } from "gsap";
import { Cabinet, CabinetSortOption } from "@/lib/types/cabinets";
import { RefObject } from "react";

/**
 * Calculates the visible page numbers for pagination
 */
export const getVisiblePages = (currentPage: number, totalPages: number) => {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i);
  if (currentPage <= 2) return [0, 1, 2, 3, 4];
  if (currentPage >= totalPages - 3)
    return [
      totalPages - 5,
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
    ];
  return [
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
  ];
};

/**
 * Handles basic pagination controls
 */
export const getPaginationControls = (
  currentPage: number,
  totalPages: number
) => {
  return {
    handleFirstPage: () => 0,
    handleLastPage: () => totalPages - 1,
    handlePrevPage: () => (currentPage > 0 ? currentPage - 1 : currentPage),
    handleNextPage: () =>
      currentPage < totalPages - 1 ? currentPage + 1 : currentPage,
  };
};

/**
 * Animates table rows when data changes
 */
export const animateTableRows = (
  tableRef: RefObject<HTMLDivElement | null>
) => {
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
};

/**
 * Animates cards when data changes
 */
export const animateCards = (cardsRef: RefObject<HTMLDivElement | null>) => {
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
};

/**
 * Highlights elements when search is applied
 */
export const highlightSearchResults = (
  ref: RefObject<HTMLDivElement | null>,
  searchActive: boolean
) => {
  if (ref.current && searchActive) {
    gsap.to(ref.current, {
      backgroundColor: "rgba(59, 130, 246, 0.05)",
      duration: 0.2,
      onComplete: () => {
        gsap.to(ref.current, {
          backgroundColor: "transparent",
          duration: 0.5,
        });
      },
    });
  }
};

/**
 * Animates sort direction change
 */
export const animateSortDirection = (sortOrder: "asc" | "desc") => {
  const sortIconElement = document.querySelector(".sort-icon");
  if (sortIconElement) {
    gsap.to(sortIconElement, {
      rotation: sortOrder === "desc" ? 0 : 180,
      duration: 0.3,
      ease: "back.out(1.7)",
    });
  }
};

/**
 * Animates column header when sorting
 */
export const animateColumnSort = (
  tableRef: RefObject<HTMLDivElement | null>,
  column: CabinetSortOption
) => {
  if (tableRef.current) {
    const headers = tableRef.current.querySelectorAll("th");
    const targetHeader = Array.from(headers).find((header) =>
      header.textContent?.includes(column.toUpperCase())
    );

    if (targetHeader) {
      gsap.fromTo(
        targetHeader,
        { backgroundColor: "#008000" },
        {
          backgroundColor: "#142E44",
          duration: 0.5,
          ease: "power2.out",
        }
      );
    }
  }
};

/**
 * Handle sort option changes
 */
export const handleColumnSort = (
  column: CabinetSortOption,
  currentSortOption: CabinetSortOption,
  currentSortOrder: "asc" | "desc",
  setSortOption: (_option: CabinetSortOption) => void,
  setSortOrder: (_order: "asc" | "desc") => void
) => {
  if (currentSortOption === column) {
    // Toggle sort order if clicking the same column
    setSortOrder(currentSortOrder === "desc" ? "asc" : "desc");
  } else {
    // Set new sort column and default to descending order
    setSortOption(column);
    setSortOrder("desc");
  }
};

/**
 * Sort cabinets by the specified option and order
 */
export const sortCabinets = (
  cabinets: Cabinet[],
  sortOption: CabinetSortOption,
  sortOrder: "asc" | "desc"
) => {
  return [...cabinets].sort((a, b) => {
    const order = sortOrder === "desc" ? -1 : 1;
    const aValue = a[sortOption] || 0;
    const bValue = b[sortOption] || 0;
    return (aValue > bValue ? 1 : -1) * order;
  });
};

/**
 * Filter and sort cabinets based on search term and sort options
 */
export const filterAndSortCabinets = (
  allCabinets: Cabinet[],
  searchTerm: string,
  sortOption: CabinetSortOption,
  sortOrder: "asc" | "desc"
) => {
  if (!allCabinets || allCabinets.length === 0) {
    return [];
  }

  let filtered = [...allCabinets];

  // Apply search term filter
  if (searchTerm.trim()) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter(
      (cab) =>
        cab.assetNumber?.toLowerCase().includes(searchLower) ||
        cab.smbId?.toLowerCase().includes(searchLower) ||
        cab.serialNumber?.toLowerCase().includes(searchLower) ||
        cab.game?.toLowerCase().includes(searchLower)
    );
  }

  // Apply sorting
  filtered.sort((a, b) => {
    const order = sortOrder === "desc" ? -1 : 1;
    let valA = a[sortOption] as string | number | undefined;
    let valB = b[sortOption] as string | number | undefined;

    // Handle null/undefined specifically for sorting, treating them as lowest value
    const aIsNull = valA === null || valA === undefined;
    const bIsNull = valB === null || valB === undefined;
    if (aIsNull && bIsNull) return 0;
    if (aIsNull) return -1 * order; // nulls/undefined first in asc, last in desc
    if (bIsNull) return 1 * order;

    // Specific type comparisons
    if (sortOption === "assetNumber") {
      // Ensure string comparison
      valA = String(valA);
      valB = String(valB);
      return valA.localeCompare(valB) * order;
    } else {
      // Default to numeric comparison for moneyIn, gross, etc.
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return (valA - valB) * order;
    }
  });

  return filtered;
};
