export type UseCabinetFiltersProps = {
  onFiltersChange?: (
    searchTerm: string,
    selectedLocation: string[],
    selectedGameType: string[],
    selectedStatus: string,
    selectedMembership: string,
    selectedSmibStatus: string
  ) => void;
};

export type UseCabinetFiltersReturn = {
  searchTerm: string;
  selectedLocation: string[];
  selectedGameType: string[];
  selectedStatus: string;
  selectedMembership: string;
  selectedSmibStatus: string;
  setSearchTerm: (term: string) => void;
  setSelectedLocation: (locationIds: string[]) => void;
  setSelectedGameType: (gameTypeIds: string[]) => void;
  setSelectedStatus: (status: string) => void;
  setSelectedMembership: (membership: string) => void;
  setSelectedSmibStatus: (status: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
};

