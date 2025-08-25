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
import { Button } from "@/components/ui/button";

export default function ActivityLogDateFilter() {
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

  // Check if any loading state is active
  const isLoading = loadingChartData || loadingTopPerforming || refreshing;

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
        <>
          {/* Mobile and md/lg: Select dropdown */}
          <div className="xl:hidden">
            <Select
              value={activeMetricsFilter}
              onValueChange={handleFilterChange}
              disabled={isLoading}
            >
              <SelectTrigger className={`w-48 bg-white border-2 border-gray-300 text-gray-700 focus:border-blue-500 transition-colors ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}>
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
          </div>

          {/* xl and above: Filter buttons */}
          <div className="hidden xl:flex items-center gap-2">
            {[
              { label: "Today", value: "Today" as TimePeriod },
              { label: "Yesterday", value: "Yesterday" as TimePeriod },
              { label: "Last 7 Days", value: "last7days" as TimePeriod },
              { label: "Last 30 Days", value: "last30days" as TimePeriod },
              { label: "Custom", value: "Custom" as TimePeriod },
              { label: "All Time", value: "All Time" as TimePeriod },
            ].map((filter) => (
              <Button
                key={filter.value}
                onClick={() => handleFilterChange(filter.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeMetricsFilter === filter.value
                    ? "bg-buttonActive text-white"
                    : "bg-button text-white hover:bg-button/90"
                } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={isLoading}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCustomPicker(false)}
            variant="outline"
            size="sm"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApplyCustomRange}
            size="sm"
            className="bg-buttonActive text-white"
          >
            Apply
          </Button>
        </div>
      )}

      {/* Custom Date Picker */}
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
