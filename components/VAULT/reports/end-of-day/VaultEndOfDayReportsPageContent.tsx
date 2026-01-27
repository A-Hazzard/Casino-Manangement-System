/**
 * Vault End-of-Day Reports Page Content Component
 *
 * End-of-Day Reports page for the Vault Management application.
 *
 * Features:
 * - Generate Report button
 * - Daily Activity Summary (Real-time queried data)
 * - Closing Float - Denomination Breakdown
 * - Closing Slot Count
 * - Cash Desk Closing Floats
 * - Vault Closing Balance
 *
 * @module components/VAULT/reports/end-of-day/VaultEndOfDayReportsPageContent
 */

'use client';

import { useState } from 'react';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { Badge } from '@/components/shared/ui/badge';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import type {
  CashierFloat,
  FloatRequest,
  VaultMetrics,
} from '@/shared/types/vault';
import {
  Calendar,
  Download,
  FileText,
  Printer,
  Wallet,
  Monitor,
  Users,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DEFAULT_REPORT_DENOMINATIONS,
  DEFAULT_REPORT_SLOTS,
  DEFAULT_CASHIER_FLOATS,
  DEFAULT_VAULT_BALANCE,
  DEFAULT_VAULT_METRICS,
} from '@/components/VAULT/overview/data/defaults';
import {
  fetchEndOfDayReportData,
  calculateEndOfDayMetrics,
  handleExportPDF,
  handleExportCSV,
  handlePrint,
} from '@/lib/helpers/vaultHelpers';
import VaultEndOfDayReportsSkeleton from '@/components/ui/skeletons/VaultEndOfDayReportsSkeleton';

export default function VaultEndOfDayReportsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const { user } = useUserStore();
  const [reportGenerated, setReportGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<{
    denominationBreakdown: Record<string, number>;
    slotCounts: typeof DEFAULT_REPORT_SLOTS;
    cashierFloats: CashierFloat[];
    vaultBalance: typeof DEFAULT_VAULT_BALANCE;
    floatRequests: FloatRequest[];
    metrics: VaultMetrics | null;
  }>({
    denominationBreakdown: {},
    slotCounts: DEFAULT_REPORT_SLOTS,
    cashierFloats: DEFAULT_CASHIER_FLOATS,
    vaultBalance: DEFAULT_VAULT_BALANCE,
    floatRequests: [],
    metrics: DEFAULT_VAULT_METRICS,
  });

  // ============================================================================
  // Data Fetching
  // ============================================================================
  const fetchReportData = async () => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) {
      setError('No location assigned');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchEndOfDayReportData(locationId);
      setReportData(data);
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      setError('Failed to load report data');
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // Computed Values
  // ============================================================================
  const metrics = calculateEndOfDayMetrics(reportData);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handle generate report action
   */
  const handleGenerateReport = async () => {
    setReportGenerated(true);
    await fetchReportData();
  };

  /**
   * Handle refresh action
   */
  const handleRefresh = async () => {
    await fetchReportData();
    toast.success('Report data refreshed');
  };

  // ============================================================================
  // Render
  // ============================================================================
  if (!reportGenerated) {
    return (
      <PageLayout showHeader={false}>
        <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
          <Card className="w-full max-w-2xl rounded-lg bg-container shadow-md">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                <FileText className="h-10 w-10 text-gray-600" />
              </div>
              <h2 className="mb-2 text-2xl font-semibold text-gray-900">
                Generate End-of-Day Report
              </h2>
              <p className="mb-8 text-sm text-gray-600">
                This will compile today's closing float, slot machine counts,
                and vault balance into a comprehensive report.
              </p>
              <Button
                onClick={handleGenerateReport}
                disabled={loading}
                className="bg-orangeHighlight text-white hover:bg-orangeHighlight/90"
                size="lg"
              >
                <Calendar className="mr-2 h-5 w-5" />
                {loading ? 'Generating...' : 'Generate Report'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  if (loading) {
    return <VaultEndOfDayReportsSkeleton />;
  }

  if (error) {
    return (
      <PageLayout showHeader={false}>
        <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center space-y-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{error}</h2>
          <Button onClick={fetchReportData} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              End-of-Day Reports
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Generate and export daily closing reports
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-button text-white hover:bg-button/90">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Report Generated
            </Badge>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="border-gray-300"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button
              onClick={handleExportPDF}
              variant="outline"
              size="sm"
              className="border-gray-300"
            >
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              size="sm"
              className="border-gray-300"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="border-gray-300"
            >
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Daily Activity Summary */}
        <Card className="rounded-lg bg-container shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Daily Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Inflows
                </p>
                <p className="mt-1 text-xl font-bold text-button">
                  +{formatAmount(metrics.totalInflows)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Outflows
                </p>
                <p className="mt-1 text-xl font-bold text-red-600">
                  -{formatAmount(metrics.totalOutflows)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Expenses</p>
                <p className="mt-1 text-xl font-bold text-red-600">
                  -{formatAmount(metrics.totalExpenses)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Player Payouts
                </p>
                <p className="mt-1 text-xl font-bold text-lighterBlueHighlight">
                  {formatAmount(metrics.totalPayouts)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Float Requests
                </p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {metrics.floatRequestsCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Closing Float - Denomination Breakdown */}
        <Card className="rounded-lg bg-container shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg font-semibold text-gray-900">
                Closing Float - Denomination Breakdown
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead isFirstColumn>Denomination</TableHead>
                  <TableHead>Count</TableHead>
                  <TableHead>Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {DEFAULT_REPORT_DENOMINATIONS.map(d => {
                  const denomKey = d.denomination.replace('$', '');
                  const count = reportData.denominationBreakdown[denomKey] || 0;
                  const totalValue = count * Number(denomKey);

                  return (
                    <TableRow key={d.denomination}>
                      <TableCell isFirstColumn className="font-medium">
                        {d.denomination}
                      </TableCell>
                      <TableCell>{count.toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-lighterBlueHighlight">
                        {formatAmount(totalValue)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell isFirstColumn>Total</TableCell>
                  <TableCell>
                    {metrics.totalDenominationCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-lighterBlueHighlight">
                    {formatAmount(metrics.totalDenominationValue)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Closing Slot Count */}
        <Card className="rounded-lg bg-container shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg font-semibold text-gray-900">
                Closing Slot Count
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead isFirstColumn>Machine ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Closing Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.slotCounts.map(slot => (
                  <TableRow key={slot.machineId}>
                    <TableCell isFirstColumn className="font-medium">
                      {slot.machineId}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {slot.location}
                    </TableCell>
                    <TableCell className="font-semibold text-button">
                      {formatAmount(slot.closingCount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell isFirstColumn>Total Machine Balance</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-button">
                    {formatAmount(metrics.totalMachineBalance)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Cash Desk Closing Floats */}
        <Card className="rounded-lg bg-container shadow-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-600" />
              <CardTitle className="text-lg font-semibold text-gray-900">
                Cash Desk Closing Floats
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead isFirstColumn>Cashier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Closing Float</TableHead>
                  <TableHead>End-of-day Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.cashierFloats.map(float => (
                  <TableRow key={float._id}>
                    <TableCell isFirstColumn className="font-medium">
                      {float.cashierName}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          'px-2 py-1',
                          float.status === 'active'
                            ? 'bg-orangeHighlight text-white hover:bg-orangeHighlight/90'
                            : 'bg-lighterBlueHighlight text-white hover:bg-lighterBlueHighlight/90'
                        )}
                      >
                        {float.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        'font-semibold',
                        float.status === 'active'
                          ? 'text-button'
                          : 'text-gray-600'
                      )}
                    >
                      {formatAmount(float.balance)}
                    </TableCell>
                    <TableCell className="font-semibold text-gray-900">
                      {formatAmount(float.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-gray-50 font-semibold">
                  <TableCell isFirstColumn>Total Cash Desk Float</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-button">
                    {formatAmount(metrics.totalCashDeskFloat)}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Vault Closing Balance */}
        <Card className="rounded-lg bg-container shadow-md">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Vault Closing Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary Metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  System Balance
                </p>
                <p className="mt-1 break-words text-xl font-bold text-orangeHighlight sm:text-2xl">
                  {formatAmount(metrics.systemBalance)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Physical Count
                </p>
                <p className="mt-1 break-words text-xl font-bold text-gray-900 sm:text-2xl">
                  {formatAmount(metrics.physicalCount)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Variance</p>
                <p className="mt-1 break-words text-xl font-bold text-orangeHighlight sm:text-2xl">
                  {metrics.variance >= 0 ? '+' : ''}
                  {formatAmount(metrics.variance)}
                </p>
              </div>
            </div>

            {/* Variance Alert */}
            {Math.abs(metrics.variance) > 0 && (
              <div className="rounded-lg border border-orangeHighlight bg-orangeHighlight/10 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orangeHighlight" />
                  <div>
                    <p className="font-semibold text-orangeHighlight">
                      Variance Detected
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      Physical count differs from system balance. Please verify
                      and reconcile.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Balance Breakdown */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Vault</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {formatAmount(metrics.systemBalance)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Machines</p>
                <p className="mt-1 text-xl font-bold text-lighterBlueHighlight">
                  {formatAmount(metrics.totalMachineBalance)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Cash Desks</p>
                <p className="mt-1 text-xl font-bold text-button">
                  {formatAmount(metrics.totalCashDeskFloat)}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total on Premises
                </p>
                <p className="mt-1 text-xl font-bold text-orangeHighlight">
                  {formatAmount(metrics.totalOnPremises)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
