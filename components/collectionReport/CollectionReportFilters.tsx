'use client';

import React, { useRef, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import LocationSingleSelect from '@/components/ui/common/LocationSingleSelect';

import { gsap } from 'gsap';
import type { CollectionReportFiltersProps } from '@/lib/types/components';

export default function CollectionReportFilters({
  locations,
  selectedLocation,
  onLocationChange,
  search,
  onSearchChange,
  onSearchSubmit,
  showUncollectedOnly,
  onShowUncollectedOnlyChange,
  selectedFilters,
  onFilterChange,
  onClearFilters,
  isSearching,
}: CollectionReportFiltersProps) {
  console.warn('[COLLECTION REPORT FILTERS] Component rendered with:');
  console.warn(`  - selectedLocation: "${selectedLocation}"`);
  console.warn(`  - locations count: ${locations.length}`);
  console.warn(`  - search: "${search}"`);
  console.warn(`  - showUncollectedOnly: ${showUncollectedOnly}`);
  const filterRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const checkboxRef = useRef<HTMLDivElement>(null);

  // Search animation
  useEffect(() => {
    if (isSearching && filterRef.current) {
      gsap.fromTo(
        filterRef.current,
        { backgroundColor: '#6a11cb' },
        {
          backgroundColor: '#5119e9',
          duration: 0.5,
          ease: 'power2.out',
        }
      );
    }
  }, [isSearching]);

  // Location select animation
  useEffect(() => {
    if (selectRef.current) {
      gsap.fromTo(
        selectRef.current,
        { scale: 0.95 },
        {
          scale: 1,
          duration: 0.3,
          ease: 'back.out(1.7)',
        }
      );
    }
  }, [selectedLocation]);

  // Checkbox animation
  useEffect(() => {
    if (checkboxRef.current) {
      gsap.fromTo(
        checkboxRef.current,
        { scale: 0.9 },
        {
          scale: 1,
          duration: 0.3,
          ease: 'back.out(1.7)',
        }
      );
    }
  }, [showUncollectedOnly]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchSubmit();
    }
  };

  return (
    <div
      ref={filterRef}
      className="flex w-full flex-col gap-y-3 border border-gray-200 bg-white p-4 lg:gap-y-4 lg:bg-buttonActive"
    >
      {/* Top row - Search, Location, and Clear Button (only on lg and above) */}
      <div className="flex flex-col gap-y-3 md:flex-row md:flex-wrap lg:items-center lg:gap-4">
        {/* Search Input */}
        <div className="relative w-full md:flex-1 md:min-w-[200px] lg:w-[320px] lg:flex-none lg:min-w-[280px]">
          <input
            type="text"
            placeholder="Search Collector or Location..."
            className="w-full rounded-md border border-black bg-white px-4 py-2 pr-10 text-sm"
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button
            onClick={onSearchSubmit}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-700"
          >
            <MagnifyingGlassIcon className="h-5 w-5 text-black" />
          </button>
        </div>

        {/* Location Select Dropdown */}
        <LocationSingleSelect
          locations={locations.map(loc => ({
            id: loc._id,
            name: loc.name,
            sasEnabled: false,
          }))}
          selectedLocation={selectedLocation}
          onSelectionChange={value => {
            console.warn('[LOCATION SELECT] Value changed to:', value);
            onLocationChange(value);
          }}
          placeholder="Select Location"
          className="w-full md:flex-1 md:min-w-[200px] lg:w-[240px] lg:flex-none lg:min-w-[200px]"
          includeAllOption={true}
        />

        {/* Clear Filters Button - only visible on lg and above */}
        <div className="hidden items-center gap-4 lg:flex">
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="whitespace-nowrap border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900"
          >
            Clear Filters
          </Button>

          {/* Uncollected Only Checkbox - positioned to the right of Clear Filters on lg and above */}
          <div ref={checkboxRef} className="flex items-center">
            <label className="flex cursor-pointer items-center gap-2 font-medium text-white">
              <Checkbox
                id="uncollected-only"
                checked={showUncollectedOnly}
                onCheckedChange={checked =>
                  onShowUncollectedOnlyChange(!!checked)
                }
                className="border border-buttonActive bg-white data-[state=checked]:bg-buttonActive"
              />
              <span className="whitespace-nowrap text-sm font-medium">
                SHOW UNCOLLECTED ONLY
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Bottom row - Checkboxes and Clear Button (for mobile and tablet) */}
      <div className="flex flex-col gap-y-3 lg:hidden">
        {/* Uncollected Only Checkbox - only visible on mobile and tablet */}
        <div ref={checkboxRef} className="flex w-full items-center">
          <label className="flex cursor-pointer items-center gap-2 font-medium text-black">
            <Checkbox
              id="uncollected-only-mobile"
              checked={showUncollectedOnly}
              onCheckedChange={checked =>
                onShowUncollectedOnlyChange(!!checked)
              }
              className="border border-buttonActive bg-white data-[state=checked]:bg-buttonActive"
            />
            <span className="whitespace-nowrap text-sm font-medium">
              SHOW UNCOLLECTED ONLY
            </span>
          </label>
        </div>

        {/* SMIB Filter Checkboxes - Flexible layout */}
        <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="smibFilter"
              checked={selectedFilters.includes('SMIBLocationsOnly')}
              onCheckedChange={checked =>
                onFilterChange('SMIBLocationsOnly', !!checked)
              }
              className="border border-buttonActive bg-white data-[state=checked]:bg-buttonActive"
            />
            <label
              htmlFor="smibFilter"
              className="cursor-pointer whitespace-nowrap text-sm font-medium text-black lg:text-white"
            >
              SMIB
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="noSmibFilter"
              checked={selectedFilters.includes('NoSMIBLocation')}
              onCheckedChange={checked =>
                onFilterChange('NoSMIBLocation', !!checked)
              }
              className="border border-buttonActive bg-white data-[state=checked]:bg-buttonActive"
            />
            <label
              htmlFor="noSmibFilter"
              className="cursor-pointer whitespace-nowrap text-sm font-medium text-black lg:text-white"
            >
              No SMIB
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="localServerFilter"
              checked={selectedFilters.includes('LocalServersOnly')}
              onCheckedChange={checked =>
                onFilterChange('LocalServersOnly', !!checked)
              }
              className="border border-buttonActive bg-white data-[state=checked]:bg-buttonActive"
            />
            <label
              htmlFor="localServerFilter"
              className="cursor-pointer whitespace-nowrap text-sm font-medium text-black lg:text-white"
            >
              Local Server
            </label>
          </div>

          {/* Clear Filters Button - flexible positioning on md, full width on mobile */}
          <div className="flex w-full md:w-auto md:flex-1 md:min-w-[120px] items-center">
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="w-full whitespace-nowrap border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
