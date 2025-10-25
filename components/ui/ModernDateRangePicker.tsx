'use client';

import React, { useState, useEffect } from 'react';
import {
  DateRangePicker,
  type DateRange,
} from '@/components/ui/dateRangePicker';
import { CustomSelect } from '@/components/ui/custom-select';
import { Label } from '@/components/ui/label';

type ModernDateRangePickerProps = {
  value?: DateRange;
  onChange: (range?: DateRange) => void;
  onGo: () => void;
  onCancel: () => void;
  onSetLastMonth: () => void;
  enableTimeInputs?: boolean;
};

// Custom Time Picker Component
const TimePicker: React.FC<{
  value: string;
  onChange: (time: string) => void;
  label: string;
  id: string;
}> = ({ value, onChange, label, id }) => {
  // Generate hour and minute options
  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i.toString().padStart(2, '0'),
    label: i.toString().padStart(2, '0'),
  }));

  const minutes = Array.from({ length: 60 }, (_, i) => ({
    value: i.toString().padStart(2, '0'),
    label: i.toString().padStart(2, '0'),
  }));

  const [selectedHour, setSelectedHour] = useState(value.split(':')[0] || '00');
  const [selectedMinute, setSelectedMinute] = useState(
    value.split(':')[1] || '00'
  );
  const [isInternalChange, setIsInternalChange] = useState(false);

  // Update local state when value prop changes (only if not an internal change)
  useEffect(() => {
    if (!isInternalChange) {
      const [hour, minute] = value.split(':');
      if (
        hour &&
        minute &&
        (hour !== selectedHour || minute !== selectedMinute)
      ) {
        setSelectedHour(hour);
        setSelectedMinute(minute);
      }
    }
  }, [value, selectedHour, selectedMinute, isInternalChange]);

  // Handle hour change
  const handleHourChange = (newHour: string) => {
    setSelectedHour(newHour);
    setIsInternalChange(true);
    const newTime = `${newHour}:${selectedMinute}`;
    onChange(newTime);
    // Reset internal change flag after a brief delay
    setTimeout(() => setIsInternalChange(false), 0);
  };

  // Handle minute change
  const handleMinuteChange = (newMinute: string) => {
    setSelectedMinute(newMinute);
    setIsInternalChange(true);
    const newTime = `${selectedHour}:${newMinute}`;
    onChange(newTime);
    // Reset internal change flag after a brief delay
    setTimeout(() => setIsInternalChange(false), 0);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <div className="w-20">
          <CustomSelect
            value={selectedHour}
            onValueChange={handleHourChange}
            options={hours}
            placeholder="HH"
            className="w-full"
            triggerClassName="px-3 py-2 rounded text-sm border border-gray-300 bg-white text-center font-medium min-w-[80px]"
            contentClassName="text-sm min-w-[120px] max-w-[200px]"
            searchable={false}
          />
        </div>
        <span className="flex items-center text-lg font-bold text-gray-500">
          :
        </span>
        <div className="w-20">
          <CustomSelect
            value={selectedMinute}
            onValueChange={handleMinuteChange}
            options={minutes}
            placeholder="MM"
            className="w-full"
            triggerClassName="px-3 py-2 rounded text-sm border border-gray-300 bg-white text-center font-medium min-w-[80px]"
            contentClassName="text-sm min-w-[120px] max-w-[200px]"
            searchable={false}
          />
        </div>
      </div>
    </div>
  );
};

export const ModernDateRangePicker: React.FC<ModernDateRangePickerProps> = ({
  value,
  onChange,
  onGo,
  onCancel,
  onSetLastMonth,
  enableTimeInputs = false,
}) => {
  // Time input states - Default to 8 AM for both start and end time
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:00');

  // Initialize time values from the date range if available
  useEffect(() => {
    if (value?.from) {
      const hours = value.from.getHours().toString().padStart(2, '0');
      const minutes = value.from.getMinutes().toString().padStart(2, '0');
      setStartTime(`${hours}:${minutes}`);
    }
    if (value?.to) {
      const hours = value.to.getHours().toString().padStart(2, '0');
      const minutes = value.to.getMinutes().toString().padStart(2, '0');
      setEndTime(`${hours}:${minutes}`);
    }
  }, [value]);

  // Handle date range change and apply time
  const handleDateRangeChange = (range?: DateRange) => {
    if (range?.from && range?.to) {
      // Apply start time to the from date
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const newFromDate = new Date(range.from);
      newFromDate.setHours(startHours, startMinutes, 0, 0);

      // Apply end time to the to date
      const [endHours, endMinutes] = endTime.split(':').map(Number);
      const newToDate = new Date(range.to);
      newToDate.setHours(endHours, endMinutes, 59, 999);

      // Validate that the dates are valid
      if (isNaN(newFromDate.getTime()) || isNaN(newToDate.getTime())) {
        console.warn('Invalid date created, skipping update');
        return;
      }

      // Validate that start date is not after end date
      if (newFromDate > newToDate) {
        console.warn('Start date cannot be after end date, skipping update');
        return;
      }

      onChange({
        from: newFromDate,
        to: newToDate,
      });
    } else if (range?.from) {
      // Handle partial selection (only from date selected)
      const [startHours, startMinutes] = startTime.split(':').map(Number);
      const newFromDate = new Date(range.from);
      newFromDate.setHours(startHours, startMinutes, 0, 0);

      if (isNaN(newFromDate.getTime())) {
        console.warn('Invalid date created, skipping update');
        return;
      }

      onChange({
        from: newFromDate,
        to: undefined,
      });
    } else {
      // No date selected, clear the range
      onChange(range);
    }
  };

  // Handle time change and update the date range
  const handleTimeChange = (timeType: 'start' | 'end', time: string) => {
    // Only process time changes if we have valid dates
    if (!value?.from || !value?.to) {
      console.warn('Cannot set time without valid date range, skipping update');
      return;
    }

    // Validate that the existing dates are valid
    if (isNaN(value.from.getTime()) || isNaN(value.to.getTime())) {
      console.warn('Invalid date range, cannot set time, skipping update');
      return;
    }

    if (timeType === 'start') {
      setStartTime(time);
      const [hours, minutes] = time.split(':').map(Number);

      const newFromDate = new Date(value.from);
      newFromDate.setHours(hours, minutes, 0, 0);

      // Validate that start date is not after end date
      if (newFromDate > value.to) {
        console.warn('Start time cannot be after end date, skipping update');
        return;
      }

      onChange({
        from: newFromDate,
        to: value.to,
      });
    } else {
      setEndTime(time);
      const [hours, minutes] = time.split(':').map(Number);

      const newToDate = new Date(value.to);
      newToDate.setHours(hours, minutes, 59, 999);

      // Validate that end date is not before start date
      if (newToDate < value.from) {
        console.warn('End time cannot be before start date, skipping update');
        return;
      }

      onChange({
        from: value.from,
        to: newToDate,
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-b-lg bg-gray-50 px-4 py-3">
      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          className="rounded-lg bg-button px-3 py-1.5 text-xs font-semibold text-white"
          onClick={onSetLastMonth}
        >
          Last Month
        </button>
        <div style={{ width: 'fit-content' }}>
          <DateRangePicker
            value={value}
            onChange={handleDateRangeChange}
            maxDate={new Date()}
            numberOfMonths={2}
          />
        </div>
      </div>

      {/* Time Inputs - Only show if enableTimeInputs is true */}
      {enableTimeInputs && value?.from && value?.to && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:gap-6">
          <TimePicker
            value={startTime}
            onChange={time => handleTimeChange('start', time)}
            label="Start Time"
            id="start-time"
          />

          <div className="flex items-center text-lg font-medium text-gray-500">
            to
          </div>

          <TimePicker
            value={endTime}
            onChange={time => handleTimeChange('end', time)}
            label="End Time"
            id="end-time"
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-2">
        <button
          className="rounded-lg bg-lighterBlueHighlight px-3 py-1.5 text-xs font-semibold text-white"
          onClick={onGo}
          disabled={!value?.from || !value?.to}
        >
          Go
        </button>
        <button
          className="rounded-lg bg-gray-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-600"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
