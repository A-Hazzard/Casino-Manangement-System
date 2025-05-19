import * as React from "react";
import { format } from "date-fns";
import {
  DayPicker,
  SelectRangeEventHandler,
  type DateRange as RDPDateRange,
} from "react-day-picker";
import "react-day-picker/dist/style.css"; // Ensure base styles are loaded
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"; // Assuming you have shadcn/ui popover
import { Button } from "@/components/ui/button"; // Assuming you have shadcn/ui button
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils"; // For conditional class names

// Re-export DateRange from react-day-picker for external use if needed
export type { RDPDateRange as DateRange };

export type DateRangePickerProps = {
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
  placeholder = "Pick a date range",
  numberOfMonths = 1,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const safeValue: RDPDateRange = React.useMemo(
    () => value ?? { from: undefined, to: undefined },
    [value]
  );

  const handleSelect: SelectRangeEventHandler = React.useCallback(
    (range: RDPDateRange | undefined) => {
      if (onChange) {
        onChange(range);
      }
      // Optional: close popover after selection, especially if it's a full range
      if (range?.from && range?.to) {
        setIsOpen(false);
      }
    },
    [onChange]
  );

  const displayValue = React.useMemo(() => {
    if (safeValue.from && safeValue.to) {
      return `${format(safeValue.from, "MMM d, yyyy")} - ${format(
        safeValue.to,
        "MMM d, yyyy"
      )}`;
    } else if (safeValue.from) {
      return format(safeValue.from, "MMM d, yyyy");
    }
    return placeholder;
  }, [safeValue, placeholder]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          onClick={() => setIsOpen(true)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayValue}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
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
              // Add any custom Tailwind classes for styling if needed
              // Example from your previous DayPicker setup:
              // caption: "text-buttonActive",
              // day_selected: "bg-button text-white",
              // day_range_middle: "bg-greenHighlight text-black",
              // day_today: "border-orangeHighlight",
            }
          }
        />
      </PopoverContent>
    </Popover>
  );
};
