import React from "react";
import { DateRangePicker } from "@/components/ui/dateRangePicker";
import MonthlyReportSummaryTable from "@/components/collectionReport/MonthlyReportSummaryTable";
import MonthlyReportDetailsTable from "@/components/collectionReport/MonthlyReportDetailsTable";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type {
  MonthlyDesktopUIProps,
  MonthlyReportSummary,
  MonthlyReportDetailsRow,
} from "@/lib/types/componentProps";
import {
  exportMonthlyReportPDF,
  exportMonthlyReportExcel,
} from "@/lib/utils/export";

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
  monthlyPaginationRef,
  monthlyFirstItemIndex,
  monthlyLastItemIndex,
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
      <div className="flex flex-wrap items-center justify-center gap-2 py-3 px-4 border-t-0 rounded-b-lg bg-gray-50">
        <button
          className="bg-button text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
          onClick={onSetLastMonth}
        >
          Last Month
        </button>
        <span className="bg-grayHighlight text-white px-3 py-1.5 rounded-l-lg text-xs font-semibold">
          Date Range
        </span>
        <div style={{ width: "fit-content" }}>
          <DateRangePicker
            value={pendingRange}
            onChange={onPendingRangeChange}
            maxDate={new Date()}
            numberOfMonths={2}
          />
        </div>
        <button
          className="bg-lighterBlueHighlight text-white px-3 py-1.5 rounded-lg text-xs font-semibold"
          onClick={onApplyDateRange}
          disabled={!pendingRange?.from || !pendingRange?.to}
        >
          Go
        </button>
      </div>

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
        ) : monthlyCurrentItems.length === 0 && !monthlyLoading ? (
          <p className="text-center text-gray-500 mt-6">
            No data available for the selected period or location.
          </p>
        ) : (
          <>
            <MonthlyReportDetailsTable details={monthlyCurrentItems} />
            {monthlyTotalPages > 1 && (
              <div className="flex flex-col items-center mt-6 space-y-3">
                <div
                  ref={monthlyPaginationRef}
                  className="flex justify-center items-center space-x-2"
                >
                  <button
                    onClick={() => onPaginateMonthly(1)}
                    disabled={monthlyPage === 1}
                    className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                    title="First page"
                  >
                    <ChevronLeft size={12} className="inline mr-[-4px]" />
                    <ChevronLeft size={12} className="inline" />
                  </button>
                  <button
                    onClick={() => onPaginateMonthly(monthlyPage - 1)}
                    disabled={monthlyPage === 1}
                    className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from(
                    { length: Math.min(5, monthlyTotalPages) },
                    (_, i) => {
                      let pageToShow = i + 1;
                      if (monthlyTotalPages > 5) {
                        if (monthlyPage > 3) pageToShow = monthlyPage - 2 + i;
                        if (monthlyPage > monthlyTotalPages - 2)
                          pageToShow = monthlyTotalPages - 4 + i;
                      }
                      return (
                        <button
                          key={pageToShow}
                          onClick={() => onPaginateMonthly(pageToShow)}
                          className={`px-3 py-1 rounded-md text-sm ${
                            monthlyPage === pageToShow
                              ? "bg-buttonActive text-white scale-105"
                              : "bg-gray-200"
                          } transition-transform duration-200`}
                        >
                          {pageToShow}
                        </button>
                      );
                    }
                  )}
                  <button
                    onClick={() => onPaginateMonthly(monthlyPage + 1)}
                    disabled={monthlyPage === monthlyTotalPages}
                    className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => onPaginateMonthly(monthlyTotalPages)}
                    disabled={monthlyPage === monthlyTotalPages}
                    className="p-2 bg-gray-200 rounded-md disabled:opacity-50"
                    title="Last page"
                  >
                    <ChevronRight size={12} className="inline mr-[-4px]" />
                    <ChevronRight size={12} className="inline" />
                  </button>
                </div>
                <p className="text-gray-500 text-sm text-center">
                  Showing {monthlyFirstItemIndex + 1} -{" "}
                  {Math.min(monthlyLastItemIndex, monthlyDetails.length)} of{" "}
                  {monthlyDetails.length} records
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlyDesktopUI;
