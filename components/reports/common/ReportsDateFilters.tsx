'use client';

import { TimePeriod } from '@/app/api/lib/types';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { ModernDateRangePicker } from '@/components/ui/ModernDateRangePicker';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useReportsStore } from '@/lib/store/reportsStore';
import { useState } from 'react';

/**
 * Reports Date Filters Component
 * Handles date range filtering for reports with both predefined and custom ranges
 * Syncs with both dashboard and reports stores
 */
export default function ReportsDateFilters() {
  const {
    activeMetricsFilter,
    setActiveMetricsFilter,
    setCustomDateRange,
    pendingCustomDateRange,
    setPendingCustomDateRange,
  } = useDashBoardStore();

  const { setDateRange, activeView } = useReportsStore();

  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [selectedSingleDate, setSelectedSingleDate] = useState<
    Date | undefined
  >(undefined);

  // Conditional filter buttons based on active tab
  const getTimeFilterButtons = () => {
    const baseButtons = [
      { label: 'Today', value: 'Today' as TimePeriod },
      { label: 'Yesterday', value: 'Yesterday' as TimePeriod },
    ];

    // Only show 7/30 day filters for non-meters tabs
    if (activeView !== 'meters') {
      baseButtons.push(
        { label: 'Last 7 Days', value: '7d' as TimePeriod },
        { label: 'Last 30 Days', value: '30d' as TimePeriod }
      );
    }

    baseButtons.push({ label: 'Custom', value: 'Custom' as TimePeriod });

    // Show "All Time" for non-meters tabs only
    if (activeView !== 'meters') {
      baseButtons.push({ label: 'All Time', value: 'All Time' as TimePeriod });
    }

    return baseButtons;
  };

  const timeFilterButtons = getTimeFilterButtons();

  /**
   * Apply custom date range to both stores
   */
  const handleApplyCustomRange = () => {
    if (pendingCustomDateRange?.startDate && pendingCustomDateRange?.endDate) {
      // Update both stores
      setCustomDateRange({
        startDate: pendingCustomDateRange.startDate,
        endDate: pendingCustomDateRange.endDate,
      });
      setDateRange(
        pendingCustomDateRange.startDate,
        pendingCustomDateRange.endDate
      );
      setActiveMetricsFilter('Custom');
      setShowCustomPicker(false);
    }
  };

  /**
   * Apply single date selection for meters tab
   */
  const handleApplySingleDate = () => {
    if (selectedSingleDate) {
      // For single date, set both start and end to the same date
      const startDate = new Date(selectedSingleDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedSingleDate);
      endDate.setHours(23, 59, 59, 999);

      // Update both stores
      setCustomDateRange({
        startDate: startDate,
        endDate: endDate,
      });
      setDateRange(startDate, endDate);
      setActiveMetricsFilter('Custom');
      setShowCustomPicker(false);
    }
  };

  /**
   * Set last month date range as a quick option
   */
  const handleSetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    setPendingCustomDateRange({ startDate: firstDay, endDate: lastDay });
  };

  /**
   * Handle filter button clicks for predefined periods
   */
  const handleFilterClick = (filter: TimePeriod) => {
    if (filter === 'Custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);

      // Update reports store based on filter
      const now = new Date();
      let startDate: Date, endDate: Date;

      switch (filter) {
        case 'Today':
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case 'Yesterday':
          startDate = new Date(now.setDate(now.getDate() - 1));
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case '7d':
        case 'last7days':
          startDate = new Date(now.setDate(now.getDate() - 7));
          endDate = new Date();
          break;
        case '30d':
        case 'last30days':
          startDate = new Date(now.setDate(now.getDate() - 30));
          endDate = new Date();
          break;

        default:
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
      }

      setDateRange(startDate, endDate);
    }
    setActiveMetricsFilter(filter);
  };

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {/* Mobile: Select dropdown */}
      <div className="w-full md:hidden">
        <select
          value={activeMetricsFilter}
          onChange={e => handleFilterClick(e.target.value as TimePeriod)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base font-semibold text-gray-700 shadow-sm focus:border-buttonActive focus:ring-buttonActive"
        >
          {timeFilterButtons.map(filter => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {/* md and above: Filter buttons */}
      <div className="hidden flex-wrap items-center gap-2 md:flex">
        {timeFilterButtons.map(filter => (
          <Button
            key={filter.value}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              activeMetricsFilter === filter.value
                ? 'bg-buttonActive text-white'
                : 'bg-button text-white hover:bg-button/90'
            }`}
            onClick={() => handleFilterClick(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Custom Date Picker (both mobile and desktop) */}
      {showCustomPicker && (
        <div className="mt-4 w-full">
          {activeView === 'meters' ? (
            // Single date picker for meters tab
            <div className="flex flex-wrap items-center justify-center gap-2 rounded-b-lg bg-gray-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Select Date:</span>
                <DatePicker
                  date={selectedSingleDate}
                  setDate={setSelectedSingleDate}
                />
              </div>
              <Button
                className="rounded-lg bg-lighterBlueHighlight px-3 py-1.5 text-xs font-semibold text-white"
                onClick={handleApplySingleDate}
                disabled={!selectedSingleDate}
              >
                Go
              </Button>
              <Button
                variant="outline"
                className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                onClick={() => {
                  setShowCustomPicker(false);
                  setSelectedSingleDate(undefined);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            // Date range picker for other tabs
            <ModernDateRangePicker
              value={
                pendingCustomDateRange
                  ? {
                      from: pendingCustomDateRange.startDate,
                      to: pendingCustomDateRange.endDate,
                    }
                  : undefined
              }
              onChange={range =>
                setPendingCustomDateRange(
                  range && range.from && range.to
                    ? { startDate: range.from, endDate: range.to }
                    : undefined
                )
              }
              onGo={handleApplyCustomRange}
              onCancel={() => {
                setShowCustomPicker(false);
                setPendingCustomDateRange(undefined);
              }}
              onSetLastMonth={handleSetLastMonth}
            />
          )}
        </div>
      )}
    </div>
  );
}
