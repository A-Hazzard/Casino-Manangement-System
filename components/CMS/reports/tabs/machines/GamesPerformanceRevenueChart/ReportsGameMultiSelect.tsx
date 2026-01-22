/**
 * Game Multi-Select Component
 * 
 * Dropdown component for selecting multiple games with search functionality
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import { Checkbox } from '@/components/shared/ui/checkbox';
import { Input } from '@/components/shared/ui/input';
import { Label } from '@/components/shared/ui/label';
import { ChevronDown, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type GameOption = {
  id: string;
  name: string;
};

type ReportsGameMultiSelectProps = {
  games: GameOption[];
  selectedGames: string[];
  onSelectionChange: (selected: string[]) => void;
  placeholder?: string;
};

/**
 * Reports Game Multi-Select Component
 * Dropdown for selecting multiple games with search
 */
export function ReportsGameMultiSelect({
  games,
  selectedGames,
  onSelectionChange,
  placeholder = 'Select games...',
}: ReportsGameMultiSelectProps) {
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

  const handleToggleGame = (gameId: string) => {
    if (selectedGames.includes(gameId)) {
      onSelectionChange(selectedGames.filter(id => id !== gameId));
    } else {
      onSelectionChange([...selectedGames, gameId]);
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const filteredOptions = games.filter(option => {
    const name = option.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const allSelected = games.length > 0 && selectedGames.length === games.length;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(games.map(g => g.id));
    }
  };

  const selectedOptions = games.filter(option =>
    selectedGames.includes(option.id)
  );
  const displayText =
    selectedOptions.length > 0
      ? `${selectedOptions.length} game${
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
                placeholder="Search games..."
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
                id="select-all-games-revenue"
                checked={allSelected}
                onCheckedChange={handleSelectAll}
              />
              <Label
                htmlFor="select-all-games-revenue"
                className="text-sm font-medium cursor-pointer"
              >
                Select All
              </Label>
            </div>
          </div>

          <div className="max-h-60 overflow-auto p-2">
            {filteredOptions.length === 0 ? (
              <div className="py-4 text-center text-sm text-gray-500">
                No games found
              </div>
            ) : (
              filteredOptions.map(option => (
                <div
                  key={option.id}
                  className="flex items-center space-x-2 rounded-md p-2 hover:bg-gray-50"
                >
                  <Checkbox
                    id={`game-revenue-${option.id}`}
                    checked={selectedGames.includes(option.id)}
                    onCheckedChange={() => handleToggleGame(option.id)}
                  />
                  <Label
                    htmlFor={`game-revenue-${option.id}`}
                    className="flex-1 cursor-pointer text-sm"
                  >
                    {option.name}
                  </Label>
                </div>
              ))
            )}
          </div>

          {selectedGames.length > 0 && (
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


