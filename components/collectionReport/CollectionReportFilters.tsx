"use client";

import React, { useRef, useEffect } from "react";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

import { CustomSelect } from "@/components/ui/custom-select";

import { gsap } from "gsap";
import type { CollectionReportFiltersProps } from "@/lib/types/components";

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
  const filterRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const checkboxRef = useRef<HTMLDivElement>(null);

  // Search animation
  useEffect(() => {
    if (isSearching && filterRef.current) {
      gsap.fromTo(
        filterRef.current,
        { backgroundColor: "#6a11cb" },
        {
          backgroundColor: "#5119e9",
          duration: 0.5,
          ease: "power2.out",
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
          ease: "back.out(1.7)",
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
          ease: "back.out(1.7)",
        }
      );
    }
  }, [showUncollectedOnly]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearchSubmit();
    }
  };

  return (
    <div
      ref={filterRef}
      className="rounded-t-lg p-4 w-full border border-gray-200 bg-white lg:bg-buttonActive flex flex-col gap-y-3 lg:gap-y-4"
    >
      {/* Top row - Search, Location, and Clear Button (only on lg and above) */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-y-3 lg:gap-4">
        {/* Search Input */}
        <div className="relative w-full lg:w-[320px] lg:min-w-[280px]">
          <input
            type="text"
            placeholder="Search Collector or Location..."
            className="w-full px-4 py-2 rounded-md border border-black text-sm pr-10 bg-white"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button
            onClick={onSearchSubmit}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <MagnifyingGlassIcon className="w-5 h-5 text-black" />
          </button>
        </div>

        {/* Location Select Dropdown */}
        <CustomSelect
          value={selectedLocation}
          onValueChange={onLocationChange}
          options={[
            { value: "all", label: "Select Location" },
            ...locations.map((loc) => ({
              value: loc._id,
              label: loc.name,
            })),
          ]}
          placeholder="Select Location"
          className="w-full lg:w-[240px] lg:min-w-[200px]"
          triggerClassName="px-4 py-2 rounded-md text-sm border border-black bg-white"
          searchable={true}
          emptyMessage="No locations found"
        />

        {/* Clear Filters Button - only visible on lg and above */}
        <div className="hidden lg:flex items-center">
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 whitespace-nowrap"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Bottom row - Checkboxes and Clear Button (for xl and below lg) */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-y-3 lg:gap-4">
        {/* Uncollected Only Checkbox */}
        <div ref={checkboxRef} className="flex items-center w-full lg:w-auto">
          <label className="flex items-center gap-2 font-medium text-black lg:text-white cursor-pointer">
            <Checkbox
              id="uncollected-only"
              checked={showUncollectedOnly}
              onCheckedChange={(checked) =>
                onShowUncollectedOnlyChange(!!checked)
              }
              className="bg-white data-[state=checked]:bg-buttonActive border border-buttonActive"
            />
            <span className="text-sm font-medium whitespace-nowrap">
              SHOW UNCOLLECTED ONLY
            </span>
          </label>
        </div>

        {/* SMIB Filter Checkboxes */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="smibFilter"
              checked={selectedFilters.includes("SMIBLocationsOnly")}
              onCheckedChange={(checked) =>
                onFilterChange("SMIBLocationsOnly", !!checked)
              }
              className="bg-white data-[state=checked]:bg-buttonActive border border-buttonActive"
            />
            <label
              htmlFor="smibFilter"
              className="text-black lg:text-white text-sm font-medium whitespace-nowrap cursor-pointer"
            >
              SMIB
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="noSmibFilter"
              checked={selectedFilters.includes("NoSMIBLocation")}
              onCheckedChange={(checked) =>
                onFilterChange("NoSMIBLocation", !!checked)
              }
              className="bg-white data-[state=checked]:bg-buttonActive border border-buttonActive"
            />
            <label
              htmlFor="noSmibFilter"
              className="text-black lg:text-white text-sm font-medium whitespace-nowrap cursor-pointer"
            >
              No SMIB
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="localServerFilter"
              checked={selectedFilters.includes("LocalServersOnly")}
              onCheckedChange={(checked) =>
                onFilterChange("LocalServersOnly", !!checked)
              }
              className="bg-white data-[state=checked]:bg-buttonActive border border-buttonActive"
            />
            <label
              htmlFor="localServerFilter"
              className="text-black lg:text-white text-sm font-medium whitespace-nowrap cursor-pointer"
            >
              Local Server
            </label>
          </div>
        </div>

        {/* Clear Filters Button - only visible on xl and below lg */}
        <div className="flex lg:hidden items-center w-full">
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 whitespace-nowrap w-full"
          >
            Clear Filters
          </Button>
        </div>
      </div>

      {/* SMIB Filter Checkboxes */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="smibFilter"
            checked={selectedFilters.includes("SMIBLocationsOnly")}
            onCheckedChange={(checked) =>
              onFilterChange("SMIBLocationsOnly", !!checked)
            }
            className="bg-white data-[state=checked]:bg-buttonActive border border-buttonActive"
          />
          <label
            htmlFor="smibFilter"
            className="text-black lg:text-white text-sm font-medium whitespace-nowrap cursor-pointer"
          >
            SMIB
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="noSmibFilter"
            checked={selectedFilters.includes("NoSMIBLocation")}
            onCheckedChange={(checked) =>
              onFilterChange("NoSMIBLocation", !!checked)
            }
            className="bg-white data-[state=checked]:bg-buttonActive border border-buttonActive"
          />
          <label
            htmlFor="noSmibFilter"
            className="text-black lg:text-white text-sm font-medium whitespace-nowrap cursor-pointer"
          >
            No SMIB
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="localServerFilter"
            checked={selectedFilters.includes("LocalServersOnly")}
            onCheckedChange={(checked) =>
              onFilterChange("LocalServersOnly", !!checked)
            }
            className="bg-white data-[state=checked]:bg-buttonActive border border-buttonActive"
          />
          <label
            htmlFor="localServerFilter"
            className="text-black lg:text-white text-sm font-medium whitespace-nowrap cursor-pointer"
          >
            Local Server
          </label>
        </div>
      </div>

      {/* Clear Filters Button */}
      <div className="flex items-center w-full lg:w-auto">
        <Button
          variant="outline"
          onClick={onClearFilters}
          className="bg-white text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 whitespace-nowrap"
        >
          Clear Filters
        </Button>
      </div>
    </div>
  );
}
