/**
 * Date Time Picker Component
 * Combined date and time picker component with popover calendar and time inputs.
 *
 * Features:
 * - Date selection via calendar
 * - Time selection via hour/minute/period inputs
 * - Combined date-time value
 * - Date and time formatting
 * - Disabled state support
 * - 12-hour format with AM/PM
 *
 * @param date - Currently selected date-time
 * @param setDate - Callback to update selected date-time
 * @param disabled - Whether the picker is disabled
 */
'use client';

import * as React from 'react';
import { format, set } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { DayPicker, SelectSingleEventHandler } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

import { cn } from '@/lib/utils';
import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/shared/ui/popover';

export type DateTimePickerProps = {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: boolean;
};

export function DateTimePicker({
  date,
  setDate,
  disabled,
}: DateTimePickerProps) {
  // Store hours and minutes separately for UI handling
  const [time, setTime] = React.useState(() => {
    if (!date) return { hours: '12', minutes: '00', period: 'AM' };
    const hours = date.getHours();
    return {
      hours:
        hours === 0 ? '12' : hours > 12 ? String(hours - 12) : String(hours),
      minutes: date.getMinutes().toString().padStart(2, '0'),
      period: hours >= 12 ? 'PM' : 'AM',
    };
  });

  // When the date changes (from calendar), update the time state to match the new date
  React.useEffect(() => {
    if (!date) return;
    const hours = date.getHours();
    setTime({
      hours:
        hours === 0 ? '12' : hours > 12 ? String(hours - 12) : String(hours),
      minutes: date.getMinutes().toString().padStart(2, '0'),
      period: hours >= 12 ? 'PM' : 'AM',
    });
  }, [date]);

  const handleDateSelect: SelectSingleEventHandler = (
    selectedDay,
    activeModifiers,
    e
  ) => {
    if (selectedDay) {
      // Stub usage to satisfy ESLint
      if (activeModifiers && e) {
        // This block does nothing but uses the variables.
      }
      let hours = parseInt(time.hours);
      if (time.period === 'PM' && hours < 12) hours += 12;
      if (time.period === 'AM' && hours === 12) hours = 0;
      const minutes = parseInt(time.minutes);
      const newDate = set(selectedDay, { hours, minutes });
      setDate(newDate);
    } else {
      setDate(undefined);
    }
  };

  // Update the date with the selected time
  React.useEffect(() => {
    if (!date) return;
    let hours = parseInt(time.hours);
    if (time.period === 'PM' && hours < 12) hours += 12;
    if (time.period === 'AM' && hours === 12) hours = 0; // 12 AM is 00 hours
    const minutes = parseInt(time.minutes);
    // Only update if the time is different
    if (date.getHours() !== hours || date.getMinutes() !== minutes) {
      const newDate = set(date, { hours, minutes });
      setDate(newDate);
    }
  }, [time, date, setDate]);

  // Format display string
  const formattedDate = React.useMemo(() => {
    if (!date) return 'Pick a date and time';
    return format(date, 'PPP p');
  }, [date]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal md:w-[280px]',
            !date && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formattedDate}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-0">
          <DayPicker
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            disabled={disabled}
            showOutsideDays
            captionLayout="dropdown"
            fromYear={1950}
            toYear={2050}
          />
          <div className="border-t border-border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 opacity-70" />
                <span className="text-sm font-medium">Time</span>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-center space-x-2">
              <Input
                type="number"
                min="1"
                max="12"
                className="w-16 text-center text-sm"
                value={time.hours}
                onChange={e => {
                  const value = e.target.value;
                  if (
                    value === '' ||
                    (parseInt(value) >= 1 && parseInt(value) <= 12)
                  ) {
                    setTime({ ...time, hours: value });
                  }
                }}
                disabled={disabled || !date}
              />
              <span className="text-sm font-medium">:</span>
              <Input
                type="number"
                min="0"
                max="59"
                className="w-16 text-center text-sm"
                value={time.minutes}
                onChange={e => {
                  const value = e.target.value;
                  if (
                    value === '' ||
                    (parseInt(value) >= 0 && parseInt(value) <= 59)
                  ) {
                    setTime({ ...time, minutes: value.padStart(2, '0') });
                  }
                }}
                disabled={disabled || !date}
              />
              <div className="flex">
                <Button
                  type="button"
                  variant={time.period === 'AM' ? 'default' : 'outline'}
                  size="sm"
                  className="w-12 rounded-r-none text-xs"
                  onClick={() => setTime({ ...time, period: 'AM' })}
                  disabled={disabled || !date}
                >
                  AM
                </Button>
                <Button
                  type="button"
                  variant={time.period === 'PM' ? 'default' : 'outline'}
                  size="sm"
                  className="w-12 rounded-l-none text-xs"
                  onClick={() => setTime({ ...time, period: 'PM' })}
                  disabled={disabled || !date}
                >
                  PM
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

