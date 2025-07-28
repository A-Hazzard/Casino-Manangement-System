"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModernDateRangePicker } from "@/components/ui/ModernDateRangePicker";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { TimePeriod } from "@/app/api/lib/types";
import { getTimeFilterButtons } from "@/lib/helpers/dashboard";

type DashboardDateFiltersProps = {
  disabled?: boolean;
  onCustomRangeGo?: () => void;
};

export default function DashboardDateFilters({
  disabled,
  onCustomRangeGo,
}: DashboardDateFiltersProps) {
  const {
    activeMetricsFilter,
    setActiveMetricsFilter,
    setCustomDateRange,
    pendingCustomDateRange,
    setPendingCustomDateRange,
  } = useDashBoardStore();

  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const timeFilterButtons = getTimeFilterButtons();

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

  const handleSetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    setPendingCustomDateRange({ startDate: firstDay, endDate: lastDay });
  };

  const handleFilterClick = (filter: TimePeriod) => {
    if (filter === "Custom") {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
    setActiveMetricsFilter(filter);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
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
      {showCustomPicker && activeMetricsFilter === "Custom" && (
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
            onSetLastMonth={handleSetLastMonth}
          />
        </div>
      )}
    </div>
  );
}
