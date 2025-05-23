import React, { useState } from "react";
import {
  DateRangePicker,
  DateRange as RDPDateRange,
} from "@/components/ui/dateRangePicker";

export default function MonthlyReportDateButtons() {
  const [range, setRange] = useState<RDPDateRange | undefined>(undefined);

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mb-4 pt-4 pb-2 rounded-b-lg border-t-0">
      <button className="bg-button text-white px-4 py-2 rounded-lg text-xs font-semibold">
        Last Month
      </button>
      <div className="flex items-center">
        
        <DateRangePicker value={range} onChange={setRange} />
      </div>
      <button className="bg-lighterBlueHighlight text-white px-4 py-2 rounded-lg text-xs font-semibold">
        Go
      </button>
    </div>
  );
}
