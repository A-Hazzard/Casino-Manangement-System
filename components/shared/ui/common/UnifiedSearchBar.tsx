'use client';

import { KeyboardEvent, useRef, useEffect } from 'react';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { gsap } from 'gsap';

type UnifiedSearchBarProps<T extends string = string> = {
  searchType: T;
  onSearchTypeChange: (value: T) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit?: () => void;
  placeholder?: string;
  searchOptions: Array<{ value: T; label: string }>;
  isSearching?: boolean;
};

export default function UnifiedSearchBar<T extends string = string>({
  searchType,
  onSearchTypeChange,
  searchValue,
  onSearchChange,
  onSearchSubmit,
  placeholder,
  searchOptions,
  isSearching = false,
}: UnifiedSearchBarProps<T>) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const containerRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ============================================================================
  // Effects
  // ============================================================================
  useEffect(() => {
    if (isSearching && containerRef.current) {
      gsap.fromTo(
        containerRef.current,
        { boxShadow: '0 0 0 2px rgba(105, 105, 105, 0.2)' },
        {
          boxShadow: '0 0 0 3px rgba(81, 25, 233, 0.3)',
          duration: 0.3,
          ease: 'power2.out',
        }
      );
    }
  }, [isSearching]);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchSubmit?.();
    }
  };

  const handleSelectChange = (value: string) => {
    onSearchTypeChange(value as T);
    inputRef.current?.focus();
  };

  // ============================================================================
  // Computed
  // ============================================================================
  const defaultPlaceholder = `Search ${searchType}...`;

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div
      ref={containerRef}
      className="flex w-full min-w-0 items-center overflow-hidden rounded-md border border-gray-300 bg-white transition-shadow duration-300 focus-within:border-buttonActive focus-within:ring-1 focus-within:ring-buttonActive"
    >
      <select
        ref={selectRef}
        value={searchType}
        onChange={e => handleSelectChange(e.target.value)}
        className="shrink-0 appearance-none border-r border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
        aria-label="Search type"
      >
        {searchOptions.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder || defaultPlaceholder}
        className="min-w-0 flex-1 bg-white px-4 py-2 text-sm focus:outline-none"
        value={searchValue}
        onChange={e => onSearchChange(e.target.value)}
        onKeyPress={handleKeyPress}
      />

      <button
        onClick={onSearchSubmit}
        aria-label="Submit search"
        title="Submit search"
        className="flex shrink-0 items-center justify-center px-3 py-2 text-gray-400 transition-colors hover:text-gray-700"
      >
        <MagnifyingGlassIcon className="h-5 w-5 text-black" />
      </button>
    </div>
  );
}
