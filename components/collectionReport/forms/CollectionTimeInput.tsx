'use client';

import React from 'react';
import { PCDateTimePicker } from '@/components/ui/pc-date-time-picker';

type CollectionTimeInputProps = {
  date: Date;
  onDateChange: (date: Date | undefined) => void;
  disabled?: boolean;
  showHelpText?: boolean;
  helpText?: string;
  className?: string;
};

/**
 * CollectionTimeInput Component
 * Reusable date/time picker for collection time
 */
export const CollectionTimeInput: React.FC<CollectionTimeInputProps> = ({
  date,
  onDateChange,
  disabled = false,
  showHelpText = true,
  helpText = 'This time applies to all machines in the collection report',
  className = '',
}) => {
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium">Collection Time</label>
      <PCDateTimePicker
        date={date}
        setDate={(newDate) => {
          if (newDate && newDate instanceof Date && !isNaN(newDate.getTime())) {
            onDateChange(newDate);
          }
        }}
        disabled={disabled}
        placeholder="Select collection time"
      />
      {showHelpText && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

