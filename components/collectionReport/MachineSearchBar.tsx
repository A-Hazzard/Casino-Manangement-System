/**
 * Machine Search Bar Component
 * Search bar component for filtering machines in collection modals.
 *
 * Features:
 * - Text search input
 * - Clear button
 * - Search icon
 * - Result count display
 * - Focus states and animations
 * - Clean, non-buggy implementation
 *
 * @param value - Current search value
 * @param onChange - Callback when search value changes
 * @param onClear - Optional callback when search is cleared
 * @param placeholder - Placeholder text
 * @param resultCount - Number of filtered results
 * @param totalCount - Total number of machines
 */
'use client';

import { Search, X } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

type MachineSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  resultCount?: number;
  totalCount?: number;
};

export const MachineSearchBar: React.FC<MachineSearchBarProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search machines...',
  resultCount,
  totalCount,
}) => {
  // Local state for immediate UI feedback (prevents cursor loss)
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInternalChangeRef = useRef<boolean>(false);

  // Sync local value with prop value when it changes externally (e.g., clear from parent)
  // But NOT when the change came from our own typing (to prevent focus loss)
  useEffect(() => {
    if (!isInternalChangeRef.current) {
      setLocalValue(value);
    }
    // Reset the flag after sync
    isInternalChangeRef.current = false;
  }, [value]);

  const handleClear = useCallback(() => {
    setLocalValue('');
    onChange('');
    if (onClear) {
      onClear();
    }
    // Maintain focus after clearing
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [onChange, onClear]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      // Mark this as an internal change to prevent useEffect from syncing back
      isInternalChangeRef.current = true;
      setLocalValue(newValue);
      onChange(newValue);
    },
    [onChange]
  );

  return (
    <div className="rounded-lg bg-white p-4 shadow-md">
      <div className="space-y-2">
        <div
          className={`relative transition-all ${
            isFocused ? 'rounded-lg ring-2 ring-blue-500' : ''
          }`}
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={localValue}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-10 transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {localValue && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 z-10 -translate-y-1/2 transform text-gray-400 transition-colors hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results count */}
        {value && resultCount !== undefined && totalCount !== undefined && (
          <p className="pl-1 text-xs text-gray-500">
            Showing {resultCount} of {totalCount} machine
            {totalCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};
