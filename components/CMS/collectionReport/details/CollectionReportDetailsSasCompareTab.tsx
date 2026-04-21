'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import type { CollectionReportData } from '@/lib/types/api';
import { getFinancialColorClass } from '@/lib/utils/financial';
import { FC } from 'react';

type CollectionReportDetailsSasCompareTabProps = {
  reportData: CollectionReportData;
};

/**
 * CollectionReportDetailsSasCompareTab Component
 *
 * Displays SAS system totals for comparison against manual meter data.
 * Helps identifying discrepancies between electronic system and physical collection.
 *
 * Features:
 * - Side-by-side comparison of SAS Drop, Cancelled, and Gross totals
 * - Responsive layout: Table for desktop, formatted cards for mobile
 * - Dynamic color coding for financial values
 * - Aggregate computation of totals from reporting data
 *
 * @param reportData - Full report details object containing SAS metrics
 */
const CollectionReportDetailsSasCompareTab: FC<CollectionReportDetailsSasCompareTabProps> = ({
  reportData,
}) => {
  // ============================================================================
  // SAS System Metric Computations
  // ============================================================================
  const sasMetrics = reportData?.sasMetrics || {
    dropped: 0,
    cancelled: 0,
    gross: 0,
  };

  const { totalSasDrop, totalSasCancelled, totalSasGross } = {
    totalSasDrop: sasMetrics.dropped || 0,
    totalSasCancelled: sasMetrics.cancelled || 0,
    totalSasGross: sasMetrics.gross || 0,
  };

  const metrics = [
    { label: 'SAS Drop Total', value: totalSasDrop },
    { label: 'SAS Cancelled Total', value: totalSasCancelled },
    { label: 'SAS Gross Total', value: totalSasGross },
  ];

  return (
    <div className="space-y-6">
      <h2 className="my-4 text-center text-xl font-bold lg:hidden">
        SAS Metrics Compare
      </h2>

      {/* Mobile Card Layout */}
      <div className="space-y-4 lg:hidden">
        <div className="overflow-hidden rounded-lg bg-white shadow-md">
          <div className="bg-lighterBlueHighlight p-3 text-white font-semibold">
            SAS Totals
          </div>
          <div className="space-y-3 p-4 text-sm">
            {metrics.map((m, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">{m.label}</span>
                <span className={`font-bold ${getFinancialColorClass(m.value)}`}>
                  ${m.value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Table Layout */}
      <div className="hidden overflow-hidden rounded-lg bg-white shadow-md lg:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-button hover:bg-button border-b-0">
              <TableHead className="font-semibold text-white">METRIC</TableHead>
              <TableHead className="font-semibold text-white text-right">VALUE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((m, i) => (
              <TableRow key={i} className="hover:bg-gray-50/50">
                <TableCell className="font-medium text-gray-700">{m.label}</TableCell>
                <TableCell className={`text-right font-bold ${getFinancialColorClass(m.value)}`}>
                  ${m.value.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default CollectionReportDetailsSasCompareTab;

