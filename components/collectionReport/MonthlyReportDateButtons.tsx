import React from "react";

export default function MonthlyReportDateButtons() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mb-4 pt-4 pb-2 rounded-b-lg border-t-0">
      <button className="bg-button text-white px-4 py-2 rounded-lg text-xs font-semibold">
        Last Month
      </button>
      <div className="flex items-center">
        <span className="bg-grayHighlight text-white px-4 py-2 rounded-l-lg text-xs font-semibold">
          Date Range
        </span>
        <input
          type="text"
          className="px-3 py-2 rounded-r-lg text-sm border border-gray-300 bg-white w-56 focus:ring-0 focus:border-gray-300 outline-none"
          placeholder="May 1, 2025 - May 1, 2025"
        />
      </div>
      <button className="bg-lighterBlueHighlight text-white px-4 py-2 rounded-lg text-xs font-semibold">
        Go
      </button>
    </div>
  );
}
