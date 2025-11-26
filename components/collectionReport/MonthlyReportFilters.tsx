/**
 * Monthly Report Filters Component
 * Filter bar for monthly reports with location selection and export options.
 *
 * Features:
 * - Location selection dropdown
 * - Export PDF button
 * - Export Excel button
 * - Responsive design
 */
import React from 'react';

export default function MonthlyReportFilters() {
  // ============================================================================
  // Render - Filters
  // ============================================================================
  return (
    <div className="mb-0 flex w-full flex-col gap-4 rounded-b-none rounded-t-lg bg-buttonActive p-4 md:flex-row md:items-center">
      <select className="w-full rounded-md border-none bg-white px-4 py-2 text-sm text-black focus:ring-2 focus:ring-buttonActive md:w-auto">
        <option>Select Location</option>
      </select>
      <div className="ml-auto flex w-full justify-end gap-2 md:w-auto">
        <button className="rounded-md bg-lighterBlueHighlight px-4 py-2 font-semibold text-white">
          EXPORT PDF
        </button>
        <button className="rounded-md bg-lighterBlueHighlight px-4 py-2 font-semibold text-white">
          EXPORT EXCEL
        </button>
      </div>
    </div>
  );
}
