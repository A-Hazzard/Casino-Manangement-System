/**
 * Cabinet Search and Filters Component
 * Handles search input, location filtering, and sorting controls
 */

import { CustomSelect } from '@/components/ui/custom-select';
import LocationSingleSelect from '@/components/ui/common/LocationSingleSelect';
import { Input } from '@/components/ui/input';
import type { CabinetSortOption } from '@/lib/hooks/data';
import type { CabinetSearchFiltersProps } from '@/lib/types/cabinetDetails';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

export const CabinetSearchFilters = ({
  searchTerm,
  onSearchChange,
  selectedLocation,
  locations,
  onLocationChange,
  showLocationFilter,
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
  if (activeSection !== 'cabinets') {
    return null;
  }

  // Sort options configuration
  const sortOptions = [
    { value: 'moneyIn-desc', label: 'Money In (Highest First)' },
    { value: 'moneyIn-asc', label: 'Money In (Lowest First)' },
    { value: 'moneyOut-desc', label: 'Money Out (Highest First)' },
    { value: 'moneyOut-asc', label: 'Money Out (Lowest First)' },
    { value: 'gross-desc', label: 'Gross Revenue (Highest First)' },
    { value: 'gross-asc', label: 'Gross Revenue (Lowest First)' },
    { value: 'jackpot-desc', label: 'Jackpot (Highest First)' },
    { value: 'jackpot-asc', label: 'Jackpot (Lowest First)' },
    { value: 'assetNumber-asc', label: 'Asset Number (A to Z)' },
    { value: 'assetNumber-desc', label: 'Asset Number (Z to A)' },
    { value: 'locationName-asc', label: 'Location (A to Z)' },
    { value: 'locationName-desc', label: 'Location (Z to A)' },
    { value: 'lastOnline-desc', label: 'Last Online (Most Recent)' },
    { value: 'lastOnline-asc', label: 'Last Online (Oldest First)' },
  ];

  const locationSelectItems = locations.map(location => ({
    id: String(location._id),
    name: location.name,
    // Leave sasEnabled undefined to avoid badge display
  }));

  const gameTypeSelectItems = gameTypes.map(gameType => ({
    id: gameType,
    name: gameType,
  }));

  // Handle sort change
  const handleSortChange = (value: string) => {
    const [option, order] = value.split('-');
    onSortChange(option as CabinetSortOption, order as 'asc' | 'desc');
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
      {/* Mobile: Horizontal scrollable filters */}
      <div className="mt-4 md:hidden">
        <div className="relative mb-3 w-full">
          <Input
            type="text"
            placeholder="Search machines..."
            className="h-11 w-full rounded-full border border-gray-300 bg-white px-4 pr-10 text-base text-gray-700 placeholder-gray-400 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="flex gap-2 min-w-max">
            {showLocationFilter && (
              <div className="w-40 flex-shrink-0">
                <LocationSingleSelect
                  locations={locationSelectItems}
                  selectedLocation={selectedLocation}
                  onSelectionChange={handleLocationChange}
                  placeholder="All Locations"
                  includeAllOption={true}
                  dropdownLabel="Select Location"
                  searchPlaceholder="Search locations..."
                  emptyMessage="No locations found"
                  showSasBadge={false}
                  className="w-full"
                />
              </div>
            )}
            <div className="w-40 flex-shrink-0">
              <LocationSingleSelect
                locations={gameTypeSelectItems}
                selectedLocation={selectedGameType}
                onSelectionChange={handleGameTypeChange}
                placeholder="All Game Types"
                includeAllOption={true}
                allOptionLabel="All Game Types"
                dropdownLabel="Select Game Type"
                searchPlaceholder="Search game types..."
                emptyMessage="No game types found"
                showSasBadge={false}
                className="w-full"
              />
            </div>
            <div className="w-32 flex-shrink-0 relative">
            <CustomSelect
              value={selectedStatus}
              onValueChange={onStatusChange}
              options={[
                  { value: 'All', label: 'All Machines' },
                  { value: 'Online', label: 'Online' },
                  { value: 'Offline', label: 'Offline' },
              ]}
              placeholder="All Status"
              className="w-full"
              triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
              searchable={true}
              emptyMessage="No status options found"
            />
          </div>
            <div className="w-40 flex-shrink-0 relative">
            <CustomSelect
              value={`${sortOption}-${sortOrder}`}
              onValueChange={handleSortChange}
              options={sortOptions}
              placeholder="Sort by"
              className="w-full"
                triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm whitespace-nowrap"
              searchable={true}
              emptyMessage="No sort options found"
            />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Search Row - Purple box */}
      <div className="mt-4 hidden rounded-b-none rounded-t-lg bg-buttonActive p-4 md:flex">
        {/* Search Input and Filters on same row */}
        <div className="flex w-full flex-wrap items-center gap-4">
          {/* Search Input - Takes available space */}
          <div className="relative min-w-0 flex-1">
            <Input
              type="text"
              placeholder="Search machines..."
              className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
              value={searchTerm}
              onChange={handleSearchChange}
            />
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

          {/* Filter Buttons - On the right, wrap when needed */}
          <div className="flex items-center gap-4 flex-wrap">
            {showLocationFilter && (
              <div className="w-auto min-w-[180px] max-w-[220px] flex-shrink-0">
                <LocationSingleSelect
                  locations={locationSelectItems}
                  selectedLocation={selectedLocation}
                  onSelectionChange={handleLocationChange}
                  placeholder="All Locations"
                  includeAllOption={true}
                  dropdownLabel="Select Location"
                  searchPlaceholder="Search locations..."
                  emptyMessage="No locations found"
                  showSasBadge={false}
                  className="w-full"
                />
              </div>
            )}

            <div className="w-auto min-w-[180px] max-w-[220px] flex-shrink-0">
              <LocationSingleSelect
                locations={gameTypeSelectItems}
                selectedLocation={selectedGameType}
                onSelectionChange={handleGameTypeChange}
                placeholder="All Game Types"
                includeAllOption={true}
                allOptionLabel="All Game Types"
                dropdownLabel="Select Game Type"
                searchPlaceholder="Search game types..."
                emptyMessage="No game types found"
                showSasBadge={false}
                className="w-full"
              />
            </div>

            {/* Status Filter with Search */}
            <div className="w-auto min-w-[120px] max-w-[150px] flex-shrink-0">
              <CustomSelect
                value={selectedStatus}
                onValueChange={onStatusChange}
                options={[
                  { value: 'All', label: 'All Machines' },
                  { value: 'Online', label: 'Online' },
                  { value: 'Offline', label: 'Offline' },
                ]}
                placeholder="All Status"
                className="w-full"
                triggerClassName="h-9 bg-white border border-gray-300 rounded-md px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                searchable={true}
                emptyMessage="No status options found"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
