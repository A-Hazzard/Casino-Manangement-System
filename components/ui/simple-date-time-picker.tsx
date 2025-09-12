"use client";

import * as React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type SimpleDateTimePickerProps = {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: boolean;
};

export function SimpleDateTimePicker({
  date,
  setDate,
  disabled,
}: SimpleDateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      setDate(newDate);
    }
    setIsOpen(false);
  };

  const formatDate = (date: Date | undefined) => {
    if (!date) return "Pick a date and time";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        className={cn(
          "w-full md:w-[280px] justify-start text-left font-normal overflow-hidden",
          !date && "text-muted-foreground"
        )}
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
        <span className="truncate">{formatDate(date)}</span>
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
          <DatePicker
            selected={date || new Date()}
            onChange={handleDateChange}
            showTimeSelect
            timeFormat="HH:mm"
            timeIntervals={15}
            dateFormat="MMMM d, yyyy h:mm aa"
            inline
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
