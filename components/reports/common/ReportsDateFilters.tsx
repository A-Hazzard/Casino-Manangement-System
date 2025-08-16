"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModernDateRangePicker } from "@/components/ui/ModernDateRangePicker";
import { getTimeFilterButtons } from "@/lib/helpers/dashboard";
import { TimePeriod } from "@/app/api/lib/types";
import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { useReportsStore } from "@/lib/store/reportsStore";

/**
 * Reports Date Filters Component
 * Handles date range filtering for reports with both predefined and custom ranges
 * Syncs with both dashboard and reports stores
 */
export default function ReportsDateFilters() {
  const {
    activeMetricsFilter,
    setActiveMetricsFilter,
    setCustomDateRange,
    pendingCustomDateRange,
    setPendingCustomDateRange,
  } = useDashBoardStore();

  const { setDateRange } = useReportsStore();

  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const timeFilterButtons = getTimeFilterButtons();

  /**
   * Apply custom date range to both stores
   */
  const handleApplyCustomRange = () => {
    if (pendingCustomDateRange?.startDate && pendingCustomDateRange?.endDate) {
      // Update both stores
      setCustomDateRange({
        startDate: pendingCustomDateRange.startDate,
        endDate: pendingCustomDateRange.endDate,
      });
      setDateRange(
        pendingCustomDateRange.startDate,
        pendingCustomDateRange.endDate
      );
      setActiveMetricsFilter("Custom");
      setShowCustomPicker(false);
    }
  };

  /**
   * Set last month date range as a quick option
   */
  const handleSetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    setPendingCustomDateRange({ startDate: firstDay, endDate: lastDay });
  };

  /**
   * Handle filter button clicks for predefined periods
   */
  const handleFilterClick = (filter: TimePeriod) => {
    if (filter === "Custom") {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);

      // Update reports store based on filter
      const now = new Date();
      let startDate: Date, endDate: Date;

      switch (filter) {
        case "Today":
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
          break;
        case "Yesterday":
          startDate = new Date(now.setDate(now.getDate() - 1));
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "last7days":
          startDate = new Date(now.setDate(now.getDate() - 7));
          endDate = new Date();
          break;
        case "last30days":
          startDate = new Date(now.setDate(now.getDate() - 30));
          endDate = new Date();
          break;
        default:
          startDate = new Date(now.setHours(0, 0, 0, 0));
          endDate = new Date(now.setHours(23, 59, 59, 999));
      }

      setDateRange(startDate, endDate);
    }
    setActiveMetricsFilter(filter);
  };

  return (
    <div className="space-y-4">
      {/* Desktop: Button layout */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        {timeFilterButtons.map((filter) => (
          <Button
            key={filter.value}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeMetricsFilter === filter.value
                ? "bg-buttonActive text-white"
                : "bg-button text-white hover:bg-button/90"
            }`}
            onClick={() => handleFilterClick(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Mobile: Select dropdown */}
      <div className="md:hidden">
        <select
          value={activeMetricsFilter}
          onChange={(e) => handleFilterClick(e.target.value as TimePeriod)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-semibold bg-white shadow-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
        >
          {timeFilterButtons.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {/* Custom Date Picker (both mobile and desktop) */}
      {showCustomPicker && activeMetricsFilter === "Custom" && (
        <div className="mt-4">
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
            onCancel={() => {
              setShowCustomPicker(false);
              setPendingCustomDateRange(undefined);
            }}
            onSetLastMonth={handleSetLastMonth}
          />
        </div>
      )}
    </div>
  );
}
