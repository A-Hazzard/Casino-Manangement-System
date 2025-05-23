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
      className="rounded-lg p-4 flex flex-col gap-4 mb-4 md:bg-buttonActive"
    >
      <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
        <div className="relative w-full md:w-64">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search Collector or Location..."
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
          className="px-4 py-2 rounded-md text-sm w-full md:w-auto border border-black"
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
        <div ref={checkboxRef} className="hidden md:flex items-center ml-4">
          <label className="flex items-center gap-2 text-black font-medium">
            <Checkbox
              id="uncollected-only-desktop"
              checked={showUncollectedOnly}
              onCheckedChange={(checked) =>
                onShowUncollectedOnlyChange(!!checked)
              }
              className="bg-white data-[state=checked]:bg-[#5119e9] border border-[#5119e9]"
            />
            <span className="text-sm font-medium text-white">
              SHOW UNCOLLECTED ONLY
            </span>
          </label>
        </div>
      </div>
      <div
        ref={checkboxRef}
        className="mx-auto flex items-center mt-2 md:hidden"
      >
        <label className="flex items-center gap-2 text-black font-medium">
          <Checkbox
            id="uncollected-only-mobile"
            checked={showUncollectedOnly}
            onCheckedChange={(checked) =>
              onShowUncollectedOnlyChange(!!checked)
            }
            className="bg-white data-[state=checked]:bg-[#5119e9] border border-[#5119e9]"
          />
          <span className="text-sm font-medium text-black">
            SHOW UNCOLLECTED ONLY
          </span>
        </label>
      </div>
    </div>
  );
}
