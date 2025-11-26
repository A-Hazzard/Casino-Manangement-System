/**
 * Simple Date Time Picker Component
 * Simple date-time picker using react-datepicker library.
 *
 * Features:
 * - Date and time selection
 * - react-datepicker integration
 * - Click outside to close handling
 * - Date formatting
 * - Disabled state support
 * - Temporary state management
 *
 * @param date - Currently selected date-time
 * @param setDate - Callback to update selected date-time
 * @param disabled - Whether the picker is disabled
 */
'use client';

import * as React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Calendar as CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type SimpleDateTimePickerProps = {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: boolean;
};

export function SimpleDateTimePicker({
  date,
  setDate,
  disabled,
}: SimpleDateTimePickerProps): React.JSX.Element {
  const [isOpen, setIsOpen] = React.useState(false);

  const [tempDate, setTempDate] = React.useState<Date | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Handle click outside to close the date picker
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setTempDate(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      setTempDate(newDate);
    }
  };

  const handleConfirm = () => {
    if (tempDate) {
      setDate(tempDate);
    }
    setIsOpen(false);
    setTempDate(null);
  };

  const handleCancel = () => {
    setIsOpen(false);
    setTempDate(null);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'Pick a date and time';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        className={cn(
          'w-full justify-start overflow-hidden text-left font-normal md:w-[280px]',
          !date && 'text-muted-foreground'
        )}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
        <span className="truncate">{formatDate(date)}</span>
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full z-[70] mt-1 rounded-md border border-gray-200 bg-white shadow-lg">
          <DatePicker
            selected={tempDate || date || new Date()}
            onChange={handleDateChange}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="MMMM d, yyyy h:mm aa"
            inline
            disabled={disabled}
          />

          <div className="flex justify-end gap-2 border-t border-gray-200 p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={disabled}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={disabled || !tempDate}
            >
              Go
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
