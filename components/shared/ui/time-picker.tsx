'use client';

import { Button } from '@/components/shared/ui/button';
import { Input } from '@/components/shared/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/shared/ui/popover';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import * as React from 'react';

export type TimePickerProps = {
  /**
   * The selected time in HH:MM format (24-hour)
   * Example: "14:30" for 2:30 PM
   */
  time: string | undefined;
  /**
   * Callback when time changes
   */
  setTime: (time: string | undefined) => void;
  /**
   * Whether the picker is disabled
   */
  disabled?: boolean;
  /**
   * Placeholder text when no time is selected
   */
  placeholder?: string;
};

/**
 * Time Picker Component
 * Allows selection of time only (no date) in 12-hour format with AM/PM.
 * Returns time in 24-hour HH:MM format for easy filtering.
 */
export function TimePicker({
  time,
  setTime,
  disabled,
  placeholder = 'Select time',
}: TimePickerProps) {
  // Parse time string (HH:MM 24-hour format) to display format
  const parseTime = (timeStr: string | undefined) => {
    if (!timeStr) return { hours: '12', minutes: '00', period: 'AM' };
    
    const [hoursStr, minutesStr] = timeStr.split(':');
    const hours24 = parseInt(hoursStr);
    
    return {
      hours: hours24 === 0 ? '12' : hours24 > 12 ? String(hours24 - 12) : String(hours24),
      minutes: minutesStr || '00',
      period: hours24 >= 12 ? 'PM' : 'AM',
    };
  };

  const [timeState, setTimeState] = React.useState(() => parseTime(time));

  // Update display when prop changes
  React.useEffect(() => {
    setTimeState(parseTime(time));
  }, [time]);

  // Convert display format to 24-hour HH:MM format
  const updateTime = (newTimeState: typeof timeState) => {
    setTimeState(newTimeState);
    
    let hours24 = parseInt(newTimeState.hours);
    if (newTimeState.period === 'PM' && hours24 < 12) hours24 += 12;
    if (newTimeState.period === 'AM' && hours24 === 12) hours24 = 0;
    
    const timeStr = `${hours24.toString().padStart(2, '0')}:${newTimeState.minutes}`;
    setTime(timeStr);
  };

  // Format display string
  const formattedTime = React.useMemo(() => {
    if (!time) return placeholder;
    const { hours, minutes, period } = timeState;
    return `${hours}:${minutes} ${period}`;
  }, [time, timeState, placeholder]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal',
            !time && 'text-muted-foreground'
          )}
          disabled={disabled}
        >
          <Clock className="mr-2 h-4 w-4" />
          {formattedTime}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 opacity-70" />
            <span className="text-sm font-medium">Select Time</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Input
              type="number"
              min="1"
              max="12"
              className="w-16 text-center text-sm"
              value={timeState.hours}
              onChange={e => {
                const value = e.target.value;
                if (
                  value === '' ||
                  (parseInt(value) >= 1 && parseInt(value) <= 12)
                ) {
                  updateTime({ ...timeState, hours: value });
                }
              }}
              disabled={disabled}
            />
            <span className="text-sm font-medium">:</span>
            <Input
              type="number"
              min="0"
              max="59"
              className="w-16 text-center text-sm"
              value={timeState.minutes}
              onChange={e => {
                const value = e.target.value;
                if (
                  value === '' ||
                  (parseInt(value) >= 0 && parseInt(value) <= 59)
                ) {
                  updateTime({ ...timeState, minutes: value.padStart(2, '0') });
                }
              }}
              disabled={disabled}
            />
            <div className="flex">
              <Button
                type="button"
                variant={timeState.period === 'AM' ? 'default' : 'outline'}
                size="sm"
                className="w-12 rounded-r-none text-xs"
                onClick={() => updateTime({ ...timeState, period: 'AM' })}
                disabled={disabled}
              >
                AM
              </Button>
              <Button
                type="button"
                variant={timeState.period === 'PM' ? 'default' : 'outline'}
                size="sm"
                className="w-12 rounded-l-none text-xs"
                onClick={() => updateTime({ ...timeState, period: 'PM' })}
                disabled={disabled}
              >
                PM
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
