import React, { useState } from "react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { DateRangePicker } from "@/components/ui/dateRangePicker";
import { formatDateOnly } from "@/lib/utils/dateUtils";
import type { MonthlyMobileUIProps } from "@/lib/types/componentProps";
import {
  exportMonthlyReportPDF,
  exportMonthlyReportExcel,
} from "@/lib/utils/export";
import PaginationControls from "@/components/ui/PaginationControls";

const ITEMS_PER_PAGE = 10;

const MonthlyMobileUI: React.FC<MonthlyMobileUIProps> = ({
  allLocationNames,
  monthlyLocation,
  onMonthlyLocationChange,
  pendingRange,
  onPendingRangeChange,
  onApplyDateRange,
  monthlySummary,
  monthlyDetails,
  monthlyLoading,
}) => {
  const [showDatePicker, setShowDatePicker] = React.useState(false);
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

  const formattedDateRange = () => {
    if (!pendingRange?.from) return "Select Date Range";
    const fromDate = formatDateOnly(pendingRange.from.toISOString());
    if (
      !pendingRange.to ||
      pendingRange.from.getTime() === pendingRange.to.getTime()
    )
      return fromDate;
    const toDate = formatDateOnly(pendingRange.to.toISOString());
    return `${fromDate} - ${toDate}`;
  };

  return (
    <div className="md:hidden w-full absolute left-0 right-0 px-2 sm:px-4 pb-4">
      <div className="mx-auto max-w-xl bg-white p-3 sm:p-4 rounded-lg shadow-lg space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select
            value={monthlyLocation}
            onValueChange={onMonthlyLocationChange}
          >
            <SelectTrigger className="bg-gray-50 border border-gray-300 text-gray-700 text-xs sm:text-sm rounded-md focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 py-2 px-2.5 truncate">
              <SelectValue placeholder="Select Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {allLocationNames.map((loc) => (
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
              className="bg-gray-200 hover:bg-gray-300 border border-gray-300 text-gray-700 text-xs sm:text-sm rounded-md py-2 px-2.5 flex items-center justify-center gap-1 truncate"
              onClick={() => setShowExportDropdown((v) => !v)}
              type="button"
            >
              EXPORT <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Button>
            {showExportDropdown && (
              <div className="absolute z-20 right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg">
                <button
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
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
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
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

        <div className="relative">
          <Button
            variant="outline"
            onClick={() => setShowDatePicker(true)}
            className="w-full justify-between bg-gray-50 border border-gray-300 text-gray-700 text-xs sm:text-sm rounded-md focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 py-2 px-2.5 text-left font-normal truncate"
          >
            <span>{formattedDateRange()}</span>
            <CalendarIcon className="h-4 w-4 text-gray-500" />
          </Button>
          {showDatePicker && (
            <div className="absolute z-10 top-full mt-1 w-full left-0 right-0 flex justify-center">
              <DateRangePicker
                value={pendingRange}
                onChange={onPendingRangeChange}
                maxDate={new Date()}
                className="w-full"
                numberOfMonths={1}
              />
            </div>
          )}
        </div>

        <Button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 sm:py-2.5 rounded-md text-xs sm:text-sm"
          onClick={() => {
            onApplyDateRange();
            setShowDatePicker(false);
          }}
          disabled={!pendingRange?.from || !pendingRange?.to || monthlyLoading}
        >
          {monthlyLoading ? "Applying..." : "Apply"}
        </Button>

        {monthlyLoading ? (
          <div className="animate-pulse h-32 bg-gray-200 rounded-lg w-full" />
        ) : (
          <div className="bg-blue-500 text-white rounded-lg shadow-md p-4 space-y-2">
            <h2 className="text-xl font-bold text-center">
              {monthlyLocation !== "all"
                ? `${monthlyLocation} - Summary`
                : "All Locations Total"}
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-center pt-1">
              {[
                { label: "DROP", value: monthlySummary.drop },
                {
                  label: "CANCELLED CREDITS",
                  value: monthlySummary.cancelledCredits,
                },
                { label: "GROSS", value: monthlySummary.gross },
                { label: "SAS GROSS", value: monthlySummary.sasGross },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-xs font-semibold opacity-90 tracking-wider uppercase">
                    {item.label}
                  </div>
                  <div className="text-lg font-medium truncate">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {monthlyLoading ? (
          <div className="space-y-3 mt-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="animate-pulse h-36 bg-gray-200 rounded-lg w-full"
              />
            ))}
          </div>
        ) : currentCardsToDisplay.length === 0 && !monthlyLoading ? null : (
          <>
            <div className="space-y-4 mt-4">
              {currentCardsToDisplay.map((detail, index) => (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                >
                  <div className="bg-lighterBlueHighlight text-white px-4 py-3 font-semibold text-md rounded-t-lg truncate">
                    Location: {detail.location}
                  </div>
                  <div className="p-4 flex flex-col gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Drop:</span>
                      <span className="font-semibold text-right">
                        {detail.drop}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Win:</span>
                      <span className="font-semibold text-right">
                        {detail.win}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">Gross:</span>
                      <span className="font-semibold text-right">
                        {detail.gross}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700 font-medium">
                        SAS Gross:
                      </span>
                      <span className="font-semibold text-right">
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
                setCurrentPage={(page) => handlePaginate(page + 1)}
              />
            )}
            {currentCardsToDisplay.length > 0 && (
              <p className="text-center text-gray-500 text-xs mt-2">
                Showing {firstItemIndex + 1} -{" "}
                {Math.min(lastItemIndex, monthlyDetails.length)} of{" "}
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
