export type UseCabinetFiltersProps = {
  onFiltersChange?: (
    searchTerm: string,
    selectedLocation: string,
    selectedGameType: string,
    selectedStatus: string
  ) => void;
};

export type UseCabinetFiltersReturn = {
  searchTerm: string;
  selectedLocation: string;
  selectedGameType: string;
  selectedStatus: string;
  setSearchTerm: (term: string) => void;
  setSelectedLocation: (location: string) => void;
  setSelectedGameType: (gameType: string) => void;
  setSelectedStatus: (status: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
};
