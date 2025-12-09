/**
 * Collection Report Date Buttons Component
 * Date filter buttons for collection reports with preset and custom date range options.
 *
 * Features:
 * - Preset date filters (Today, Yesterday, Last 7 Days, Last 30 Days, All Time)
 * - Custom date range picker
 * - Responsive design (dropdown on mobile, buttons on desktop)
 * - "Set Last Month" quick action
 * - Loading and disabled states
 *
 * @param activeFilter - Currently active date filter
 * @param onFilterChange - Callback when filter changes
 * @param customDateRange - Current custom date range
 * @param onCustomDateChange - Callback when custom date range changes
 * @param onApplyCustomDateRange - Callback to apply custom date range
 * @param disabled - Whether controls are disabled
 * @param isLoading - Whether data is loading
 */
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ModernDateRangePicker } from '@/components/ui/ModernDateRangePicker';
import type { DateRange } from '@/components/ui/dateRangePicker';
import type { CollectionReportDateFilter } from '@/lib/types/componentProps';

type CollectionReportDateButtonsProps = {
  activeFilter: CollectionReportDateFilter;
  onFilterChange: (filter: CollectionReportDateFilter) => void;
  customDateRange: DateRange;
  onCustomDateChange: (range?: DateRange) => void;
  onApplyCustomDateRange: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

const FILTERS: { label: string; value: CollectionReportDateFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 Days', value: 'last7' },
  { label: 'Last 30 Days', value: 'last30' },
  { label: 'All Time', value: 'alltime' },
];

export default function CollectionReportDateButtons({
  activeFilter,
  onFilterChange,
  customDateRange,
  onCustomDateChange,
  onApplyCustomDateRange,
  disabled,
  isLoading = false,
}: CollectionReportDateButtonsProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const handlePresetClick = (value: CollectionReportDateFilter) => {
    setShowCustomPicker(false);
    onFilterChange(value);
  };

  const handleCustomClick = () => {
    setShowCustomPicker(true);
    onFilterChange('custom');
  };

  const handleSetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    onCustomDateChange({ from: firstDay, to: lastDay });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {/* Mobile and md/lg: Select dropdown */}
      <div className="w-full xl:hidden">
        <select
          value={activeFilter}
          onChange={e =>
            onFilterChange(e.target.value as CollectionReportDateFilter)
          }
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive md:w-48"
          disabled={disabled || isLoading}
        >
          {FILTERS.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* xl and above: Filter buttons */}
      <div className="hidden flex-wrap items-center gap-2 xl:flex">
        {FILTERS.map(({ label, value }) => (
          <Button
            key={value}
            onClick={() => handlePresetClick(value)}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              activeFilter === value
                ? 'bg-buttonActive text-white'
                : 'bg-button text-white hover:bg-button/90'
            } ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
            disabled={disabled || isLoading}
          >
            {label}
          </Button>
        ))}
        <Button
          onClick={handleCustomClick}
          className={`rounded-md px-3 py-1 text-sm transition-colors ${
            activeFilter === 'custom'
              ? 'bg-buttonActive text-white'
              : 'bg-button text-white hover:bg-button/90'
          } ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
          disabled={disabled || isLoading}
        >
          Custom
        </Button>
      </div>

      {/* Custom Date Picker (both mobile and desktop) */}
      {showCustomPicker && activeFilter === 'custom' && (
        <div className="mt-4 w-full">
          <ModernDateRangePicker
            value={customDateRange}
            onChange={onCustomDateChange}
            onGo={() => {
              onApplyCustomDateRange();
              setShowCustomPicker(false);
            }}
            onCancel={() => {
              setShowCustomPicker(false);
            }}
            onSetLastMonth={handleSetLastMonth}
          />
        </div>
      )}
    </div>
  );
}
