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
import type { DateRange as RDPDateRange } from "react-day-picker";

export type ActivityLogDateFilterProps = {
  onDateRangeChange?: (dateRange: { from: Date; to: Date } | undefined) => void;
  onTimePeriodChange?: (timePeriod: TimePeriod) => void;
  disabled?: boolean;
};

export default function ActivityLogDateFilter({
  onDateRangeChange,
  onTimePeriodChange,
  disabled = false,
}: ActivityLogDateFilterProps) {
  const [activeFilter, setActiveFilter] = useState<TimePeriod>("7d");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [pendingCustomDateRange, setPendingCustomDateRange] = useState<RDPDateRange>();

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

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Filter Controls */}
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