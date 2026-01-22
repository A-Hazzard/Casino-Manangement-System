/**
 * Vault End-of-Day Reports Page Content Component
 *
 * End-of-Day Reports page for the Vault Management application.
 *
 * Features:
 * - Generate Report button
 * - Daily Activity Summary
 * - Closing Float - Denomination Breakdown
 * - Closing Slot Count
 * - Cash Desk Closing Floats
 * - Vault Closing Balance
 *
 * @module components/VAULT/pages/VaultEndOfDayReportsPageContent
 */
'use client';

import { useState } from 'react';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shared/ui/card';
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
import { mockCashierFloats, mockVaultBalance } from '@/components/VAULT/overview/data/mockData';
import type { CashierFloat } from '@/shared/types/vault';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Mock data for end-of-day report
const mockDenominationBreakdown = [
  { denomination: '$100', count: 850, totalValue: 85000 },
  { denomination: '$50', count: 200, totalValue: 10000 },
  { denomination: '$20', count: 150, totalValue: 3000 },
  { denomination: '$10', count: 100, totalValue: 1000 },
  { denomination: '$5', count: 200, totalValue: 1000 },
  { denomination: '$1', count: 1000, totalValue: 1000 },
];

const mockSlotCounts = [
  { machineId: 'SM-001', location: 'Slot Section A', closingCount: 12500 },
  { machineId: 'SM-002', location: 'Slot Section B', closingCount: 15800 },
  { machineId: 'SM-003', location: 'Slot Section C', closingCount: 9800 },
  { machineId: 'SM-004', location: 'VIP Slots', closingCount: 6900 },
];

const totalDenominationValue = mockDenominationBreakdown.reduce(
  (sum, d) => sum + d.totalValue,
  0
);
const totalDenominationCount = mockDenominationBreakdown.reduce(
  (sum, d) => sum + d.count,
  0
);
const totalMachineBalance = mockSlotCounts.reduce(
  (sum, m) => sum + m.closingCount,
  0
);
const totalCashDeskFloat = mockCashierFloats.reduce(
  (sum: number, f: CashierFloat) => sum + f.currentFloat,
  0
);

const systemBalance = mockVaultBalance.balance;
const physicalCount = totalDenominationValue;
const variance = systemBalance - physicalCount;
const totalOnPremises = systemBalance + totalMachineBalance + totalCashDeskFloat;

export default function VaultEndOfDayReportsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const [reportGenerated, setReportGenerated] = useState(false);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handle generate report action
   * Sets reportGenerated state to true and shows success message
   */
  const handleGenerateReport = () => {
    setReportGenerated(true);
    toast.success('Report generated successfully');
  };

  /**
   * Handle PDF export action
   * Placeholder for future export functionality
   */
  const handleExportPDF = () => {
    toast.info('PDF export will be implemented');
  };

  /**
   * Handle CSV export action
   * Placeholder for future export functionality
   */
  const handleExportCSV = () => {
    toast.info('CSV export will be implemented');
  };

  /**
   * Handle print action
   * Placeholder for future print functionality
   */
  const handlePrint = () => {
    toast.info('Print functionality will be implemented');
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
                This will compile today's closing float, slot machine counts, and vault
                balance into a comprehensive report.
              </p>
              <Button
                onClick={handleGenerateReport}
                className="bg-orangeHighlight text-white hover:bg-orangeHighlight/90"
                size="lg"
              >
                <Calendar className="mr-2 h-5 w-5" />
                Generate Report
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            End-of-Day Reports
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Generate and export daily closing reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-button text-white hover:bg-button/90">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Report Generated Successfully
          </Badge>
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
              <p className="text-sm font-medium text-gray-600">Total Inflows</p>
              <p className="mt-1 text-xl font-bold text-button">+$37,500</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Outflows</p>
              <p className="mt-1 text-xl font-bold text-red-600">-$15,000</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Expenses</p>
              <p className="mt-1 text-xl font-bold text-red-600">-$0</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Player Payouts</p>
              <p className="mt-1 text-xl font-bold text-lighterBlueHighlight">
                $5,085
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Float Requests</p>
              <p className="mt-1 text-xl font-bold text-gray-900">2</p>
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
              {mockDenominationBreakdown.map(denom => (
                <TableRow key={denom.denomination}>
                  <TableCell isFirstColumn className="font-medium">
                    {denom.denomination}
                  </TableCell>
                  <TableCell>{denom.count.toLocaleString()}</TableCell>
                  <TableCell className="font-semibold text-lighterBlueHighlight">
                    {formatAmount(denom.totalValue)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gray-50 font-semibold">
                <TableCell isFirstColumn>Total</TableCell>
                <TableCell>{totalDenominationCount.toLocaleString()}</TableCell>
                <TableCell className="text-lighterBlueHighlight">
                  {formatAmount(totalDenominationValue)}
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
              {mockSlotCounts.map(slot => (
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
                  {formatAmount(totalMachineBalance)}
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
                <TableHead>Station</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Closing Float</TableHead>
                <TableHead>End-of-day Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockCashierFloats.map((float: { id: string; cashier: string; station: string; currentFloat: number; status: string }) => (
                <TableRow key={float.id}>
                  <TableCell isFirstColumn className="font-medium">
                    {float.cashier}
                  </TableCell>
                  <TableCell>{float.station}</TableCell>
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
                      float.status === 'active' ? 'text-button' : 'text-gray-600'
                    )}
                  >
                    {formatAmount(float.currentFloat)}
                  </TableCell>
                  <TableCell className="font-semibold text-gray-900">
                    {formatAmount(float.currentFloat)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-gray-50 font-semibold">
                <TableCell isFirstColumn>Total Cash Desk Float</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-button">
                  {formatAmount(totalCashDeskFloat)}
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
              <p className="text-sm font-medium text-gray-600">System Balance</p>
              <p className="mt-1 break-words text-xl font-bold text-orangeHighlight sm:text-2xl">
                {formatAmount(systemBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Physical Count</p>
              <p className="mt-1 break-words text-xl font-bold text-gray-900 sm:text-2xl">
                {formatAmount(physicalCount)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Variance</p>
              <p className="mt-1 break-words text-xl font-bold text-orangeHighlight sm:text-2xl">
                {variance >= 0 ? '+' : ''}
                {formatAmount(variance)}
              </p>
            </div>
          </div>

          {/* Variance Alert */}
          {Math.abs(variance) > 0 && (
            <div className="rounded-lg border border-orangeHighlight bg-orangeHighlight/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orangeHighlight" />
                <div>
                  <p className="font-semibold text-orangeHighlight">
                    Variance Detected
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    Physical count differs from system balance. Please verify and
                    reconcile.
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
                {formatAmount(systemBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Machines</p>
              <p className="mt-1 text-xl font-bold text-lighterBlueHighlight">
                {formatAmount(totalMachineBalance)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Cash Desks</p>
              <p className="mt-1 text-xl font-bold text-button">
                {formatAmount(totalCashDeskFloat)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total on Premises</p>
              <p className="mt-1 text-xl font-bold text-orangeHighlight">
                {formatAmount(totalOnPremises)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </PageLayout>
  );
}
