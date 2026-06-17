/**
 * LocationsPageFilterSection Component
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

type LocationsPageFilterSectionProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedFilters: LocationFilter[];
  onFilterChange: (filter: LocationFilter, checked: boolean) => void;
  onMultiFilterChange: (filters: LocationFilter[]) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
};

const STATUS_OPTIONS = [
  { id: 'FullSMIBs', name: 'Full SMIB' },
  { id: 'SemiSMIBs', name: 'Semi SMIB' },
  { id: 'NoSMIBLocation', name: 'No SMIB' },
  { id: 'LocalServersOnly', name: 'Local Server' },
  { id: 'MembershipOnly', name: 'Membership' },
  { id: 'MissingCoordinates', name: 'Missing Coordinates' },
  { id: 'HasCoordinates', name: 'Has Coordinates' },
];

export default function LocationsPageFilterSection({
  searchTerm,
  onSearchChange,
  selectedFilters,
  onFilterChange,
  onMultiFilterChange,
  selectedStatus,
  onStatusChange,
}: LocationsPageFilterSectionProps) {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="space-y-4">
      {/* Search and Desktop Filter Bar */}
      <div className="flex flex-col gap-4 rounded-t-lg bg-buttonActive p-4">
        {/* Top Row: Search Input, Status Dropdown, and Location Type */}
        <div className="flex w-full flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative w-full md:max-w-[240px] lg:max-w-[280px] xl:max-w-[320px] 2xl:max-w-[360px]">
            <Input
              type="text"
              placeholder="Search locations..."
              className="h-9 w-full rounded-md border border-gray-200 bg-white px-3 pr-9 text-sm focus:ring-2 focus:ring-purple-200"
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
            />
            <MagnifyingGlassIcon className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>

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

          {/* Location Type Dropdown (hidden on 2XL, visible on other breakpoints) */}
          <div className="w-full sm:w-[180px] 2xl:hidden">
            <LocationMultiSelect
              locations={STATUS_OPTIONS}
              selectedLocations={selectedFilters as string[]}
              onSelectionChange={ids =>
                onMultiFilterChange(ids as LocationFilter[])
              }
              placeholder="Location Type"
              showSearch={false}
              showSasBadge={false}
              className="w-full"
            />
          </div>
        </div>

        {/* Bottom Row: 2XL+ Toolbar Checkboxes */}
        <div className="hidden flex-wrap items-center gap-x-6 gap-y-2 2xl:flex">
          {/* Connection Group */}
          <div className="flex items-center gap-4">
            {STATUS_OPTIONS.slice(0, 4).map(opt => (
              <div key={opt.id} className="flex items-center space-x-2.5">
                <Checkbox
                  id={opt.id}
                  checked={selectedFilters.includes(opt.id as LocationFilter)}
                  onCheckedChange={checked =>
                    onFilterChange(opt.id as LocationFilter, checked === true)
                  }
                  className="h-4 w-4 border-white/40 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-purple-700"
                />
                <Label
                  htmlFor={opt.id}
                  className="cursor-pointer whitespace-nowrap text-[13px] font-semibold text-white/90 transition-colors hover:text-white"
                >
                  {opt.name}
                </Label>
              </div>
            ))}
          </div>

          <div className="h-6 w-[1px] bg-white/20" />

          {/* Features Group */}
          <div className="flex items-center gap-4">
            {STATUS_OPTIONS.slice(4, 5).map(opt => (
              <div key={opt.id} className="flex items-center space-x-2.5">
                <Checkbox
                  id={opt.id}
                  checked={selectedFilters.includes(opt.id as LocationFilter)}
                  onCheckedChange={checked =>
                    onFilterChange(opt.id as LocationFilter, checked === true)
                  }
                  className="h-4 w-4 border-white/40 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-purple-700"
                />
                <Label
                  htmlFor={opt.id}
                  className="cursor-pointer whitespace-nowrap text-[13px] font-semibold text-white/90 transition-colors hover:text-white"
                >
                  {opt.name}
                </Label>
              </div>
            ))}
          </div>

          <div className="h-6 w-[1px] bg-white/20" />

          {/* Quality Group */}
          <div className="flex items-center gap-4">
            {STATUS_OPTIONS.slice(5).map(opt => (
              <div key={opt.id} className="flex items-center space-x-2.5">
                <Checkbox
                  id={opt.id}
                  checked={selectedFilters.includes(opt.id as LocationFilter)}
                  onCheckedChange={checked =>
                    onFilterChange(opt.id as LocationFilter, checked === true)
                  }
                  className="h-4 w-4 border-white/40 data-[state=checked]:border-white data-[state=checked]:bg-white data-[state=checked]:text-purple-700"
                />
                <Label
                  htmlFor={opt.id}
                  className="cursor-pointer whitespace-nowrap text-[13px] font-semibold text-white/90 transition-colors hover:text-white"
                >
                  {opt.name}
                </Label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
