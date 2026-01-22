/**
 * Monthly Mobile UI Component
 * Mobile layout wrapper for monthly reports page.
 *
 * Features:
 * - Mobile-only display (hidden on desktop)
 * - Location selection dropdown
 * - Date range picker
 * - Monthly report summary display
 * - Monthly report details cards
 * - Export PDF and Excel functionality
 * - Pagination controls
 * - Client-side pagination
 *
 * @param allLocationNames - Array of all location names
 * @param monthlyLocation - Currently selected location
 * @param onMonthlyLocationChange - Callback when location changes
 * @param pendingRange - Pending date range selection
 * @param onPendingRangeChange - Callback when date range changes
 * @param onApplyDateRange - Callback to apply date range
 * @param onSetLastMonth - Callback to set last month date range
 * @param monthlySummary - Monthly report summary data
 * @param monthlyDetails - Monthly report details data
 * @param monthlyLoading - Whether data is loading
 */
import { CollectionReportMonthlyMonthYearPicker } from '@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyMonthYearPicker';
import { Button } from '@/components/shared/ui/button';
import LocationMultiSelect from '@/components/shared/ui/common/LocationMultiSelect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import { ChevronDown, Download, ExternalLink, FileSpreadsheet, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import PaginationControls from '@/components/shared/ui/PaginationControls';
import type { MonthlyMobileUIProps, MonthlyReportDetailsRow } from '@/lib/types/components';
import {
  exportMonthlyReportExcel,
  exportMonthlyReportPDF,
} from '@/lib/utils/export';

// ============================================================================
// Constants
// ============================================================================

const ITEMS_PER_PAGE = 20;

/**
 * CollectionReportMonthlyMobile Component
 * Mobile layout wrapper for monthly reports page.
 */
export default function CollectionReportMonthlyMobile({
  locations,
  monthlyLocation,
  onMonthlyLocationChange,
  pendingRange,
      onPendingRangeChange,
      onSetLastMonth,
  monthlySummary,
  monthlyDetails,
  monthlyLoading,
}: MonthlyMobileUIProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(0);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    if (!text || text.trim() === '' || text === '-') {
      toast.error(`No ${label} value to copy`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text.trim());
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  // Find location ID by name
  const getLocationId = (locationName: string): string | null => {
    const location = locations.find(loc => loc.name === locationName);
    return location?.id || null;
  };

  const totalPages = Math.ceil(monthlyDetails.length / ITEMS_PER_PAGE) || 1;
  const firstItemIndex = currentPage * ITEMS_PER_PAGE;
  const lastItemIndex = (currentPage + 1) * ITEMS_PER_PAGE;
  const currentCardsToDisplay = monthlyDetails.slice(
    firstItemIndex,
    lastItemIndex
  );

  const handlePaginate = (pageNumber: number) => {
    if (pageNumber < 0 || pageNumber >= totalPages) return;
    setCurrentPage(pageNumber);
  };

  // Handler for export with format selection
  const handleExport = async (format: 'pdf' | 'excel') => {
    const totalLocations = locations.length;
    const currentLocationsCount = monthlyDetails.length;
    if (format === 'pdf') {
      await exportMonthlyReportPDF(monthlySummary, monthlyDetails, totalLocations, currentLocationsCount);
    } else {
      exportMonthlyReportExcel(monthlySummary, monthlyDetails, totalLocations, currentLocationsCount);
    }
  };

  return (
    <div className="w-full px-2 pb-4 sm:px-4 md:hidden">
      <div className="mx-auto max-w-xl space-y-4 rounded-lg bg-white p-3 shadow-lg sm:p-4">
        <div className="grid grid-cols-2 gap-3">
          <LocationMultiSelect
            locations={locations}
            selectedLocations={Array.isArray(monthlyLocation) ? monthlyLocation : (monthlyLocation === 'all' ? [] : [monthlyLocation])}
            onSelectionChange={onMonthlyLocationChange}
            placeholder="Select locations..."
            className="w-full"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center justify-center gap-1 truncate rounded-md border border-gray-300 bg-gray-200 px-2.5 py-2 text-xs text-gray-700 hover:bg-gray-300 sm:text-sm"
              >
                <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Export
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleExport('pdf')}
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleExport('excel')}
                className="cursor-pointer"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="w-full">
          <CollectionReportMonthlyMonthYearPicker
            value={pendingRange}
            onChange={onPendingRangeChange}
            onSetLastMonth={onSetLastMonth}
          />
        </div>

        {monthlyLoading ? (
          <div className="h-32 w-full animate-pulse rounded-lg bg-gray-200" />
        ) : (
          <div className="space-y-2 rounded-lg bg-blue-500 p-4 text-white shadow-md">
            <h2 className="text-center text-xl font-bold">
              {Array.isArray(monthlyLocation) && monthlyLocation.length > 0
                ? `${monthlyLocation.length} Selected Locations - Summary`
                : monthlyLocation !== 'all' && typeof monthlyLocation === 'string'
                  ? `${locations.find(loc => loc.id === monthlyLocation)?.name || monthlyLocation} - Summary`
                  : `All (${monthlyDetails.length}/${locations.length}) Locations Total`}
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 pt-1 text-center">
              {[
                { label: 'DROP', value: monthlySummary.drop, copyLabel: 'Drop' },
                {
                  label: 'CANCELLED CREDITS',
                  value: monthlySummary.cancelledCredits,
                  copyLabel: 'Cancelled Credits',
                },
                { label: 'GROSS', value: monthlySummary.gross, copyLabel: 'Gross' },
                { label: 'SAS GROSS', value: monthlySummary.sasGross, copyLabel: 'SAS Gross' },
              ].map(item => (
                <div key={item.label}>
                  <div className="text-xs font-semibold uppercase tracking-wider opacity-90">
                    {item.label}
                  </div>
                  <button
                    onClick={() => copyToClipboard(item.value, item.copyLabel)}
                    className="truncate text-lg font-medium hover:text-blue-200 hover:underline cursor-pointer"
                    title="Click to copy"
                  >
                    {item.value}
                  </button>
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
              {currentCardsToDisplay.map((detail: MonthlyReportDetailsRow, index: number) => {
                const locationId = getLocationId(detail.location);
                return (
                  <div
                    key={index}
                    className="overflow-hidden rounded-lg bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    <div className="flex items-center justify-between rounded-t-lg bg-lighterBlueHighlight px-4 py-3">
                      <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <span className="text-md font-semibold text-white">Location:</span>
                        {locationId ? (
                          <>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                router.push(`/locations/${locationId}`);
                              }}
                              className="text-md truncate font-semibold text-white hover:text-blue-200 hover:underline cursor-pointer"
                              title="Click to view location details"
                            >
                              {detail.location}
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                router.push(`/locations/${locationId}`);
                              }}
                              className="flex-shrink-0"
                              title="View location details"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-white hover:text-blue-200 cursor-pointer transition-transform hover:scale-110" />
                            </button>
                          </>
                        ) : (
                          <span className="text-md truncate font-semibold text-white">
                            {detail.location}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 p-4 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Drop:</span>
                        <button
                          onClick={() => copyToClipboard(detail.drop, 'Drop')}
                          className="text-right font-semibold hover:text-blue-600 hover:underline cursor-pointer"
                          title="Click to copy"
                        >
                          {detail.drop}
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Win:</span>
                        <button
                          onClick={() => copyToClipboard(detail.win, 'Win')}
                          className="text-right font-semibold hover:text-blue-600 hover:underline cursor-pointer"
                          title="Click to copy"
                        >
                          {detail.win}
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">Gross:</span>
                        <button
                          onClick={() => copyToClipboard(detail.gross, 'Gross')}
                          className="text-right font-semibold hover:text-blue-600 hover:underline cursor-pointer"
                          title="Click to copy"
                        >
                          {detail.gross}
                        </button>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-700">
                          SAS Gross:
                        </span>
                        <button
                          onClick={() => copyToClipboard(detail.sasGross, 'SAS Gross')}
                          className="text-right font-semibold hover:text-blue-600 hover:underline cursor-pointer"
                          title="Click to copy"
                        >
                          {detail.sasGross}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {totalPages > 0 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={handlePaginate}
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
}

