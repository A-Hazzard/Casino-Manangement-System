'use client';

import DateFilters from '@/components/ui/common/DateFilters'; // Aliased as DashboardDateFilters in concept
import { CustomSelect } from '@/components/ui/custom-select';
import { Input } from '@/components/ui/input';
import { SESSION_SORT_OPTIONS } from '@/lib/constants/sessions';
import { SessionsFiltersProps } from '@/lib/types/sessions';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

export function SessionsFilters({
  searchTerm,
  onSearchChange,
  sortBy,
  sortOrder,
  setSortBy,
  setSortOrder,
  onSortChange,
}: SessionsFiltersProps) {
  
  const handleSortFieldChange = (value: string) => {
    if (setSortBy) setSortBy(value);
    if (onSortChange) onSortChange(value);
  };

  const handleSortOrderChange = (value: string) => {
    if (setSortOrder) setSortOrder(value as 'asc' | 'desc');
  };

  return (
    <div className="w-full max-w-full space-y-4">
      {/* Date Filters */}
      <div>
        <DateFilters hideAllTime={false} mode="desktop" />
      </div>

      {/* Mobile: Search + Horizontal scroll filters */}
      <div className="md:hidden">
        {/* Search */}
        <div className="relative mb-3 w-full">
          <Input
            type="text"
            placeholder="Search by player, machine, or session ID..."
            className="h-11 w-full rounded-full border border-gray-300 bg-white px-4 pr-10 text-base text-gray-700 placeholder-gray-400 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Filters - Horizontal scrollable */}
        <div className="scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 flex gap-2 overflow-x-auto pb-2">
          <div className="flex min-w-max gap-2">
            {/* Sort Field */}
            <div className="relative w-40 flex-shrink-0">
              <CustomSelect
                value={sortBy}
                onValueChange={handleSortFieldChange}
                options={SESSION_SORT_OPTIONS.map(o => ({
                  value: o.value,
                  label: o.label,
                }))}
                placeholder="Sort By"
                className="w-full"
                triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm whitespace-nowrap"
                searchable={true}
                emptyMessage="No sort options"
              />
            </div>

            {/* Sort Order */}
            <div className="relative w-28 flex-shrink-0">
              <CustomSelect
                value={sortOrder}
                onValueChange={handleSortOrderChange}
                options={[
                  { value: 'desc', label: 'Desc' },
                  { value: 'asc', label: 'Asc' },
                ]}
                placeholder="Order"
                className="w-full"
                triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: Search row (purple bar style) */}
      <div className="hidden items-center gap-4 rounded-b-none rounded-t-lg bg-buttonActive p-4 md:flex">
        {/* Search */}
        <div className="relative min-w-0 max-w-md flex-1">
          <Input
            type="text"
            placeholder="Search by player, machine, or session ID..."
            className="h-9 w-full rounded-md border border-gray-300 bg-white px-3 pr-10 text-sm text-gray-700 placeholder-gray-400 focus:border-buttonActive focus:ring-buttonActive"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
          />
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        </div>

        {/* Sort Field */}
        <div className="w-auto min-w-[180px] max-w-[220px]">
          <CustomSelect
            value={sortBy}
            onValueChange={handleSortFieldChange}
            options={SESSION_SORT_OPTIONS.map(o => ({
              value: o.value,
              label: o.label,
            }))}
            placeholder="Sort By"
            className="w-full"
            triggerClassName="h-9 bg-white border border-gray-300 rounded-md px-3 text-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
          />
        </div>

        {/* Sort Order */}
        <div className="w-auto min-w-[120px] max-w-[140px]">
          <CustomSelect
            value={sortOrder}
            onValueChange={handleSortOrderChange}
            options={[
              { value: 'desc', label: 'Desc' },
              { value: 'asc', label: 'Asc' },
            ]}
            placeholder="Order"
            className="w-full"
            triggerClassName="h-9 bg-white border border-gray-300 rounded-md px-3 text-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
          />
        </div>
      </div>
    </div>
  );
}
