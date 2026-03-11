/**
 * Cabinet Filters Types
 * Types for cabinet filtering functionality.
 *
 * Used by useCabinetFilters hook to manage search, location,
 * game type, and status filters for cabinet listings.
 */
export type UseCabinetFiltersProps = {
  onFiltersChange?: (
    searchTerm: string,
    selectedLocation: string[],
    selectedGameType: string[],
    selectedStatus: string
  ) => void;
};

export type UseCabinetFiltersReturn = {
  searchTerm: string;
  selectedLocation: string[];
  selectedGameType: string[];
  selectedStatus: string;
  setSearchTerm: (term: string) => void;
  setSelectedLocation: (locationIds: string[]) => void;
  setSelectedGameType: (gameTypeIds: string[]) => void;
  setSelectedStatus: (status: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
};

