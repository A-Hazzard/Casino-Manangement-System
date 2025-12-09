'use client';

import {
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from 'date-fns';
import { Calendar as CalendarIcon, Check } from 'lucide-react';
import * as React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

// Helper function to format time for display
const formatTimeDisplay = (hours: number, minutes: number): string => {
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const ampm = hours < 12 ? 'AM' : 'PM';
  const displayMinute = minutes.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${ampm}`;
};

// Time Input Component - 12-hour format with AM/PM
type TimeInputProps = {
  hours: number; // 24-hour format (0-23) internally
  minutes: number;
  onChange: (hours: number, minutes: number) => void; // Returns 24-hour format
};

const TimeInput: React.FC<TimeInputProps> = ({ hours, minutes, onChange }) => {
  // Convert 24-hour to 12-hour format for display
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const isPM = hours >= 12;

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputHour = parseInt(e.target.value) || 1;
    const newDisplayHour = Math.max(1, Math.min(12, inputHour));
    // Convert 12-hour to 24-hour format based on current AM/PM state
    let newHours24: number;
    if (isPM) {
      // PM: 12 PM = 12, 1-11 PM = 13-23
      newHours24 = newDisplayHour === 12 ? 12 : newDisplayHour + 12;
    } else {
      // AM: 12 AM = 0, 1-11 AM = 1-11
      newHours24 = newDisplayHour === 12 ? 0 : newDisplayHour;
    }
    onChange(newHours24, minutes);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
    onChange(hours, newMinutes);
  };

  const handleAMPMChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newIsPM = e.target.value === 'PM';
    let newHours24: number;

    // Convert current display hour (1-12) to 24-hour format based on new AM/PM selection
    if (newIsPM) {
      // PM: 12 PM = 12, 1-11 PM = 13-23
      newHours24 = displayHour === 12 ? 12 : displayHour + 12;
    } else {
      // AM: 12 AM = 0, 1-11 AM = 1-11
      newHours24 = displayHour === 12 ? 0 : displayHour;
    }

    onChange(newHours24, minutes);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="number"
          min="1"
          max="12"
          value={displayHour}
          onChange={handleHoursChange}
          className="w-12 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-14"
          placeholder="HH"
        />
        <span className="flex-shrink-0 font-medium text-gray-500">:</span>
        <input
          type="number"
          min="0"
          max="59"
          value={minutes}
          onChange={handleMinutesChange}
          className="w-12 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-14"
          placeholder="MM"
        />
        <select
          value={isPM ? 'PM' : 'AM'}
          onChange={handleAMPMChange}
          className="w-14 flex-shrink-0 rounded border border-gray-300 bg-white px-1.5 py-1.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-16 sm:px-2"
        >
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      <span className="text-center text-xs font-medium text-gray-600">
        {formatTimeDisplay(hours, minutes)}
      </span>
    </div>
  );
};

interface ModernCalendarProps {
  date?: { from?: Date; to?: Date };
  onSelect?: (date?: { from?: Date; to?: Date }) => void;
  className?: string;
  enableTimeInputs?: boolean;
  mode?: 'single' | 'range';
  disabled?: boolean;
}

export function ModernCalendar({
  date,
  onSelect,
  className,
  enableTimeInputs = false,
  mode = 'range',
  disabled = false,
}: ModernCalendarProps) {
  const [startDate, setStartDate] = React.useState<Date | null>(
    date?.from || null
  );
  const [endDate, setEndDate] = React.useState<Date | null>(date?.to || null);
  const [isOpen, setIsOpen] = React.useState(false);

  // Track selected times separately for range mode, single time for single mode
  const [selectedStartTime, setSelectedStartTime] = React.useState<{
    hours: number;
    minutes: number;
  } | null>(() => {
    if (date?.from && enableTimeInputs) {
      return {
        hours: date.from.getHours(),
        minutes: date.from.getMinutes(),
      };
    }
    return null;
  });

  const [selectedEndTime, setSelectedEndTime] = React.useState<{
    hours: number;
    minutes: number;
  } | null>(() => {
    if (date?.to && enableTimeInputs && mode === 'range') {
      return {
        hours: date.to.getHours(),
        minutes: date.to.getMinutes(),
      };
    }
    // For range mode, default end time to same as start or end of day
    if (date?.from && enableTimeInputs && mode === 'range') {
      return {
        hours: date.from.getHours(),
        minutes: date.from.getMinutes(),
      };
    }
    return null;
  });

  React.useEffect(() => {
    if (isOpen) {
      console.log('🔵 Calendar opened, current date:', date);
      setStartDate(date?.from || null);
      setEndDate(date?.to || null);

      if (date?.from && enableTimeInputs) {
        const startHours = date.from.getHours();
        const startMinutes = date.from.getMinutes();
        setSelectedStartTime({ hours: startHours, minutes: startMinutes });

        if (mode === 'range' && date?.to) {
          const endHours = date.to.getHours();
          const endMinutes = date.to.getMinutes();
          const newEndTime = { hours: endHours, minutes: endMinutes };
          setSelectedEndTime(newEndTime);
          console.log('🕐 Initialized times:', {
            start: { startHours, startMinutes },
            end: newEndTime,
          });
        } else if (mode === 'range') {
          // Default end time to same as start time
          const newEndTime = { hours: startHours, minutes: startMinutes };
          setSelectedEndTime(newEndTime);
          console.log('🕐 Initialized times:', {
            start: { startHours, startMinutes },
            end: newEndTime,
          });
        } else {
          console.log('🕐 Initialized times:', {
            start: { startHours, startMinutes },
            end: null,
          });
        }
      }
    }
  }, [date, isOpen, enableTimeInputs, mode]);

  const presets = [
    {
      label: 'Today',
      getValue: () => ({
        from: startOfDay(new Date()),
        to: startOfDay(new Date()),
      }),
    },
    {
      label: 'Yesterday',
      getValue: () => ({
        from: startOfDay(subDays(new Date(), 1)),
        to: startOfDay(subDays(new Date(), 1)),
      }),
    },
    {
      label: 'This Week',
      getValue: () => ({
        from: startOfWeek(new Date()),
        to: endOfWeek(new Date()),
      }),
    },
    {
      label: 'Last Week',
      getValue: () => ({
        from: subDays(startOfWeek(new Date()), 7),
        to: subDays(endOfWeek(new Date()), 7),
      }),
    },
    {
      label: 'This Month',
      getValue: () => ({
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      }),
    },
    {
      label: 'Last Month',
      getValue: () => ({
        from: subMonths(startOfMonth(new Date()), 1),
        to: subMonths(endOfMonth(new Date()), 1),
      }),
    },
  ];

  const visiblePresets =
    mode === 'single'
      ? presets.filter(p => ['Today', 'Yesterday'].includes(p.label))
      : presets;

  const handleApply = () => {
    console.log('🟢 Apply clicked');
    console.log('📅 Current startDate:', startDate);
    console.log('📅 Current endDate:', endDate);
    console.log('🕐 Current selectedStartTime:', selectedStartTime);
    console.log('🕐 Current selectedEndTime:', selectedEndTime);

    if (mode === 'range') {
      if (startDate && endDate) {
        let finalStart = startDate;
        let finalEnd = endDate;

        if (enableTimeInputs) {
          // Apply start time to start date (using local time)
          if (selectedStartTime) {
            finalStart = new Date(startDate);
            finalStart.setHours(
              selectedStartTime.hours,
              selectedStartTime.minutes,
              0,
              0
            );
          }

          // Apply end time to end date (using local time)
          if (selectedEndTime) {
            finalEnd = new Date(endDate);
            finalEnd.setHours(
              selectedEndTime.hours,
              selectedEndTime.minutes,
              0,
              0
            );
          }

          // If same day and same time, ensure end is at least 1 minute after start
          if (
            isSameDay(finalStart, finalEnd) &&
            finalStart.getTime() === finalEnd.getTime()
          ) {
            finalEnd = new Date(finalEnd.getTime() + 60 * 1000); // Add 1 minute
          }

          console.log('🟡 Applied times to range:', {
            finalStart: finalStart.toISOString(),
            finalEnd: finalEnd.toISOString(),
            localStart: finalStart.toString(),
            localEnd: finalEnd.toString(),
          });
        }

        onSelect?.({ from: finalStart, to: finalEnd });
        setIsOpen(false);
      }
    } else {
      if (startDate) {
        let finalDate = startDate;

        if (enableTimeInputs && selectedStartTime) {
          finalDate = new Date(startDate);
          finalDate.setHours(
            selectedStartTime.hours,
            selectedStartTime.minutes,
            0,
            0
          );
          console.log('🟡 Applied time to single date:', {
            iso: finalDate.toISOString(),
            local: finalDate.toString(),
          });
        }

        onSelect?.({ from: finalDate, to: finalDate });
        setIsOpen(false);
      }
    }
  };

  const handlePresetClick = (preset: {
    label: string;
    getValue: () => { from: Date; to: Date };
  }) => {
    const range = preset.getValue();
    console.log('⏰ Preset clicked:', preset.label, range);

    if (mode === 'single') {
      setStartDate(range.from);
      setEndDate(range.from);
    } else {
      setStartDate(range.from);
      setEndDate(range.to);
    }

    // Set time to current time or midnight
    if (enableTimeInputs) {
      const now = new Date();
      const time = {
        hours: now.getHours(),
        minutes: now.getMinutes(),
      };
      setSelectedStartTime(time);
      if (mode === 'range') {
        setSelectedEndTime(time);
      }
    }
  };

  const isPresetActive = (preset: {
    label: string;
    getValue: () => { from: Date; to: Date };
  }) => {
    const range = preset.getValue();
    if (!startDate || (mode === 'range' && !endDate)) return false;

    if (mode === 'single') {
      return isSameDay(range.from, startDate);
    }
    return isSameDay(range.from, startDate) && isSameDay(range.to, endDate!);
  };

  const onChange = (date: Date | [Date | null, Date | null] | null) => {
    console.log('📅 Date changed:', date);
    if (mode === 'range') {
      const [start, end] = date as [Date | null, Date | null];
      setStartDate(start);
      setEndDate(end);
    } else {
      const newDate = date as Date | null;
      setStartDate(newDate);
      setEndDate(newDate);
    }

    // Initialize time if not set
    if (enableTimeInputs && !selectedStartTime) {
      const now = new Date();
      const time = {
        hours: now.getHours(),
        minutes: now.getMinutes(),
      };
      setSelectedStartTime(time);
      if (mode === 'range' && !selectedEndTime) {
        setSelectedEndTime(time);
      }
    }
  };

  // Time input handlers
  const handleStartTimeChange = (hours: number, minutes: number) => {
    setSelectedStartTime({ hours, minutes });
  };

  const handleEndTimeChange = (hours: number, minutes: number) => {
    setSelectedEndTime({ hours, minutes });
  };

  const headerText = React.useMemo(() => {
    if (!date?.from)
      return mode === 'range' ? 'Pick a date range' : 'Pick a date';

    if (mode === 'range') {
      if (date.to) {
        if (enableTimeInputs) {
          return `${format(date.from, 'MMM dd, yyyy h:mm aa')} - ${format(date.to, 'MMM dd, yyyy h:mm aa')}`;
        }
        return `${format(date.from, 'MMM dd, yyyy')} - ${format(date.to, 'MMM dd, yyyy')}`;
      }
      return format(
        date.from,
        enableTimeInputs ? 'MMM dd, yyyy h:mm aa' : 'MMM dd, yyyy'
      );
    }

    return format(
      date.from,
      enableTimeInputs ? 'MMM dd, yyyy h:mm aa' : 'MMM dd, yyyy'
    );
  }, [date, mode, enableTimeInputs]);

  return (
    <div className={cn('grid w-full gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            disabled={disabled}
            variant={'outline'}
            className={cn(
              'w-full min-w-[200px] max-w-full justify-start border-gray-200 bg-white text-left text-xs font-normal shadow-sm transition-all hover:bg-gray-50 sm:text-sm',
              !date?.from && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0 text-blue-500" />
            <span className="truncate font-medium text-gray-700">
              {headerText}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto max-w-[calc(100vw-2rem)] p-0 sm:max-w-[600px] lg:max-w-[700px]"
          align="start"
          side="bottom"
          sideOffset={8}
          collisionPadding={16}
          avoidCollisions={true}
          sticky="always"
        >
          <div className="flex max-h-[calc(100vh-4rem)] max-w-full flex-col overflow-hidden rounded-lg border border-gray-100 bg-white shadow-xl lg:flex-row">
            {/* Presets Sidebar */}
            <div className="hidden w-[140px] flex-shrink-0 flex-col gap-1 border-r border-gray-100 bg-slate-50/50 p-3 lg:flex">
              <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Presets
              </div>
              {visiblePresets.map(preset => (
                <Button
                  key={preset.label}
                  variant="ghost"
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    'h-9 w-full justify-start rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isPresetActive(preset)
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {preset.label}
                  {isPresetActive(preset) && (
                    <Check className="ml-auto h-3 w-3" />
                  )}
                </Button>
              ))}
            </div>

            {/* DatePicker */}
            <div className="flex min-w-0 flex-shrink-0 flex-col overflow-x-auto overflow-y-auto p-3 sm:p-4">
              {mode === 'range' ? (
                <DatePicker
                  selected={startDate}
                  onChange={
                    onChange as (date: [Date | null, Date | null]) => void
                  }
                  startDate={startDate || undefined}
                  endDate={endDate || undefined}
                  selectsRange
                  inline
                  dateFormat="MMMM d, yyyy"
                  calendarClassName="modern-calendar"
                  shouldCloseOnSelect={false}
                />
              ) : (
                <DatePicker
                  selected={startDate}
                  onChange={onChange as (date: Date | null) => void}
                  inline
                  dateFormat="MMMM d, yyyy"
                  calendarClassName="modern-calendar"
                  shouldCloseOnSelect={false}
                />
              )}

              {/* Apply Button - Desktop: shown after calendar */}
              <div className="mt-4 hidden justify-end gap-2 lg:flex">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleApply}
                  className="bg-blue-600 text-white hover:bg-blue-700"
                  disabled={!startDate || (mode === 'range' && !endDate)}
                >
                  Apply
                </Button>
              </div>
            </div>

            {/* Custom Time Inputs */}
            {enableTimeInputs && (
              <div
                className={cn(
                  'flex w-full min-w-0 flex-shrink-0 flex-col border-t border-gray-100 bg-white lg:w-auto lg:border-l lg:border-t-0',
                  mode === 'range' ? 'lg:w-[200px]' : 'lg:w-[150px]'
                )}
              >
                <div className="border-b border-gray-100 p-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {mode === 'range' ? 'Times' : 'Time'}
                </div>
                <div className="flex min-w-0 flex-1 space-y-4 overflow-y-auto p-3 sm:p-4">
                  {/* Start Time Input */}
                  <div className="space-y-2">
                    {mode === 'range' && (
                      <label className="mb-1.5 block text-xs font-medium text-gray-700">
                        Start Time
                      </label>
                    )}
                    <TimeInput
                      hours={selectedStartTime?.hours ?? 0}
                      minutes={selectedStartTime?.minutes ?? 0}
                      onChange={handleStartTimeChange}
                    />
                  </div>

                  {/* End Time Input (only for range mode) */}
                  {mode === 'range' && (
                    <div className="space-y-2">
                      <label className="mb-1.5 block text-xs font-medium text-gray-700">
                        End Time
                      </label>
                      <TimeInput
                        hours={selectedEndTime?.hours ?? 0}
                        minutes={selectedEndTime?.minutes ?? 0}
                        onChange={handleEndTimeChange}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cancel and Apply Buttons - Mobile: shown at bottom of entire component */}
            <div className="flex justify-end gap-2 border-t border-gray-100 bg-gray-50 p-3 lg:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                disabled={!startDate || (mode === 'range' && !endDate)}
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <style jsx global>{`
        .modern-calendar {
          border: none;
          font-family: inherit;
        }
        .react-datepicker {
          border: none;
          box-shadow: none;
        }
        .react-datepicker__header {
          background-color: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }
        .react-datepicker__day--selected,
        .react-datepicker__day--in-range {
          background-color: #2563eb !important;
          color: white !important;
        }
        .react-datepicker__day--in-selecting-range {
          background-color: #dbeafe !important;
          color: #1e40af !important;
        }
      `}</style>
    </div>
  );
}
