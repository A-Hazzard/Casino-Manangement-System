"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModernDateRangePicker } from "@/components/ui/ModernDateRangePicker";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { TimePeriod } from "@/app/api/lib/types";
import { getTimeFilterButtons } from "@/lib/helpers/dashboard";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DashboardDateFiltersProps } from "@/lib/types/componentProps";

export default function DashboardDateFilters({
  disabled,
  onCustomRangeGo,
  hideAllTime = false,
  mode = "auto",
}: DashboardDateFiltersProps) {
  const {
    activeMetricsFilter,
    setActiveMetricsFilter,
    setCustomDateRange,
    pendingCustomDateRange,
    setPendingCustomDateRange,
  } = useDashBoardStore();

  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const allTimeFilterButtons = getTimeFilterButtons();
  const timeFilterButtons = hideAllTime 
    ? allTimeFilterButtons.filter(button => button.value !== "All Time")
    : allTimeFilterButtons;

  const handleApplyCustomRange = () => {
    if (pendingCustomDateRange?.startDate && pendingCustomDateRange?.endDate) {
      setCustomDateRange({
        startDate: pendingCustomDateRange.startDate,
        endDate: pendingCustomDateRange.endDate,
      });
      setActiveMetricsFilter("Custom");
      setShowCustomPicker(false);
      if (onCustomRangeGo) onCustomRangeGo();
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
    setPendingCustomDateRange({ startDate: firstDay, endDate: lastDay });
  };

  const handleFilterClick = (filter: TimePeriod) => {
    if (filter === "Custom") {
      setShowCustomPicker(true);
      // Don't immediately set activeMetricsFilter to Custom
      // Only show the picker, keep the current filter active
    } else {
      setShowCustomPicker(false);
      setActiveMetricsFilter(filter);
    }
  };

  const showMobileSelect = mode === "mobile" || mode === "auto";
  const showDesktopButtons = mode === "desktop" || mode === "auto";

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      {showMobileSelect && (
        <div className={mode === "auto" ? "w-full md:hidden" : "w-full"}>
          <Select
            value={activeMetricsFilter}
            onValueChange={handleFilterClick as (v: string) => void}
          >
            <SelectTrigger className="w-full bg-white border-2 border-gray-300 text-gray-700 focus:border-blue-500 transition-colors">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              {timeFilterButtons.map((filter) => (
                <SelectItem key={filter.value} value={filter.value as string}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showDesktopButtons && (
        <div className={mode === "auto" ? "hidden md:flex flex-wrap items-center gap-2" : "flex flex-wrap items-center gap-2"}>
          {timeFilterButtons.map((filter) => (
            <Button
              key={filter.value}
              className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                activeMetricsFilter === filter.value
                  ? "bg-buttonActive text-white"
                  : "bg-button text-white hover:bg-button/90"
              }`}
              onClick={() => handleFilterClick(filter.value)}
              disabled={disabled}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      )}

      {showCustomPicker && (
        <div className="w-full sm:w-auto">
          <ModernDateRangePicker
            value={
              pendingCustomDateRange
                ? {
                    from: pendingCustomDateRange.startDate,
                    to: pendingCustomDateRange.endDate,
                  }
                : undefined
            }
            onChange={(range) =>
              setPendingCustomDateRange(
                range && range.from && range.to
                  ? { startDate: range.from, endDate: range.to }
                  : undefined
              )
            }
            onGo={handleApplyCustomRange}
            onCancel={handleCancelCustomRange}
            onSetLastMonth={handleSetLastMonth}
          />
        </div>
      )}
    </div>
  );
}
