/**
 * Modern Date Range Picker Component
 * Advanced date range picker with time selection and preset options.
 *
 * Features:
 * - Date range selection (start and end dates)
 * - Optional time inputs for start and end times
 * - "Set Last Month" quick action
 * - Go and Cancel buttons
 * - Custom time picker component
 * - Optimized for mobile performance
 *
 * Large component (~337 lines) handling date range selection with time support.
 *
 * @param value - Currently selected date range
 * @param onChange - Callback to update date range
 * @param onGo - Callback when "Go" button is clicked
 * @param onCancel - Callback when "Cancel" button is clicked
 * @param onSetLastMonth - Callback when "Set Last Month" is clicked
 * @param enableTimeInputs - Whether to show time inputs
 */
'use client';

import { CustomSelect } from '@/components/shared/ui/custom-select';
import {
    DateRangePicker,
    type DateRange,
} from '@/components/shared/ui/dateRangePicker';
import { Label } from '@/components/shared/ui/label';
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

// ============================================================================
// Types & Helper Components
// ============================================================================

type ModernDateRangePickerProps = {
  value?: DateRange;
  onChange: (range?: DateRange) => void;
  onGo: () => void;
  onCancel: () => void;
  onSetLastMonth: () => void;
  enableTimeInputs?: boolean;
  hideGoButton?: boolean;
  hideCancelButton?: boolean;
};

// Custom Time Picker Component - Optimized for mobile performance
const TimePicker = React.memo<{
  value: string;
  onChange: (time: string) => void;
  label: string;
  id: string;
}>(({ value, onChange, label, id }) => {
  // Memoize options to prevent recreation on every render
  const hours = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        value: i.toString().padStart(2, '0'),
        label: i.toString().padStart(2, '0'),
      })),
    []
  );

  const minutes = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        value: i.toString().padStart(2, '0'),
        label: i.toString().padStart(2, '0'),
      })),
    []
  );

  const [selectedHour, setSelectedHour] = useState(value.split(':')[0] || '00');
  const [selectedMinute, setSelectedMinute] = useState(
    value.split(':')[1] || '00'
  );

  // Use ref to track internal changes instead of state to avoid extra renders
  const isInternalChangeRef = useRef(false);

  // Update local state when value prop changes (only if not an internal change)
  useEffect(() => {
    if (!isInternalChangeRef.current) {
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
    isInternalChangeRef.current = false;
  }, [value, selectedHour, selectedMinute]);

  // Memoize handlers to prevent recreation
  const handleHourChange = useCallback(
    (newHour: string) => {
      setSelectedHour(newHour);
      isInternalChangeRef.current = true;
      const newTime = `${newHour}:${selectedMinute}`;
      onChange(newTime);
    },
    [selectedMinute, onChange]
  );

  const handleMinuteChange = useCallback(
    (newMinute: string) => {
      setSelectedMinute(newMinute);
      isInternalChangeRef.current = true;
      const newTime = `${selectedHour}:${newMinute}`;
      onChange(newTime);
    },
    [selectedHour, onChange]
  );

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
});

TimePicker.displayName = 'TimePicker';

export const ModernDateRangePicker: React.FC<ModernDateRangePickerProps> = ({
  value,
  onChange,
  onGo,
  onCancel,
  onSetLastMonth,
  enableTimeInputs = false,
  hideGoButton = false,
  hideCancelButton = false,
}) => {
  // Time input states - Default to 8 AM for both start and end time
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('08:00');

  // Track if time was initialized to prevent unnecessary updates
  const timeInitializedRef = useRef(false);

  // Initialize time values from the date range if available (run only once per value change)
  useEffect(() => {
    if (value?.from && value?.to && !timeInitializedRef.current) {
      const fromHours = value.from.getHours().toString().padStart(2, '0');
      const fromMinutes = value.from.getMinutes().toString().padStart(2, '0');
      const toHours = value.to.getHours().toString().padStart(2, '0');
      const toMinutes = value.to.getMinutes().toString().padStart(2, '0');

      setStartTime(`${fromHours}:${fromMinutes}`);
      setEndTime(`${toHours}:${toMinutes}`);
      timeInitializedRef.current = true;
    }

    // Reset flag when value is cleared
    if (!value?.from || !value?.to) {
      timeInitializedRef.current = false;
    }
  }, [value?.from, value?.to]);

  // Memoized date range change handler
  const handleDateRangeChange = useCallback(
    (range?: DateRange) => {
      if (range?.from && range?.to) {
        // Determine times based on whether time inputs are enabled
        const startH = enableTimeInputs ? parseInt(startTime.split(':')[0]) : 0;
        const startM = enableTimeInputs ? parseInt(startTime.split(':')[1]) : 0;
        const endH = enableTimeInputs ? parseInt(endTime.split(':')[0]) : 23;
        const endM = enableTimeInputs ? parseInt(endTime.split(':')[1]) : 59;

        // Apply start time to the from date
        const newFromDate = new Date(range.from);
        newFromDate.setHours(startH, startM, 0, 0);

        // Apply end time to the to date
        const newToDate = new Date(range.to);
        newToDate.setHours(endH, endM, 59, 999);

        // Validate that the dates are valid
        if (isNaN(newFromDate.getTime()) || isNaN(newToDate.getTime())) {
          return;
        }

        // Validate that start date is not after end date
        if (newFromDate > newToDate) {
          return;
        }

        onChange({
          from: newFromDate,
          to: newToDate,
        });
      } else if (range?.from) {
        // Handle partial selection (only from date selected)
        const startH = enableTimeInputs ? parseInt(startTime.split(':')[0]) : 0;
        const startM = enableTimeInputs ? parseInt(startTime.split(':')[1]) : 0;
        
        const newFromDate = new Date(range.from);
        newFromDate.setHours(startH, startM, 0, 0);

        if (isNaN(newFromDate.getTime())) {
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
    },
    [startTime, endTime, onChange, enableTimeInputs]
  );

  // Memoized time change handler
  const handleTimeChange = useCallback(
    (timeType: 'start' | 'end', time: string) => {
      // Only process time changes if we have valid dates
      if (!value?.from || !value?.to) {
        return;
      }

      // Validate that the existing dates are valid
      if (isNaN(value.from.getTime()) || isNaN(value.to.getTime())) {
        return;
      }

      if (timeType === 'start') {
        setStartTime(time);
        const [hours, minutes] = time.split(':').map(Number);

        const newFromDate = new Date(value.from);
        newFromDate.setHours(hours, minutes, 0, 0);

        // Validate that start date is not after end date
        if (newFromDate > value.to) {
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
          return;
        }

        onChange({
          from: value.from,
          to: newToDate,
        });
      }
    },
    [value, onChange]
  );

  return (
    <div className="flex flex-col gap-4 rounded-b-lg bg-gray-50 px-4 py-3">
      {/* Date Range Picker */}
      <div className="flex flex-col items-center justify-center gap-3">
        <button
          className="rounded-lg bg-button px-3 py-1.5 text-xs font-semibold text-white"
          onClick={onSetLastMonth}
        >
          Last Month
        </button>
        {/* Mobile: 1 month, Desktop: 2 months */}
        <div className="w-full overflow-x-auto">
          <div className="flex justify-center">
            <DateRangePicker
              value={value}
              onChange={handleDateRangeChange}
              maxDate={new Date()}
              numberOfMonths={1}
              className="mx-auto"
            />
          </div>
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
      {(!hideGoButton || !hideCancelButton) && (
        <div className="flex w-full items-center justify-center gap-2">
          {!hideGoButton && (
            <button
              className="rounded-lg bg-lighterBlueHighlight px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              onClick={onGo}
              disabled={!value?.from || !value?.to}
            >
              Go
            </button>
          )}
          {!hideCancelButton && (
            <button
              className="rounded-lg bg-gray-500 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-600"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
};

