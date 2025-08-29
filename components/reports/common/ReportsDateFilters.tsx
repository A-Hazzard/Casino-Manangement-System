"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModernDateRangePicker } from "@/components/ui/ModernDateRangePicker";
import { DatePicker } from "@/components/ui/date-picker";
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
    loadingChartData,
    loadingTopPerforming,
    refreshing,
  } = useDashBoardStore();

  const { setDateRange, activeView } = useReportsStore();

  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [selectedSingleDate, setSelectedSingleDate] = useState<Date | undefined>(undefined);
  
  // Conditional filter buttons based on active tab
  const getTimeFilterButtons = () => {
    const baseButtons = [
      { label: "Today", value: "Today" as TimePeriod },
      { label: "Yesterday", value: "Yesterday" as TimePeriod },
    ];

    // Only show 7/30 day filters for non-meters tabs
    if (activeView !== "meters") {
      baseButtons.push(
        { label: "Last 7 Days", value: "last7days" as TimePeriod },
        { label: "Last 30 Days", value: "last30days" as TimePeriod }
      );
    }

    baseButtons.push({ label: "Custom", value: "Custom" as TimePeriod });

    // Show "All Time" for non-meters tabs
    if (activeView !== "meters") {
      baseButtons.push({ label: "All Time", value: "All Time" as TimePeriod });
    }

    return baseButtons;
  };

  const timeFilterButtons = getTimeFilterButtons();

  // Check if any loading state is active
  const isLoading = loadingChartData || loadingTopPerforming || refreshing;

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
   * Apply single date selection for meters tab
   */
  const handleApplySingleDate = () => {
    if (selectedSingleDate) {
      // For single date, set both start and end to the same date
      const startDate = new Date(selectedSingleDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(selectedSingleDate);
      endDate.setHours(23, 59, 59, 999);

      // Update both stores
      setCustomDateRange({
        startDate: startDate,
        endDate: endDate,
      });
      setDateRange(startDate, endDate);
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
    <div className="flex flex-wrap items-center gap-2 w-full">
      {/* Mobile: Select dropdown */}
      <div className="w-full md:hidden">
        <select
          value={activeMetricsFilter}
          onChange={(e) => handleFilterClick(e.target.value as TimePeriod)}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base font-semibold bg-white shadow-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
          disabled={isLoading}
        >
          {timeFilterButtons.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      {/* md and above: Filter buttons */}
      <div className="hidden md:flex flex-wrap items-center gap-2">
        {timeFilterButtons.map((filter) => (
          <Button
            key={filter.value}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeMetricsFilter === filter.value
                ? "bg-buttonActive text-white"
                : "bg-button text-white hover:bg-button/90"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => handleFilterClick(filter.value)}
            disabled={isLoading}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Custom Date Picker (both mobile and desktop) */}
      {showCustomPicker && (
        <div className="mt-4 w-full">
          {activeView === "meters" ? (
            // Single date picker for meters tab
            <div className="flex flex-wrap items-center justify-center gap-2 py-3 px-4 rounded-b-lg bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Select Date:</span>
                <DatePicker
                  date={selectedSingleDate}
                  setDate={setSelectedSingleDate}
                />
              </div>
              <Button
                className="bg-lighterBlueHighlight text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
                onClick={handleApplySingleDate}
                disabled={!selectedSingleDate}
              >
                Go
              </Button>
              <Button
                variant="outline"
                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                onClick={() => {
                  setShowCustomPicker(false);
                  setSelectedSingleDate(undefined);
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            // Date range picker for other tabs
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
          )}
        </div>
      )}
    </div>
  );
}
