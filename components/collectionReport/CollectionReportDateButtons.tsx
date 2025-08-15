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
};

const FILTERS: { label: string; value: CollectionReportDateFilter }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "last7" },
  { label: "Last 30 Days", value: "last30" },
];

export default function CollectionReportDateButtons({
  activeFilter,
  onFilterChange,
  customDateRange,
  onCustomDateChange,
  onApplyCustomDateRange,
  disabled,
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
      {FILTERS.map(({ label, value }) => (
        <Button
          key={value}
          onClick={() => handlePresetClick(value)}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            activeFilter === value
              ? 'bg-buttonActive text-white'
              : 'bg-button text-white hover:bg-button/90'
          }`}
          disabled={disabled}
        >
          {label}
        </Button>
      ))}
      <Button
        onClick={handleCustomClick}
        className={`px-3 py-1 text-sm rounded-md transition-colors ${
          activeFilter === "custom"
            ? 'bg-buttonActive text-white'
            : 'bg-button text-white hover:bg-button/90'
        }`}
        disabled={disabled}
      >
        Custom
      </Button>
      {showCustomPicker && activeFilter === "custom" && (
        <ModernDateRangePicker
          value={customDateRange}
          onChange={onCustomDateChange}
          onGo={onApplyCustomDateRange}
          onCancel={() => {
            setShowCustomPicker(false);
          }}
          onSetLastMonth={handleSetLastMonth}
        />
      )}
    </div>
  );
}
