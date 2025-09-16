"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { DateRange as RDPDateRange } from "react-day-picker";

type MonthlyDatePickerProps = {
  value?: RDPDateRange;
  onChange: (range?: RDPDateRange) => void;
  onGo: () => void;
  onCancel: () => void;
  onSetLastMonth: () => void;
  disabled?: boolean;
};

/**
 * Monthly Date Picker Component
 * 
 * Constrains date selection to full months only (month/year picker)
 * Automatically sets the range to cover the entire selected month
 * 
 * Author: Aaron Hazzard - Senior Software Engineer
 * Last Updated: August 29th, 2025
 */
export const MonthlyDatePicker: React.FC<MonthlyDatePickerProps> = ({
  value,
  onChange,
  onGo,
  onCancel,
  onSetLastMonth,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Format display value to show month and year
  const displayValue = React.useMemo(() => {
    if (value?.from && value?.to) {
      const fromMonth = format(value.from, "MMMM yyyy");
      const toMonth = format(value.to, "MMMM yyyy");
      
      if (fromMonth === toMonth) {
        return fromMonth;
      }
      return `${fromMonth} - ${toMonth}`;
    } else if (value?.from) {
      return format(value.from, "MMMM yyyy");
    }
    return "Select month";
  }, [value]);

  // Handle date selection - automatically set to full month
  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange(undefined);
      return;
    }

    // Set the range to cover the entire month
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    
    const newRange: RDPDateRange = {
      from: startOfMonth,
      to: endOfMonth,
    };
    
    onChange(newRange);
    setIsOpen(false);
  };

  // Handle last month button
  const handleLastMonth = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const startOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    const endOfLastMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);
    
    const lastMonthRange: RDPDateRange = {
      from: startOfLastMonth,
      to: endOfLastMonth,
    };
    
    onChange(lastMonthRange);
    onSetLastMonth();
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-3 px-4 rounded-b-lg bg-gray-50">
      <Button
        className="bg-button text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
        onClick={handleLastMonth}
        disabled={disabled}
      >
        Last Month
      </Button>
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-[200px] justify-start text-left font-normal"
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {displayValue}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value?.from}
            onSelect={handleDateSelect}
            disabled={[
              { after: new Date() } // Disable future months
            ]}
            initialFocus
            showOutsideDays
            captionLayout="dropdown"
            fromYear={2020}
            toYear={new Date().getFullYear()}
            classNames={{
              caption: "text-buttonActive font-semibold",
              day_selected: "bg-button text-white",
              day_today: "border-orangeHighlight",
            }}
          />
        </PopoverContent>
      </Popover>
      
      <Button
        className="bg-lighterBlueHighlight text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
        onClick={onGo}
        disabled={!value?.from || !value?.to || disabled}
      >
        Go
      </Button>
      
      <Button
        className="bg-gray-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-600"
        onClick={onCancel}
        disabled={disabled}
      >
        Cancel
      </Button>
    </div>
  );
};
