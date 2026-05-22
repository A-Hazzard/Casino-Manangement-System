/**
 * CollectionReportFilters Component
 *
 * A robust horizontally-oriented filtering bar for narrowing down collection report lists.
 *
 * Features:
 * - Multi-criteria search (Location names, Report IDs, Serial numbers)
 * - Type-specific filtering (Manual reports vs Scheduled tasks)
 * - Date range selection with custom calendar integration
 * - Real-time "Clear All" capability for reset
 * - Responsive layout: Inline for desktop, stacked for mobile
 * - Informative "No Results" state handling
 * - Location selection dropdown
 * - Search functionality
 * - Uncollected only filter checkbox
 * - Status filters
 * - Clear filters button
 * - GSAP animations for search state
 * - Responsive design
 *
 * @param searchTerm - Active search string for text-based matching
 * @param searchType - Specific field toggle for the search input
 * @param dateRange - Standardized {from, to} date object for temporal filtering
 * @param onSearchChange - Callback for search text updates
 * @param onSearchTypeChange - Callback for switching search categories
 * @param onDateRangeChange - Callback for range selection updates
 * @param onClearFilters - Callback to reset all filter state
 * @param locations - Available locations list
 * @param selectedLocation - Currently selected location
 * @param onLocationChange - Callback when location changes
 * @param search - Current search value
 * @param onSearchChange - Callback when search changes
 * @param onSearchSubmit - Callback when search is submitted
 * @param showUncollectedOnly - Whether to show only uncollected reports
 * @param onShowUncollectedOnlyChange - Callback when uncollected filter changes
 * @param selectedFilters - Currently selected status filters
 * @param onFilterChange - Callback when filter changes
 * @param onClearFilters - Callback to clear all filters
 * @param isSearching - Whether search is in progress
 */
'use client';

import { useRef, useEffect } from 'react';
import { Checkbox } from '@/components/shared/ui/checkbox';
import { Button } from '@/components/shared/ui/button';
import LocationMultiSelect from '@/components/shared/ui/common/LocationMultiSelect';
import UnifiedSearchBar from './UnifiedSearchBar';

import { gsap } from 'gsap';
import type { CollectionReportFiltersProps } from '@/lib/types/components';

export default function CollectionReportFilters({
  locations,
  selectedLocation,
  onLocationChange,
  search,
  onSearchChange,
  searchType,
  onSearchTypeChange,
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

  // ============================================================================
  // State & Hooks
  // ============================================================================
  const filterRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const checkboxRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Effects
  // ============================================================================
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

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div
      ref={filterRef}
      className="flex w-full flex-col gap-y-3 rounded-lg bg-buttonActive p-4 lg:gap-y-4"
    >
      {/* Top row - Search and Location (md: side by side, lg: with Clear Button) */}
      <div className="flex flex-col gap-y-3 md:flex-row md:items-center md:gap-3 lg:gap-4">
        {/* Unified Search Bar */}
        <div className="min-w-0 flex-1 md:max-w-[400px] lg:w-[320px] lg:min-w-[280px] lg:flex-none">
          <UnifiedSearchBar
            searchType={searchType}
            onSearchTypeChange={onSearchTypeChange}
            searchValue={search}
            onSearchChange={onSearchChange}
            onSearchSubmit={onSearchSubmit}
            searchOptions={[
              { value: 'collector', label: 'Collector' },
              { value: 'location', label: 'Location' },
              { value: 'locationReportId', label: 'Report ID' },
              { value: 'locationId', label: 'Location ID' },
              { value: 'collectorId', label: 'Collector ID' },
            ]}
            isSearching={isSearching}
          />
        </div>

        {/* Location Select Dropdown */}
        <LocationMultiSelect
          locations={locations.map(loc => ({
            id: loc._id,
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
            console.warn('[LOCATION SELECT] Value changed to:', value);
            onLocationChange(value.length === 0 ? 'all' : value);
          }}
          placeholder="Select Locations"
          className="w-full md:max-w-[300px] md:flex-1 lg:w-[240px] lg:min-w-[200px] lg:flex-none"
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
                className="border border-white bg-white data-[state=checked]:border-white data-[state=checked]:bg-buttonActive"
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
          <label className="flex cursor-pointer items-center gap-2 font-medium text-white">
            <Checkbox
              id="uncollected-only-mobile"
              checked={showUncollectedOnly}
              onCheckedChange={checked =>
                onShowUncollectedOnlyChange(!!checked)
              }
              className="border border-white bg-white data-[state=checked]:border-white data-[state=checked]:bg-buttonActive"
            />
            <span className="whitespace-nowrap text-sm font-medium">
              SHOW UNCOLLECTED ONLY
            </span>
          </label>
        </div>

        {/* SMIB Filter Checkboxes - Better layout for md screens */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="smibFilter"
              checked={selectedFilters.includes('SMIBLocationsOnly')}
              onCheckedChange={checked =>
                onFilterChange('SMIBLocationsOnly', !!checked)
              }
              className="border border-white bg-white data-[state=checked]:border-white data-[state=checked]:bg-buttonActive"
            />
            <label
              htmlFor="smibFilter"
              className="cursor-pointer whitespace-nowrap text-sm font-medium text-white"
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
              className="border border-white bg-white data-[state=checked]:border-white data-[state=checked]:bg-buttonActive"
            />
            <label
              htmlFor="noSmibFilter"
              className="cursor-pointer whitespace-nowrap text-sm font-medium text-white"
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
              className="border border-white bg-white data-[state=checked]:border-white data-[state=checked]:bg-buttonActive"
            />
            <label
              htmlFor="localServerFilter"
              className="cursor-pointer whitespace-nowrap text-sm font-medium text-white"
            >
              Local Server
            </label>
          </div>

          {/* Clear Filters Button - Better positioning on md */}
          <div className="flex w-full items-center sm:ml-auto sm:w-auto">
            <Button
              variant="outline"
              onClick={onClearFilters}
              className="w-full whitespace-nowrap border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 sm:w-auto"
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
