"use client";

import React, { useRef, useEffect } from "react";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Checkbox } from "@/components/ui/checkbox";
import { gsap } from "gsap";
import type { LocationSelectItem } from "@/lib/types/location";

interface CollectionReportFiltersProps {
  locations: LocationSelectItem[];
  selectedLocation: string;
  onLocationChange: (value: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  showUncollectedOnly: boolean;
  onShowUncollectedOnlyChange: (checked: boolean) => void;
  isSearching: boolean;
}

export default function CollectionReportFilters({
  locations,
  selectedLocation,
  onLocationChange,
  search,
  onSearchChange,
  onSearchSubmit,
  showUncollectedOnly,
  onShowUncollectedOnlyChange,
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
      className="rounded-t-lg p-4 w-full border border-gray-200 bg-white lg:bg-buttonActive flex flex-col lg:flex-row lg:items-center lg:justify-start gap-y-3 lg:gap-2"
    >
      {/* Search Input */}
      <div className="relative w-full lg:w-[280px]">
        <input
          type="text"
          placeholder="Search Collector or Location..."
          className="w-full px-4 py-2 rounded-md border border-black text-sm pr-10"
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
      <select
        ref={selectRef}
        className="w-full lg:w-[240px] px-4 py-2 rounded-md text-sm border border-black"
        value={selectedLocation}
        onChange={(e) => onLocationChange(e.target.value)}
      >
        <option value="all">Select Location</option>
        {locations.map((loc) => (
          <option key={loc._id} value={loc._id}>
            {loc.name}
          </option>
        ))}
      </select>

      {/* Uncollected Only Checkbox */}
      <div ref={checkboxRef} className="flex items-center w-full lg:w-auto">
        <label className="flex items-center gap-2 font-medium text-black lg:text-white cursor-pointer">
          <Checkbox
            id="uncollected-only"
            checked={showUncollectedOnly}
            onCheckedChange={(checked) => onShowUncollectedOnlyChange(!!checked)}
            className="bg-white data-[state=checked]:bg-buttonActive border border-buttonActive"
          />
          <span className="text-sm font-medium whitespace-nowrap">
            SHOW UNCOLLECTED ONLY
          </span>
        </label>
      </div>
    </div>
  );
} 