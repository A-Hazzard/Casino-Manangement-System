"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModernDateRangePicker } from "@/components/ui/ModernDateRangePicker";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { TimePeriod } from "@/app/api/lib/types";
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
    loadingChartData,
    loadingTopPerforming,
    refreshing,
  } = useDashBoardStore();

  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const timeFilterButtons: { label: string; value: TimePeriod }[] = hideAllTime
    ? [
        { label: "Today", value: "Today" as TimePeriod },
        { label: "Yesterday", value: "Yesterday" as TimePeriod },
        { label: "Last 7 Days", value: "last7days" as TimePeriod },
        { label: "Last 30 Days", value: "last30days" as TimePeriod },
        { label: "Custom", value: "Custom" as TimePeriod },
      ]
    : [
        { label: "Today", value: "Today" as TimePeriod },
        { label: "Yesterday", value: "Yesterday" as TimePeriod },
        { label: "Last 7 Days", value: "last7days" as TimePeriod },
        { label: "Last 30 Days", value: "last30days" as TimePeriod },
        { label: "Custom", value: "Custom" as TimePeriod },
        { label: "All Time", value: "All Time" as TimePeriod },
      ];

  // Check if any loading state is active
  const isLoading = loadingChartData || loadingTopPerforming || refreshing;

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

  const showDesktopButtons = mode === "desktop" || mode === "auto";

  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      {/* Mobile: Select dropdown */}
      <div className={mode === "auto" ? "w-full md:hidden" : "w-full"}>
        <Select
          value={activeMetricsFilter}
          onValueChange={handleFilterClick as (v: string) => void}
          disabled={isLoading}
        >
          <SelectTrigger
            className={`bg-white border-2 border-gray-300 text-gray-700 focus:border-blue-500 transition-colors ${
              mode === "auto" ? "w-full" : "w-full"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
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

      {/* md and above: Filter buttons */}
      {showDesktopButtons && (
        <div
          className={
            mode === "auto"
              ? "hidden md:flex flex-wrap items-center gap-2"
              : "flex flex-wrap items-center gap-2"
          }
        >
          {timeFilterButtons.map((filter) => (
            <Button
              key={filter.value}
              onClick={() => handleFilterClick(filter.value)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                activeMetricsFilter === filter.value
                  ? "bg-buttonActive text-white"
                  : "bg-button text-white hover:bg-button/90"
              } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={disabled || isLoading}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      )}

      {/* Custom Date Picker (both mobile and desktop) */}
      {showCustomPicker && (
        <div className="mt-4 w-full">
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
