/**
 * Monthly Desktop UI Component
 * Desktop layout wrapper for monthly reports page.
 *
 * Features:
 * - Desktop-only display (hidden on mobile)
 * - Location selection dropdown
 * - Date range picker
 * - Monthly report summary table
 * - Monthly report details table
 * - Export PDF and Excel functionality
 * - Pagination controls
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
 * @param monthlyCurrentItems - Currently displayed items
 * @param monthlyLoading - Whether data is loading
 * @param monthlyTotalPages - Total number of pages
 * @param monthlyPage - Current page number
 * @param onPaginateMonthly - Callback when page changes
 */
import CollectionReportMonthlyDetailsTable from '@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyDetailsTable';
import { CollectionReportMonthlyMonthYearPicker } from '@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyMonthYearPicker';
import CollectionReportMonthlySummaryTable from '@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlySummaryTable';
import { Button } from '@/components/shared/ui/button';
import LocationMultiSelect from '@/components/shared/ui/common/LocationMultiSelect';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import type { MonthlyDesktopUIProps } from '@/lib/types/components';
import {
    exportMonthlyReportExcel,
    exportMonthlyReportPDF,
} from '@/lib/utils/export';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';

/**
 * CollectionReportMonthlyDesktop Component
 * Desktop layout wrapper for monthly reports page.
 */
export default function CollectionReportMonthlyDesktop({
  locations,
  monthlyLocation,
  onMonthlyLocationChange,
  pendingRange,
      onPendingRangeChange,
      onSetLastMonth,
  monthlySummary,
  monthlyDetails,
  monthlyCurrentItems,
  monthlyLoading,
  monthlyTotalPages,
  monthlyPage,
  onPaginateMonthly,
}: MonthlyDesktopUIProps) {
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
    <div className="hidden space-y-4 rounded-lg bg-white shadow-md md:block">
      {/* Controls Bar */}
      <div className="flex flex-col gap-4 rounded-t-lg bg-buttonActive p-4 md:flex-row md:items-center">
        <LocationMultiSelect
          locations={locations}
          selectedLocations={Array.isArray(monthlyLocation) ? monthlyLocation : (monthlyLocation === 'all' ? [] : [monthlyLocation])}
          onSelectionChange={onMonthlyLocationChange}
          placeholder="Select locations..."
          className="w-auto"
        />
        <div className="ml-auto flex w-full justify-end md:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex items-center gap-2 border-white bg-white text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
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
      </div>

      {/* Date Filters Bar */}
      <CollectionReportMonthlyMonthYearPicker
        value={pendingRange}
        onChange={onPendingRangeChange}
        onSetLastMonth={onSetLastMonth}
      />

      {/* Content Area */}
      <div className="space-y-4 px-4 pb-4">
        <h2 className="mt-4 text-center text-xl font-bold">
          {Array.isArray(monthlyLocation) && monthlyLocation.length > 0
            ? `${monthlyLocation.length} Selected Locations - Summary`
            : monthlyLocation !== 'all' && typeof monthlyLocation === 'string'
              ? `${locations.find(loc => loc.id === monthlyLocation)?.name || monthlyLocation} - Summary`
              : `All (${monthlyDetails.length}/${locations.length}) Locations Total`}
        </h2>
        {monthlyLoading ? (
          <div className="h-24 w-full animate-pulse rounded bg-gray-200" />
        ) : (
            <CollectionReportMonthlySummaryTable summary={monthlySummary} loading={monthlyLoading} />
        )}

        {monthlyLoading ? (
          <div className="mt-4 h-40 w-full animate-pulse rounded bg-gray-200" />
        ) : monthlyCurrentItems.length === 0 && !monthlyLoading ? null : (
          <>
            <CollectionReportMonthlyDetailsTable details={monthlyCurrentItems} locations={locations} loading={monthlyLoading} />
            {monthlyTotalPages > 0 && (
              <PaginationControls
                currentPage={monthlyPage}
                totalPages={monthlyTotalPages}
                setCurrentPage={onPaginateMonthly}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

