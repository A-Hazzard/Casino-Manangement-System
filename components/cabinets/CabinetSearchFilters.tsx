/**
 * Cabinet Search and Filters Component
 * Handles search input, location filtering, and sorting controls
 */

import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Input } from "@/components/ui/input";
import { CustomSelect } from "@/components/ui/custom-select";
import type { CabinetSearchFiltersProps } from "@/lib/types/cabinetDetails";
import type { CabinetSortOption } from "@/lib/hooks/data";

export const CabinetSearchFilters = ({
  searchTerm,
  onSearchChange,
  selectedLocation,
  locations,
  onLocationChange,
  selectedGameType,
  gameTypes,
  onGameTypeChange,
  selectedStatus,
  onStatusChange,
  sortOption,
  sortOrder,
  onSortChange,
  activeSection,
}: CabinetSearchFiltersProps) => {
  // Only show filters for cabinets section
  if (activeSection !== "cabinets") {
    return null;
  }

  // Sort options configuration
  const sortOptions = [
    { value: "moneyIn-desc", label: "Money In (Highest First)" },
    { value: "moneyIn-asc", label: "Money In (Lowest First)" },
    { value: "moneyOut-desc", label: "Money Out (Highest First)" },
    { value: "moneyOut-asc", label: "Money Out (Lowest First)" },
    { value: "gross-desc", label: "Gross Revenue (Highest First)" },
    { value: "gross-asc", label: "Gross Revenue (Lowest First)" },
    { value: "jackpot-desc", label: "Jackpot (Highest First)" },
    { value: "jackpot-asc", label: "Jackpot (Lowest First)" },
    { value: "assetNumber-asc", label: "Asset Number (A to Z)" },
    { value: "assetNumber-desc", label: "Asset Number (Z to A)" },
    { value: "locationName-asc", label: "Location (A to Z)" },
    { value: "locationName-desc", label: "Location (Z to A)" },
    { value: "lastOnline-desc", label: "Last Online (Most Recent)" },
    { value: "lastOnline-asc", label: "Last Online (Oldest First)" },
  ];

  // Location options configuration
  const locationOptions = [
    { value: "all", label: "All Locations" },
    ...locations.map((location) => ({
      value: location._id,
      label: location.name,
    })),
  ];

  // Game type options configuration
  const gameTypeOptions = [
    { value: "all", label: "All Game Types" },
    ...gameTypes.map((gameType) => ({
      value: gameType,
      label: gameType,
    })),
  ];

  // Handle sort change
  const handleSortChange = (value: string) => {
    const [option, order] = value.split("-");
    onSortChange(option as CabinetSortOption, order as "asc" | "desc");
  };

  // Handle location change
  const handleLocationChange = (value: string) => {
    onLocationChange(value);
  };

  // Handle game type change
  const handleGameTypeChange = (value: string) => {
    onGameTypeChange(value);
  };

  // Handle search change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = event.target.value;
    onSearchChange(newSearchTerm);
  };

  return (
    <>
      {/* Mobile: Compact filter layout - 2 rows of 2 filters each + search */}
      <div className="md:hidden mt-4">
        {/* Search Input - Full width */}
        <div className="relative w-full mb-3">
          <Input
            type="text"
            placeholder="Search machines..."
            className="w-full pr-10 bg-white border border-gray-300 rounded-full h-11 px-4 shadow-sm text-gray-700 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive text-base"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>

        {/* Filters Row 1: Location and Game Type */}
        <div className="flex gap-2 mb-2">
          <div className="flex-1">
            <CustomSelect
              value={selectedLocation}
              onValueChange={handleLocationChange}
              options={locationOptions}
              placeholder="All Locations"
              className="w-full"
              triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
              searchable={true}
              emptyMessage="No locations found"
            />
          </div>
          <div className="flex-1">
            <CustomSelect
              value={selectedGameType}
              onValueChange={handleGameTypeChange}
              options={gameTypeOptions}
              placeholder="All Games"
              className="w-full"
              triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
              searchable={true}
              emptyMessage="No game types found"
            />
          </div>
        </div>

        {/* Filters Row 2: Status and Sort */}
        <div className="flex gap-2">
          <div className="flex-1">
            <CustomSelect
              value={selectedStatus}
              onValueChange={onStatusChange}
              options={[
                { value: "All", label: "All Machines" },
                { value: "Online", label: "Online" },
                { value: "Offline", label: "Offline" },
              ]}
              placeholder="All Status"
              className="w-full"
              triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
              searchable={true}
              emptyMessage="No status options found"
            />
          </div>
          <div className="flex-1">
            <CustomSelect
              value={`${sortOption}-${sortOrder}`}
              onValueChange={handleSortChange}
              options={sortOptions}
              placeholder="Sort by"
              className="w-full"
              triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
              searchable={true}
              emptyMessage="No sort options found"
            />
          </div>
        </div>
      </div>

      {/* Desktop: Search Row - Purple box */}
      <div className="hidden md:flex items-center gap-4 p-4 bg-buttonActive rounded-t-lg rounded-b-none mt-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md min-w-0">
          <Input
            type="text"
            placeholder="Search machines..."
            className="w-full pr-10 bg-white border border-gray-300 rounded-md h-9 px-3 text-gray-700 placeholder-gray-400 focus:ring-buttonActive focus:border-buttonActive text-sm"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        </div>

        {/* Location Filter */}
        <select
          value={selectedLocation}
          onChange={(event) => handleLocationChange(event.target.value)}
          className="w-auto max-w-[200px] h-9 rounded-md border border-gray-300 px-3 bg-white text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm truncate"
        >
          {locationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Game Type Filter */}
        <select
          value={selectedGameType}
          onChange={(event) => handleGameTypeChange(event.target.value)}
          className="w-auto max-w-[200px] h-9 rounded-md border border-gray-300 px-3 bg-white text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm truncate"
        >
          {gameTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(event) => onStatusChange(event.target.value)}
          className="w-auto max-w-[150px] h-9 rounded-md border border-gray-300 px-3 bg-white text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm truncate"
        >
          <option value="All">All Machines</option>
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
        </select>
      </div>
    </>
  );
};
