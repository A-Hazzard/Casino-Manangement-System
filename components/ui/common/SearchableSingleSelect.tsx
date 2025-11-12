'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type SearchableOption = {
  id: string;
  label: string;
  description?: string;
};

type SearchableSingleSelectProps = {
  options: SearchableOption[];
  selectedId: string;
  onSelectionChange: (id: string) => void;
  placeholder?: string;
  includeAllOption?: boolean;
  allLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  dropdownLabel?: string;
};

export default function SearchableSingleSelect({
  options,
  selectedId,
  onSelectionChange,
  placeholder = 'Select option...',
  includeAllOption = false,
  allLabel = 'All Options',
  searchPlaceholder = 'Search options...',
  emptyMessage = 'No options found',
  className,
  dropdownLabel,
}: SearchableSingleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !triggerRef.current?.contains(event.target as Node)
      ) {
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

  const combinedOptions = useMemo(() => {
    const baseOptions = includeAllOption
      ? [{ id: 'all', label: allLabel } as SearchableOption, ...options]
      : options;

    return baseOptions;
  }, [includeAllOption, allLabel, options]);

  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return combinedOptions;
    }

    const term = searchTerm.toLowerCase();
    return combinedOptions.filter(option => {
      const labelMatch = option.label.toLowerCase().includes(term);
      const descriptionMatch = option.description
        ? option.description.toLowerCase().includes(term)
        : false;
      return labelMatch || descriptionMatch;
    });
  }, [combinedOptions, searchTerm]);

  const selectedOption = combinedOptions.find(option => option.id === selectedId);
  const displayLabel = selectedOption?.label || placeholder;

  return (
    <div className={cn('relative', className)} ref={triggerRef}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full justify-between text-left font-normal"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform',
            isOpen ? 'rotate-180' : ''
          )}
        />
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-[70] mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg"
        >
          <div className="border-b border-gray-100 p-2">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {dropdownLabel || 'Select Option'}
              </span>
            </div>
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

          <div className="py-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-sm text-gray-500">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={cn(
                    'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50',
                    selectedId === option.id ? 'bg-blue-50' : ''
                  )}
                  onClick={() => {
                    onSelectionChange(option.id);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span className="flex-1 truncate text-sm font-medium text-gray-900">
                    {option.label}
                  </span>
                  {selectedId === option.id && <Check className="h-4 w-4 text-blue-600" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}


