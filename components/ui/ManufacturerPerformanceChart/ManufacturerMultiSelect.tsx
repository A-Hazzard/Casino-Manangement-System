/**
 * Manufacturer Multi-Select Component
 * 
 * Dropdown component for selecting multiple manufacturers with search functionality
 */

'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type ManufacturerOption = {
  id: string;
  name: string;
};

type ManufacturerMultiSelectProps = {
  manufacturers: ManufacturerOption[];
  selectedManufacturers: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
};

/**
 * Manufacturer Multi-Select Component
 * Dropdown for selecting multiple manufacturers with search
 */
export function ManufacturerMultiSelect({
  manufacturers,
  selectedManufacturers,
  onSelectionChange,
  placeholder = 'Select manufacturers...',
}: ManufacturerMultiSelectProps) {
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
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleToggleManufacturer = (manufacturerId: string) => {
    if (selectedManufacturers.includes(manufacturerId)) {
      onSelectionChange(selectedManufacturers.filter(id => id !== manufacturerId));
    } else {
      onSelectionChange([...selectedManufacturers, manufacturerId]);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const filteredOptions = manufacturers.filter(option => {
    const name = option.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const allSelected = manufacturers.length > 0 && selectedManufacturers.length === manufacturers.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(manufacturers.map(m => m.id));
    }
  };

  const selectedOptions = manufacturers.filter(option =>
    selectedManufacturers.includes(option.id)
  );
  const displayText =
    selectedOptions.length > 0
      ? `${selectedOptions.length} manufacturer${
          selectedOptions.length > 1 ? 's' : ''
        } selected`
      : placeholder;

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between text-left font-normal"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 opacity-50 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search manufacturers..."
                className="pl-8"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="border-b p-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all-manufacturers-performance"
                checked={allSelected}
                onCheckedChange={handleSelectAll}
              />
              <Label
                htmlFor="select-all-manufacturers-performance"
                className="text-sm font-medium cursor-pointer"
              >
                Select All
              </Label>
            </div>
          </div>

          <div className="max-h-60 overflow-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                No manufacturers found
              </div>
            ) : (
              filteredOptions.map(option => (
                <div
                  key={option.id}
                  className="flex items-center space-x-2 rounded-md p-2 hover:bg-gray-50"
                >
                  <Checkbox
                    id={`manufacturer-performance-${option.id}`}
                    checked={selectedManufacturers.includes(option.id)}
                    onCheckedChange={() => handleToggleManufacturer(option.id)}
                  />
                  <Label
                    htmlFor={`manufacturer-performance-${option.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {option.name}
                  </Label>
                </div>
              ))
            )}
          </div>

          {selectedManufacturers.length > 0 && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={handleClearAll}
              >
                <X className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

