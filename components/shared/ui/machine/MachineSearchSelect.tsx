'use client';

import { cn } from '@/lib/utils';
import type { GamingMachine } from '@/shared/types/entities';
import { Check, ChevronDown, Search } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

type MachineSearchSelectProps = {
  value: string; // Selected machineId
  onValueChange: (machineId: string) => void;
  machines: GamingMachine[]; // All available Machines
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
};

export function MachineSearchSelect({
  value,
  onValueChange,
  machines,
  placeholder = 'Select Machine...',
  disabled = false,
  className,
  emptyMessage = 'No machines found',
}: MachineSearchSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter Machines based on search term
  const filteredMachines = useMemo(() => {
    if (!searchTerm) return machines;

    const term = searchTerm.toLowerCase();
    return machines.filter(machine => {
      // Search logic matching Locations page: Asset, SMID, Serial, Game
      return (
        machine.serialNumber?.toLowerCase().includes(term) ||
        machine.assetNumber?.toLowerCase().includes(term) ||
        machine.relayId?.toLowerCase().includes(term) ||
        machine.smbId?.toLowerCase().includes(term) ||
        machine.game?.toLowerCase().includes(term)
      );
    });
  }, [machines, searchTerm]);

  // Find selected Machine
  const selectedMachine = machines.find(m => m._id === value);

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
          prev < filteredMachines.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && filteredMachines[focusedIndex]) {
          handleSelect(filteredMachines[focusedIndex]._id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (machineId: string) => {
    onValueChange(machineId);
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const getDisplayText = (machine?: GamingMachine) => {
    if (!machine) return placeholder;
    // Format: "Serial - Game" or "Asset (Serial) - Game"
    const identifier = machine.assetNumber 
      ? `${machine.assetNumber} (${machine.serialNumber})`
      : machine.serialNumber;
    return `${identifier} - ${machine.game}`;
  };

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
          <span className="truncate text-left">{getDisplayText(selectedMachine)}</span>
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
              placeholder="Search by Asset, SMID, Serial, Game..."
              className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Options List */}
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredMachines.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredMachines.map((machine, index) => {
                const isSelected = machine._id === value;
                const isFocused = index === focusedIndex;
                const identifier = machine.assetNumber || machine.serialNumber;
                const secondaryInfo = [
                   machine.assetNumber ? `S/N: ${machine.serialNumber}` : null,
                   machine.relayId ? `SMID: ${machine.relayId}` : null
                ].filter(Boolean).join(' • ');

                return (
                  <button
                    key={machine._id}
                    type="button"
                    onClick={() => handleSelect(machine._id)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2.5 text-sm outline-none',
                      'hover:bg-accent hover:text-accent-foreground',
                      isFocused && 'bg-accent text-accent-foreground',
                      isSelected && 'bg-accent/50'
                    )}
                  >
                    <div className="flex w-full items-center gap-3">
                      <div className="flex flex-1 flex-col items-start gap-0.5">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">{identifier}</span>
                            <span className="text-muted-foreground">-</span>
                            <span className="font-medium">{machine.game}</span>
                        </div>
                        {secondaryInfo && (
                          <span className="text-xs text-muted-foreground">
                            {secondaryInfo}
                          </span>
                        )}
                      </div>

                      {isSelected && (
                        <Check className="h-4 w-4 shrink-0 ml-2" />
                      )}
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
