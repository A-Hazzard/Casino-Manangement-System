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
import { CustomSelect } from '@/components/shared/ui/custom-select';
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
  selectedStatus: string;
  onStatusChange: (status: string) => void;
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
  selectedStatus,
  onStatusChange,
}: LocationsDetailsFilterSectionProps) {
  return (
    <div className="space-y-4">
      {/* Search and Desktop Filter Bar */}
      <div className="flex flex-col items-center gap-4 rounded-t-lg bg-buttonActive p-4 md:flex-row">
        <div className="relative w-full md:w-[320px]">
          <Input
            type="text"
            placeholder="Search locations..."
            className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 pr-9 text-sm focus:ring-2 focus:ring-purple-200"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Combined Status and Location Type Dropdowns Container */}
        <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto">
          {/* Status Dropdown */}
          <div className="w-full sm:w-[180px]">
            <CustomSelect
              value={selectedStatus}
              onValueChange={onStatusChange}
              options={[
                { value: 'All', label: 'All Status' },
                { value: 'Online', label: 'Online' },
                { value: 'OfflineLongest', label: 'Offline (Longest First)' },
                { value: 'OfflineShortest', label: 'Offline (Shortest First)' },
                { value: 'NeverOnline', label: 'Never Online' },
                { value: 'Archived', label: 'Archived' },
              ]}
              placeholder="All Status"
              className="w-full"
              triggerClassName="h-9 bg-white border border-gray-200 rounded-md px-3 text-gray-700 focus:ring-2 focus:ring-purple-200 text-sm"
              searchable={false}
            />
          </div>

          {/* Location Type Dropdown (hidden on XL, visible on other breakpoints) */}
          <div className="w-full sm:w-[180px] xl:hidden">
            <LocationMultiSelect
              locations={STATUS_OPTIONS}
              selectedLocations={selectedFilters as string[]}
              onSelectionChange={ids =>
                onMultiFilterChange(ids as LocationFilter[])
              }
              placeholder="Location Type"
              showSearch={false}
              className="w-full"
            />
          </div>
        </div>

        {/* XL+ Checkboxes - Organized in logical groups */}
        <div className="hidden flex-1 flex-wrap items-center gap-x-8 gap-y-2 xl:flex">
          {/* Connection Group */}
          <div className="flex items-center gap-4 border-r border-white/30 pr-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">Connection</span>
            {STATUS_OPTIONS.slice(0, 3).map(opt => (
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

          {/* Features Group */}
          <div className="flex items-center gap-4 border-r border-white/30 pr-6">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">Features</span>
            {STATUS_OPTIONS.slice(3, 4).map(opt => (
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

          {/* Quality Group */}
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/70">Quality</span>
            {STATUS_OPTIONS.slice(4).map(opt => (
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
      </div>

      {/* Mobile Checkboxes (Visible only on small screens) */}
      <div className="bg-buttonActive p-4 rounded-lg md:hidden">
        <div className="flex flex-wrap justify-center gap-4">
          {STATUS_OPTIONS.map(opt => (
            <div key={`${opt.id}-mobile`} className="flex items-center space-x-2">
              <Checkbox
                id={`${opt.id}-mobile`}
                checked={selectedFilters.includes(opt.id as LocationFilter)}
                onCheckedChange={checked =>
                  onFilterChange(opt.id as LocationFilter, checked === true)
                }
                className="border-white data-[state=checked]:bg-white data-[state=checked]:text-purple-700"
              />
              <Label
                htmlFor={`${opt.id}-mobile`}
                className="cursor-pointer text-sm font-medium text-white"
              >
                {opt.name}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

