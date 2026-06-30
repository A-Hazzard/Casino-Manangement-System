'use client';

import ActivityLogDateFilter from '@/components/shared/ui/ActivityLogDateFilter';
import { Button } from '@/components/shared/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { ChevronDownIcon } from '@radix-ui/react-icons';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import type { TimePeriod } from '@/shared/types/common';

type AdministrationActivityLogsFilterBarProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchMode: 'username' | 'email' | 'description' | '_id';
  onSearchModeChange: (mode: 'username' | 'email' | 'description' | '_id') => void;
  searchDropdownOpen: boolean;
  onSearchDropdownToggle: () => void;
  actionFilter: string;
  onActionFilterChange: (value: string) => void;
  resourceFilter: string;
  onResourceFilterChange: (value: string) => void;
  timePeriod: TimePeriod;
  onTimePeriodChange: (period: TimePeriod) => void;
  onDateRangeChange: (range: { from: Date; to: Date } | undefined) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  disabled?: boolean;
};

export function AdministrationActivityLogsFilterBar({
  searchTerm,
  onSearchChange,
  searchMode,
  onSearchModeChange,
  searchDropdownOpen,
  onSearchDropdownToggle,
  actionFilter,
  onActionFilterChange,
  resourceFilter,
  onResourceFilterChange,
  timePeriod,
  onTimePeriodChange,
  onDateRangeChange,
  onClearFilters,
  hasActiveFilters,
  disabled,
}: AdministrationActivityLogsFilterBarProps) {
  const modeLabel =
    searchMode === 'username'
      ? 'Username'
      : searchMode === 'email'
        ? 'Email'
        : searchMode === 'description'
          ? 'Description'
          : 'ID';

  return (
    <div className="mt-6">
      <div className="mb-3 flex justify-start">
        <ActivityLogDateFilter
          timePeriod={timePeriod}
          onTimePeriodChange={onTimePeriodChange}
          onDateRangeChange={onDateRangeChange}
          disabled={disabled}
        />
      </div>

      <div className="rounded-t-lg bg-buttonActive p-3 md:p-4">
        <div className="flex flex-wrap items-center justify-start gap-3">
          <div className="flex w-full sm:w-auto items-stretch gap-2">
            <div className="flex h-11 w-full sm:w-80 md:w-96 rounded-md bg-white shadow-sm">
              <input
                type="text"
                placeholder="Search activity logs..."
                value={searchTerm}
                onChange={e => onSearchChange(e.target.value)}
                className="h-full flex-1 cursor-text rounded-l-md border-none bg-white px-3 text-sm outline-none ring-buttonActive focus:ring-1"
              />
              <span className="flex cursor-pointer items-center border-l border-gray-300 bg-white px-2 text-gray-400 transition-colors hover:text-gray-600">
                <MagnifyingGlassIcon className="h-4 w-4 md:h-5 md:w-5" />
              </span>
            </div>

            <div className="relative flex-shrink-0">
              <button
                type="button"
                className="flex h-11 w-full cursor-pointer items-center justify-center whitespace-nowrap rounded-md bg-white px-3 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 md:px-4 md:text-sm"
                onClick={onSearchDropdownToggle}
              >
                {modeLabel}
                <ChevronDownIcon
                  className={`ml-1 h-3 w-3 transition-transform md:ml-2 md:h-4 md:w-4 ${
                    searchDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {searchDropdownOpen && (
                <div className="absolute left-0 top-full z-20 mt-1 w-auto min-w-40 rounded-md border border-gray-200 bg-white shadow-lg">
                  {(['username', 'email', 'description', '_id'] as const).map(mode => (
                    <button
                      key={mode}
                      className={`block w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-gray-100 ${
                        searchMode === mode ? 'font-semibold text-buttonActive' : 'text-gray-700'
                      }`}
                      onClick={() => {
                        onSearchModeChange(mode);
                        onSearchDropdownToggle();
                      }}
                    >
                      {mode === 'username' ? 'Username' : mode === 'email' ? 'Email' : mode === 'description' ? 'Description' : 'ID'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Select value={actionFilter} onValueChange={onActionFilterChange}>
            <SelectTrigger className="h-11 w-auto min-w-32 bg-white">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="view">View</SelectItem>
            </SelectContent>
          </Select>

          <Select value={resourceFilter} onValueChange={onResourceFilterChange}>
            <SelectTrigger className="h-11 w-auto min-w-32 bg-white">
              <SelectValue placeholder="Resource" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Resources</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="machine">Machine</SelectItem>
              <SelectItem value="location">Location</SelectItem>
              <SelectItem value="collection">Collection</SelectItem>
              <SelectItem value="collection-report">Collection Report</SelectItem>
              <SelectItem value="collection-report-v2">Collection Report V2</SelectItem>
              <SelectItem value="collection-report-v2-machine">V2 Machine Capture</SelectItem>
              <SelectItem value="licencee">Licencee</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="session">Session</SelectItem>
              <SelectItem value="vault">Vault</SelectItem>
              <SelectItem value="cashier_shift">Cashier Shift</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onClearFilters}
              className="h-11 shrink-0 border-white/80 bg-white/90 text-gray-700 hover:bg-white hover:text-buttonActive"
            >
              Clear All Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
