'use client';

import { cn } from '@/lib/utils';
import type { SmibDevice } from '@/shared/types/entities';
import { Check, ChevronDown, Search } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

type SMIBSearchSelectProps = {
  value: string; // Selected relayId
  onValueChange: (relayId: string) => void;
  smibs: SmibDevice[]; // All available SMIBs
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
};

export function SMIBSearchSelect({
  value,
  onValueChange,
  smibs,
  placeholder = 'Select SMIB...',
  disabled = false,
  className,
  emptyMessage = 'No SMIBs found',
}: SMIBSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter SMIBs based on search term
  const filteredSmibs = useMemo(() => {
    if (!searchTerm) return smibs;

    const term = searchTerm.toLowerCase();
    return smibs.filter(smib => {
      return (
        smib.relayId.toLowerCase().includes(term) ||
        smib.serialNumber?.toLowerCase().includes(term) ||
        smib.game?.toLowerCase().includes(term) ||
        smib.locationName?.toLowerCase().includes(term)
      );
    });
  }, [smibs, searchTerm]);

  // Find selected SMIB
  const selectedSmib = smibs.find(smib => smib.relayId === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
    return undefined;
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    return undefined;
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev =>
          prev < filteredSmibs.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && filteredSmibs[focusedIndex]) {
          handleSelect(filteredSmibs[focusedIndex].relayId);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (relayId: string) => {
    onValueChange(relayId);
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const displayText = selectedSmib
    ? `${selectedSmib.relayId}${selectedSmib.serialNumber ? ` - ${selectedSmib.serialNumber}` : ''}${selectedSmib.locationName ? ` (${selectedSmib.locationName})` : ''}`
    : placeholder;

  return (
    <div className={cn('relative w-full', className)}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-11 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isOpen && 'ring-2 ring-ring ring-offset-2'
        )}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 opacity-50 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div
          ref={contentRef}
          className={cn(
            'absolute z-50 mt-2 max-h-96 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95'
          )}
        >
          {/* Search Input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search SMIBs..."
              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredSmibs.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredSmibs.map((smib, index) => {
                const isSelected = smib.relayId === value;
                const isFocused = index === focusedIndex;

                return (
                  <button
                    key={`${smib.relayId}-${smib.machineId}`}
                    type="button"
                    onClick={() => handleSelect(smib.relayId)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none',
                      'hover:bg-accent hover:text-accent-foreground',
                      isFocused && 'bg-accent text-accent-foreground',
                      isSelected && 'bg-accent/50'
                    )}
                  >
                    <div className="flex flex-1 items-center gap-2">
                      {/* SMIB Info */}
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium">{smib.relayId}</span>
                        {(smib.serialNumber || smib.game) && (
                          <span className="text-xs text-muted-foreground">
                            {smib.serialNumber || smib.game}
                          </span>
                        )}
                        {smib.locationName && (
                          <span className="text-xs text-muted-foreground">
                            📍 {smib.locationName}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Check Icon */}
                    {isSelected && (
                      <Check className="ml-auto h-4 w-4 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
