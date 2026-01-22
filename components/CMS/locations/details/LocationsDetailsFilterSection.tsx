/**
 * LocationsDetailsFilterSection Component
 *
 * Handles search input and status filters for the locations dashboard.
 * 
 * @param props - Component props
 */

'use client';

import { Checkbox } from '@/components/shared/ui/checkbox';
import LocationMultiSelect from '@/components/shared/ui/common/LocationMultiSelect';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import type { LocationFilter } from '@/lib/types/location';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

type LocationsDetailsFilterSectionProps = {
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

export default function LocationsDetailsFilterSection({
  searchTerm,
  onSearchChange,
  selectedFilters,
  onFilterChange,
  onMultiFilterChange,
}: LocationsDetailsFilterSectionProps) {
  return (
    <div className="space-y-4">
      {/* Search and Desktop Filter Bar */}
      <div className="flex flex-col items-center gap-4 rounded-t-lg bg-buttonActive p-4 md:flex-row">
        <div className="relative w-full md:w-[400px]">
          <Input
            type="text"
            placeholder="Search locations..."
            className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 pr-9 text-sm focus:ring-2 focus:ring-purple-200"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Desktop Filter Dropdown (below XL) */}
        <div className="hidden md:block xl:hidden">
          <LocationMultiSelect
            locations={STATUS_OPTIONS}
            selectedLocations={selectedFilters as string[]}
            onSelectionChange={ids =>
              onMultiFilterChange(ids as LocationFilter[])
            }
            placeholder="Location Type"
            showSearch={false}
            className="w-[200px]"
          />
        </div>

        {/* XL+ Checkboxes */}
        <div className="hidden flex-shrink-0 flex-wrap items-center gap-3 xl:flex">
          {STATUS_OPTIONS.map(opt => (
            <div key={opt.id} className="flex items-center space-x-2">
              <Checkbox
                id={opt.id}
                checked={selectedFilters.includes(opt.id as LocationFilter)}
                onCheckedChange={checked =>
                  onFilterChange(opt.id as LocationFilter, checked === true)
                }
                className="border-white data-[state=checked]:bg-white data-[state=checked]:text-purple-700"
              />
              <Label
                htmlFor={opt.id}
                className="cursor-pointer whitespace-nowrap text-sm font-medium text-white"
              >
                {opt.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Checkboxes (Visible only on small screens) */}
      <div className="flex flex-wrap justify-center gap-4 md:hidden">
        {STATUS_OPTIONS.map(opt => (
          <div key={`${opt.id}-mobile`} className="flex items-center space-x-2">
            <Checkbox
              id={`${opt.id}-mobile`}
              checked={selectedFilters.includes(opt.id as LocationFilter)}
              onCheckedChange={checked =>
                onFilterChange(opt.id as LocationFilter, checked === true)
              }
              className="border-purple-200"
            />
            <Label
              htmlFor={`${opt.id}-mobile`}
              className="cursor-pointer text-sm font-medium text-gray-700"
            >
              {opt.name}
            </Label>
          </div>
        ))}
      </div>
    </div>
  );
}

