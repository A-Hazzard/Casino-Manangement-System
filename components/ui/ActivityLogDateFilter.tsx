"use client";

import { useState } from "react";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModernDateRangePicker } from "@/components/ui/ModernDateRangePicker";
import { Calendar } from "lucide-react";
import type { TimePeriod } from "@/shared/types/common";

export default function ActivityLogDateFilter() {
  const {
    activeMetricsFilter,
    setActiveMetricsFilter,
    customDateRange,
    setCustomDateRange,
    pendingCustomDateRange,
    setPendingCustomDateRange,
  } = useDashBoardStore();

  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const handleFilterChange = (value: TimePeriod) => {
    if (value === "Custom") {
      setShowCustomPicker(true);
      // Don't immediately set activeMetricsFilter to Custom
      // Only show the picker, keep the current filter active
    } else {
      setShowCustomPicker(false);
      setActiveMetricsFilter(value);
    }
  };

  const handleApplyCustomRange = () => {
    if (pendingCustomDateRange?.startDate && pendingCustomDateRange?.endDate) {
      setCustomDateRange({
        startDate: pendingCustomDateRange.startDate,
        endDate: pendingCustomDateRange.endDate,
      });
      setActiveMetricsFilter("Custom");
      setShowCustomPicker(false);
    }
  };

  const handleCancelCustomRange = () => {
    setShowCustomPicker(false);
    setPendingCustomDateRange(undefined);
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-600">Date Range:</span>
      </div>

      {!showCustomPicker ? (
        <Select value={activeMetricsFilter} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-48 bg-white border-2 border-gray-300 text-gray-700 focus:border-blue-500 transition-colors">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Today">Today</SelectItem>
            <SelectItem value="Yesterday">Yesterday</SelectItem>
            <SelectItem value="last7days">Last 7 Days</SelectItem>
            <SelectItem value="last30days">Last 30 Days</SelectItem>
            <SelectItem value="Custom">Custom Range</SelectItem>
            <SelectItem value="All Time">All Time</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <div className="flex items-center gap-2">
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
            onSetLastMonth={() => {
              const now = new Date();
              const firstDay = new Date(
                now.getFullYear(),
                now.getMonth() - 1,
                1
              );
              const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
              setPendingCustomDateRange({
                startDate: firstDay,
                endDate: lastDay,
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
