import React from "react";
import { ModernDateRangePicker } from "@/components/ui/ModernDateRangePicker";
import MonthlyReportSummaryTable from "@/components/collectionReport/MonthlyReportSummaryTable";
import MonthlyReportDetailsTable from "@/components/collectionReport/MonthlyReportDetailsTable";
import type { MonthlyDesktopUIProps } from "@/lib/types/componentProps";
import {
  exportMonthlyReportPDF,
  exportMonthlyReportExcel,
} from "@/lib/utils/export";
import PaginationControls from "@/components/ui/PaginationControls";

const MonthlyDesktopUI: React.FC<MonthlyDesktopUIProps> = ({
  allLocationNames,
  monthlyLocation,
  onMonthlyLocationChange,
  pendingRange,
  onPendingRangeChange,
  onApplyDateRange,
  onSetLastMonth,
  monthlySummary,
  monthlyDetails,
  monthlyCurrentItems,
  monthlyLoading,
  monthlyTotalPages,
  monthlyPage,
  onPaginateMonthly,
}) => {
  // Handler to properly await the async PDF export
  const handleExportPDF = async () => {
    await exportMonthlyReportPDF(monthlySummary, monthlyDetails);
  };

  return (
    <div className="hidden md:block bg-white rounded-lg shadow-md space-y-4">
      {/* Controls Bar */}
      <div className="bg-buttonActive rounded-t-lg p-4 flex flex-col md:flex-row md:items-center gap-4">
        <select
          className="px-4 py-2 rounded-md text-sm w-full md:w-auto bg-white text-black border-none focus:ring-2 focus:ring-buttonActive"
          value={monthlyLocation}
          onChange={(e) => onMonthlyLocationChange(e.target.value)}
        >
          <option value="all">All Locations</option>
          {allLocationNames.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <div className="flex gap-2 ml-auto w-full md:w-auto justify-end">
          <button
            className="bg-lighterBlueHighlight text-white px-4 py-2 rounded-md font-semibold text-sm"
            onClick={handleExportPDF}
          >
            EXPORT PDF
          </button>
          <button
            className="bg-lighterBlueHighlight text-white px-4 py-2 rounded-md font-semibold text-sm"
            onClick={() =>
              exportMonthlyReportExcel(monthlySummary, monthlyDetails)
            }
          >
            EXPORT EXCEL
          </button>
        </div>
      </div>

      {/* Date Filters Bar */}
      <ModernDateRangePicker
        value={pendingRange}
        onChange={onPendingRangeChange}
        onGo={onApplyDateRange}
        onCancel={() => {
          // Reset the pending range when canceling
          onPendingRangeChange(undefined);
        }}
        onSetLastMonth={onSetLastMonth}
      />

      {/* Content Area */}
      <div className="px-4 pb-4 space-y-4">
        <h2 className="text-xl font-bold mt-4 text-center">
          {monthlyLocation !== "all"
            ? `${monthlyLocation} - Summary`
            : "All Locations Total"}
        </h2>
        {monthlyLoading ? (
          <div className="animate-pulse h-24 bg-gray-200 rounded w-full" />
        ) : (
          <MonthlyReportSummaryTable summary={monthlySummary} />
        )}

        {monthlyLoading ? (
          <div className="animate-pulse h-40 bg-gray-200 rounded w-full mt-4" />
        ) : monthlyCurrentItems.length === 0 && !monthlyLoading ? null : (
          <>
            <MonthlyReportDetailsTable details={monthlyCurrentItems} />
            {monthlyTotalPages > 1 && (
              <PaginationControls
                currentPage={monthlyPage - 1}
                totalPages={monthlyTotalPages}
                setCurrentPage={(page) => onPaginateMonthly(page + 1)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlyDesktopUI;
