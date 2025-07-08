"use client";

import { useDashBoardStore } from "@/lib/store/dashboardStore";
import { getTimeFilterButtons } from "@/lib/helpers/dashboard";
import type { TimePeriod } from "@shared/types";

export function TimePeriodSelector() {
  const {
    activeMetricsFilter,
    setActiveMetricsFilter,
    loadingChartData,
    refreshing,
  } = useDashBoardStore();

  const timeFilterButtons = getTimeFilterButtons();

  return (
    <div className="flex lg:hidden justify-center my-4">
      <select
        className={`px-4 py-2 rounded-full text-sm bg-buttonActive text-white ${
          loadingChartData || refreshing
            ? "opacity-50 cursor-not-allowed"
            : ""
        }`}
        value={activeMetricsFilter}
        onChange={(e) =>
          setActiveMetricsFilter(e.target.value as TimePeriod)
        }
        disabled={loadingChartData || refreshing}
      >
        {timeFilterButtons.map((filter) => (
          <option key={filter.value} value={filter.value}>
            {filter.label}
          </option>
        ))}
      </select>
    </div>
  );
} 