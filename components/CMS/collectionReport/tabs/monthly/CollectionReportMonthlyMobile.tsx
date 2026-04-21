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
import { ChevronDown, Download, ExternalLink, FileSpreadsheet, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import PaginationControls from '@/components/shared/ui/PaginationControls';
import type { MonthlyMobileUIProps, MonthlyReportDetailsRow } from '@/lib/types/components';
import { exportMonthlyReportExcel, exportMonthlyReportPDF } from '@/lib/utils/export';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { getGrossColorClass } from '@/lib/utils/financial';

// ============================================================================
// Constants
// ============================================================================

const ITEMS_PER_PAGE = 20;

// Colour config for each summary metric — mirrors FinancialMetricsCards style
const SUMMARY_METRICS = [
  {
    key: 'drop' as const,
    label: 'Drop',
    gradient: 'from-purple-500 to-purple-600',
    dot: 'bg-purple-500',
  },
  {
    key: 'cancelledCredits' as const,
    label: 'Cancelled Credits',
    gradient: 'from-blue-500 to-blue-600',
    dot: 'bg-blue-500',
  },
  {
    key: 'gross' as const,
    label: 'Gross',
    gradient: 'from-orange-500 to-orange-600',
    dot: 'bg-orange-500',
  },
  {
    key: 'sasGross' as const,
    label: 'SAS Gross',
    gradient: 'from-amber-500 to-yellow-500',
    dot: 'bg-amber-500',
  },
];

// ============================================================================
// Component
// ============================================================================

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
  const { formatAmount } = useCurrencyFormat();
  const [currentPage, setCurrentPage] = useState(0);

  const formatVal = (v: number | string | null | undefined): string => {
    if (v === '-' || v === undefined || v === null || v === '') return '—';
    const num = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(num) ? String(v) : formatAmount(num);
  };

  const colorCls = (v: number | string | null | undefined): string => {
    if (v === '-' || v === undefined || v === null || v === '') return '';
    const num = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(num) ? '' : getGrossColorClass(num);
  };

  const copy = async (text: string, label: string) => {
    if (!text || text.trim() === '' || text === '-') { toast.error(`No ${label} value to copy`); return; }
    try {
      await navigator.clipboard.writeText(text.replace('$', '').replace(/,/g, '').trim());
      toast.success(`${label} copied`);
    } catch { toast.error(`Failed to copy ${label}`); }
  };

  const getLocationId = (name: string) => locations.find(loc => loc.name === name)?.id ?? null;

  const totalPages = Math.ceil(monthlyDetails.length / ITEMS_PER_PAGE) || 1;
  const startIdx = currentPage * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const pageItems = monthlyDetails.slice(startIdx, endIdx);

  const summaryTitle =
    Array.isArray(monthlyLocation) && monthlyLocation.length > 0
      ? `${monthlyLocation.length} Location${monthlyLocation.length > 1 ? 's' : ''} — Summary`
      : monthlyLocation !== 'all' && typeof monthlyLocation === 'string'
        ? `${locations.find(loc => loc.id === monthlyLocation)?.name ?? monthlyLocation} — Summary`
        : `All (${monthlyDetails.length}/${locations.length}) Locations — Summary`;

  const handleExport = async (format: 'pdf' | 'excel') => {
    if (format === 'pdf') {
      await exportMonthlyReportPDF(monthlySummary, monthlyDetails, locations.length, monthlyDetails.length);
    } else {
      exportMonthlyReportExcel(monthlySummary, monthlyDetails, locations.length, monthlyDetails.length);
    }
  };

  return (
    <div className="w-full pb-6 md:hidden">

      {/* ── Purple filter bar ── */}
      <div className="bg-buttonActive px-3 py-3 sm:px-4">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <LocationMultiSelect
              locations={locations}
              selectedLocations={
                Array.isArray(monthlyLocation)
                  ? monthlyLocation
                  : monthlyLocation === 'all' ? [] : [monthlyLocation]
              }
              onSelectionChange={onMonthlyLocationChange}
              placeholder="Select locations..."
              className="w-full"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="h-11 shrink-0 gap-1.5 rounded-md bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Download className="h-3.5 w-3.5" />
                Export
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('pdf')} className="cursor-pointer">
                <FileText className="mr-2 h-4 w-4" />Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')} className="cursor-pointer">
                <FileSpreadsheet className="mr-2 h-4 w-4" />Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Date picker — below the filter bar ── */}
      <div className="border-b bg-white px-3 py-3 sm:px-4">
        <CollectionReportMonthlyMonthYearPicker
          value={pendingRange}
          onChange={onPendingRangeChange}
          onSetLastMonth={onSetLastMonth}
        />
      </div>

      {/* ── Summary totals — FinancialMetricsCards style ── */}
      <div className="px-3 pt-4 sm:px-4">
        {monthlyLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">
              {summaryTitle}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SUMMARY_METRICS.map(metric => {
                const raw = monthlySummary[metric.key];
                const formatted = formatVal(raw);
                const valueCls = colorCls(raw);
                return (
                  <div
                    key={metric.key}
                    className="relative overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                  >
                    {/* Coloured top strip */}
                    <div className={`absolute left-0 right-0 top-0 h-1 bg-gradient-to-r ${metric.gradient}`} />
                    <div className="p-4 pt-5">
                      <div className="mb-2 flex items-center justify-between">
                        <h3 className="text-xs font-medium uppercase tracking-wide text-gray-500">
                          {metric.label}
                        </h3>
                        <div className={`h-2 w-2 rounded-full ${metric.dot}`} />
                      </div>
                      <button
                        onClick={() => copy(String(raw ?? ''), metric.label)}
                        className="text-left hover:opacity-70"
                        title="Tap to copy"
                      >
                        <span className={`text-lg font-bold ${valueCls || 'text-gray-900'}`}>
                          {formatted}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Location cards — collection tab card style ── */}
      {monthlyLoading ? (
        <div className="mt-4 space-y-3 px-3 sm:px-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-44 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <p className="mt-6 px-3 text-center text-sm text-gray-400 sm:px-4">
          No data for the selected period.
        </p>
      ) : (
        <>
          <div className="mt-4 space-y-4 px-3 sm:px-4">
            {pageItems.map((detail: MonthlyReportDetailsRow, index: number) => {
              const locationId = getLocationId(detail.location);
              return (
                <div
                  key={index}
                  className="overflow-hidden rounded-lg bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                >
                  {/* Header — same as collection tab card */}
                  <div className="bg-lighterBlueHighlight px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {locationId ? (
                        <>
                          <button
                            onClick={() => router.push(`/locations/${locationId}`)}
                            className="min-w-0 truncate text-sm font-semibold text-white hover:text-blue-200"
                          >
                            {detail.location}
                          </button>
                          <button onClick={() => router.push(`/locations/${locationId}`)}>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/70 hover:text-white" />
                          </button>
                        </>
                      ) : (
                        <span className="min-w-0 truncate text-sm font-semibold text-white">
                          {detail.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body — stacked label: value rows like collection tab */}
                  <div className="flex flex-col gap-3 bg-white p-4">
                    {[
                      { label: 'Drop', value: detail.drop },
                      { label: 'Win', value: detail.win },
                      { label: 'Gross', value: detail.gross },
                      { label: 'SAS Gross', value: detail.sasGross },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">{row.label}</span>
                        <button
                          onClick={() => copy(row.value, row.label)}
                          className="text-right text-sm font-semibold hover:opacity-70"
                          title="Tap to copy"
                        >
                          <span className={colorCls(row.value) || 'text-gray-900'}>
                            {formatVal(row.value)}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-4 px-3 sm:px-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={page => { if (page >= 0 && page < totalPages) setCurrentPage(page); }}
              />
              <p className="mt-2 text-center text-xs text-gray-400">
                {startIdx + 1}–{Math.min(endIdx, monthlyDetails.length)} of {monthlyDetails.length} locations
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
