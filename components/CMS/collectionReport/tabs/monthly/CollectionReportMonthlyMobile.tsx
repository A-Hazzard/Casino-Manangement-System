'use client';

import CollectionReportMonthlyCardSkeleton from '@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyCardSkeleton';
import CollectionReportMonthlyFilters from '@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyFilters';
import CollectionReportMonthlyLocationCard from '@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlyLocationCard';
import CollectionReportMonthlySummaryCards from '@/components/CMS/collectionReport/tabs/monthly/CollectionReportMonthlySummaryCards';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import type { MonthlyMobileUIProps } from '@/lib/types/components';
import {
  exportMonthlyReportExcel,
  exportMonthlyReportPDF,
} from '@/lib/utils/export';
import { format } from 'date-fns';
import { useMemo } from 'react';

export default function CollectionReportMonthlyMobile({
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
  monthlyFirstItemIndex,
  monthlyLastItemIndex,
}: MonthlyMobileUIProps) {
  const totalPages = monthlyTotalPages || 1;

  const locationLabel = useMemo(() => {
    if (Array.isArray(monthlyLocation) && monthlyLocation.length > 0) {
      if (monthlyLocation.length === 1) {
        return (
          locations.find(loc => loc.id === monthlyLocation[0])?.name ??
          '1 location'
        );
      }
      return `${monthlyLocation.length} locations`;
    }

    if (monthlyLocation !== 'all' && typeof monthlyLocation === 'string') {
      return (
        locations.find(loc => loc.id === monthlyLocation)?.name ??
        monthlyLocation
      );
    }

    return 'All locations';
  }, [monthlyLocation, locations]);

  const periodLabel = pendingRange?.from
    ? format(pendingRange.from, 'MMMM yyyy')
    : 'selected period';

  const summaryTitle = useMemo(() => {
    if (Array.isArray(monthlyLocation) && monthlyLocation.length > 0) {
      return `${monthlyLocation.length} location${monthlyLocation.length > 1 ? 's' : ''} summary`;
    }

    if (monthlyLocation !== 'all' && typeof monthlyLocation === 'string') {
      const name =
        locations.find(loc => loc.id === monthlyLocation)?.name ??
        monthlyLocation;
      return `${name} summary`;
    }

    return `All locations summary (${monthlyDetails.length}/${locations.length})`;
  }, [monthlyLocation, locations, monthlyDetails.length]);

  const getLocationId = (name: string) =>
    locations.find(loc => loc.name === name)?.id ?? null;

  const handleExportPdf = async () => {
    await exportMonthlyReportPDF(
      monthlySummary,
      monthlyDetails,
      locations.length,
      monthlyDetails.length
    );
  };

  const handleExportExcel = () => {
    exportMonthlyReportExcel(
      monthlySummary,
      monthlyDetails,
      locations.length,
      monthlyDetails.length
    );
  };

  const handleLocationChange = (selectedIds: string[]) => {
    onMonthlyLocationChange(
      selectedIds.length === 0 ? 'all' : selectedIds
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-24 md:hidden">
      <div className="px-1">
        <p className="text-xs font-medium text-gray-500">
          Showing{' '}
          <span className="font-bold text-gray-900">
            {monthlyDetails.length}
          </span>{' '}
          locations for{' '}
          <span className="font-bold text-buttonActive">{periodLabel}</span>
          {' · '}
          <span className="font-bold text-buttonActive">{locationLabel}</span>
        </p>
      </div>

      <CollectionReportMonthlyFilters
        locations={locations}
        monthlyLocation={monthlyLocation}
        onMonthlyLocationChange={handleLocationChange}
        pendingRange={pendingRange}
        onPendingRangeChange={onPendingRangeChange}
        onSetLastMonth={onSetLastMonth}
        monthlyLoading={monthlyLoading}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
      />

      <CollectionReportMonthlySummaryCards
        summary={monthlySummary}
        loading={monthlyLoading}
        title={summaryTitle}
      />

      {monthlyLoading ? (
        <CollectionReportMonthlyCardSkeleton count={4} />
      ) : monthlyCurrentItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg bg-container p-8 text-center shadow-sm">
          <p className="text-base font-medium text-gray-600">
            No data for this period
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Try a different month or location filter.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {monthlyCurrentItems.map((detail, index) => (
              <CollectionReportMonthlyLocationCard
                key={`${detail.location}-${index}`}
                detail={detail}
                locationId={getLocationId(detail.location)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="space-y-2">
              <PaginationControls
                currentPage={monthlyPage}
                totalPages={totalPages}
                setCurrentPage={onPaginateMonthly}
              />
              <p className="text-center text-xs text-gray-500">
                {monthlyFirstItemIndex}–{monthlyLastItemIndex} of{' '}
                {monthlyDetails.length} locations
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
