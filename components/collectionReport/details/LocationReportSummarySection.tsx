/**
 * LocationReportSummarySection Component
 *
 * Displays the header and summary metrics for a collection report.
 *
 * Features:
 * - Report title and metadata (status, timestamp, collector)
 * - Financial summary cards (Gross, Amount to Collect, etc.)
 * - Action buttons (Fix Report, Refresh)
 * - Issue alerts (SAS time issues, history issues)
 */

'use client';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ArrowLeft,
  RefreshCw,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import type { CollectionReportData } from '@/lib/types/api';
import { formatCurrency } from '@/lib/utils/currency';
import { getFinancialColorClass } from '@/lib/utils/financialColors';

type LocationReportSummarySectionProps = {
  reportData: CollectionReportData;
  reportId: string;
  hasSasTimeIssues: boolean;
  hasCollectionHistoryIssues: boolean;
  isFixingReport: boolean;
  onFixReportClick: () => void;
  onRefresh?: () => void;
};

export default function LocationReportSummarySection({
  reportData,
  reportId,
  hasSasTimeIssues,
  hasCollectionHistoryIssues,
  isFixingReport,
  onFixReportClick,
  onRefresh,
}: LocationReportSummarySectionProps) {
  const { locationName, collectionDate, isEditing } = reportData;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/collection-report">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {locationName || 'Collection Report'}
            </h1>
            <p className="text-sm text-gray-500">
              ID: {reportId} | {collectionDate ? new Date(collectionDate).toLocaleString() : 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Issue Warnings */}
          {(hasSasTimeIssues || hasCollectionHistoryIssues) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-2"
                    onClick={onFixReportClick}
                    disabled={isFixingReport}
                  >
                    <Zap className={`h-4 w-4 ${isFixingReport ? 'animate-pulse' : ''}`} />
                    {isFixingReport ? 'Fixing...' : 'Fix Issues'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Click to resolve detected collection history or SAS time issues</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Total Machine Gross"
          value={reportData.locationMetrics?.metersGross || 0}
          isCurrency
        />
        <Card
          title="Total SAS Gross"
          value={reportData.locationMetrics?.sasGross || 0}
          isCurrency
        />
        <Card
          title="Amount to Collect"
          value={Number(reportData.locationMetrics?.amountToCollect) || 0}
          isCurrency
        />
        <Card
          title="Status"
          value={isEditing ? 'Editing' : 'Finalized'}
          className={isEditing ? 'text-orange-600' : 'text-green-600'}
        />
      </div>
    </div>
  );
}

function Card({ 
  title, 
  value, 
  isCurrency = false, 
  className = '' 
}: { 
  title: string; 
  value: string | number; 
  isCurrency?: boolean;
  className?: string;
}) {
  const displayValue = isCurrency ? formatCurrency(Number(value)) : value;
  const colorClass = isCurrency ? getFinancialColorClass(Number(value)) : className;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md">
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
      <p className={`mt-2 text-2xl font-bold ${colorClass}`}>
        {displayValue}
      </p>
    </div>
  );
}

