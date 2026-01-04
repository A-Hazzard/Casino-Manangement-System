/**
 * LocationReportSasCompareTab Component
 *
 * Displays SAS system totals for comparison.
 *
 * Features:
 * - SAS Drop Total
 * - SAS Cancelled Total
 * - SAS Gross Total
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
import type { CollectionReportData } from '@/lib/types/api';
import { getFinancialColorClass } from '@/lib/utils/financialColors';

type CollectionReportDetailsSasCompareTabProps = {
  reportData: CollectionReportData;
};

export default function CollectionReportDetailsSasCompareTab({
  reportData,
}: CollectionReportDetailsSasCompareTabProps) {
  // Use the sasMetrics from reportData if available, otherwise calculate from collections
  const sasMetrics = reportData?.sasMetrics || {
    dropped: 0,
    cancelled: 0,
    gross: 0,
  };

  // If sasMetrics is available, use it; otherwise we'd need collections to calculate
  // For now, we'll use sasMetrics from reportData
  const { totalSasDrop, totalSasCancelled, totalSasGross } = reportData?.sasMetrics
    ? {
        totalSasDrop: sasMetrics.dropped,
        totalSasCancelled: sasMetrics.cancelled,
        totalSasGross: sasMetrics.gross,
      }
    : {
        totalSasDrop: 0,
        totalSasCancelled: 0,
        totalSasGross: 0,
      };

  return (
    <div>
      {/* Mobile layout */}
      <div className="space-y-4 lg:hidden">
        <h2 className="my-4 text-center text-xl font-bold">
          SAS Metrics Compare
        </h2>
        <div className="overflow-hidden rounded-lg bg-white shadow-md">
          <div className="bg-lighterBlueHighlight p-3 text-white">
            <h3 className="font-semibold">SAS Totals</h3>
          </div>
          <div className="space-y-2 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">SAS Drop Total</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  totalSasDrop
                )}`}
              >
                {totalSasDrop.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">SAS Cancelled Total</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  totalSasCancelled
                )}`}
              >
                {totalSasCancelled.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">SAS Gross Total</span>
              <span
                className={`font-medium ${getFinancialColorClass(
                  totalSasGross
                )}`}
              >
                {totalSasGross.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden overflow-x-auto rounded-lg bg-white shadow-md lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-button hover:bg-button">
              <TableHead className="font-semibold text-white">METRIC</TableHead>
              <TableHead className="font-semibold text-white">VALUE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-gray-50">
              <TableCell className="font-medium">SAS Drop Total</TableCell>
              <TableCell className={getFinancialColorClass(totalSasDrop)}>
                {totalSasDrop.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-gray-50">
              <TableCell className="font-medium">
                SAS Cancelled Total
              </TableCell>
              <TableCell
                className={getFinancialColorClass(totalSasCancelled)}
              >
                {totalSasCancelled.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </TableCell>
            </TableRow>
            <TableRow className="hover:bg-gray-50">
              <TableCell className="font-medium">SAS Gross Total</TableCell>
              <TableCell className={getFinancialColorClass(totalSasGross)}>
                {totalSasGross.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
