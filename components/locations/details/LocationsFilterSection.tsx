/**
 * LocationsFilterSection Component
 *
 * Handles search input and status filters for the locations dashboard.
 */

'use client';

import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import LocationMultiSelect from '@/components/ui/common/LocationMultiSelect';
import type { LocationFilter } from '@/lib/types/location';

type LocationsFilterSectionProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedFilters: LocationFilter[];
  onFilterChange: (filter: LocationFilter, checked: boolean) => void;
  onMultiFilterChange: (filters: LocationFilter[]) => void;
};

const STATUS_OPTIONS = [
  { id: 'SMIBLocationsOnly', name: 'SMIB' },
  { id: 'NoSMIBLocation', name: 'No SMIB' },
  { id: 'LocalServersOnly', name: 'Local Server' },
  { id: 'MembershipOnly', name: 'Membership' },
  { id: 'MissingCoordinates', name: 'Missing Coordinates' },
  { id: 'HasCoordinates', name: 'Has Coordinates' },
];

export default function LocationsFilterSection({
  searchTerm,
  onSearchChange,
  selectedFilters,
  onFilterChange,
  onMultiFilterChange,
}: LocationsFilterSectionProps) {
  return (
    <div className="space-y-4">
      {/* Search and Desktop Filter Bar */}
      <div className="mt-4 flex flex-col md:flex-row items-center gap-4 bg-buttonActive p-4 rounded-lg">
        <div className="relative w-full md:min-w-[250px] md:flex-1">
          <Input
            type="text"
            placeholder="Search locations..."
            className="h-10 w-full rounded-md border border-gray-200 bg-white px-4 pr-10 text-sm focus:ring-2 focus:ring-purple-200"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Desktop Filter Dropdown (below XL) */}
        <div className="hidden md:block xl:hidden">
          <LocationMultiSelect
            locations={STATUS_OPTIONS}
            selectedLocations={selectedFilters as string[]}
            onSelectionChange={(ids) => onMultiFilterChange(ids as LocationFilter[])}
            placeholder="Location Status"
            showSearch={false}
            className="w-[200px]"
          />
        </div>

        {/* XL+ Checkboxes */}
        <div className="hidden xl:flex flex-wrap items-center gap-4">
          {STATUS_OPTIONS.map((opt) => (
            <div key={opt.id} className="flex items-center space-x-2">
              <Checkbox
                id={opt.id}
                checked={selectedFilters.includes(opt.id as LocationFilter)}
                onCheckedChange={(checked) => onFilterChange(opt.id as LocationFilter, checked === true)}
                className="border-white data-[state=checked]:bg-white data-[state=checked]:text-purple-700"
              />
              <Label htmlFor={opt.id} className="text-sm font-medium text-white whitespace-nowrap cursor-pointer">
                {opt.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Checkboxes (Visible only on small screens) */}
      <div className="flex flex-wrap justify-center gap-4 md:hidden">
        {STATUS_OPTIONS.map((opt) => (
          <div key={`${opt.id}-mobile`} className="flex items-center space-x-2">
            <Checkbox
              id={`${opt.id}-mobile`}
              checked={selectedFilters.includes(opt.id as LocationFilter)}
              onCheckedChange={(checked) => onFilterChange(opt.id as LocationFilter, checked === true)}
              className="border-purple-200"
            />
            <Label htmlFor={`${opt.id}-mobile`} className="text-sm font-medium text-gray-700 cursor-pointer">
              {opt.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}



