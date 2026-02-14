/**
 * Date Picker Component
 * Single date picker component with popover calendar.
 *
 * Features:
 * - Single date selection
 * - Popover calendar interface
 * - Date formatting
 * - Disabled state support
 * - Auto-close on selection
 *
 * @param date - Currently selected date
 * @param setDate - Callback to update selected date
 * @param disabled - Whether the picker is disabled
 */
'use client';

import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import * as React from 'react';
import { DayPicker, SelectSingleEventHandler } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

import { Button } from '@/components/shared/ui/button';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/shared/ui/popover';
import { cn } from '@/lib/utils';

export type DatePickerProps = {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: boolean;
  disabledDates?: any; // Matcher | Matcher[] from react-day-picker
};

export function DatePicker({ date, setDate, disabled, disabledDates }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect: SelectSingleEventHandler = (
    day,
    selectedDate,
    activeModifiers,
    _e
  ) => {
    if (activeModifiers.disabled) {
       return; 
    }
    setDate(day);
    if (day) {
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-full justify-start text-left font-normal md:w-[240px]',
            !date && 'text-muted-foreground'
          )}
          disabled={disabled}
          onClick={() => setIsOpen(true)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP') : <span>Pick a date</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <DayPicker
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus={isOpen}
          disabled={disabledDates}
          showOutsideDays
        />
      </PopoverContent>
    </Popover>
  );
}

