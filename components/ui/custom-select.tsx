'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SelectOption, CustomSelectProps } from '@/lib/types/customSelect';

export function CustomSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option',
  disabled = false,
  className,
  triggerClassName,
  contentClassName,
  searchable = false,
  emptyMessage = 'No options found',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>(
    'bottom'
  );

  // Filter options based on search term
  const filteredOptions = searchable
    ? options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  // Find selected option
  const selectedOption = options.find(option => option.value === value);

  // Debug logging for location select
  if (options.length > 0 && options[0]?.value === 'all') {
    console.warn('[CUSTOM SELECT - LOCATION] Debug info:');
    console.warn(`  - Received value: "${value}"`);
    console.warn(
      `  - Selected option: ${selectedOption ? `"${selectedOption.label}"` : 'null'}`
    );
    console.warn(`  - Options count: ${options.length}`);
    console.warn(`  - First option: ${JSON.stringify(options[0])}`);
  }

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when opened and calculate dropdown position
  useEffect(() => {
    if (isOpen) {
      if (searchable && searchInputRef.current) {
        searchInputRef.current.focus();
      }

      // Calculate dropdown position based on available space
      if (triggerRef.current) {
        const triggerRect = triggerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - triggerRect.bottom;
        const spaceAbove = triggerRect.top;

        // If there's more space above and less than 200px below, position above
        if (spaceAbove > spaceBelow && spaceBelow < 200) {
          setDropdownPosition('top');
        } else {
          setDropdownPosition('bottom');
        }
      }
    }
  }, [isOpen, searchable]);

  const handleSelect = useCallback(
    (selectedValue: string) => {
      onValueChange?.(selectedValue);
      setIsOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
      triggerRef.current?.focus();
    },
    [onValueChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) {
        if (
          event.key === 'Enter' ||
          event.key === ' ' ||
          event.key === 'ArrowDown'
        ) {
          event.preventDefault();
          setIsOpen(true);
          setFocusedIndex(0);
        }
        return;
      }

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setSearchTerm('');
          setFocusedIndex(-1);
          triggerRef.current?.focus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex(prev =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex(prev =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
            const option = filteredOptions[focusedIndex];
            if (!option.disabled) {
              handleSelect(option.value);
            }
          }
          break;
      }
    },
    [isOpen, filteredOptions, focusedIndex, handleSelect]
  );

  const handleTriggerClick = useCallback(() => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setFocusedIndex(0);
      }
    }
  }, [disabled, isOpen]);

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleTriggerClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          'hover:bg-accent hover:text-accent-foreground',
          triggerClassName
        )}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? 'select-options' : undefined}
        role="combobox"
      >
        <span
          className={cn('truncate', !selectedOption && 'text-muted-foreground')}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 opacity-50 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div
          ref={contentRef}
          id="select-options"
          className={cn(
            'absolute z-50 w-full min-w-full max-w-none rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95',
            'sm:max-w-[300px] md:max-w-[400px] lg:max-w-[500px]',
            dropdownPosition === 'bottom'
              ? 'top-full mt-1'
              : 'bottom-full mb-1',
            contentClassName
          )}
          role="listbox"
        >
          {/* Search Input */}
          {searchable && (
            <div className="border-b p-2">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search options..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full rounded border px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={e => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setFocusedIndex(0);
                  }
                }}
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-1.5 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  disabled={option.disabled}
                  className={cn(
                    'relative flex w-full cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none transition-colors',
                    'hover:bg-accent hover:text-accent-foreground',
                    'focus:bg-accent focus:text-accent-foreground',
                    'disabled:pointer-events-none disabled:opacity-50',
                    focusedIndex === index &&
                      'bg-accent text-accent-foreground',
                    value === option.value && 'bg-accent text-accent-foreground'
                  )}
                  role="option"
                  aria-selected={value === option.value}
                >
                  <span className="flex-1 truncate text-left font-medium">
                    {option.label}
                  </span>
                  {value === option.value && <Check className="ml-2 h-4 w-4" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Convenience component for location selection
import type { LocationSelectProps } from '@/lib/types/customSelect';

export function LocationSelect({
  value,
  onValueChange,
  locations,
  placeholder = 'Select Location',
  disabled = false,
  className,
  emptyMessage = 'No locations found',
}: LocationSelectProps) {
  const options: SelectOption[] = locations.map(location => ({
    value: String(location._id),
    label: location.name,
  }));

  return (
    <CustomSelect
      value={value}
      onValueChange={onValueChange}
      options={options}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      searchable={true}
      emptyMessage={emptyMessage}
    />
  );
}
