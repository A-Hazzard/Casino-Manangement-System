"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export type LocationOption = {
  id: string;
  name: string;
  sasEnabled: boolean;
};

interface LocationMultiSelectProps {
  options: LocationOption[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export default function LocationMultiSelect({
  options,
  selectedIds,
  onSelectionChange,
  placeholder = "Select locations...",
  className = "",
}: LocationMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleLocation = (locationId: string) => {
    const newSelection = selectedIds.includes(locationId)
      ? selectedIds.filter(id => id !== locationId)
      : [...selectedIds, locationId];
    onSelectionChange(newSelection);
  };

  const handleClearAll = () => {
    console.log("Clearing all selections");
    onSelectionChange([]);
    setIsOpen(false); // Close the dropdown after clearing
  };

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOptions = options.filter(option => selectedIds.includes(option.id));
  const displayText = selectedOptions.length > 0 
    ? (selectedIds.length === options.length && options.length > 0)
      ? "All Locations"
      : `${selectedOptions.length} location${selectedOptions.length > 1 ? 's' : ''} selected`
    : placeholder;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-left font-normal"
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Header with search and clear button */}
          <div className="p-2 border-b border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Locations</span>
              {selectedIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClearAll();
                  }}
                  className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
                >
                  Clear all
                </Button>
              )}
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
              const isSelected = selectedIds.includes(option.id);
              return (
                <div
                  key={option.id}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleToggleLocation(option.id)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <Check className="h-4 w-4 text-blue-600" />
                      ) : (
                        <div className="h-4 w-4 border border-gray-300 rounded" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {option.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={option.sasEnabled ? "default" : "secondary"}
                          className={`text-xs ${
                            option.sasEnabled 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {option.sasEnabled ? 'SAS Enabled' : 'Non-SAS'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer with selection count */}
          {selectedIds.length > 0 && (
            <div className="p-2 border-t border-gray-100 bg-gray-50">
              <div className="text-xs text-gray-600">
                {selectedIds.length} location{selectedIds.length > 1 ? 's' : ''} selected
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected items display */}
      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {selectedIds.length === options.length && options.length > 0 ? (
            // Show "All Locations" when all are selected
            <Badge
              variant="secondary"
              className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
            >
              <span>All Locations</span>
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={handleClearAll}
              />
            </Badge>
          ) : (
            // Show individual location chips when not all are selected
            selectedOptions.map((option) => (
              <Badge
                key={option.id}
                variant="secondary"
                className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
              >
                <span className="truncate max-w-32">{option.name}</span>
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleToggleLocation(option.id)}
                />
              </Badge>
            ))
          )}
        </div>
      )}
    </div>
  );
} 