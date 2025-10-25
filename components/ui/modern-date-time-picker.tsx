'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export type ModernDateTimePickerProps = {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
};

export function ModernDateTimePicker({
  date,
  setDate,
  disabled = false,
  placeholder = 'Pick a date and time',
  className,
}: ModernDateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [tempDate, setTempDate] = React.useState<Date | undefined>(date);
  const [tempTime, setTempTime] = React.useState<string>('');

  // Initialize temp values when date changes
  React.useEffect(() => {
    if (date) {
      setTempDate(date);
      setTempTime(format(date, 'HH:mm'));
    } else {
      setTempDate(undefined);
      setTempTime('');
    }
  }, [date]);

  // Generate time options (every 15 minutes)
  const timeOptions = React.useMemo(() => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute
          .toString()
          .padStart(2, '0')}`;
        const displayTime = format(
          new Date(2000, 0, 1, hour, minute),
          'h:mm aa'
        );
        options.push({ value: timeString, label: displayTime });
      }
    }
    return options;
  }, []);

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      // If we have a time selected, combine date and time
      if (tempTime) {
        const [hours, minutes] = tempTime.split(':').map(Number);
        const combinedDate = new Date(selectedDate);
        combinedDate.setHours(hours, minutes, 0, 0);
        setTempDate(combinedDate);
      } else {
        setTempDate(selectedDate);
      }
    }
  };

  const handleTimeSelect = (timeValue: string) => {
    setTempTime(timeValue);
    if (tempDate) {
      const [hours, minutes] = timeValue.split(':').map(Number);
      const combinedDate = new Date(tempDate);
      combinedDate.setHours(hours, minutes, 0, 0);
      setTempDate(combinedDate);
    }
  };

  const handleConfirm = () => {
    if (tempDate) {
      setDate(tempDate);
    }
    setOpen(false);
  };

  const handleCancel = () => {
    setTempDate(date);
    setTempTime(date ? format(date, 'HH:mm') : '');
    setOpen(false);
  };

  const formatDisplayDate = (date: Date | undefined) => {
    if (!date) return placeholder;
    return format(date, "MMM d, yyyy 'at' h:mm aa");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'w-full justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formatDisplayDate(date)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Calendar Section */}
          <div className="border-r">
            <Calendar
              mode="single"
              selected={tempDate}
              onSelect={handleDateSelect}
              disabled={date =>
                date > new Date() || date < new Date('1900-01-01')
              }
              initialFocus
            />
          </div>

          {/* Time Section */}
          <div className="w-48 border-l p-3">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Time</Label>
              </div>

              <Select value={tempTime} onValueChange={handleTimeSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent className="max-h-48">
                  {timeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  className="flex-1"
                  disabled={disabled}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirm}
                  className="flex-1"
                  disabled={disabled || !tempDate}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
