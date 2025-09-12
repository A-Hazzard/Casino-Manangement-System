"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModernDateRangePicker } from "@/components/ui/ModernDateRangePicker";
import type { DateRange } from "@/components/ui/dateRangePicker";
import type { CollectionReportDateFilter } from "@/lib/types/componentProps";

type CollectionReportDateButtonsProps = {
  activeFilter: CollectionReportDateFilter;
  onFilterChange: (filter: CollectionReportDateFilter) => void;
  customDateRange: DateRange;
  onCustomDateChange: (range?: DateRange) => void;
  onApplyCustomDateRange: () => void;
  disabled?: boolean;
  isLoading?: boolean;
};

const FILTERS: { label: string; value: CollectionReportDateFilter }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Last 30 Days", value: "last30" },
  { label: "All Time", value: "alltime" },
];

export default function CollectionReportDateButtons({
  activeFilter,
  onFilterChange,
  customDateRange,
  onCustomDateChange,
  onApplyCustomDateRange,
  disabled,
  isLoading = false,
}: CollectionReportDateButtonsProps) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const handlePresetClick = (value: CollectionReportDateFilter) => {
    setShowCustomPicker(false);
    onFilterChange(value);
  };

  const handleCustomClick = () => {
    setShowCustomPicker(true);
    onFilterChange("custom");
  };

  const handleSetLastMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    onCustomDateChange({ from: firstDay, to: lastDay });
  };

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {/* Mobile and md/lg: Select dropdown */}
      <div className="w-full xl:hidden">
        <select
          value={activeFilter}
          onChange={(e) =>
            onFilterChange(e.target.value as CollectionReportDateFilter)
          }
          className="w-full md:w-48 rounded-lg border border-gray-300 px-4 py-3 text-base font-semibold bg-white shadow-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
          disabled={disabled || isLoading}
        >
          {FILTERS.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
      </div>

      {/* xl and above: Filter buttons */}
      <div className="hidden xl:flex flex-wrap items-center gap-2">
        {FILTERS.map(({ label, value }) => (
          <Button
            key={value}
            onClick={() => handlePresetClick(value)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeFilter === value
                ? "bg-buttonActive text-white"
                : "bg-button text-white hover:bg-button/90"
            } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            disabled={disabled || isLoading}
          >
            {label}
          </Button>
        ))}
        <Button
          onClick={handleCustomClick}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            activeFilter === "custom"
              ? "bg-buttonActive text-white"
              : "bg-button text-white hover:bg-button/90"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={disabled || isLoading}
        >
          Custom
        </Button>
      </div>

      {/* Custom Date Picker (both mobile and desktop) */}
      {showCustomPicker && activeFilter === "custom" && (
        <div className="mt-4 w-full">
          <ModernDateRangePicker
            value={customDateRange}
            onChange={onCustomDateChange}
            onGo={() => {
              onApplyCustomDateRange();
              setShowCustomPicker(false);
            }}
            onCancel={() => {
              setShowCustomPicker(false);
            }}
            onSetLastMonth={handleSetLastMonth}
          />
        </div>
      )}
    </div>
  );
}
