/**
 * Quarterly Date Filters Component
 *
 * Custom date filter component for location-evaluation and location-revenue tabs
 * that includes Quarterly option in addition to standard date filters.
 */

'use client';

import { Button } from '@/components/ui/button';
import { CustomSelect } from '@/components/ui/custom-select';
import DateRangeIndicator from '@/components/ui/DateRangeIndicator';
import { ModernCalendar } from '@/components/ui/ModernCalendar';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import { useUserStore } from '@/lib/store/userStore';
import { TimePeriod } from '@/shared/types/common';
import { useEffect, useMemo, useState } from 'react';

type QuarterlyDateFiltersProps = {
  disabled?: boolean;
  onCustomRangeGo?: () => void;
  hideIndicator?: boolean;
  mode?: 'auto' | 'mobile' | 'desktop';
  enableTimeInputs?: boolean;
};

export default function QuarterlyDateFilters({
  disabled,
  onCustomRangeGo,
  hideIndicator = false,
  mode = 'auto',
  enableTimeInputs = false,
}: QuarterlyDateFiltersProps) {
  const { activeMetricsFilter, setActiveMetricsFilter, setCustomDateRange } =
    useDashBoardStore();

  const [shouldTriggerCallback, setShouldTriggerCallback] = useState(false);
  const user = useUserStore(state => state.user);
  const isDeveloper = (user?.roles || []).includes('developer');

  const timeFilterButtons: { label: string; value: TimePeriod }[] =
    useMemo(() => {
      const baseButtons = [
        { label: 'Today', value: 'Today' as TimePeriod },
        { label: 'Yesterday', value: 'Yesterday' as TimePeriod },
        { label: 'Last 7 Days', value: '7d' as TimePeriod },
      ];

      // Only show "Last 30 Days" to developers
      if (isDeveloper) {
        baseButtons.push({ label: 'Last 30 Days', value: '30d' as TimePeriod });
      }

      // Add Quarterly option for location-evaluation and location-revenue tabs
      baseButtons.push({
        label: 'Quarterly',
        value: 'Quarterly' as TimePeriod,
      });

      baseButtons.push({ label: 'Custom', value: 'Custom' as TimePeriod });

      return baseButtons;
    }, [isDeveloper]);

  // Handle callback after state updates
  useEffect(() => {
    if (shouldTriggerCallback && onCustomRangeGo) {
      setShouldTriggerCallback(false);
      onCustomRangeGo();
    }
  }, [shouldTriggerCallback, onCustomRangeGo]);

  const handleFilterClick = (filter: TimePeriod) => {
    setActiveMetricsFilter(filter);
    if (onCustomRangeGo && filter !== 'Custom') {
      // Trigger callback for non-custom filters
      setTimeout(() => onCustomRangeGo(), 0);
    }
  };

  const handleSelectChange = (value: string) => {
    handleFilterClick(value as TimePeriod);
  };

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
            disabled={disabled}
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



