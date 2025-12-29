/**
 * Date Range Picker Component
 * Date range picker component with popover calendar and error boundary.
 *
 * Features:
 * - Date range selection (start and end dates)
 * - Popover calendar interface
 * - Date formatting
 * - Error boundary for error handling
 * - Disabled state support
 *
 * @param value - Currently selected date range
 * @param onChange - Callback to update selected date range
 * @param disabled - Whether the picker is disabled
 */
import * as React from 'react';
import { format } from 'date-fns';
import {
  DayPicker,
  SelectRangeEventHandler,
  type DateRange as RDPDateRange,
} from 'react-day-picker';
import 'react-day-picker/dist/style.css'; // Ensure base styles are loaded
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'; // Assuming you have shadcn/ui popover
import { Button } from '@/components/ui/button'; // Assuming you have shadcn/ui button
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils'; // For conditional class names

// ============================================================================
// Error Boundary
// ============================================================================

// Simple Error Boundary for DayPicker
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.warn('DayPicker Error Boundary caught error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('DayPicker Error Boundary error details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-center text-red-600">
          <p>Date picker encountered an error. Please try again.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 rounded bg-blue-500 px-3 py-1 text-sm text-white"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Re-export DateRange from react-day-picker for external use if needed
export type { RDPDateRange as DateRange };

type DateRangePickerProps = {
  value?: RDPDateRange;
  onChange?: (range?: RDPDateRange) => void;
  className?: string;
  disabled?: boolean;
  maxDate?: Date;
  placeholder?: string;
  numberOfMonths?: 1 | 2;
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  className,
  disabled,
  maxDate,
  placeholder = 'Pick a date range',
  numberOfMonths = 1,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const safeValue: RDPDateRange = React.useMemo(() => {
    if (!value) {
      return { from: undefined, to: undefined };
    }

    // Validate that dates exist and are valid
    const hasValidFrom = value.from && !isNaN(value.from.getTime());
    const hasValidTo = value.to && !isNaN(value.to.getTime());

    // If we have both valid dates, return the range
    if (hasValidFrom && hasValidTo) {
      return { from: value.from, to: value.to };
    }

    // If we only have a valid from date, return partial range (this is important for showing selected date)
    if (hasValidFrom) {
      return { from: value.from, to: undefined };
    }

    // If we only have a valid to date (shouldn't happen but handle it)
    if (hasValidTo) {
      return { from: undefined, to: value.to };
    }

    // If neither is valid, return empty range
    return { from: undefined, to: undefined };
  }, [value]);

  const handleSelect: SelectRangeEventHandler = React.useCallback(
    (range: RDPDateRange | undefined) => {
      if (onChange) {
        onChange(range);
      }
      // Close popover only when both dates are selected (complete range)
      if (range?.from && range?.to) {
        setIsOpen(false);
      }
      // Keep popover open if only one date is selected (user needs to select second date)
    },
    [onChange]
  );

  const displayValue = React.useMemo(() => {
    try {
      if (safeValue.from && safeValue.to) {
        // Validate dates before formatting
        if (isNaN(safeValue.from.getTime()) || isNaN(safeValue.to.getTime())) {
          return placeholder;
        }
        // If same date, show single date
        if (safeValue.from.getTime() === safeValue.to.getTime()) {
          return format(safeValue.from, 'MMM d, yyyy');
        }
        // If different dates, show range
        return `${format(safeValue.from, 'MMM d, yyyy')} - ${format(
          safeValue.to,
          'MMM d, yyyy'
        )}`;
      } else if (safeValue.from) {
        // Validate date before formatting
        if (isNaN(safeValue.from.getTime())) {
          return placeholder;
        }
        return format(safeValue.from, 'MMM d, yyyy');
      }
      return placeholder;
    } catch (error) {
      console.warn('Error formatting date range:', error);
      return placeholder;
    }
  }, [safeValue, placeholder]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={'outline'}
          className={cn(
            'w-[280px] justify-start text-left font-normal',
            !value && 'text-muted-foreground',
            className
          )}
          disabled={disabled}
          onClick={() => setIsOpen(true)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 max-w-[calc(100vw-2rem)]" 
        align="start"
        sideOffset={4}
      >
        <ErrorBoundary>
          <DayPicker
            mode="range"
            selected={safeValue}
            onSelect={handleSelect}
            numberOfMonths={numberOfMonths}
            disabled={
              disabled === true
                ? true
                : maxDate
                  ? [{ after: maxDate }]
                  : undefined
            }
            initialFocus={isOpen}
            showOutsideDays
            classNames={
              {
                months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                month: "space-y-4",
                // Add any custom Tailwind classes for styling if needed
                // Example from your previous DayPicker setup:
                // caption: "text-buttonActive",
                // day_selected: "bg-button text-white",
                // day_range_middle: "bg-greenHighlight text-black",
                // day_today: "border-orangeHighlight",
              }
            }
          />
        </ErrorBoundary>
      </PopoverContent>
    </Popover>
  );
};
