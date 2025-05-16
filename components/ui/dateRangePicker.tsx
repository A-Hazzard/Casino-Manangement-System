import * as React from "react";
import { format } from "date-fns";
import {
  DayPicker,
  SelectRangeEventHandler,
  type DateRange as RDPDateRange,
} from "react-day-picker";
import "react-day-picker/dist/style.css";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Re-export DateRange from react-day-picker
export type { RDPDateRange as DateRange };

export type DateRangePickerProps = {
  value?: RDPDateRange;
  onChange: (range?: RDPDateRange) => void;
  className?: string;
  disabled?: boolean;
  maxDate?: Date;
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  value,
  onChange,
  maxDate,
}) => {
  // Defensive: always use an object with from/to
  const safeValue: RDPDateRange = value ?? { from: undefined, to: undefined };

  const formatted =
    safeValue.from && safeValue.to
      ? `${format(safeValue.from, "MMM d, yyyy")} - ${format(
          safeValue.to,
          "MMM d, yyyy"
        )}`
      : "Pick a date range";

  // Tailwind classes matching the color scheme
  const customClassNames = {
    caption: "text-buttonActive",
    day_selected: "bg-button text-white",
    day_range_middle: "bg-greenHighlight text-black",
    day_today: "border-orangeHighlight",
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="bg-white border border-gray-300 rounded-none px-4 py-2 text-black min-w-[220px] text-left focus:outline-none focus:ring-2 focus:ring-buttonActive"
          type="button"
        >
          {formatted}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPicker
          mode="range"
          selected={safeValue}
          onSelect={onChange as SelectRangeEventHandler}
          numberOfMonths={1}
          disabled={maxDate ? { after: maxDate } : undefined}
          classNames={{
            caption: customClassNames.caption,
            day_selected: customClassNames.day_selected,
            day_range_middle: customClassNames.day_range_middle,
            day_today: customClassNames.day_today,
          }}
        />
      </PopoverContent>
    </Popover>
  );
};
