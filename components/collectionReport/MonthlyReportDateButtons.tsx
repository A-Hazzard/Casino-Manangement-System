import React, { useState } from 'react';
import {
  DateRangePicker,
  DateRange as RDPDateRange,
} from '@/components/ui/dateRangePicker';

export default function MonthlyReportDateButtons() {
  const [range, setRange] = useState<RDPDateRange | undefined>(undefined);

  return (
    <div className="mb-4 flex flex-wrap items-center justify-center gap-2 rounded-b-lg border-t-0 pb-2 pt-4">
      <button className="rounded-lg bg-button px-4 py-2 text-xs font-semibold text-white">
        Last Month
      </button>
      <div className="flex items-center">
        <DateRangePicker value={range} onChange={setRange} />
      </div>
      <button className="rounded-lg bg-lighterBlueHighlight px-4 py-2 text-xs font-semibold text-white">
        Go
      </button>
    </div>
  );
}
