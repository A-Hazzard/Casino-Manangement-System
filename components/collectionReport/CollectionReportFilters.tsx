import React, { useRef, useEffect } from "react";
import type { LocationSelectItem } from "@/lib/types/location";
import { gsap } from "gsap";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Checkbox } from "@/components/ui/checkbox";

type Props = {
  locations: LocationSelectItem[];
  selectedLocation: string;
  onLocationChange: (locationId: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  showUncollectedOnly: boolean;
  onShowUncollectedOnlyChange: (val: boolean) => void;
  isSearching?: boolean;
  onSearchSubmit: () => void;
};

export default function CollectionReportFilters({
  locations,
  selectedLocation,
  onLocationChange,
  search,
  onSearchChange,
  showUncollectedOnly,
  onShowUncollectedOnlyChange,
  isSearching = false,
  onSearchSubmit,
}: Props) {
  const filterRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const checkboxRef = useRef<HTMLDivElement>(null);

  // Animation for search input when searching
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

  // Animation for mounting
  useEffect(() => {
    if (filterRef.current) {
      gsap.fromTo(
        filterRef.current,
        { opacity: 0, y: -10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: "power2.out",
        }
      );
    }
  }, []);

  // Animation for filter changes
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

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputRef.current) {
      // Add a flash animation on enter
      gsap.fromTo(
        inputRef.current,
        { backgroundColor: "#f0f0f0" },
        {
          backgroundColor: "#ffffff",
          duration: 0.3,
          ease: "power2.out",
        }
      );
      onSearchSubmit();
    }
  };

  return (
    <div
      ref={filterRef}
      className="rounded-lg p-4 mb-4 w-full border border-gray-200 bg-white md:bg-buttonActive flex flex-col gap-y-3"
    >
      <div className="flex flex-col gap-y-2 w-full">
        <div className="relative w-full">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Collector..."
            className="w-full px-4 py-2 rounded-md border border-black text-sm pr-10"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            onKeyPress={handleSearchKeyPress}
          />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
            <MagnifyingGlassIcon className="w-5 h-5 text-black" />
          </button>
        </div>
        <select
          ref={selectRef}
          className="w-full px-4 py-2 rounded-md text-sm border border-black"
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
      </div>
      <div ref={checkboxRef} className="flex items-center justify-center mt-1">
        <label className="flex items-center gap-2 font-medium w-auto text-black md:text-white">
          <Checkbox
            id="uncollected-only"
            checked={showUncollectedOnly}
            onCheckedChange={(checked) =>
              onShowUncollectedOnlyChange(!!checked)
            }
            className="bg-white data-[state=checked]:bg-buttonActive border border-buttonActive"
          />
          <span className="text-sm font-medium">SHOW UNCOLLECTED ONLY</span>
        </label>
      </div>
    </div>
  );
}
