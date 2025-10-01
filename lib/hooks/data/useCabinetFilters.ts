/**
 * Custom hook for managing cabinet search and filter state
 * Handles search term, location filter, and filter logic
 */

import { useState, useCallback, useEffect } from "react";

interface UseCabinetFiltersProps {
  onFiltersChange?: (
    searchTerm: string,
    selectedLocation: string,
    selectedGameType: string
  ) => void;
}

interface UseCabinetFiltersReturn {
  searchTerm: string;
  selectedLocation: string;
  selectedGameType: string;
  setSearchTerm: (term: string) => void;
  setSelectedLocation: (location: string) => void;
  setSelectedGameType: (gameType: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function useCabinetFilters({
  onFiltersChange,
}: UseCabinetFiltersProps = {}): UseCabinetFiltersReturn {
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedGameType, setSelectedGameType] = useState<string>("all");

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedLocation("all");
    setSelectedGameType("all");
  }, []);

  // Check if any filters are active
  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedLocation !== "all" ||
    selectedGameType !== "all";

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

  // Notify parent of filter changes
  useEffect(() => {
    if (onFiltersChange) {
      onFiltersChange(searchTerm, selectedLocation, selectedGameType);
    }
  }, [searchTerm, selectedLocation, selectedGameType, onFiltersChange]);

  return {
    searchTerm,
    selectedLocation,
    selectedGameType,
    setSearchTerm: handleSearchTermChange,
    setSelectedLocation: handleLocationChange,
    setSelectedGameType: handleGameTypeChange,
    clearFilters,
    hasActiveFilters,
  };
}
