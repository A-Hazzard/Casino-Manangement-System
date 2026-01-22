/**
 * LocationReportCollectionsTable Component
 *
 * Displays the list of machine metrics for a collection report.
 *
 * Features:
 * - Search machines by ID or other fields
 * - Sorting by multiple columns (Machine ID, Gross, Variation, etc.)
 * - Pagination (Desktop & Mobile views)
 * - Visual indicators for RAM cleared machines
 * - Responsive layout (Cards for mobile, Table for desktop)
 */

'use client';

import { Button } from '@/components/shared/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/shared/ui/tooltip';
import type { MachineMetric } from '@/lib/types/api';
import { formatSasTime } from '@/lib/utils/collection';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';
import {
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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
};

export default function CollectionReportDetailsCollectionsTable({
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
}: CollectionReportDetailsCollectionsTableProps) {
  const router = useRouter();

  const handleMachineClick = (metric: MachineMetric) => {
    if (metric.actualMachineId) {
      router.push(`/cabinets/${metric.actualMachineId}`);
    }
  };

  const hasRamClears = metrics.some(m => m.ramClear);

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
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      </div>

      {/* RAM Clear Alert */}
      {hasRamClears && (
        <div className="flex items-center gap-3 rounded-lg border-l-4 border-orange-500 bg-orange-50 p-4 text-orange-800">
          <Zap className="h-5 w-5 text-orange-500" />
          <p className="text-sm font-semibold">
            {metrics.filter(m => m.ramClear).length} machine(s) were ram cleared
          </p>
        </div>
      )}

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <SortableHeader
                label="MACHINE"
                field="machineId"
                currentField={sortField}
                direction={sortDirection}
                onClick={onSort}
              />
              <SortableHeader
                label="DROP/CANCELLED"
                field="dropCancelled"
                currentField={sortField}
                direction={sortDirection}
                onClick={onSort}
              />
              <SortableHeader
                label="MACHINE GROSS"
                field="metersGross"
                currentField={sortField}
                direction={sortDirection}
                onClick={onSort}
              />
              <SortableHeader
                label="SAS GROSS"
                field="sasGross"
                currentField={sortField}
                direction={sortDirection}
                onClick={onSort}
              />
              <SortableHeader
                label="VARIATION"
                field="variation"
                currentField={sortField}
                direction={sortDirection}
                onClick={onSort}
              />
              <TableHead className="px-4 py-4 font-semibold text-gray-600 min-w-[160px]">SAS TIMES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMetrics.map((metric) => (
              <TableRow
                key={metric.id}
                data-machine-id={metric.machineId}
                className={`group transition-colors hover:bg-gray-50/80 ${
                  metric.ramClear ? 'bg-orange-50/30' : ''
                }`}
              >
                <TableCell className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <span
                      onClick={() => handleMachineClick(metric)}
                      className="cursor-pointer rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 transition-all group-hover:bg-blue-200"
                    >
                      {metric.machineId}
                    </span>
                    {metric.ramClear && <RamClearIndicator />}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-4 text-gray-600">{metric.dropCancelled || '0 / 0'}</TableCell>
                <TableCell className="px-4 py-4 font-medium text-gray-900">
                  {metric.metersGross?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="px-4 py-4 font-medium text-gray-900">
                  {metric.sasGross?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className={`px-4 py-4 font-bold ${Number(metric.variation) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metric.variation?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="px-4 py-4 text-xs text-gray-500 whitespace-nowrap min-w-[160px]">
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

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        {paginatedMetrics.map((metric) => (
          <div
            key={metric.id}
            className={`rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${
              metric.ramClear ? 'border-l-4 border-l-orange-500' : ''
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <span
                onClick={() => handleMachineClick(metric)}
                className="cursor-pointer font-bold text-blue-600 hover:underline"
              >
                {metric.machineId}
              </span>
              {metric.ramClear && <RamClearIndicator />}
            </div>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <MobileField label="Drop/Cancelled" value={metric.dropCancelled} />
              <MobileField label="Machine Gross" value={metric.metersGross} isCurrency />
              <MobileField label="SAS Gross" value={metric.sasGross ?? 0} isCurrency />
              <MobileField 
                label="Variation" 
                value={metric.variation ?? 0} 
                isCurrency 
                isBold 
                className={Number(metric.variation || 0) < 0 ? 'text-red-600' : 'text-green-600'}
              />
              <div className="col-span-2 grid grid-cols-2 gap-y-3 pt-2 border-t border-gray-100">
                <MobileField label="Start Time" value={formatSasTime(metric.sasStartTime || '')} />
                <MobileField label="End Time" value={formatSasTime(metric.sasEndTime || '')} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function SortableHeader({ label, field, currentField, direction, onClick }: {
  label: string;
  field: keyof MachineMetric;
  currentField: keyof MachineMetric;
  direction: 'asc' | 'desc';
  onClick: (field: keyof MachineMetric) => void;
}) {
  return (
    <TableHead
      onClick={() => onClick(field)}
      className="cursor-pointer px-4 py-4 font-semibold text-gray-600 transition-colors hover:text-blue-600"
    >
      <div className="flex items-center gap-1.5">
        {label}
        {currentField === field && (
          direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
        )}
      </div>
    </TableHead>
  );
}

function RamClearIndicator() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex h-5 w-5 animate-pulse items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
            <Zap className="h-3 w-3" />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Machine was RAM cleared</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function MobileField({ label, value, isCurrency = false, isBold = false, className = '' }: {
  label: string;
  value: string | number;
  isCurrency?: boolean;
  isBold?: boolean;
  className?: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">{label}</p>
      <p className={`mt-0.5 font-medium ${isBold ? 'font-bold' : ''} ${className}`}>
        {isCurrency ? value?.toLocaleString(undefined, { minimumFractionDigits: 2 }) : (value || '-')}
      </p>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
      >
        <DoubleArrowLeftIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Page</span>
        <input
          type="number"
          min={1}
          max={totalPages}
          value={currentPage}
          onChange={(e) => onPageChange(Number(e.target.value))}
          className="w-12 rounded border border-gray-300 p-1 text-center text-sm focus:border-blue-500 focus:outline-none"
        />
        <span className="text-sm text-gray-500">of {totalPages}</span>
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        <DoubleArrowRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
}




