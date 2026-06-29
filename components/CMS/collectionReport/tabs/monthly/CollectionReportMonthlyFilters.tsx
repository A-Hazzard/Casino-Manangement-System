'use client';

import { CollectionReportMonthlyMonthYearPicker } from '@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyMonthYearPicker';
import { Button } from '@/components/shared/ui/button';
import LocationMultiSelect from '@/components/shared/ui/common/LocationMultiSelect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import type { LocationMultiSelectProps } from '@/lib/types/components';
import { ChevronDown, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { DateRange as RDPDateRange } from 'react-day-picker';

type CollectionReportMonthlyFiltersProps = {
  locations: LocationMultiSelectProps['locations'];
  monthlyLocation: string | string[] | 'all';
  onMonthlyLocationChange: (locationIds: string[]) => void;
  pendingRange?: RDPDateRange;
  onPendingRangeChange: (range?: RDPDateRange) => void;
  onSetLastMonth: () => void;
  monthlyLoading: boolean;
  onExportPdf: () => void;
  onExportExcel: () => void;
};

export default function CollectionReportMonthlyFilters({
  locations,
  monthlyLocation,
  onMonthlyLocationChange,
  pendingRange,
  onPendingRangeChange,
  onSetLastMonth,
  monthlyLoading,
  onExportPdf,
  onExportExcel,
}: CollectionReportMonthlyFiltersProps) {
  const selectedLocations =
    Array.isArray(monthlyLocation)
      ? monthlyLocation
      : monthlyLocation === 'all'
        ? []
        : [monthlyLocation];

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg bg-buttonActive p-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/90">
          Locations
        </p>
        <LocationMultiSelect
          locations={locations}
          selectedLocations={selectedLocations}
          onSelectionChange={onMonthlyLocationChange}
          placeholder="All locations"
          className="w-full"
        />
      </div>

      <CollectionReportMonthlyMonthYearPicker
        value={pendingRange}
        onChange={onPendingRangeChange}
        onSetLastMonth={onSetLastMonth}
        disabled={monthlyLoading}
        variant="filterBar"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={monthlyLoading}
            className="h-11 w-full gap-2 rounded-md border-white/30 bg-white text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export Report
            <ChevronDown className="ml-auto h-4 w-4 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem onClick={onExportPdf} className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            Export as PDF
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportExcel} className="cursor-pointer">
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export as Excel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
