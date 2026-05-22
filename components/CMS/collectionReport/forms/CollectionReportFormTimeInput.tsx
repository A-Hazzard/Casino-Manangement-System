'use client';

import { ModernCalendar } from '@/components/shared/ui/ModernCalendar';

type CollectionTimeInputProps = {
  date: Date;
  onDateChange: (date: Date | undefined) => void;
  disabled?: boolean;
  showHelpText?: boolean;
  helpText?: string;
  className?: string;
  minDate?: Date;
  maxDate?: Date;
  isLoadingTime?: boolean;
};

/**
 * CollectionReportFormTimeInput Component
 * Reusable date/time picker for collection time
 */
export default function CollectionReportFormTimeInput({
  date,
  onDateChange,
  disabled = false,
  showHelpText = true,
  helpText = 'This time applies to all machines in the collection report',
  className = '',
  minDate,
  maxDate = new Date(),
  isLoadingTime = false,
}: CollectionTimeInputProps) {
  // ============================================================================
  // Render
  // ============================================================================
  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium">Collection Time</label>
      {isLoadingTime ? (
        <div className="h-10 w-full animate-pulse rounded-md border border-gray-200 bg-gray-200/50" />
      ) : (
        <ModernCalendar
          date={date ? { from: date, to: date } : undefined}
          onSelect={range => {
            if (range?.from) {
              onDateChange(range.from);
            }
          }}
          enableTimeInputs={true}
          mode="single"
          disabled={disabled}
          minDate={minDate}
          maxDate={maxDate}
        />
      )}
      {showHelpText && <p className="mt-1 text-xs text-gray-500">{helpText}</p>}
    </div>
  );
}
