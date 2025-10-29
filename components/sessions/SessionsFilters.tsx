'use client';

import DashboardDateFilters from '@/components/dashboard/DashboardDateFilters';
import { CustomSelect } from '@/components/ui/custom-select';
import { Input } from '@/components/ui/input';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { SESSION_SORT_OPTIONS } from '@/lib/constants/sessions';

type SessionsFiltersProps = {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  // New props for explicit control to keep consistency with other pages
  setSortBy?: (field: string) => void;
  setSortOrder?: (order: 'asc' | 'desc') => void;
  onSortChange?: (field: string) => void; // kept for backward compatibility
};

export default function SessionsFilters({
  searchTerm,
  onSearchChange,
  sortBy,
  sortOrder,
  setSortBy,
  setSortOrder,
  onSortChange,
}: SessionsFiltersProps) {
  // Handlers with fallbacks to onSortChange for compatibility
  const handleSortFieldChange = (value: string) => {
    if (setSortBy) setSortBy(value);
    else if (onSortChange) onSortChange(value);
  };

  const handleSortOrderChange = (value: string) => {
    const order = value === 'asc' ? 'asc' : 'desc';
    if (setSortOrder) setSortOrder(order);
  };

  return (
    <div className="space-y-4 w-full max-w-full">
      {/* Date Filters */}
      <div>
        <DashboardDateFilters hideAllTime={false} />
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
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          <div className="flex gap-2 min-w-max">
            {/* Sort Field */}
            <div className="w-40 flex-shrink-0 relative">
              <CustomSelect
                value={sortBy}
                onValueChange={handleSortFieldChange}
                options={SESSION_SORT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                placeholder="Sort By"
                className="w-full"
                triggerClassName="h-10 bg-white border border-gray-300 rounded-full px-3 text-gray-700 focus:ring-buttonActive focus:border-buttonActive text-sm whitespace-nowrap"
                searchable={true}
                emptyMessage="No sort options"
              />
            </div>

            {/* Sort Order */}
            <div className="w-28 flex-shrink-0 relative">
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

      {/* Desktop: Search row (purple bar style like other pages) */}
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
            options={SESSION_SORT_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
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
