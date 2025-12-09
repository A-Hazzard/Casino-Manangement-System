'use client';

import { ModernCalendar } from '@/components/ui/ModernCalendar';
import React from 'react';

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
      <ModernCalendar
        date={date ? { from: date, to: date } : undefined}
        onSelect={(range) => {
          if (range?.from) {
            onDateChange(range.from);
          }
        }}
        enableTimeInputs={true}
        mode="single"
        disabled={disabled}
      />
      {showHelpText && (
        <p className="mt-1 text-xs text-gray-500">{helpText}</p>
      )}
    </div>
  );
};

