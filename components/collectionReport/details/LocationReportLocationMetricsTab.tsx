/**
 * LocationReportLocationMetricsTab Component
 *
 * Displays aggregated location-level metrics for a collection report.
 *
 * Features:
 * - Summary cards for total gross, variance, and collected amounts
 * - Detailed breakdown of location revenue and profits
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
import { formatCurrency } from '@/lib/utils/currency';
import { getFinancialColorClass } from '@/lib/utils/financialColors';

type LocationReportLocationMetricsTabProps = {
  reportData: CollectionReportData;
};

export default function LocationReportLocationMetricsTab({
  reportData,
}: LocationReportLocationMetricsTabProps) {
  const { locationMetrics } = reportData;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-900">Location-Level Metrics</h2>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 lg:hidden">
        <MobileCard title="Machine Totals" className="border-blue-100">
          <MetricRow label="Total Drop/Cancelled" value={locationMetrics?.droppedCancelled} />
          <MetricRow label="Total Machine Gross" value={locationMetrics?.metersGross} isCurrency />
          <MetricRow label="Total SAS Gross" value={locationMetrics?.sasGross} isCurrency />
          <MetricRow label="Total Variation" value={locationMetrics?.variation} isCurrency isBold />
        </MobileCard>

        <MobileCard title="Collection Details" className="border-green-100">
          <MetricRow label="Variance" value={locationMetrics?.variance ?? 0} isCurrency />
          <MetricRow label="Variance Reason" value={locationMetrics?.varianceReason ?? ''} />
          <MetricRow label="Amount to Collect" value={locationMetrics?.amountToCollect ?? 0} isCurrency isBold />
          <MetricRow label="Collected Amount" value={locationMetrics?.collectedAmount ?? 0} isCurrency isBold />
        </MobileCard>

        <MobileCard title="Financial Results" className="border-purple-100">
          <MetricRow label="Location Revenue" value={locationMetrics?.locationRevenue ?? 0} isCurrency />
          <MetricRow label="Taxes" value={locationMetrics?.taxes ?? 0} isCurrency />
          <MetricRow label="Partner Profit" value={locationMetrics?.locationRevenue && locationMetrics?.taxes ? locationMetrics.locationRevenue - locationMetrics.taxes : 0} isCurrency isBold />
          <MetricRow label="Final Balance" value={locationMetrics?.currentBalanceOwed} isCurrency isBold />
        </MobileCard>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="px-6 py-4 font-semibold text-gray-600">CATEGORY</TableHead>
              <TableHead className="px-6 py-4 font-semibold text-gray-600">METRIC</TableHead>
              <TableHead className="px-6 py-4 font-semibold text-gray-600 text-right">VALUE</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <GroupedRow group="Machine Totals" label="Total Drop/Cancelled" value={locationMetrics?.droppedCancelled} />
            <GroupedRow group="Machine Totals" label="Total Machine Gross" value={locationMetrics?.metersGross} isCurrency />
            <GroupedRow group="Machine Totals" label="Total SAS Gross" value={locationMetrics?.sasGross} isCurrency />
            <GroupedRow group="Machine Totals" label="Total Variation" value={locationMetrics?.variation} isCurrency isBold />
            
            <GroupedRow group="Collection Details" label="Variance" value={locationMetrics?.variance ?? 0} isCurrency />
            <GroupedRow group="Collection Details" label="Amount to Collect" value={locationMetrics?.amountToCollect ?? 0} isCurrency />
            <GroupedRow group="Collection Details" label="Collected Amount" value={locationMetrics?.collectedAmount ?? 0} isCurrency isBold />
            
            <GroupedRow group="Financial Results" label="Location Revenue" value={locationMetrics?.locationRevenue ?? 0} isCurrency />
            <GroupedRow group="Financial Results" label="Partner Profit" value={locationMetrics?.locationRevenue && locationMetrics?.taxes ? locationMetrics.locationRevenue - locationMetrics.taxes : 0} isCurrency isBold />
            <GroupedRow group="Financial Results" label="Final Balance" value={locationMetrics?.currentBalanceOwed} isCurrency isBold />
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MetricRow({ label, value, isCurrency = false, isBold = false }: {
  label: string;
  value: string | number;
  isCurrency?: boolean;
  isBold?: boolean;
}) {
  const displayValue = isCurrency ? formatCurrency(Number(value)) : (value || '-');
  const colorClass = isCurrency ? getFinancialColorClass(Number(value)) : '';

  return (
    <div className="flex justify-between py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-gray-500 text-xs uppercase tracking-tight">{label}</span>
      <span className={`font-medium ${isBold ? 'font-bold' : ''} ${colorClass}`}>
        {displayValue}
      </span>
    </div>
  );
}

function GroupedRow({ group, label, value, isCurrency = false, isBold = false }: {
  group: string;
  label: string;
  value: string | number;
  isCurrency?: boolean;
  isBold?: boolean;
}) {
  const displayValue = isCurrency ? formatCurrency(Number(value)) : (value || '-');
  const colorClass = isCurrency ? getFinancialColorClass(Number(value)) : '';

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="px-6 py-3 font-medium text-gray-400 text-[10px] uppercase tracking-wider align-top">
        {label === 'Total Drop/Cancelled' || label === 'Variance' || label === 'Location Revenue' ? group : ''}
      </TableCell>
      <TableCell className="px-6 py-3 text-gray-700">{label}</TableCell>
      <TableCell className={`px-6 py-3 text-right font-medium ${isBold ? 'font-bold text-lg' : ''} ${colorClass}`}>
        {displayValue}
      </TableCell>
    </TableRow>
  );
}

function MobileCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${className}`}>
      <h3 className="mb-3 text-sm font-bold text-gray-900 border-b border-gray-50 pb-2">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

