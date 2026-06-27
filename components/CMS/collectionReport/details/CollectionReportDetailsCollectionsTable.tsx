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
import { useMachineOnlineStatus } from '@/lib/hooks/useMachineOnlineStatus';
import MachineOnlineStatusDot from '@/components/ui/MachineOnlineStatusDot';
import { Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

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
 *
 * Features:
 * - Searchable machine data with real-time filtering
 * - Sortable columns for machine ID, gross, variation, etc.
 * - Interactive machine display with navigation to cabinet details
 * - Visual indicators for RAM clears, notes, and jackpot deductions
 * - Responsive dual-view: Table for desktop, card-stack for mobile
 *
 * @param metrics - Array of all machine metrics associated with the report
 * @param paginatedMetrics - Subset of metrics for the current page view
 * @param searchTerm - Active search filter text
 * @param onSearchChange - Callback for search input updates
 * @param sortField - The metric property currently being sorted by
 * @param sortDirection - 'asc' or 'desc' sorting state
 * @param onSort - Callback to trigger sorting by a specific field
 * @param currentPage - Current active pagination page
 * @param totalPages - Total number of available pages
 * @param onPageChange - Callback for page navigation
 * @param useNetGross - Flag to subtract jackpots from SAS Gross display
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
  // State & Hooks
  // ============================================================================
  const router = useRouter();

  // ============================================================================
  // Helpers
  // ============================================================================
  // Show decimals only when the fractional part is >= 0.1 (e.g. 78596 → "78,596", 26440.50 → "26,440.50")
  const smartNum = (value: number | string): string => {
    const numericValue = Number(value);
    if (isNaN(numericValue)) return String(value);
    const fractionalPart = Math.abs(numericValue % 1);
    return numericValue.toLocaleString(
      undefined,
      fractionalPart >= 0.1
        ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
        : { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    );
  };

  // Online/offline status — collect actualMachineId for each metric that has one
  const detailsMachineIds = useMemo(
    () =>
      metrics
        .map(metric => metric.actualMachineId)
        .filter((id): id is string => Boolean(id)),
    [metrics]
  );
  const detailsMachineStatusMap = useMachineOnlineStatus(detailsMachineIds);

  // ============================================================================
  // Computed
  // ============================================================================
  const hasRamClears = metrics.some(metric => metric.ramClear);

  // ============================================================================
  // Handlers
  // ============================================================================
  const handleMachineClick = useCallback(
    (metric: MachineMetric) => {
      if (metric.actualMachineId) {
        router.push(`/cabinets/${metric.actualMachineId}`);
      }
    },
    [router]
  );

  // ============================================================================
  // Render
  // ============================================================================
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
            {metrics.filter(metric => metric.ramClear).length}{' '}
            {metrics.filter(metric => metric.ramClear).length > 1
              ? 'machines'
              : 'machine'}{' '}
            {metrics.filter(metric => metric.ramClear).length > 1
              ? 'were'
              : 'was'}{' '}
            ram cleared
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
                label="METER IN/OUT"
                field="metersIn"
                currentField={sortField}
                direction={sortDirection}
                onClick={onSort}
              />
              <CollectionReportDetailsSortableHeader
                label="PREV IN/OUT"
                field="prevIn"
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
                  <div className="flex flex-col gap-1">
                    <CollectionReportDetailsMachineDisplay
                      name={metric.machineId}
                      onClick={() => handleMachineClick(metric)}
                    />
                    <div className="flex items-center gap-1.5">
                      {metric.actualMachineId && (
                        <MachineOnlineStatusDot
                          isOnline={
                            detailsMachineStatusMap[metric.actualMachineId]
                          }
                        />
                      )}
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
                  {smartNum(metric.metersIn ?? 0)} /{' '}
                  {smartNum(metric.metersOut ?? 0)}
                </TableCell>

                <TableCell className="px-4 py-4 text-gray-600">
                  {smartNum(metric.prevIn ?? 0)} /{' '}
                  {smartNum(metric.prevOut ?? 0)}
                </TableCell>

                <TableCell className="px-4 py-4 text-gray-600">
                  {metric.dropCancelled || '0 / 0'}
                </TableCell>

                <TableCell
                  className={`px-4 py-4 font-medium ${Number(metric.metersGross ?? 0) < 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {smartNum(metric.metersGross ?? 0)}
                </TableCell>

                <TableCell className="px-4 py-4">
                  <CollectionReportDetailsSasGrossCell
                    metric={metric}
                    useNetGross={useNetGross}
                  />
                </TableCell>

                <TableCell className="px-4 py-4">
                  {metric.variation === 'No SMIB for this Machine' ? (
                    <span className="font-medium italic text-gray-500">
                      No SMIB for this Machine
                    </span>
                  ) : (
                    <span
                      className={`font-bold ${
                        Number(metric.variation ?? 0) < 0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {smartNum(metric.variation ?? 0)}
                    </span>
                  )}
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
          // formatSmartDecimal always returns a string — convert back to number for arithmetic
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
              <div className="mb-3 flex flex-col gap-1">
                <CollectionReportDetailsMachineDisplay
                  name={metric.machineId}
                  onClick={() => handleMachineClick(metric)}
                />
                <div className="flex items-center gap-1.5">
                  {metric.actualMachineId && (
                    <MachineOnlineStatusDot
                      isOnline={detailsMachineStatusMap[metric.actualMachineId]}
                    />
                  )}
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
                  label="Meter In/Out"
                  value={`${smartNum(metric.metersIn ?? 0)} / ${smartNum(metric.metersOut ?? 0)}`}
                />
                <CollectionReportDetailsMobileField
                  label="Prev In/Out"
                  value={`${smartNum(metric.prevIn ?? 0)} / ${smartNum(metric.prevOut ?? 0)}`}
                />
                <CollectionReportDetailsMobileField
                  label="Drop/Cancelled"
                  value={metric.dropCancelled}
                />
                <CollectionReportDetailsMobileField
                  label="Machine Gross"
                  value={smartNum(metric.metersGross ?? 0)}
                  className={
                    Number(metric.metersGross ?? 0) < 0
                      ? 'text-red-600'
                      : 'text-green-600'
                  }
                />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-gray-400">
                    {useNetGross ? 'SAS Gross (Net)' : 'SAS Gross'}
                  </p>
                  <p
                    className={`mt-0.5 font-medium ${
                      metric.sasGross === 'No SAS Data' ||
                      metric.sasGross === 'No SMIB for this Machine'
                        ? ''
                        : displaySasGross < 0
                          ? 'text-red-600'
                          : 'text-green-600'
                    }`}
                  >
                    {metric.sasGross === 'No SMIB for this Machine' ? (
                      <span className="italic text-gray-500">
                        No SMIB for this Machine
                      </span>
                    ) : metric.sasGross === 'No SAS Data' ? (
                      <span className="italic text-gray-500">No SAS Data</span>
                    ) : (
                      smartNum(displaySasGross)
                    )}
                  </p>
                  {hasJackpotDeduction &&
                    metric.sasGross !== 'No SMIB for this Machine' && (
                      <p className="mt-0.5 text-[10px] text-amber-600">
                        Jackpot: -{smartNum(jackpot)}
                      </p>
                    )}
                </div>
                <CollectionReportDetailsMobileField
                  label="Variation"
                  value={
                    metric.variation === 'No SMIB for this Machine' ? (
                      <span className="italic text-gray-500">
                        No SMIB for this Machine
                      </span>
                    ) : (
                      smartNum(metric.variation ?? 0)
                    )
                  }
                  isBold
                  className={
                    metric.variation === 'No SMIB for this Machine'
                      ? ''
                      : Number(metric.variation || 0) < 0
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
