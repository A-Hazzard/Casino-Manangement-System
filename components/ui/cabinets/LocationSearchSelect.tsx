'use client';

import * as React from 'react';
import {
  Command,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LocationSearchSelectProps } from '@/lib/types/location';

export function LocationSearchSelect({
  locations,
  selectedLocationName,
  onSelect,
}: LocationSearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Sort them alphabetically and add "All Locations" at the top
  const sorted = React.useMemo(() => {
    const allLocationsOption = { _id: 'all', name: 'All Locations' };
    return [allLocationsOption, ...locations].sort((a, b) => {
      if (a._id === 'all') return -1;
      if (b._id === 'all') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [locations]);

  // Filter by user's typed input but always keep "All Locations"
  const filteredLocations = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sorted;
    return [
      sorted[0], // Keep "All Locations"
      ...sorted.slice(1).filter(loc => loc.name.toLowerCase().includes(q)),
    ];
  }, [searchQuery, sorted]);

  const handleSelect = (locId: string) => {
    setOpen(false);
    onSelect(locId);
  };

  const buttonLabel = selectedLocationName || 'Select Location';

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="w-full rounded-md border bg-container px-3 py-2 text-left text-foreground">
          {buttonLabel}
        </button>
      </DialogTrigger>

      <DialogContent className="overflow-hidden p-0 sm:max-w-[400px]">
        <DialogHeader className="border-b border-border px-4 py-2">
          <DialogTitle className="text-lg font-semibold">
            Select a Location
          </DialogTitle>
        </DialogHeader>

        <Command>
          <CommandInput
            placeholder="Type location name..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="border-b border-border"
          />

          <CommandList>
            <CommandEmpty>No matching locations.</CommandEmpty>
            <CommandGroup>
              {filteredLocations.map(loc => (
                <CommandItem
                  key={loc._id}
                  onSelect={() => handleSelect(loc._id)}
                  className="cursor-pointer hover:bg-accent"
                >
                  {loc.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
