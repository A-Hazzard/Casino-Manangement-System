import React from 'react';
import { MonthlyDatePicker } from '@/components/ui/MonthlyDatePicker';
import MonthlyReportSummaryTable from '@/components/collectionReport/MonthlyReportSummaryTable';
import MonthlyReportDetailsTable from '@/components/collectionReport/MonthlyReportDetailsTable';
import type { MonthlyDesktopUIProps } from '@/lib/types/componentProps';
import {
  exportMonthlyReportPDF,
  exportMonthlyReportExcel,
} from '@/lib/utils/export';
import PaginationControls from '@/components/ui/PaginationControls';

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
    <div className="hidden space-y-4 rounded-lg bg-white shadow-md md:block">
      {/* Controls Bar */}
      <div className="flex flex-col gap-4 rounded-t-lg bg-buttonActive p-4 md:flex-row md:items-center">
        <select
          className="w-full rounded-md border-none bg-white px-4 py-2 text-sm text-black focus:ring-2 focus:ring-buttonActive md:w-auto"
          value={monthlyLocation}
          onChange={e => onMonthlyLocationChange(e.target.value)}
        >
          <option value="all">All Locations</option>
          {allLocationNames.map(loc => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <div className="ml-auto flex w-full justify-end gap-2 md:w-auto">
          <button
            className="rounded-md bg-lighterBlueHighlight px-4 py-2 text-sm font-semibold text-white"
            onClick={handleExportPDF}
          >
            EXPORT PDF
          </button>
          <button
            className="rounded-md bg-lighterBlueHighlight px-4 py-2 text-sm font-semibold text-white"
            onClick={() =>
              exportMonthlyReportExcel(monthlySummary, monthlyDetails)
            }
          >
            EXPORT EXCEL
          </button>
        </div>
      </div>

      {/* Date Filters Bar */}
      <MonthlyDatePicker
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
      <div className="space-y-4 px-4 pb-4">
        <h2 className="mt-4 text-center text-xl font-bold">
          {monthlyLocation !== 'all'
            ? `${monthlyLocation} - Summary`
            : 'All Locations Total'}
        </h2>
        {monthlyLoading ? (
          <div className="h-24 w-full animate-pulse rounded bg-gray-200" />
        ) : (
          <MonthlyReportSummaryTable summary={monthlySummary} />
        )}

        {monthlyLoading ? (
          <div className="mt-4 h-40 w-full animate-pulse rounded bg-gray-200" />
        ) : monthlyCurrentItems.length === 0 && !monthlyLoading ? null : (
          <>
            <MonthlyReportDetailsTable details={monthlyCurrentItems} />
            {monthlyTotalPages > 1 && (
              <PaginationControls
                currentPage={monthlyPage - 1}
                totalPages={monthlyTotalPages}
                setCurrentPage={page => onPaginateMonthly(page + 1)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlyDesktopUI;
