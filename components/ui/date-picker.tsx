'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker, SelectSingleEventHandler } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export type DatePickerProps = {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: boolean;
};

export function DatePicker({ date, setDate, disabled }: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleSelect: SelectSingleEventHandler = (
    day,
    selectedDate,
    activeModifiers,
    e
  ) => {
    if (activeModifiers && e) {
      /* Stub */
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
          disabled={disabled}
          showOutsideDays
        />
      </PopoverContent>
    </Popover>
  );
}
