/**
 * Activity Log Date Filter Component
 * Date filter component for activity logs with preset and custom date range options.
 *
 * Features:
 * - Preset time period filters (Today, Yesterday, Last 7 Days, Last 30 Days, All Time, Custom)
 * - Custom date range picker using MuiDateCalendar
 * - Date range change callbacks
 * - Time period change callbacks
 * - Disabled state support
 *
 * @param onDateRangeChange - Callback when custom date range changes
 * @param onTimePeriodChange - Callback when time period filter changes
 * @param disabled - Whether controls are disabled
 */
'use client';

import { TimePeriod } from '@/app/api/lib/types';
import { Button } from '@/components/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/shared/ui/popover';
import { MuiDateCalendar } from '@/components/shared/ui/MuiDateCalendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import { useEffect, useMemo, useState } from 'react';

type ActivityLogDateFilterProps = {
  onDateRangeChange?: (dateRange: { from: Date; to: Date } | undefined) => void;
  onTimePeriodChange?: (timePeriod: TimePeriod) => void;
  disabled?: boolean;
  timePeriod?: TimePeriod;
};

export default function ActivityLogDateFilter({
  onDateRangeChange,
  onTimePeriodChange,
  disabled = false,
  timePeriod,
}: ActivityLogDateFilterProps) {
  // ============================================================================
  // State & Hooks
  // ============================================================================
  const [internalActiveFilter, setInternalActiveFilter] = useState<TimePeriod>('7d');
  const [showCustomDesktop, setShowCustomDesktop] = useState(false);
  const [showCustomMobile, setShowCustomMobile] = useState(false);

  const activeFilter = timePeriod !== undefined ? timePeriod : internalActiveFilter;

  const setActiveFilter = (val: TimePeriod) => {
    setInternalActiveFilter(val);
  };

  // Sync internal state when external timePeriod changes (e.g. on reset/clear)
  useEffect(() => {
    if (timePeriod !== undefined) {
      setInternalActiveFilter(timePeriod);
      if (timePeriod !== 'Custom') {
        setShowCustomDesktop(false);
        setShowCustomMobile(false);
      }
    }
  }, [timePeriod]);

  // ============================================================================
  // Computed
  // ============================================================================
  const timeFilterButtons: { label: string; value: TimePeriod }[] =
    useMemo(() => {
      const baseButtons = [
        { label: 'Today', value: 'Today' as TimePeriod },
        { label: 'Yesterday', value: 'Yesterday' as TimePeriod },
        { label: 'Last 7 Days', value: '7d' as TimePeriod },
      ];

      baseButtons.push({ label: 'Last 30 Days', value: '30d' as TimePeriod });

      baseButtons.push(
        { label: 'All Time', value: 'All Time' as TimePeriod },
        { label: 'Custom', value: 'Custom' as TimePeriod }
      );

      return baseButtons;
    }, []);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleFilterClick = (filter: TimePeriod) => {
    if (filter === 'Custom') {
      setShowCustomDesktop(true);
    } else {
      setShowCustomDesktop(false);
      setShowCustomMobile(false);
      setActiveFilter(filter);
      onTimePeriodChange?.(filter);
      onDateRangeChange?.(undefined);
    }
  };

  const handleMobileSelectChange = (value: string) => {
    if (value === 'Custom') {
      setShowCustomMobile(true);
    } else {
      setShowCustomMobile(false);
      setShowCustomDesktop(false);
      setActiveFilter(value as TimePeriod);
      onTimePeriodChange?.(value as TimePeriod);
      onDateRangeChange?.(undefined);
    }
  };

  const handleCustomSelect = (range?: { from: Date; to: Date }) => {
    if (!range) return;
    setActiveFilter('Custom');
    setShowCustomDesktop(false);
    setShowCustomMobile(false);
    onTimePeriodChange?.('Custom');
    onDateRangeChange?.({ from: range.from, to: range.to });
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className="flex w-full flex-col gap-3">
      {/* Filter Controls */}
      <div className="flex w-full flex-wrap items-center gap-2">
        {/* Desktop Filter Buttons */}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {timeFilterButtons
            .filter(b => b.value !== 'Custom')
            .map(button => (
              <Button
                key={button.value}
                onClick={() => handleFilterClick(button.value)}
                disabled={disabled}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  activeFilter === button.value
                    ? 'bg-buttonActive text-white'
                    : 'bg-button text-white hover:bg-button/90'
                }`}
              >
                {button.label}
              </Button>
            ))}

          <Popover open={showCustomDesktop} onOpenChange={setShowCustomDesktop}>
            <PopoverTrigger asChild>
              <Button
                disabled={disabled}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${
                  activeFilter === 'Custom'
                    ? 'bg-buttonActive text-white'
                    : 'bg-button text-white hover:bg-button/90'
                }`}
              >
                Custom
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" side="bottom">
              <MuiDateCalendar
                showTime={false}
                buttonLabel="Apply"
                onSelect={handleCustomSelect}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Mobile Filter Dropdown */}
        <div className="w-full md:hidden">
          <Select
            value={showCustomMobile ? 'Custom' : activeFilter}
            onValueChange={handleMobileSelectChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-full bg-white border-2 border-gray-300 text-gray-700 focus:border-blue-500 transition-colors min-h-[44px] text-base">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              {timeFilterButtons.map(button => (
                <SelectItem key={button.value} value={button.value}>
                  {button.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* MuiDateCalendar for mobile - shown when Custom is selected */}
          {showCustomMobile && (
            <div className="mt-2 w-full">
              <MuiDateCalendar
                showTime={false}
                buttonLabel="Apply"
                onSelect={handleCustomSelect}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
