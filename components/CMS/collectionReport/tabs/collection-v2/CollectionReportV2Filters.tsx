'use client';

import { Button } from '@/components/shared/ui/button';
import LocationMultiSelect from '@/components/shared/ui/common/LocationMultiSelect';
import UnifiedSearchBar from '../collection/UnifiedSearchBar';
import type { LocationSelectItem } from '@/lib/types/location';

type V2FiltersProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchType: 'collector' | 'location' | 'sessionId' | 'locationId';
  onSearchTypeChange: (
    value: 'collector' | 'location' | 'sessionId' | 'locationId'
  ) => void;
  locations: LocationSelectItem[];
  selectedLocation: string | string[];
  onLocationChange: (value: string | string[]) => void;
  onClearFilters: () => void;
};

export default function CollectionReportV2Filters({
  search,
  onSearchChange,
  searchType,
  onSearchTypeChange,
  locations,
  selectedLocation,
  onLocationChange,
  onClearFilters,
}: V2FiltersProps) {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="flex w-full flex-col gap-y-3 rounded-lg bg-buttonActive p-4 lg:gap-y-4">
      {/* Top row - Search and Location */}
      <div className="flex flex-col gap-y-3 md:flex-row md:items-center md:gap-3 lg:gap-4">
        {/* Unified Search Bar */}
        <div className="min-w-0 flex-1 md:max-w-[400px] lg:w-[320px] lg:min-w-[280px] lg:flex-none">
          <UnifiedSearchBar
            searchType={searchType}
            onSearchTypeChange={onSearchTypeChange}
            searchValue={search}
            onSearchChange={onSearchChange}
            searchOptions={[
              { value: 'collector', label: 'Collector' },
              { value: 'location', label: 'Location' },
              { value: 'sessionId', label: 'Session ID' },
              { value: 'locationId', label: 'Location ID' },
            ]}
          />
        </div>

        {/* Location Multi Select Dropdown */}
        <LocationMultiSelect
          locations={locations.map(loc => ({
            id: String(loc._id),
            name: loc.name,
            sasEnabled: false,
          }))}
          selectedLocations={
            Array.isArray(selectedLocation)
              ? selectedLocation
              : selectedLocation === 'all'
                ? []
                : [selectedLocation]
          }
          onSelectionChange={value => {
            onLocationChange(value.length === 0 ? 'all' : value);
          }}
          placeholder="Select Locations"
          className="w-full md:max-w-[300px] md:flex-1 lg:w-[240px] lg:min-w-[200px] lg:flex-none"
        />

        {/* Clear Filters (desktop) */}
        <div className="hidden items-center gap-4 lg:flex">
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="whitespace-nowrap border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Bottom row - Clear Button (mobile and tablet) */}
      <div className="flex flex-col gap-y-3 lg:hidden">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="whitespace-nowrap border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
