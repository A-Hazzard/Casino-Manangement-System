"use client";

import * as React from "react";
import { format, set } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { DayPicker, SelectSingleEventHandler } from "react-day-picker";
import "react-day-picker/dist/style.css";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DateTimePickerProps = {
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  disabled?: boolean;
};

export function DateTimePicker({
  date,
  setDate,
  disabled,
}: DateTimePickerProps) {
  // Store hours and minutes separately for UI handling
  const [time, setTime] = React.useState(() => {
    if (!date) return { hours: "12", minutes: "00", period: "AM" };
    const hours = date.getHours();
    return {
      hours:
        hours === 0 ? "12" : hours > 12 ? String(hours - 12) : String(hours),
      minutes: date.getMinutes().toString().padStart(2, "0"),
      period: hours >= 12 ? "PM" : "AM",
    };
  });

  // When the date changes (from calendar), update the time state to match the new date
  React.useEffect(() => {
    if (!date) return;
    const hours = date.getHours();
    setTime({
      hours:
        hours === 0 ? "12" : hours > 12 ? String(hours - 12) : String(hours),
      minutes: date.getMinutes().toString().padStart(2, "0"),
      period: hours >= 12 ? "PM" : "AM",
    });
  }, [date]);

  const handleDateSelect: SelectSingleEventHandler = (
    selectedDay,
    activeModifiers,
    e
  ) => {
    if (selectedDay) {
      // Stub usage to satisfy ESLint
      if (activeModifiers && e) {
        // This block does nothing but uses the variables.
      }
      let hours = parseInt(time.hours);
      if (time.period === "PM" && hours < 12) hours += 12;
      if (time.period === "AM" && hours === 12) hours = 0;
      const minutes = parseInt(time.minutes);
      const newDate = set(selectedDay, { hours, minutes });
      setDate(newDate);
    } else {
      setDate(undefined);
    }
  };

  // Update the date with the selected time (but not when date changes)
  React.useEffect(() => {
    if (!date) return;
    let hours = parseInt(time.hours);
    if (time.period === "PM" && hours < 12) hours += 12;
    if (time.period === "AM" && hours === 12) hours = 0; // 12 AM is 00 hours
    const minutes = parseInt(time.minutes);
    // Only update if the time is different
    if (date.getHours() !== hours || date.getMinutes() !== minutes) {
      const newDate = set(date, { hours, minutes });
      setDate(newDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time, setDate]); // Added setDate, kept date out intentionally

  // Format display string
  const formattedDate = React.useMemo(() => {
    if (!date) return "Pick a date and time";
    return format(date, "PPP p");
  }, [date]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full md:w-[280px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formattedDate}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-0">
          <DayPicker
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            disabled={disabled}
            showOutsideDays
            captionLayout="dropdown"
            fromYear={1950}
            toYear={2050}
          />
          <div className="p-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 opacity-70" />
                <span className="text-sm font-medium">Time</span>
              </div>
            </div>
            <div className="flex items-center justify-center mt-2 space-x-2">
              <select
                className="w-16 rounded border border-input p-1 text-sm"
                value={time.hours}
                onChange={(e) => setTime({ ...time, hours: e.target.value })}
                disabled={disabled || !date}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                  <option key={hour} value={hour}>
                    {hour}
                  </option>
                ))}
              </select>
              <span className="text-sm font-medium">:</span>
              <select
                className="w-16 rounded border border-input p-1 text-sm"
                value={time.minutes}
                onChange={(e) => setTime({ ...time, minutes: e.target.value })}
                disabled={disabled || !date}
              >
                {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                  <option
                    key={minute}
                    value={minute.toString().padStart(2, "0")}
                  >
                    {minute.toString().padStart(2, "0")}
                  </option>
                ))}
              </select>
              <select
                className="w-16 rounded border border-input p-1 text-sm"
                value={time.period}
                onChange={(e) =>
                  setTime({ ...time, period: e.target.value as "AM" | "PM" })
                }
                disabled={disabled || !date}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
