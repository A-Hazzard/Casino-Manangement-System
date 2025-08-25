"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Search } from "lucide-react";


type LocationSingleSelectProps = {
  locations: { id: string; name: string; sasEnabled?: boolean }[];
  selectedLocation: string;
  onSelectionChange: (locationId: string) => void;
  placeholder?: string;
  className?: string;
  includeAllOption?: boolean;
};

export default function LocationSingleSelect({
  locations,
  selectedLocation,
  onSelectionChange,
  placeholder = "Select location...",
  className,
  includeAllOption = true,
}: LocationSingleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectLocation = (locationId: string) => {
    onSelectionChange(locationId);
    setIsOpen(false);
  };

  // Prepare options with "All Locations" if enabled
  const options = includeAllOption
    ? [{ id: "all", name: "All Locations", sasEnabled: true }, ...locations]
    : locations;

  // Filter options based on search term
  const filteredOptions = options.filter((option) => {
    const name = option.name || "";
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedOption = options.find(
    (option) => option.id === selectedLocation
  );
  const displayText = selectedOption?.name || placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-left font-normal"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Header with search */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">
                Select Location
              </span>
            </div>
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search locations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 h-8 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Options */}
          <div className="py-1">
            {filteredOptions.map((option) => {
              const isSelected = selectedLocation === option.id;
              return (
                <div
                  key={option.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                    isSelected ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleSelectLocation(option.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <Check className="h-4 w-4 text-blue-600" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {option.name}
                      </div>
                      {option.id !== "all" && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              option.sasEnabled ? "default" : "secondary"
                            }
                            className={`text-xs ${
                              option.sasEnabled
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {option.sasEnabled ? "SAS Enabled" : "Non-SAS"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* No results message */}
          {filteredOptions.length === 0 && (
            <div className="p-3 text-center text-sm text-gray-500">
              No locations found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
