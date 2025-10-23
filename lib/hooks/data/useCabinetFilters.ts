/**
 * Custom hook for managing cabinet search and filter state
 * Handles search term, location filter, and filter logic
 */

import { useState, useCallback, useEffect } from "react";
import type {
  UseCabinetFiltersProps,
  UseCabinetFiltersReturn,
} from "@/lib/types/cabinetFilters";

export function useCabinetFilters({
  onFiltersChange,
}: UseCabinetFiltersProps = {}): UseCabinetFiltersReturn {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedGameType, setSelectedGameType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedLocation("all");
    setSelectedGameType("all");
    setSelectedStatus("All");
  }, []);

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedLocation !== "all" ||
    selectedGameType !== "all" ||
    selectedStatus !== "All";

  // Handle search term changes
  const handleSearchTermChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Handle location filter changes
  const handleLocationChange = useCallback((location: string) => {
    setSelectedLocation(location);
  }, []);

  // Handle game type filter changes
  const handleGameTypeChange = useCallback((gameType: string) => {
    setSelectedGameType(gameType);
  }, []);

  // Handle status filter changes
  const handleStatusChange = useCallback((status: string) => {
    setSelectedStatus(status);
  }, []);

  // Notify parent of filter changes
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(
        searchTerm,
        selectedLocation,
        selectedGameType,
        selectedStatus
      );
    }
  }, [
    searchTerm,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    onFiltersChange,
  ]);

  return {
    searchTerm,
    selectedLocation,
    selectedGameType,
    selectedStatus,
    setSearchTerm: handleSearchTermChange,
    setSelectedLocation: handleLocationChange,
    setSelectedGameType: handleGameTypeChange,
    setSelectedStatus: handleStatusChange,
    clearFilters,
    hasActiveFilters,
  };
}
