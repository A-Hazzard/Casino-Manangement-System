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
 * - Radix Popover integration for reliable focus and modal escape
 *
 * @param locations - Array of location options
 * @param selectedLocation - Currently selected location ID
 * @param onSelectionChange - Callback when selection changes
 */
'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/shared/ui/button';
import { Badge } from '@/components/shared/ui/badge';
import { Input } from '@/components/shared/ui/input';
import { Checkbox } from '@/components/shared/ui/checkbox';
import { Check, ChevronDown, Filter, Search } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

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
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Autofocus search input when dropdown opens
  useEffect(() => {
    if (!isOpen) return;

    // Use requestAnimationFrame to ensure the popover is rendered and visible
    const rafId = requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(rafId);
  }, [isOpen]);

  const handleSelectLocation = (locationId: string) => {
    onSelectionChange(locationId);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Prepare options with "All Locations" if enabled
  const options = useMemo(() => includeAllOption
    ? [
        {
          id: 'all',
          name: allOptionLabel,
          sasEnabled: showSasBadge ? true : undefined,
        },
        ...locations,
      ]
    : locations, [includeAllOption, allOptionLabel, showSasBadge, locations]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => options.filter(option => {
    const name = option.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  }), [options, searchTerm]);

  const selectedOption = options.find(option => option.id === selectedLocation);
  const displayText = selectedOption?.name || placeholder;

  const useAutoWidth = className?.includes('w-auto') || className?.match(/md:w-auto|lg:w-auto|xl:w-auto/);
  const buttonWidthClass = useAutoWidth ? 'w-auto min-w-fit' : 'w-full';

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <Button
          variant="outline"
          className={`${buttonWidthClass} ${className} justify-between text-left font-normal whitespace-nowrap px-3 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-blue-500/20`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {showFilterIcon && <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />}
            <span className="truncate">{displayText}</span>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform flex-shrink-0 ml-2 text-gray-400 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </Button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={4}
          align="start"
          // We set width to max-content to fit the longest item, while min-width reflects the trigger button
          style={{ 
            width: 'max-content',
            minWidth: 'var(--radix-popover-trigger-width)' 
          }}
          className="z-[99999] max-h-[60vh] flex flex-col overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl animate-in fade-in-0 zoom-in-95"
          // Crucial: stop propagation to prevent background modal from stealing focus or closing
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          {/* Header with search */}
          <div className="flex-shrink-0 border-b border-gray-100 bg-white p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {dropdownLabel}
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transform text-gray-400" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-sm focus:ring-blue-500/20"
                // Prevent Radix logic from interferring with typing
                onKeyDown={(e) => {
                  if (e.key === ' ') e.stopPropagation();
                }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
            {/* All Locations option */}
            {includeAllOption && filteredOptions.length > 0 && searchTerm === '' && (
              <div 
                className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/80 backdrop-blur-sm"
              >
                <div 
                  className="flex cursor-pointer items-center gap-2 px-3 py-2.5 hover:bg-white transition-colors"
                  onClick={() => handleSelectLocation('all')}
                >
                  <div className="flex-shrink-0">
                    <Checkbox
                      checked={selectedLocation === 'all'}
                      onCheckedChange={() => handleSelectLocation('all')}
                      className="h-4 w-4 rounded border-gray-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-800">
                    {allOptionLabel}
                  </span>
                  <span className="ml-auto text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {locations.length} Locations
                  </span>
                </div>
              </div>
            )}

            {/* Options list */}
            <div className="py-1">
              {filteredOptions
                .filter(option => !includeAllOption || option.id !== 'all')
                .map(option => {
                  const isSelected = selectedLocation === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={`flex w-full cursor-pointer items-center justify-between px-3 py-2.5 transition-colors hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                      onClick={() => handleSelectLocation(option.id)}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex-shrink-0 flex items-center justify-center w-4">
                          {isSelected && (
                            <Check className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 flex flex-col items-start gap-1">
                          <span className={`text-sm whitespace-nowrap ${isSelected ? 'font-semibold text-blue-700' : 'font-medium text-gray-700'}`}>
                            {option.name}
                          </span>
                          {option.sasEnabled &&
                            option.id !== 'all' &&
                            showSasBadge && (
                              <Badge
                                className="text-[9px] h-4 leading-none font-bold uppercase tracking-tighter bg-green-50 text-green-700 border-green-200"
                                variant="outline"
                              >
                                SAS Connected
                              </Badge>
                            )}
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Empty state */}
            {filteredOptions.length === 0 && (
              <div className="p-8 text-center flex flex-col items-center gap-2">
                <Search className="h-8 w-8 text-gray-200" />
                <p className="text-sm font-medium text-gray-400">
                  {emptyMessage}
                </p>
              </div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
