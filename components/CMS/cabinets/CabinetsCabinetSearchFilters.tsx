/**
 * Cabinets Cabinet Search and Filters Component
 *
 * Provides search input and filter controls for the cabinets list.
 * Renders differently on mobile (scrollable horizontal filters) vs desktop (purple bar).
 *
 * Features:
 * - Text search input with magnifying glass icon
 * - Location filter dropdown
 * - Game type filter dropdown
 * - Status filter (All/Online/Offline)
 * - Sort options dropdown
 * - Responsive design (mobile vs desktop layouts)
 */

import MultiSelectDropdown from '@/components/shared/ui/common/MultiSelectDropdown';
import { CustomSelect } from '@/components/shared/ui/custom-select';
import { Input } from '@/components/shared/ui/input';
import type { CabinetSortOption } from '@/lib/hooks/data';
import type { CabinetsCabinetSearchFiltersProps } from '@/lib/types/cabinet';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

export const CabinetsCabinetSearchFilters = ({
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
}: CabinetsCabinetSearchFiltersProps) => {
  if (activeSection !== 'cabinets') {
    return null;
  }

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
    { value: 'offlineTime-desc', label: 'Offline Time (Longest First)' },
    { value: 'offlineTime-asc', label: 'Offline Time (Shortest First)' },
  ];

  const locationOptions = locations.map(location => ({
    id: String(location._id),
    label: location.name,
  }));

  const gameTypeOptions = gameTypes.map(gameType => ({
    id: gameType,
    label: gameType,
  }));

  const handleSortChange = (value: string) => {
    const [option, order] = value.split('-');
    onSortChange(option as CabinetSortOption, order as 'asc' | 'desc');
  };

  const handleLocationChange = (values: string[]) => {
    console.warn('[CabinetFilters] Location changed to:', values);
    onLocationChange(values);
  };

  const handleGameTypeChange = (values: string[]) => {
    console.warn('[CabinetFilters] Game type changed to:', values);
    onGameTypeChange(values);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  };

  return (
    <>
      {/* Mobile View: Horizontal scrollable filters */}
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
              <div className="w-48 flex-shrink-0">
                <MultiSelectDropdown
                  options={locationOptions}
                  selectedIds={selectedLocation}
                  onChange={handleLocationChange}
                  placeholder="All Locations"
                  label="Locations"
                  searchPlaceholder="Search locations..."
                />
              </div>
            )}
            <div className="w-48 flex-shrink-0">
              <MultiSelectDropdown
                options={gameTypeOptions}
                selectedIds={selectedGameType}
                onChange={handleGameTypeChange}
                placeholder="All Game Types"
                label="Game Types"
                searchPlaceholder="Search game types..."
              />
            </div>
            <div className="w-44 flex-shrink-0 relative">
              <CustomSelect
                value={selectedStatus}
                onValueChange={onStatusChange}
                options={[
                  { value: 'All', label: 'All Status' },
                  { value: 'Online', label: 'Online' },
                  { value: 'OfflineLongest', label: 'Offline (Longest First)' },
                  { value: 'OfflineShortest', label: 'Offline (Shortest First)' },
                  { value: 'NeverOnline', label: 'Never Online' },
                ]}
                placeholder="All Status"
                className="w-full"
                triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                searchable={false}
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
                searchable={false}
                emptyMessage="No sort options found"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop View: Purple search bar with filters */}
      <div className="relative mt-4 hidden rounded-b-none rounded-t-lg bg-buttonActive p-4 md:flex overflow-visible">
        <div className="flex w-full flex-wrap items-center gap-4">
          {/* Search Input */}
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

          {/* Filter Dropdowns */}
          <div className="flex items-center gap-4 flex-wrap">
            {showLocationFilter && (
              <div className="w-auto min-w-[200px] max-w-[250px] flex-shrink-0">
                <MultiSelectDropdown
                  options={locationOptions}
                  selectedIds={selectedLocation}
                  onChange={handleLocationChange}
                  placeholder="All Locations"
                  label="Locations"
                  searchPlaceholder="Search locations..."
                />
              </div>
            )}

            <div className="w-auto min-w-[200px] max-w-[250px] flex-shrink-0">
              <MultiSelectDropdown
                options={gameTypeOptions}
                selectedIds={selectedGameType}
                onChange={handleGameTypeChange}
                placeholder="All Game Types"
                label="Game Types"
                searchPlaceholder="Search game types..."
              />
            </div>

            {/* Status Filter */}
            <div className="w-auto min-w-[180px] max-w-[220px] flex-shrink-0">
              <CustomSelect
                value={selectedStatus}
                onValueChange={onStatusChange}
                options={[
                  { value: 'All', label: 'All Status' },
                  { value: 'Online', label: 'Online' },
                  { value: 'OfflineLongest', label: 'Offline (Longest First)' },
                  { value: 'OfflineShortest', label: 'Offline (Shortest First)' },
                  { value: 'NeverOnline', label: 'Never Online' },
                ]}
                placeholder="All Status"
                className="w-full"
                triggerClassName="h-9 bg-white border border-gray-300 rounded-md px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
                searchable={false}
                emptyMessage="No status options found"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

