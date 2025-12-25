/**
 * LocationReportSasCompareTab Component
 *
 * Displays a side-by-side comparison of machine metrics and SAS recorded metrics.
 *
 * Features:
 * - Direct comparison of Machine Gross vs SAS Gross
 * - Highlighted variations and discrepancies
 * - SAS recorded times for start and end of collection
 * - Responsive layout for mobile and desktop
 */

'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { MachineMetric } from '@/lib/types/api';
import { formatSasTime } from '@/lib/utils/collectionReportDetail';

type LocationReportSasCompareTabProps = {
  metrics: MachineMetric[];
  paginatedMetrics: MachineMetric[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function LocationReportSasCompareTab({
  paginatedMetrics,
}: LocationReportSasCompareTabProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">SAS Comparison</h2>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="px-6 py-4 font-semibold text-gray-600">MACHINE</TableHead>
              <TableHead className="px-6 py-4 font-semibold text-gray-600">MACHINE GROSS</TableHead>
              <TableHead className="px-6 py-4 font-semibold text-gray-600">SAS GROSS</TableHead>
              <TableHead className="px-6 py-4 font-semibold text-gray-600">VARIATION</TableHead>
              <TableHead className="px-6 py-4 font-semibold text-gray-600">SAS TIMES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMetrics.map((metric) => (
              <TableRow key={metric.id} className="hover:bg-gray-50/50">
                <TableCell className="px-6 py-4 font-bold text-blue-700">{metric.machineId}</TableCell>
                <TableCell className="px-6 py-4 font-medium">
                  {metric.metersGross?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="px-6 py-4 font-medium">
                  {metric.sasGross?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className={`px-6 py-4 font-bold ${Number(metric.variation) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metric.variation?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="px-6 py-4 text-xs text-gray-500">
                  <div className="space-y-0.5">
                    <p>Start: {formatSasTime(metric.sasStartTime || '')}</p>
                    <p>End: {formatSasTime(metric.sasEndTime || '')}</p>
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
          <div key={metric.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 font-bold text-blue-700">{metric.machineId}</div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Machine Gross</p>
                <p className="font-medium">{metric.metersGross?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">SAS Gross</p>
                <p className="font-medium">{metric.sasGross?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="col-span-2 border-t border-gray-50 pt-3">
                <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">SAS Times</p>
                <div className="mt-1 flex flex-col gap-1 text-xs text-gray-600">
                  <span>Start: {formatSasTime(metric.sasStartTime || '')}</span>
                  <span>End: {formatSasTime(metric.sasEndTime || '')}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



