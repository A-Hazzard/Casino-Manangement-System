/**
 * Location Multi Select Component
 * Multi-select dropdown component specifically for location selection.
 *
 * Features:
 * - Multiple location selection
 * - Search functionality
 * - Selected locations display
 * - Clear all functionality
 * - Maximum selections limit
 * - Click outside to close
 *
 * @param locations - Array of location options
 * @param selectedLocations - Array of selected location IDs
 * @param onSelectionChange - Callback when selection changes
 * @param placeholder - Placeholder text
 * @param className - Additional CSS classes
 * @param maxSelections - Maximum number of selections allowed
 */
'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { LocationMultiSelectProps } from '@/lib/types/components';

export default function LocationMultiSelect({
  locations,
  selectedLocations,
  onSelectionChange,
  placeholder = 'Select locations...',
  className,
  maxSelections,
  showSearch = true,
}: LocationMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
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

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleLocation = (locationId: string) => {
    const newSelection = selectedLocations.includes(locationId)
      ? selectedLocations.filter(id => id !== locationId)
      : [...selectedLocations, locationId];
    onSelectionChange(newSelection);
  };

  const handleClearAll = () => {
    onSelectionChange([]);
    setIsOpen(false); // Close the dropdown after clearing
  };

  // Filter options based on search term
  const filteredOptions = locations.filter(option => {
    const name = option.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Calculate select all state
  const allSelected =
    locations.length > 0 && selectedLocations.length === locations.length;
  const someSelected = selectedLocations.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      // If maxSelections is set, only select up to that limit
      const locationsToSelect = maxSelections
        ? locations.slice(0, maxSelections).map(loc => loc.id)
        : locations.map(loc => loc.id);
      onSelectionChange(locationsToSelect);
    }
  };

  const selectedOptions = locations.filter(option =>
    selectedLocations.includes(option.id)
  );
  const displayText =
    selectedOptions.length > 0
      ? `${selectedOptions.length} location${
          selectedOptions.length > 1 ? 's' : ''
        } selected`
      : placeholder;

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
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {/* Header with search and clear button */}
          <div className="border-b border-gray-100 p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Locations
              </span>
              {selectedLocations.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
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
            {showSearch && (
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search locations..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 text-sm"
                  onClick={e => e.stopPropagation()}
                />
              </div>
            )}
          </div>

          {/* Select All Option */}
          {locations.length > 0 && (
            <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-gray-100">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  {allSelected ? 'Deselect All' : 'Select All'} (
                  {locations.length})
                </span>
                {someSelected && !allSelected && (
                  <span className="ml-auto text-xs text-gray-500">
                    {selectedLocations.length} selected
                  </span>
                )}
              </label>
            </div>
          )}

          {/* Options */}
          <div className="py-1">
            {filteredOptions.map(option => {
              const isSelected = selectedLocations.includes(option.id);
              return (
                <div
                  key={option.id}
                  className={`flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleToggleLocation(option.id)}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <Check className="h-4 w-4 text-blue-600" />
                      ) : (
                        <div className="h-4 w-4 rounded border border-gray-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-gray-900">
                        {option.name}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={option.sasEnabled ? 'default' : 'secondary'}
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
          {selectedLocations.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50 p-2">
              <div className="text-xs text-gray-600">
                {selectedLocations.length} location
                {selectedLocations.length > 1 ? 's' : ''} selected
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selected items display */}
      {selectedOptions.length > 0 && (
        <div className="mt-2">
          <div className="max-h-[320px] overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-2">
            <div className="flex flex-wrap gap-1">
              {selectedOptions.map(option => (
                <Badge
                  key={option.id}
                  variant="secondary"
                  className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  <span className="max-w-32 truncate">{option.name}</span>
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleToggleLocation(option.id)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
