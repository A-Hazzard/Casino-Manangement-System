/**
 * Location Single Select Component
 * Single-select dropdown component specifically for location selection.
 *
 * Features:
 * - Single location selection
 * - Search functionality
 * - SAS badge display
 * - All locations option
 * - Click outside to close
 * - Empty state handling
 *
 * @param locations - Array of location options
 * @param selectedLocation - Currently selected location ID
 * @param onSelectionChange - Callback when selection changes
 * @param placeholder - Placeholder text
 * @param className - Additional CSS classes
 * @param includeAllOption - Whether to include "All Locations" option
 * @param allOptionLabel - Label for all option
 * @param showSasBadge - Whether to show SAS enabled badge
 * @param dropdownLabel - Label for dropdown
 * @param searchPlaceholder - Search input placeholder
 * @param emptyMessage - Message when no locations found
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Check, ChevronDown, Filter, Search } from 'lucide-react';

type LocationSingleSelectOption = {
  id: string;
  name: string;
  sasEnabled?: boolean;
};

type LocationSingleSelectProps = {
  locations: LocationSingleSelectOption[];
  selectedLocation: string;
  onSelectionChange: (locationId: string) => void;
  placeholder?: string;
  className?: string;
  includeAllOption?: boolean;
  allOptionLabel?: string;
  showSasBadge?: boolean;
  dropdownLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  showFilterIcon?: boolean;
};

export default function LocationSingleSelect({
  locations,
  selectedLocation,
  onSelectionChange,
  placeholder = 'Select location...',
  className,
  includeAllOption = true,
  allOptionLabel = 'All Locations',
  showSasBadge = true,
  dropdownLabel = 'Select Location',
  searchPlaceholder = 'Search locations...',
  emptyMessage = 'No locations found',
  showFilterIcon = false,
}: LocationSingleSelectProps) {
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

  const handleSelectLocation = (locationId: string) => {
    onSelectionChange(locationId);
    setIsOpen(false);
  };

  // Prepare options with "All Locations" if enabled
  const options = includeAllOption
    ? [
        {
          id: 'all',
          name: allOptionLabel,
          // Avoid showing SAS badge for the "all" option
          sasEnabled: showSasBadge ? true : undefined,
        },
        ...locations,
      ]
    : locations;

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    const name = option.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedOption = options.find(option => option.id === selectedLocation);
  const displayText = selectedOption?.name || placeholder;

  // Determine if we should use auto width based on className prop
  const useAutoWidth = className?.includes('w-auto') || className?.match(/md:w-auto|lg:w-auto|xl:w-auto/);
  const buttonWidthClass = useAutoWidth ? 'w-auto min-w-fit' : 'w-full';
  
  // Calculate the width needed for the longest location name (for dropdown)
  const longestName = options.reduce((longest, option) => 
    option.name.length > longest.length ? option.name : longest, 
    displayText
  );
  // Estimate width: ~8-10px per character + padding (60px for icons/padding)
  const estimatedWidth = Math.max(longestName.length * 9 + 80, 250);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={`${buttonWidthClass} justify-between text-left font-normal whitespace-nowrap`}
      >
        <div className="flex items-center gap-2">
          {showFilterIcon && <Filter className="h-4 w-4 text-gray-400" />}
          <span>{displayText}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 transition-transform flex-shrink-0 ml-2 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </Button>

      {isOpen && (
        <div 
          className={`absolute z-[70] mt-1 max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg ${
            useAutoWidth ? 'min-w-full' : 'w-full'
          }`}
          style={useAutoWidth ? { width: `${estimatedWidth}px` } : undefined}
        >
          {/* Header with search */}
          <div className="border-b border-gray-100 p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {dropdownLabel}
              </span>
            </div>
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-sm"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Select All / All Locations Option */}
          {includeAllOption && filteredOptions.length > 0 && (
            <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
              <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 hover:bg-gray-100">
                <Checkbox
                  checked={selectedLocation === 'all'}
                  onCheckedChange={() => handleSelectLocation('all')}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  {allOptionLabel} ({locations.length})
                </span>
              </label>
            </div>
          )}

          {/* Options */}
          <div className="py-1">
            {filteredOptions
              .filter(option => !includeAllOption || option.id !== 'all')
              .map(option => {
                const isSelected = selectedLocation === option.id;
                return (
                  <div
                    key={option.id}
                    className={`flex cursor-pointer items-center justify-between px-3 py-2 hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleSelectLocation(option.id)}
                  >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <Check className="h-4 w-4 text-blue-600" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
                        {option.name}
                      </div>
                      {typeof option.sasEnabled === 'boolean' &&
                        option.id !== 'all' &&
                        showSasBadge && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              option.sasEnabled ? 'default' : 'secondary'
                            }
                            className={`text-xs ${
                              option.sasEnabled
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {option.sasEnabled ? 'SAS Enabled' : 'Non-SAS'}
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
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
