'use client';

import { cn } from '@/lib/utils';
import type { SmibDevice } from '@/shared/types/entities';
import { Check, ChevronDown, Search } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

type SmibStatus = 'online' | 'offline';

/**
 * Get SMIB online/offline status
 * CRITICAL: Uses ONLY the online field from the API response
 * The API determines status based on MQTT broker activity (lastActivity < 3 minutes)
 * This ensures consistency with actual broker connection status
 */
const getSmibStatus = (smib: SmibDevice): SmibStatus => {
  // Use the online status directly from API
  if (typeof smib.online === 'boolean') {
    return smib.online ? 'online' : 'offline';
  }
  
  // If online status not provided by API, default to offline
  return 'offline';
};

const getStatusDotClass = (status: SmibStatus): string => {
  if (status === 'online') {
    return 'bg-emerald-500 animate-pulse';
  }

  if (status === 'offline') {
    return 'bg-destructive';
  }

  return 'bg-muted-foreground/40';
};

const getStatusLabel = (status: SmibStatus): string => {
  return status === 'online' ? 'Online' : 'Offline';
};

type SMIBSearchSelectProps = {
  value: string; // Selected relayId
  onValueChange: (relayId: string) => void;
  smibs: SmibDevice[]; // All available SMIBs
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
  statusOverrides?: Partial<Record<string, SmibStatus>>;
};

export function SMIBSearchSelect({
  value,
  onValueChange,
  smibs,
  placeholder = 'Select SMIB...',
  disabled = false,
  className,
  emptyMessage = 'No SMIBs found',
  statusOverrides,
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
  const selectedStatusOverride =
    value && statusOverrides ? statusOverrides[value] : undefined;
  const selectedStatus = selectedStatusOverride
    ? selectedStatusOverride
    : selectedSmib
      ? getSmibStatus(selectedSmib)
      : null;

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
        <span className="flex flex-1 items-center gap-2 overflow-hidden">
          <span
            aria-hidden="true"
            className={cn(
              'h-2.5 w-2.5 shrink-0 rounded-full transition-colors duration-150',
              selectedStatus ? getStatusDotClass(selectedStatus) : 'bg-muted-foreground/40'
            )}
          />
          <span className="truncate text-left">{displayText}</span>
        </span>
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
                const overrideStatus = statusOverrides?.[smib.relayId];
                const status = overrideStatus ?? getSmibStatus(smib);
                const statusLabel = getStatusLabel(status);

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
                    <div className="flex w-full items-center gap-3">
                      <div className="flex flex-1 flex-col items-start gap-0.5">
                        <span className="font-medium">{smib.relayId}</span>
                        {(smib.serialNumber || smib.game) && (
                          <span className="text-xs text-muted-foreground">
                            {smib.serialNumber || smib.game}
                          </span>
                        )}
                        {smib.locationName && (
                          <span className="text-xs text-muted-foreground">
                            Location: {smib.locationName}
                          </span>
                        )}
                      </div>

                      <div className="ml-auto flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className={cn(
                            'h-2 w-2 shrink-0 rounded-full transition-colors duration-150',
                            getStatusDotClass(status)
                          )}
                        />
                        <span className="text-xs font-medium text-muted-foreground">
                          {statusLabel}
                        </span>
                        {isSelected && (
                          <Check className="h-4 w-4 shrink-0" />
                        )}
                      </div>
                    </div>
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
