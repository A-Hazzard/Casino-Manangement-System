/**
 * Date Range Filter Component
 * Date range picker component with popover calendar and apply/cancel buttons.
 *
 * Features:
 * - Date range selection
 * - Popover calendar interface
 * - Apply and cancel buttons
 * - Date formatting
 * - Local state management
 *
 * @param dateRange - Current date range
 * @param onApply - Callback when date range is applied
 * @param className - Additional CSS classes
 */
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DateRange as RDPDateRange } from 'react-day-picker';
import { CalendarIcon, ChevronDownIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { DateRangeFilterProps } from '@/lib/types/componentProps';

export default function DateRangeFilter({
  dateRange,
  onApply,
  className,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localDateRange, setLocalDateRange] = useState<
    RDPDateRange | undefined
  >(dateRange);

  useEffect(() => {
    setLocalDateRange(dateRange);
  }, [dateRange]);

  const handleApply = () => {
    onApply(localDateRange);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setLocalDateRange(dateRange); // Reset to the original range
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[280px] justify-start text-left font-normal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, 'LLL dd, y')} -{' '}
                  {format(dateRange.to, 'LLL dd, y')}
                </>
              ) : (
                format(dateRange.from, 'LLL dd, y')
              )
            ) : (
              <span>Pick a date</span>
            )}
            <ChevronDownIcon className="ml-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={localDateRange?.from}
            selected={localDateRange}
            onSelect={setLocalDateRange}
            numberOfMonths={2}
          />
          <div className="flex justify-between border-t p-2">
            <Button variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
            <Button onClick={handleApply}>Apply</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
