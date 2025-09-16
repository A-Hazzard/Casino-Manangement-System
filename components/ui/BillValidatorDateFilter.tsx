"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModernDateRangePicker } from "@/components/ui/ModernDateRangePicker";
import { TimePeriod } from "@/app/api/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import type { DateRange as RDPDateRange } from "react-day-picker";

export type BillValidatorDateFilterProps = {
  onDateRangeChange?: (dateRange: { from: Date; to: Date } | undefined) => void;
  onTimePeriodChange?: (timePeriod: TimePeriod) => void;
  onTimeRangeChange?: (timeRange: { startTime: string; endTime: string } | undefined) => void;
  onDenominationChange?: (denomination: string) => void;
  denomination?: string;
  uniqueDenominations?: number[];
  disabled?: boolean;
};

export default function BillValidatorDateFilter({
  onDateRangeChange,
  onTimePeriodChange,
  onTimeRangeChange,
  onDenominationChange,
  denomination = "all",
  uniqueDenominations = [],
  disabled = false,
}: BillValidatorDateFilterProps) {
  const [activeFilter, setActiveFilter] = useState<TimePeriod>("7d");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [pendingCustomDateRange, setPendingCustomDateRange] = useState<RDPDateRange>();
  const [timeRange, setTimeRange] = useState<{ startTime: string; endTime: string }>({
    startTime: "",
    endTime: "",
  });

  const timeFilterButtons: { label: string; value: TimePeriod }[] = [
    { label: "Today", value: "Today" as TimePeriod },
    { label: "Yesterday", value: "Yesterday" as TimePeriod },
    { label: "Last 7 Days", value: "7d" as TimePeriod },
    { label: "Last 30 Days", value: "30d" as TimePeriod },
    { label: "All Time", value: "All Time" as TimePeriod },
    { label: "Custom", value: "Custom" as TimePeriod },
  ];

  const handleFilterClick = (filter: TimePeriod) => {
    if (filter === "Custom") {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
      setActiveFilter(filter);
      onTimePeriodChange?.(filter);
      onDateRangeChange?.(undefined);
    }
  };

  const handleApplyCustomRange = () => {
    if (pendingCustomDateRange?.from && pendingCustomDateRange?.to) {
      // Convert dates to proper timezone format
      const startDate = new Date(pendingCustomDateRange.from);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(pendingCustomDateRange.to);
      endDate.setHours(23, 59, 59, 999);
      
      setActiveFilter("Custom");
      setShowCustomPicker(false);
      onTimePeriodChange?.("Custom");
      onDateRangeChange?.({ from: startDate, to: endDate });
    }
  };

  const handleCancelCustomRange = () => {
    setShowCustomPicker(false);
    setPendingCustomDateRange(undefined);
  };

  const handleSetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    setPendingCustomDateRange({ from: firstDay, to: lastDay });
  };

  const handleTimeRangeChange = (field: 'startTime' | 'endTime', value: string) => {
    const newTimeRange = { ...timeRange, [field]: value };
    setTimeRange(newTimeRange);
    
    // Only call the callback if both times are set or both are empty
    if ((newTimeRange.startTime && newTimeRange.endTime) || 
        (!newTimeRange.startTime && !newTimeRange.endTime)) {
      onTimeRangeChange?.(newTimeRange.startTime && newTimeRange.endTime ? newTimeRange : undefined);
    }
  };

  const clearTimeRange = () => {
    setTimeRange({ startTime: "", endTime: "" });
    onTimeRangeChange?.(undefined);
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Date Filter Controls */}
      <div className="flex flex-wrap items-center gap-2 w-full">
        {/* Desktop Filter Buttons */}
        <div className="hidden md:flex items-center gap-2">
          {timeFilterButtons.map((button) => (
            <Button
              key={button.value}
              variant={activeFilter === button.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterClick(button.value)}
              disabled={disabled}
              className={
                activeFilter === button.value
                  ? "bg-buttonActive text-container"
                  : "bg-container text-grayHighlight border-buttonActive hover:bg-buttonActive hover:text-container"
              }
            >
              {button.label}
            </Button>
          ))}
        </div>

        {/* Mobile Filter Dropdown */}
        <div className="md:hidden w-full">
          <Select
            value={activeFilter}
            onValueChange={(value) => handleFilterClick(value as TimePeriod)}
            disabled={disabled}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select time period" />
            </SelectTrigger>
            <SelectContent>
              {timeFilterButtons.map((button) => (
                <SelectItem key={button.value} value={button.value}>
                  {button.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Time Range (Optional)</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={clearTimeRange}
            disabled={disabled || (!timeRange.startTime && !timeRange.endTime)}
          >
            Clear
          </Button>
        </div>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <TimePicker
                label="Start Time"
                value={timeRange.startTime ? new Date(`2000-01-01T${timeRange.startTime}`) : null}
                onChange={(newValue) => {
                  const timeString = newValue ? newValue.toTimeString().slice(0, 5) : "";
                  handleTimeRangeChange('startTime', timeString);
                }}
                disabled={disabled}
                slotProps={{
                  textField: {
                    size: "small",
                    sx: {
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '6px',
                        fontSize: '14px',
                        height: '40px',
                        minHeight: '40px',
                        maxHeight: '40px',
                        '& .MuiOutlinedInput-input': {
                          height: '40px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                        },
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b82f6',
                          borderWidth: '2px',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '14px',
                        color: '#6b7280',
                        '&.Mui-focused': {
                          color: '#3b82f6',
                        },
                      },
                    }
                  }
                }}
              />
            </div>
            <div>
              <TimePicker
                label="End Time"
                value={timeRange.endTime ? new Date(`2000-01-01T${timeRange.endTime}`) : null}
                onChange={(newValue) => {
                  const timeString = newValue ? newValue.toTimeString().slice(0, 5) : "";
                  handleTimeRangeChange('endTime', timeString);
                }}
                disabled={disabled}
                slotProps={{
                  textField: {
                    size: "small",
                    sx: {
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '6px',
                        fontSize: '14px',
                        height: '40px',
                        minHeight: '40px',
                        maxHeight: '40px',
                        '& .MuiOutlinedInput-input': {
                          height: '40px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                        },
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b82f6',
                          borderWidth: '2px',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '14px',
                        color: '#6b7280',
                        '&.Mui-focused': {
                          color: '#3b82f6',
                        },
                      },
                    }
                  }
                }}
              />
            </div>
            <div>
              <Select
                value={denomination}
                onValueChange={(value) => onDenominationChange?.(value)}
                disabled={disabled}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="All Denominations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Denominations</SelectItem>
                  {uniqueDenominations.map((denom) => (
                    <SelectItem key={denom} value={denom.toString()}>
                      ${denom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </LocalizationProvider>
      </div>

      {/* Custom Date Range Picker */}
      {showCustomPicker && (
        <ModernDateRangePicker
          value={pendingCustomDateRange}
          onChange={setPendingCustomDateRange}
          onGo={handleApplyCustomRange}
          onCancel={handleCancelCustomRange}
          onSetLastMonth={handleSetLastMonth}
        />
      )}
    </div>
  );
}
