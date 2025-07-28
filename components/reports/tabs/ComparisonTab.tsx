"use client";

import { useDashBoardStore } from "@/lib/store/dashboardStore";
import ComparisonReports from "../ComparisonReports";

export default function ComparisonTab() {
  const { customDateRange } = useDashBoardStore();

  return (
    <div className="space-y-6">
      <ComparisonReports
        dateRange={{
          start: customDateRange.startDate,
          end: customDateRange.endDate,
        }}
      />
    </div>
  );
}
