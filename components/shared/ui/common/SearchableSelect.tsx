'use client';

import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type SearchableSelectOption = {
  label: string;
  value: string;
  group?: string;
};

type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  emptyMessage?: string;
  error?: boolean;
};

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  className,
  emptyMessage = 'No options found',
  error = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    option.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.group && option.group.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedOption = options.find(option => option.value === value);
  const displayText = selectedOption?.label || placeholder;

  return (
    <div className={cn('relative w-full', className)} ref={dropdownRef}>
      <Button
        type="button"
        ref={buttonRef}
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full justify-between text-left font-normal px-3 py-2 h-auto text-sm rounded-xl border',
          !selectedOption && 'text-muted-foreground',
          error ? 'border-red-500' : 'border-gray-200'
        )}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown
          className={`h-4 w-4 opacity-50 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto overflow-x-hidden rounded-xl border border-gray-200 bg-white shadow-lg custom-scrollbar">
          <div className="sticky top-0 bg-white border-b border-gray-100 p-2 z-10">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 transform text-gray-400" />
              <Input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs rounded-lg"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = value === option.value;
                return (
                  <div
                    key={option.value}
                    className={cn(
                      'flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-gray-50',
                      isSelected ? 'bg-violet-50 text-violet-900 font-medium' : 'text-gray-700'
                    )}
                    onClick={() => handleSelect(option.value)}
                  >
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.group && <span className="text-[10px] text-gray-400">{option.group}</span>}
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-violet-600" />}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-sm text-gray-500">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
