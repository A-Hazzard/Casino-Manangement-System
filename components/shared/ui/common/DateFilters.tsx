/**
 * Date Filters Component
 *
 * Reusable date filter component used across the application.
 *
 * Features:
 * - Predefined time periods (Today, Yesterday, 7d, 30d, etc.)
 * - Custom date range selection with ModernCalendar
 * - Responsive design (mobile dropdown, desktop buttons)
 * - Optional quarterly filter
 * - Optional time inputs for custom ranges
 *
 * @module components/ui/common/DateFilters
 */

'use client';

import { TimePeriod } from '@/app/api/lib/types';
import { Button } from '@/components/shared/ui/button';
import { CustomSelect } from '@/components/shared/ui/custom-select';
import DateRangeIndicator from '@/components/shared/ui/DateRangeIndicator';
import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';
import {
  createDateInTrinidadTime,
  getGamingDayEndInTrinidad,
} from '@/shared/utils/dateFormat';
import { useDashBoardStore } from '@/lib/store/dashboardStore';
import type { DateFiltersProps } from '@/lib/types/components';
import { useEffect, useMemo, useState } from 'react';

export default function DateFilters({
  disabled,
  onCustomRangeGo,
  hideAllTime,
  showQuarterly = false,
  mode = 'auto',
  enableTimeInputs = false,
  hideIndicator = false,
  showIndicatorOnly = false,
}: DateFiltersProps & {
  hideIndicator?: boolean;
  showIndicatorOnly?: boolean;
}) {
  const {
    activeMetricsFilter,
    setActiveMetricsFilter,
    setActivePieChartFilter,
    setCustomDateRange,
    gameDayOffset,
  } = useDashBoardStore();

  const [shouldTriggerCallback, setShouldTriggerCallback] = useState(false);

  useEffect(() => {
    if (hideAllTime && activeMetricsFilter === 'All Time') {
      setActiveMetricsFilter('30d');
    }
  }, [activeMetricsFilter, hideAllTime, setActiveMetricsFilter]);

  useEffect(() => {
    if (!showQuarterly && activeMetricsFilter === 'Quarterly') {
      setActiveMetricsFilter('Today');
    }
  }, [activeMetricsFilter, showQuarterly, setActiveMetricsFilter]);

  useEffect(() => {
    if (!activeMetricsFilter || activeMetricsFilter === 'Custom') return;

    const today = new Date();
    const gamingStartHour = gameDayOffset;

    switch (activeMetricsFilter) {
      case 'Today': {
        const startDate = createDateInTrinidadTime(
          today.getFullYear(),
          today.getMonth() + 1,
          today.getDate(),
          gamingStartHour,
          0,
          0
        );
        const endDate = getGamingDayEndInTrinidad(today, gameDayOffset);
        setCustomDateRange({ startDate, endDate });
        break;
      }
      case 'Yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const startDate = createDateInTrinidadTime(
          yesterday.getFullYear(),
          yesterday.getMonth() + 1,
          yesterday.getDate(),
          gamingStartHour,
          0,
          0
        );
        const endDate = getGamingDayEndInTrinidad(yesterday, gameDayOffset);
        setCustomDateRange({ startDate, endDate });
        break;
      }
      case '7d': {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        const startDate = createDateInTrinidadTime(
          sevenDaysAgo.getFullYear(),
          sevenDaysAgo.getMonth() + 1,
          sevenDaysAgo.getDate(),
          gamingStartHour,
          0,
          0
        );
        const endDate = getGamingDayEndInTrinidad(today, gameDayOffset);
        setCustomDateRange({ startDate, endDate });
        break;
      }
      case '30d': {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        const startDate = createDateInTrinidadTime(
          thirtyDaysAgo.getFullYear(),
          thirtyDaysAgo.getMonth() + 1,
          thirtyDaysAgo.getDate(),
          gamingStartHour,
          0,
          0
        );
        const endDate = getGamingDayEndInTrinidad(today, gameDayOffset);
        setCustomDateRange({ startDate, endDate });
        break;
      }
    }
  }, [activeMetricsFilter, gameDayOffset, setCustomDateRange]);

  const timeFilterButtons: { label: string; value: TimePeriod }[] =
    useMemo(() => {
      const baseButtons = [
        { label: 'Today', value: 'Today' as TimePeriod },
        { label: 'Yesterday', value: 'Yesterday' as TimePeriod },
        { label: 'Last 7 Days', value: '7d' as TimePeriod },
      ];

      baseButtons.push({ label: 'Last 30 Days', value: '30d' as TimePeriod });

      // Add Quarterly option if enabled
      if (showQuarterly) {
        baseButtons.push({
          label: 'Quarterly',
          value: 'Quarterly' as TimePeriod,
        });
      }

      baseButtons.push({ label: 'Custom', value: 'Custom' as TimePeriod });

      if (!hideAllTime) {
        baseButtons.push({
          label: 'All Time',
          value: 'All Time' as TimePeriod,
        });
      }

      return baseButtons;
    }, [hideAllTime, showQuarterly]);

  // Handle callback after state updates
  useEffect(() => {
    if (shouldTriggerCallback && onCustomRangeGo) {
      setShouldTriggerCallback(false);
      onCustomRangeGo();
    }
  }, [shouldTriggerCallback, onCustomRangeGo]);

  const handleFilterClick = (filter: TimePeriod) => {
    setActiveMetricsFilter(filter);
    setActivePieChartFilter(filter); // Sync pie chart filter with main filter
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
                  setActivePieChartFilter('Custom'); // Sync pie chart filter
                  if (onCustomRangeGo) {
                    setTimeout(() => onCustomRangeGo(), 0);
                  }
                }
              }}
              enableTimeInputs={enableTimeInputs}
              gameDayOffset={gameDayOffset}
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
                  setActivePieChartFilter('Custom'); // Sync pie chart filter
                  // Trigger callback
                  if (onCustomRangeGo) {
                    // Short timeout to ensure state updates propagate
                    setTimeout(() => onCustomRangeGo(), 0);
                  }
                }
              }}
              enableTimeInputs={enableTimeInputs}
              gameDayOffset={gameDayOffset}
              className="w-auto"
            />
          </div>
        )}
      </div>
    </div>
  );
}
