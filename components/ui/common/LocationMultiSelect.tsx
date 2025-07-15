"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    onSelectionChange([]);
  };

  const selectedOptions = options.filter(option => selectedIds.includes(option.id));
  const displayText = selectedOptions.length > 0 
    ? `${selectedOptions.length} location${selectedOptions.length > 1 ? 's' : ''} selected`
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
          {/* Header with clear button */}
          <div className="p-2 border-b border-gray-100 flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Locations</span>
            {selectedIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
              >
                Clear all
              </Button>
            )}
          </div>

          {/* Options */}
          <div className="py-1">
            {options.map((option) => {
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
          {selectedOptions.map((option) => (
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
          ))}
        </div>
      )}
    </div>
  );
} 