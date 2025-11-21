'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X, Search } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

export type MultiSelectOption = {
  id: string;
  label: string;
  disabled?: boolean;
};

type MultiSelectDropdownProps = {
  options: MultiSelectOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  disabled?: boolean;
  showSelectAll?: boolean;
  maxHeight?: string;
};

export default function MultiSelectDropdown({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select items...',
  searchPlaceholder = 'Search...',
  label,
  disabled = false,
  showSelectAll = true,
  maxHeight = 'max-h-60',
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allSelected = options.length > 0 && selectedIds.length === options.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange(options.filter(o => !o.disabled).map(o => o.id));
    }
  };

  const handleToggle = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleRemove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedIds.filter(selectedId => selectedId !== id));
  };

  const selectedOptions = options.filter(o => selectedIds.includes(o.id));
  const displayText = selectedOptions.length === 0
    ? placeholder
    : selectedOptions.length === options.length
    ? `All ${label || 'items'} (${options.length})`
    : `${selectedOptions.length} selected`;

  return (
    <div ref={dropdownRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm ${
          disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-gray-400'
        } focus:border-buttonActive focus:outline-none focus:ring-2 focus:ring-buttonActive/20`}
      >
        <span className={selectedOptions.length === 0 ? 'text-gray-500' : 'text-gray-900'}>
          {displayText}
        </span>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Selected Items Badges (shown below dropdown) */}
      {selectedOptions.length > 0 && selectedOptions.length < options.length && (
        <div className="mt-2">
          <div className="max-h-[320px] overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-2">
            <div className="flex flex-wrap gap-1">
              {selectedOptions.map(option => (
                <span
                  key={option.id}
                  className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800"
                >
                  {option.label}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={(e) => handleRemove(option.id, e)}
                      className="hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[9999] mt-1 w-full rounded-md border border-gray-300 bg-white shadow-lg">
          {/* Search Bar */}
          <div className="border-b border-gray-200 p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchPlaceholder}
                className="pl-8 text-sm"
                autoFocus
              />
            </div>
          </div>

          {/* Select All Option */}
          {showSelectAll && filteredOptions.length > 0 && (
            <div className="border-b border-gray-200 bg-gray-50 px-3 py-2">
              <label className="flex cursor-pointer items-center gap-2 hover:bg-gray-100 rounded px-1 py-1">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium text-gray-700">
                  {allSelected ? 'Deselect All' : 'Select All'} ({options.length})
                </span>
                {someSelected && !allSelected && (
                  <span className="ml-auto text-xs text-gray-500">
                    {selectedIds.length} selected
                  </span>
                )}
              </label>
            </div>
          )}

          {/* Options List */}
          <div className={`overflow-y-auto ${maxHeight}`}>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-center text-sm text-gray-500">
                No results found
              </div>
            ) : (
              filteredOptions.map(option => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 hover:bg-gray-100 ${
                    option.disabled ? 'cursor-not-allowed opacity-50' : ''
                  }`}
                >
                  <Checkbox
                    checked={selectedIds.includes(option.id)}
                    onCheckedChange={() => !option.disabled && handleToggle(option.id)}
                    disabled={option.disabled}
                    className="h-4 w-4"
                  />
                  <span className="flex-1 text-sm text-gray-900">
                    {option.label}
                  </span>
                  {selectedIds.includes(option.id) && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </label>
              ))
            )}
          </div>

          {/* Footer with count */}
          {selectedOptions.length > 0 && (
            <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
              <div className="text-xs text-gray-600">
                {selectedOptions.length} of {options.length} selected
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

