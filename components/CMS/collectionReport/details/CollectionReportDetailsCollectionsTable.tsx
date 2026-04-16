'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import type { MachineMetric } from '@/lib/types/api';
import { formatSasTime } from '@/lib/utils/collection';
import { Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

// === Sub-components ===
import {
  CollectionReportDetailsJackpotIndicator,
  CollectionReportDetailsNoteIndicator,
  CollectionReportDetailsRamClearIndicator,
} from './components/CollectionReportDetailsIndicators';
import { CollectionReportDetailsMachineDisplay } from './components/CollectionReportDetailsMachineDisplay';
import { CollectionReportDetailsMobileField } from './components/CollectionReportDetailsMobileField';
import { CollectionReportDetailsPagination } from './components/CollectionReportDetailsPagination';
import { CollectionReportDetailsSasGrossCell } from './components/CollectionReportDetailsSasGrossCell';
import { CollectionReportDetailsSortableHeader } from './components/CollectionReportDetailsSortableHeader';

type CollectionReportDetailsCollectionsTableProps = {
  metrics: MachineMetric[];
  paginatedMetrics: MachineMetric[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortField: keyof MachineMetric;
  sortDirection: 'asc' | 'desc';
  onSort: (field: keyof MachineMetric) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** When true, deduct jackpot from SAS Gross display and show indicator */
  useNetGross?: boolean;
};

/**
 * CollectionReportDetailsCollectionsTable Component
 *
 * Displays the list of machine metrics for a collection report.
 * Supports searching, sorting, and pagination across desktop and mobile views.
 */
export function CollectionReportDetailsCollectionsTable({
  metrics,
  paginatedMetrics,
  searchTerm,
  onSearchChange,
  sortField,
  sortDirection,
  onSort,
  currentPage,
  totalPages,
  onPageChange,
  useNetGross = false,
}: CollectionReportDetailsCollectionsTableProps) {
  // ============================================================================
  // Router & Component State
  // ============================================================================
  const router = useRouter();

  // ============================================================================
  // Metric Summary & Indicators Checks
  // ============================================================================
  const hasRamClears = metrics.some(m => m.ramClear);

  // ============================================================================
  // Machine Detail Navigation Handlers
  // ============================================================================
  const handleMachineClick = useCallback(
    (metric: MachineMetric) => {
      if (metric.actualMachineId) {
        router.push(`/cabinets/${metric.actualMachineId}`);
      }
    },
    [router]
  );

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-gray-900">Machine Metrics</h2>
        <div className="relative max-w-sm flex-1">
          <input
            type="text"
            placeholder="Search machines..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* RAM Clear Alert Indicator */}
      {hasRamClears && (
        <div className="flex items-center gap-3 rounded-lg border-l-4 border-orange-500 bg-orange-50 p-4 text-orange-800">
          <Zap className="h-5 w-5 text-orange-500" />
          <p className="text-sm font-semibold">
            {metrics.filter(m => m.ramClear).length} {metrics.filter(m => m.ramClear).length > 1 ? 'machines' : 'machine'} {metrics.filter(m => m.ramClear).length > 1 ? 'were' : 'was'} ram cleared
          </p>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <CollectionReportDetailsSortableHeader
                label="MACHINE"
                field="machineId"
                currentField={sortField}
                direction={sortDirection}
                onClick={onSort}
              />
              <CollectionReportDetailsSortableHeader
                label="DROP/CANCELLED"
                field="dropCancelled"
                currentField={sortField}
                direction={sortDirection}
                onClick={onSort}
              />
              <CollectionReportDetailsSortableHeader
                label="MACHINE GROSS"
                field="metersGross"
                currentField={sortField}
                direction={sortDirection}
                onClick={onSort}
              />
              <CollectionReportDetailsSortableHeader
                label={useNetGross ? 'SAS GROSS (NET)' : 'SAS GROSS'}
                field="sasGross"
                currentField={sortField}
                direction={sortDirection}
                onClick={onSort}
              />
              <CollectionReportDetailsSortableHeader
                label="VARIATION"
                field="variation"
                currentField={sortField}
                direction={sortDirection}
                onClick={onSort}
              />
              <th className="min-w-[160px] px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                SAS TIMES
              </th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMetrics.map(metric => (
              <TableRow
                key={metric.id}
                data-machine-id={metric.machineId}
                className={`group transition-colors hover:bg-gray-50/80 ${
                  metric.ramClear ? 'bg-orange-50/30' : ''
                }`}
              >
                <TableCell className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <CollectionReportDetailsMachineDisplay
                        name={metric.machineId}
                        onClick={() => handleMachineClick(metric)}
                      />
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-1">
                      {metric.ramClear && (
                        <CollectionReportDetailsRamClearIndicator />
                      )}
                      {useNetGross && (metric.jackpot ?? 0) > 0 && (
                        <CollectionReportDetailsJackpotIndicator />
                      )}
                      {metric.notes && (
                        <CollectionReportDetailsNoteIndicator
                          note={metric.notes}
                        />
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell className="px-4 py-4 text-gray-600">
                  {metric.dropCancelled || '0 / 0'}
                </TableCell>

                <TableCell className="px-4 py-4 font-medium text-gray-900">
                  {metric.metersGross?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </TableCell>

                <TableCell className="px-4 py-4">
                  <CollectionReportDetailsSasGrossCell
                    metric={metric}
                    useNetGross={useNetGross}
                  />
                </TableCell>

                <TableCell
                  className={`px-4 py-4 font-bold ${Number(metric.variation) < 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {metric.variation?.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}
                </TableCell>

                <TableCell className="min-w-[160px] whitespace-nowrap px-4 py-4 text-xs text-gray-500">
                  <div className="space-y-1">
                    <p>{formatSasTime(metric.sasStartTime || '')}</p>
                    <p>{formatSasTime(metric.sasEndTime || '')}</p>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {paginatedMetrics.map(metric => {
          const jackpot = metric.jackpot ?? 0;
          const hasJackpotDeduction = useNetGross && jackpot > 0;
          const rawSasGross = Number(metric.sasGross) || 0;
          const displaySasGross = hasJackpotDeduction
            ? rawSasGross - jackpot
            : rawSasGross;

          return (
            <div
              key={metric.id}
              className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${
                metric.ramClear ? 'border-l-4 border-l-orange-500' : ''
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <CollectionReportDetailsMachineDisplay
                  name={metric.machineId}
                  onClick={() => handleMachineClick(metric)}
                />
                <div className="flex shrink-0 items-center gap-1.5">
                  {metric.ramClear && (
                    <CollectionReportDetailsRamClearIndicator />
                  )}
                  {hasJackpotDeduction && (
                    <CollectionReportDetailsJackpotIndicator />
                  )}
                  {metric.notes && (
                    <CollectionReportDetailsNoteIndicator note={metric.notes} />
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-y-3 text-sm">
                <CollectionReportDetailsMobileField
                  label="Drop/Cancelled"
                  value={metric.dropCancelled}
                />
                <CollectionReportDetailsMobileField
                  label="Machine Gross"
                  value={metric.metersGross}
                  isCurrency
                />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                    {useNetGross ? 'SAS Gross (Net)' : 'SAS Gross'}
                  </p>
                  <p
                    className={`mt-0.5 font-medium ${hasJackpotDeduction && displaySasGross < 0 ? 'text-red-600' : ''}`}
                  >
                    {typeof metric.sasGross === 'string' ? (
                      <span className="italic text-gray-500">
                        {metric.sasGross}
                      </span>
                    ) : (
                      displaySasGross.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })
                    )}
                  </p>
                  {hasJackpotDeduction && (
                    <p className="mt-0.5 text-[10px] text-amber-600">
                      Jackpot: -
                      {jackpot.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  )}
                </div>
                <CollectionReportDetailsMobileField
                  label="Variation"
                  value={metric.variation ?? 0}
                  isCurrency={typeof metric.variation !== 'string'}
                  isBold
                  className={
                    Number(metric.variation || 0) < 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }
                />
                <div className="col-span-2 grid grid-cols-2 gap-y-3 border-t border-gray-100 pt-2">
                  <CollectionReportDetailsMobileField
                    label="Start Time"
                    value={formatSasTime(metric.sasStartTime || '')}
                  />
                  <CollectionReportDetailsMobileField
                    label="End Time"
                    value={formatSasTime(metric.sasEndTime || '')}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CollectionReportDetailsPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
