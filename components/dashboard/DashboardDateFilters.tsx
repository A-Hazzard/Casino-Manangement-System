'use client';

import { TimePeriod } from '@/app/api/lib/types';
import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/ui/custom-select';
import DateRangeIndicator from '@/components/ui/DateRangeIndicator';
import { ModernCalendar } from '@/components/ui/ModernCalendar';
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
  const { activeMetricsFilter, setActiveMetricsFilter, setCustomDateRange } =
    useDashBoardStore();

  const [shouldTriggerCallback, setShouldTriggerCallback] = useState(false);

  useEffect(() => {
    if (hideAllTime && activeMetricsFilter === 'All Time') {
      setActiveMetricsFilter('30d');
    }
  }, [activeMetricsFilter, hideAllTime, setActiveMetricsFilter]);

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

  // Handle callback after state updates
  useEffect(() => {
    if (shouldTriggerCallback && onCustomRangeGo) {
      setShouldTriggerCallback(false);
      onCustomRangeGo();
    }
  }, [shouldTriggerCallback, onCustomRangeGo]);

  const handleFilterClick = (filter: TimePeriod) => {
    setActiveMetricsFilter(filter);
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

      {/* Filter Controls */}
      <div className="flex w-full flex-wrap items-center gap-2">
        {/* Select dropdown - used below md: (mobile only) */}
        <div
          className={
            mode === 'auto'
              ? 'flex w-full flex-col gap-2 md:hidden'
              : mode === 'mobile'
                ? 'flex w-full flex-col gap-2'
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
            disabled={false}
            className="w-full"
            triggerClassName="bg-white border-2 border-gray-300 text-gray-700 focus:border-blue-500 transition-colors min-h-[44px] text-base"
            contentClassName="text-gray-700"
          />

          {/* ModernCalendar for mobile - shown only when Custom is selected */}
          {activeMetricsFilter === 'Custom' && (
            <ModernCalendar
              date={
                useDashBoardStore.getState().customDateRange
                  ? {
                      from: useDashBoardStore.getState().customDateRange
                        ?.startDate,
                      to: useDashBoardStore.getState().customDateRange?.endDate,
                    }
                  : undefined
              }
              onSelect={date => {
                if (date?.from && date?.to) {
                  setCustomDateRange({
                    startDate: date.from,
                    endDate: date.to,
                  });
                  setActiveMetricsFilter('Custom');
                  if (onCustomRangeGo) {
                    setTimeout(() => onCustomRangeGo(), 0);
                  }
                }
              }}
              enableTimeInputs={enableTimeInputs}
              className="w-full"
            />
          )}
        </div>

        {/* Desktop buttons - shown on md: and above when mode is auto or desktop */}
        {(mode === 'auto' || mode === 'desktop') && (
          <div
            className={
              mode === 'auto'
                ? 'hidden flex-wrap items-center gap-2 md:flex'
                : 'flex flex-wrap items-center gap-2'
            }
          >
            {timeFilterButtons
              .filter(b => b.value !== 'Custom')
              .map(filter => (
                <Button
                  key={filter.value}
                  onClick={() => handleFilterClick(filter.value)}
                  className={`rounded-md px-3 py-1 text-sm transition-colors ${
                    activeMetricsFilter === filter.value
                      ? 'bg-buttonActive text-white'
                      : 'bg-button text-white hover:bg-button/90'
                  }`}
                  disabled={disabled}
                >
                  {filter.label}
                </Button>
              ))}

            <ModernCalendar
              date={
                activeMetricsFilter === 'Custom' &&
                useDashBoardStore.getState().customDateRange
                  ? {
                      from: useDashBoardStore.getState().customDateRange
                        ?.startDate,
                      to: useDashBoardStore.getState().customDateRange?.endDate,
                    }
                  : undefined
              }
              onSelect={date => {
                if (date?.from && date?.to) {
                  setCustomDateRange({
                    startDate: date.from,
                    endDate: date.to,
                  });
                  setActiveMetricsFilter('Custom');
                  // Trigger callback
                  if (onCustomRangeGo) {
                    // Short timeout to ensure state updates propagate
                    setTimeout(() => onCustomRangeGo(), 0);
                  }
                }
              }}
              enableTimeInputs={enableTimeInputs}
              className="w-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
}
