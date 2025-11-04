'use client';

import { Search, X } from 'lucide-react';
import React, { useState, useCallback } from 'react';

type MachineSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  resultCount?: number;
  totalCount?: number;
};

/**
 * MachineSearchBar Component
 * Clean, non-buggy search bar for filtering machines
 */
export const MachineSearchBar: React.FC<MachineSearchBarProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search machines...',
  resultCount,
  totalCount,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    onChange('');
    if (onClear) {
      onClear();
    }
  }, [onChange, onClear]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div className="space-y-2">
        <div
          className={`relative transition-all ${
            isFocused ? 'ring-2 ring-blue-500 rounded-lg' : ''
          }`}
        >
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none z-10" />
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
          {value && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        
        {/* Results count */}
        {value && resultCount !== undefined && totalCount !== undefined && (
          <p className="text-xs text-gray-500 pl-1">
            Showing {resultCount} of {totalCount} machine{totalCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
};

