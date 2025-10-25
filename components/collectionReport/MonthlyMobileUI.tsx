import React, { useState } from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { MonthlyDatePicker } from '@/components/ui/MonthlyDatePicker';

import type { MonthlyMobileUIProps } from '@/lib/types/componentProps';
import {
  exportMonthlyReportPDF,
  exportMonthlyReportExcel,
} from '@/lib/utils/export';
import PaginationControls from '@/components/ui/PaginationControls';

const ITEMS_PER_PAGE = 10;

const MonthlyMobileUI: React.FC<MonthlyMobileUIProps> = ({
  allLocationNames,
  monthlyLocation,
  onMonthlyLocationChange,
  pendingRange,
  onPendingRangeChange,
  onApplyDateRange,
  onSetLastMonth,
  monthlySummary,
  monthlyDetails,
  monthlyLoading,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const totalPages = Math.ceil(monthlyDetails.length / ITEMS_PER_PAGE);
  const firstItemIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const lastItemIndex = currentPage * ITEMS_PER_PAGE;
  const currentCardsToDisplay = monthlyDetails.slice(
    firstItemIndex,
    lastItemIndex
  );

  const handlePaginate = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  return (
    <div className="w-full px-2 pb-4 sm:px-4 md:hidden">
      <div className="mx-auto max-w-xl space-y-4 rounded-lg bg-white p-3 shadow-lg sm:p-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={monthlyLocation}
            onValueChange={onMonthlyLocationChange}
          >
            <SelectTrigger className="truncate rounded-md border border-gray-300 bg-gray-50 px-2.5 py-2 text-xs text-gray-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 sm:text-sm">
              <SelectValue placeholder="Select Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {allLocationNames.map(loc => (
                <SelectItem
                  key={loc}
                  value={loc}
                  className="text-xs sm:text-sm"
                >
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Button
              variant="outline"
              className="flex items-center justify-center gap-1 truncate rounded-md border border-gray-300 bg-gray-200 px-2.5 py-2 text-xs text-gray-700 hover:bg-gray-300 sm:text-sm"
              onClick={() => setShowExportDropdown(v => !v)}
              type="button"
            >
              EXPORT <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            {showExportDropdown && (
              <div className="absolute right-0 z-20 mt-1 w-32 rounded-md border border-gray-200 bg-white shadow-lg">
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  onClick={async () => {
                    setShowExportDropdown(false);
                    await exportMonthlyReportPDF(
                      monthlySummary,
                      monthlyDetails
                    );
                  }}
                >
                  Export PDF
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                  onClick={() => {
                    setShowExportDropdown(false);
                    exportMonthlyReportExcel(monthlySummary, monthlyDetails);
                  }}
                >
                  Export Excel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-full">
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
        </div>

        {monthlyLoading ? (
          <div className="h-32 w-full animate-pulse rounded-lg bg-gray-200" />
        ) : (
          <div className="space-y-2 rounded-lg bg-blue-500 p-4 text-white shadow-md">
            <h2 className="text-center text-xl font-bold">
              {monthlyLocation !== 'all'
                ? `${monthlyLocation} - Summary`
                : 'All Locations Total'}
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 text-center">
              {[
                { label: 'DROP', value: monthlySummary.drop },
                {
                  label: 'CANCELLED CREDITS',
                  value: monthlySummary.cancelledCredits,
                },
                { label: 'GROSS', value: monthlySummary.gross },
                { label: 'SAS GROSS', value: monthlySummary.sasGross },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-90">
                    {item.label}
                  </div>
                  <div className="truncate text-lg font-medium">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {monthlyLoading ? (
          <div className="mt-4 space-y-3">
            {[1, 2].map(i => (
              <div
                key={i}
                className="h-36 w-full animate-pulse rounded-lg bg-gray-200"
              />
            ))}
          </div>
        ) : currentCardsToDisplay.length === 0 && !monthlyLoading ? null : (
          <>
            <div className="mt-4 space-y-4">
              {currentCardsToDisplay.map((detail, index) => (
                <div
                  key={index}
                  className="overflow-hidden rounded-lg bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  <div className="text-md truncate rounded-t-lg bg-lighterBlueHighlight px-4 py-3 font-semibold text-white">
                    Location: {detail.location}
                  </div>
                  <div className="flex flex-col gap-2 p-4 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Drop:</span>
                      <span className="text-right font-semibold">
                        {detail.drop}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Win:</span>
                      <span className="text-right font-semibold">
                        {detail.win}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">Gross:</span>
                      <span className="text-right font-semibold">
                        {detail.gross}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-gray-700">
                        SAS Gross:
                      </span>
                      <span className="text-right font-semibold">
                        {detail.sasGross}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <PaginationControls
                currentPage={currentPage - 1}
                totalPages={totalPages}
                setCurrentPage={page => handlePaginate(page + 1)}
              />
            )}
            {currentCardsToDisplay.length > 0 && (
              <p className="mt-2 text-center text-xs text-gray-500">
                Showing {firstItemIndex + 1} -{' '}
                {Math.min(lastItemIndex, monthlyDetails.length)} of{' '}
                {monthlyDetails.length} records
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MonthlyMobileUI;
