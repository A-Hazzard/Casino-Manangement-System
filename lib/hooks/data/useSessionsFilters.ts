/**
 * Custom hook for managing sessions filtering and search functionality
 * Handles search terms, sorting, and filter state management
 */

import { useState, useCallback, useMemo } from "react";

interface UseSessionsFiltersProps {
  onFiltersChange?: (filters: {
    searchTerm: string;
    sortBy: string;
    sortOrder: "asc" | "desc";
  }) => void;
}

interface UseSessionsFiltersReturn {
  // Filter states
  searchTerm: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  
  // Filter actions
  setSearchTerm: (term: string) => void;
  setSortBy: (field: string) => void;
  setSortOrder: (order: "asc" | "desc") => void;
  handleSort: (field: string) => void;
  clearFilters: () => void;
  
  // Filter utilities
  hasActiveFilters: boolean;
  getSortIcon: (field: string) => string;
}

export function useSessionsFilters({
  onFiltersChange,
}: UseSessionsFiltersProps = {}): UseSessionsFiltersReturn {
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("startTime");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Handle search term changes
  const handleSearchTermChange = useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  // Handle sort field changes
  const handleSortByChange = useCallback((field: string) => {
    setSortBy(field);
  }, []);

  // Handle sort order changes
  const handleSortOrderChange = useCallback((order: "asc" | "desc") => {
    setSortOrder(order);
  }, []);

  // Handle sort toggle (toggle between asc/desc for same field)
  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }, [sortBy]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSortBy("startTime");
    setSortOrder("desc");
  }, []);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return searchTerm.trim() !== "" || sortBy !== "startTime" || sortOrder !== "desc";
  }, [searchTerm, sortBy, sortOrder]);

  // Get sort icon for a field
  const getSortIcon = useCallback((field: string) => {
    if (sortBy !== field) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  }, [sortBy, sortOrder]);

  // Notify parent of filter changes
  useMemo(() => {
    if (onFiltersChange) {
      onFiltersChange({
        searchTerm,
        sortBy,
        sortOrder,
      });
    }
  }, [searchTerm, sortBy, sortOrder, onFiltersChange]);

  return {
    searchTerm,
    sortBy,
    sortOrder,
    setSearchTerm: handleSearchTermChange,
    setSortBy: handleSortByChange,
    setSortOrder: handleSortOrderChange,
    handleSort,
    clearFilters,
    hasActiveFilters,
    getSortIcon,
  };
}
