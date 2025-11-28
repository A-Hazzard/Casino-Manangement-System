'use client';

import { TimePeriod } from '@/app/api/lib/types';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/ui/custom-select';
import DateRangeIndicator from '@/components/ui/DateRangeIndicator';
import { type DateRange } from '@/components/ui/dateRangePicker';
import { ModernDateRangePicker } from '@/components/ui/ModernDateRangePicker';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { DashboardDateFiltersProps } from '@/lib/types/componentProps';
import { useEffect, useMemo, useState } from 'react';

export default function DashboardDateFilters({
  disabled,
  onCustomRangeGo,
  hideAllTime,
  mode = 'auto',
  enableTimeInputs = false,
  hideIndicator = false,
  showIndicatorOnly = false,
}: DashboardDateFiltersProps & {
  hideIndicator?: boolean;
  showIndicatorOnly?: boolean;
}) {
  const {
    activeMetricsFilter,
    setActiveMetricsFilter,
    setCustomDateRange,
    pendingCustomDateRange,
    setPendingCustomDateRange,
    loadingChartData,
    loadingTopPerforming,
    refreshing,
  } = useDashBoardStore();

  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [shouldTriggerCallback, setShouldTriggerCallback] = useState(false);
  // Local state for the picker to allow partial ranges (start date only)
  const [tempDateRange, setTempDateRange] = useState<DateRange | undefined>(
    undefined
  );

  useEffect(() => {
    if (hideAllTime && activeMetricsFilter === 'All Time') {
      setActiveMetricsFilter('30d');
    }
  }, [activeMetricsFilter, hideAllTime, setActiveMetricsFilter]);

  // Initialize temp range when picker opens
  useEffect(() => {
    if (showCustomPicker) {
      if (pendingCustomDateRange) {
        setTempDateRange({
          from: pendingCustomDateRange.startDate,
          to: pendingCustomDateRange.endDate,
        });
      } else if (
        activeMetricsFilter === 'Custom' &&
        useDashBoardStore.getState().customDateRange
      ) {
        const current = useDashBoardStore.getState().customDateRange;
        setTempDateRange({
          from: current.startDate,
          to: current.endDate,
        });
      } else {
        setTempDateRange(undefined);
      }
    }
  }, [showCustomPicker, pendingCustomDateRange, activeMetricsFilter]);

  const timeFilterButtons: { label: string; value: TimePeriod }[] = useMemo(
    () =>
      hideAllTime
        ? [
            { label: 'Today', value: 'Today' as TimePeriod },
            { label: 'Yesterday', value: 'Yesterday' as TimePeriod },
            { label: 'Last 7 Days', value: '7d' as TimePeriod },
            { label: 'Last 30 Days', value: '30d' as TimePeriod },
            { label: 'Custom', value: 'Custom' as TimePeriod },
          ]
        : [
            { label: 'Today', value: 'Today' as TimePeriod },
            { label: 'Yesterday', value: 'Yesterday' as TimePeriod },
            { label: 'Last 7 Days', value: '7d' as TimePeriod },
            { label: 'Last 30 Days', value: '30d' as TimePeriod },
            { label: 'All Time', value: 'All Time' as TimePeriod },
            { label: 'Custom', value: 'Custom' as TimePeriod },
          ],
    [hideAllTime]
  );

  // Check if any loading state is active
  const isLoading = loadingChartData || loadingTopPerforming || refreshing;

  // Handle callback after state updates
  useEffect(() => {
    if (shouldTriggerCallback && onCustomRangeGo) {
      setShouldTriggerCallback(false);
      onCustomRangeGo();
    }
  }, [shouldTriggerCallback, onCustomRangeGo]);

  const handleApplyCustomRange = () => {
    if (tempDateRange?.from && tempDateRange?.to) {
      // Use the exact dates with time information from the ModernDateRangePicker
      setCustomDateRange({
        startDate: tempDateRange.from,
        endDate: tempDateRange.to,
      });
      // Also update pending in store to keep it in sync if needed, or just rely on customDateRange
      setPendingCustomDateRange({
        startDate: tempDateRange.from,
        endDate: tempDateRange.to,
      });

      setActiveMetricsFilter('Custom');
      setShowCustomPicker(false);

      // Set flag to trigger callback after state updates
      setShouldTriggerCallback(true);
    }
  };

  const handleCancelCustomRange = () => {
    setShowCustomPicker(false);
    setTempDateRange(undefined);
    setPendingCustomDateRange(undefined);
  };

  const handleSetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    setTempDateRange({ from: firstDay, to: lastDay });
  };

  const handleFilterClick = (filter: TimePeriod) => {
    if (filter === 'Custom') {
      setShowCustomPicker(true);
      // Don't immediately set activeMetricsFilter to Custom
      // Only show the picker, keep the current filter active
    } else {
      setShowCustomPicker(false);
      setActiveMetricsFilter(filter);
    }
  };

  const handleSelectChange = (value: string) => {
    handleFilterClick(value as TimePeriod);
  };

  // If only showing indicator, return early
  if (showIndicatorOnly) {
    return (
      <div className="flex w-full flex-col gap-3">
        <DateRangeIndicator />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {/* Date Range Indicator */}
      {!hideIndicator && <DateRangeIndicator />}

      {/* Filter Controls - This section aligns with Machine Status Widget */}
      <div className="flex w-full flex-wrap items-center gap-2">
        {/* Select dropdown - used below lg: (mobile and tablet) */}
        <div
          className={
            mode === 'auto'
              ? 'w-full lg:hidden'
              : mode === 'mobile'
                ? 'w-full'
                : 'hidden'
          }
        >
          <CustomSelect
            value={activeMetricsFilter}
            onValueChange={handleSelectChange}
            options={timeFilterButtons.map(filter => ({
              value: filter.value as string,
              label: filter.label,
            }))}
            placeholder="Select date range"
            disabled={isLoading}
            className={`w-full ${
              isLoading ? 'cursor-not-allowed opacity-50' : ''
            }`}
            triggerClassName="bg-white border-2 border-gray-300 text-gray-700 focus:border-blue-500 transition-colors min-h-[44px] text-base"
            contentClassName="text-gray-700"
          />
        </div>

        {/* Desktop buttons - shown on lg: and above when mode is auto or desktop */}
        {(mode === 'auto' || mode === 'desktop') && (
          <div
            className={
              mode === 'auto'
                ? 'hidden flex-wrap items-center gap-2 lg:flex'
                : 'flex flex-wrap items-center gap-2'
            }
          >
            {timeFilterButtons.map(filter => (
              <Button
                key={filter.value}
                onClick={() => handleFilterClick(filter.value)}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  activeMetricsFilter === filter.value
                    ? 'bg-buttonActive text-white'
                    : 'bg-button text-white hover:bg-button/90'
                } ${isLoading ? 'cursor-not-allowed opacity-50' : ''}`}
                disabled={disabled || isLoading}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        )}

        {/* Custom Date Picker (both mobile and desktop) */}
        {showCustomPicker && (
          <div className="mt-4 w-full">
            <ModernDateRangePicker
              value={tempDateRange}
              onChange={setTempDateRange}
              onGo={handleApplyCustomRange}
              onCancel={handleCancelCustomRange}
              onSetLastMonth={handleSetLastMonth}
              enableTimeInputs={enableTimeInputs}
            />
          </div>
        )}
      </div>
    </div>
  );
}
