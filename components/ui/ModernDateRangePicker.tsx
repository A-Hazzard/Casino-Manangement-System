"use client";

import React from "react";
import { DateRangePicker, type DateRange } from "@/components/ui/dateRangePicker";

type ModernDateRangePickerProps = {
  value?: DateRange;
  onChange: (range?: DateRange) => void;
  onGo: () => void;
  onCancel: () => void;
  onSetLastMonth: () => void;
};

export const ModernDateRangePicker: React.FC<ModernDateRangePickerProps> = ({
  value,
  onChange,
  onGo,
  onCancel,
  onSetLastMonth,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-3 px-4 rounded-b-lg bg-gray-50">
      <button
        className="bg-button text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
        onClick={onSetLastMonth}
      >
        Last Month
      </button>
      <div style={{ width: "fit-content" }}>
        <DateRangePicker
          value={value}
          onChange={onChange}
          maxDate={new Date()}
          numberOfMonths={2}
        />
      </div>
      <button
        className="bg-lighterBlueHighlight text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
        onClick={onGo}
        disabled={!value?.from || !value?.to}
      >
        Go
      </button>
      <button
        className="bg-gray-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-600"
        onClick={onCancel}
      >
        Cancel
      </button>
    </div>
  );
}; 