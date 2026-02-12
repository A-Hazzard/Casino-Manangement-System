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

import DebugSection from '@/components/shared/debug/DebugSection';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import { DatePicker } from '@/components/shared/ui/date-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import VaultEndOfDayReportsSkeleton from '@/components/ui/skeletons/VaultEndOfDayReportsSkeleton';
import VaultManagerHeader from '@/components/VAULT/layout/VaultManagerHeader';
import {
  DEFAULT_CASHIER_FLOATS,
  DEFAULT_REPORT_DENOMINATIONS,
  DEFAULT_REPORT_SLOTS,
  DEFAULT_VAULT_BALANCE,
  DEFAULT_VAULT_METRICS,
} from '@/components/VAULT/overview/data/defaults';
import {
  calculateEndOfDayMetrics,
  fetchEndOfDayReportData,
} from '@/lib/helpers/vaultHelpers';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import type {
  CashierFloat,
  FloatRequest,
  VaultMetrics,
} from '@/shared/types/vault';
import { isSameDay } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  Monitor,
  RefreshCw,
  Users,
  Wallet
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function VaultEndOfDayReportsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const { user, hasActiveVaultShift } = useUserStore();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
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
      const data = await fetchEndOfDayReportData(locationId, selectedDate);
      setReportData(data);
    } catch (err) {
      console.error('Failed to fetch report data:', err);
      setError('Failed to load report data');
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh when report parameters change
  useEffect(() => {
    if (reportGenerated && user?.assignedLocations?.[0]) {
      fetchReportData();
    }
  }, [selectedDate, reportGenerated]); // eslint-disable-line react-hooks/exhaustive-deps

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

  /**
   * Handle CSV export
   */
  const handleExportCSV = () => {
    try {
      const data = [
        { Section: 'Daily Activity Summary', Metric: 'Total Inflows', Value: metrics.totalInflows },
        { Section: 'Daily Activity Summary', Metric: 'Total Outflows', Value: metrics.totalOutflows },
        { Section: 'Daily Activity Summary', Metric: 'Expenses', Value: metrics.totalExpenses },
        { Section: 'Daily Activity Summary', Metric: 'Player Payouts', Value: metrics.totalPayouts },
        { Section: 'Denomination Breakdown', Metric: 'Total Value', Value: metrics.totalDenominationValue },
        { Section: 'Location Breakdown', Metric: 'Vault Balance', Value: metrics.systemBalance },
        { Section: 'Location Breakdown', Metric: 'Machine Balance', Value: metrics.totalMachineBalance },
        { Section: 'Location Breakdown', Metric: 'Cash Desk Floats', Value: metrics.totalCashDeskFloat },
        { Section: 'Location Breakdown', Metric: 'Total on Premises', Value: metrics.totalOnPremises },
        { Section: 'Variance', Metric: 'System Balance', Value: metrics.systemBalance },
        { Section: 'Variance', Metric: 'Physical Count', Value: metrics.physicalCount },
        { Section: 'Variance', Metric: 'Discrepancy', Value: metrics.variance },
      ];

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'End of Day Report');
      XLSX.writeFile(workbook, `End_of_Day_Report_${new Date().toISOString().split('T')[0]}.csv`);
      toast.success('CSV exported successfully');
    } catch (error) {
      console.error('CSV export failed:', error);
      toast.error('Failed to export CSV');
    }
  };

  /**
   * Handle PDF export
   */
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text('End-of-Day Closing Report', 14, 22);
      
      doc.setFontSize(10);
      doc.text(`Location: ${user?.assignedLocations?.[0] || 'N/A'}`, 14, 30);
      doc.text(`Manager: ${user?.username || 'N/A'}`, 14, 35);
      doc.text(`Date: ${new Date().toLocaleString()}`, 14, 40);

      autoTable(doc, {
        startY: 50,
        head: [['Section', 'Metric', 'Value']],
        body: [
          ['Activity', 'Total Inflows', formatAmount(metrics.totalInflows)],
          ['Activity', 'Total Outflows', formatAmount(metrics.totalOutflows)],
          ['Activity', 'Expenses', formatAmount(metrics.totalExpenses)],
          ['Activity', 'Payouts', formatAmount(metrics.totalPayouts)],
          ['Locations', 'Vault', formatAmount(metrics.systemBalance)],
          ['Locations', 'Slot Machines', formatAmount(metrics.totalMachineBalance)],
          ['Locations', 'Cash Desks', formatAmount(metrics.totalCashDeskFloat)],
          ['Locations', 'Total on Premises', formatAmount(metrics.totalOnPremises)],
          ['Verification', 'System Balance', formatAmount(metrics.systemBalance)],
          ['Verification', 'Physical Count', formatAmount(metrics.physicalCount)],
          ['Verification', 'Variance', formatAmount(metrics.variance)],
        ],
      });

      doc.save(`End_of_Day_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export failed:', error);
      toast.error('Failed to export PDF');
    }
  };



  // ============================================================================
  // Render
  // ============================================================================
  
  // Only block access if the selected date is 'today' AND there is an active shift
  // Using isSameDay to check if selectedDate is today
  const isToday = selectedDate && isSameDay(selectedDate, new Date());
  
  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header - Always Visible */}
        <VaultManagerHeader
            title="End-of-Day Reports"
            description="Generate and export daily closing reports"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 whitespace-nowrap">Report Date:</span>
              <DatePicker 
                date={selectedDate} 
                setDate={(date) => {
                  setSelectedDate(date);
                  if (date) {
                    setReportGenerated(true);
                  }
                }} 
              />
            </div>
            
            {reportGenerated && !error && !(hasActiveVaultShift && isToday) && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleRefresh}
                  variant="outline"
                  size="sm"
                  title="Refresh Report"
                  className="h-8 w-8 p-0 border-gray-300 bg-white sm:w-auto sm:px-3"
                >
                  <RefreshCw className="h-3.5 w-3.5 sm:mr-2" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 border-gray-300 bg-white"
                    >
                      <Download className="h-3.5 w-3.5 sm:mr-2" />
                      <span className="hidden xs:inline sm:hidden">Export</span>
                      <span className="hidden sm:inline">Export Report</span>
                      <ChevronDown className="ml-1 h-3.5 w-3.5 text-gray-500" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleExportPDF}>
                      Export as PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSV}>
                      Export as CSV
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </VaultManagerHeader>

        {/* Content Area */}
        {(() => {
          // 1. Restricted Access for Today
          if (hasActiveVaultShift && isToday) {
            return (
              <div className="flex min-h-[50vh] items-center justify-center">
                <Card className="w-full max-w-md rounded-lg bg-container shadow-md">
                  <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orangeHighlight/10">
                      <AlertTriangle className="h-8 w-8 text-orangeHighlight" />
                    </div>
                    <h2 className="mb-2 text-xl font-bold text-gray-900">
                      Access Restricted for Today
                    </h2>
                    <p className="mb-6 text-sm text-gray-600">
                      The End-of-Day Report for today is only available after the vault shift has been closed.
                      <br/>
                      <span className="font-medium">You can select a past date from the picker above to view historical reports.</span>
                    </p>
                    <Button 
                      variant="outline" 
                      onClick={() => window.location.href = '/vault/management'}
                    >
                      Return to Dashboard
                    </Button>
                  </CardContent>
                </Card>
              </div>
            );
          }

          // 2. Not Generated Yet
          if (!reportGenerated) {
            return (
              <div className="flex min-h-[50vh] items-center justify-center">
                <Card className="w-full max-w-2xl rounded-lg bg-container shadow-md">
                  <CardContent className="flex flex-col items-center justify-center p-12 text-center">
                    <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
                      <FileText className="h-10 w-10 text-gray-600" />
                    </div>
                    <h2 className="mb-2 text-2xl font-semibold text-gray-900">
                      Generate End-of-Day Report
                    </h2>
                    <p className="mb-8 text-sm text-gray-600">
                      This will compile the closing float, slot machine counts,
                      and vault balance into a comprehensive report for the selected date.
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
            );
          }

          // 3. Loading
          if (loading) {
            return <VaultEndOfDayReportsSkeleton />;
          }

          // 4. Error
          if (error) {
            return (
              <div className="flex min-h-[50vh] flex-col items-center justify-center space-y-4">
                <div className="rounded-full bg-red-100 p-3">
                  <AlertTriangle className="h-10 w-10 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{error}</h2>
                <Button onClick={fetchReportData} variant="outline">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            );
          }

          // 5. Report Content
          return (
            <>

        {/* Summary Statistics */}
        <Card className="rounded-lg bg-container shadow-md border-t-4 border-orangeHighlight">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-gray-900">
                Summary Statistics
              </CardTitle>
              <div className="flex items-center gap-3">
                <DebugSection title="EOD Metrics" data={{ metrics, reportData }} />
                <div className="text-xs font-medium text-gray-400 uppercase">Real-time queried data</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 lg:grid-cols-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Total Managed</p>
                <p className="text-xl font-bold text-gray-900">{formatAmount(metrics.totalOnPremises)}</p>
                <p className="text-[10px] text-gray-400">Sum of Vault, Machines, Floats</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Net Flow</p>
                <p className={cn(
                  "text-xl font-bold",
                  (metrics.totalInflows - metrics.totalOutflows) >= 0 ? "text-button" : "text-red-600"
                )}>
                  {formatAmount(metrics.totalInflows - metrics.totalOutflows)}
                </p>
                <p className="text-[10px] text-gray-400">Total In - Total Out</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Expenses</p>
                <p className="text-xl font-bold text-red-600">{formatAmount(metrics.totalExpenses)}</p>
                <p className="text-[10px] text-gray-400">Current day expenses</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Payouts</p>
                <p className="text-xl font-bold text-lighterBlueHighlight">{formatAmount(metrics.totalPayouts)}</p>
                <p className="text-[10px] text-gray-400">Handpays & Redemptions</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Variance</p>
                <p className={cn(
                  "text-xl font-bold",
                  metrics.variance === 0 ? "text-button" : "text-orangeHighlight"
                )}>
                  {formatAmount(metrics.variance)}
                </p>
                <p className="text-[10px] text-gray-400">System vs Physical</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Requests</p>
                <p className="text-xl font-bold text-gray-900">{metrics.floatRequestsCount}</p>
                <p className="text-[10px] text-gray-400">Pending float approvals</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Breakdown */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Visual Distribution */}
          <Card className="rounded-lg bg-container shadow-md lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Visual Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-600">Vault</span>
                  <span className="font-bold text-gray-900">
                    {metrics.totalOnPremises > 0 
                      ? ((metrics.systemBalance / metrics.totalOnPremises) * 100).toFixed(1)
                      : '0.0'
                    }%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div 
                    className="h-full rounded-full bg-orangeHighlight" 
                    style={{ 
                      width: metrics.totalOnPremises > 0 
                        ? `${(metrics.systemBalance / metrics.totalOnPremises) * 100}%` 
                        : '0%'
                    }} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-600">Slot Machines</span>
                  <span className="font-bold text-gray-900">
                    {metrics.totalOnPremises > 0 
                      ? ((metrics.totalMachineBalance / metrics.totalOnPremises) * 100).toFixed(1)
                      : '0.0'
                    }%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div 
                    className="h-full rounded-full bg-lighterBlueHighlight" 
                    style={{ 
                      width: metrics.totalOnPremises > 0 
                        ? `${(metrics.totalMachineBalance / metrics.totalOnPremises) * 100}%` 
                        : '0%'
                    }} 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-600">Cashier Floats</span>
                  <span className="font-bold text-gray-900">
                    {metrics.totalOnPremises > 0 
                      ? ((metrics.totalCashDeskFloat / metrics.totalOnPremises) * 100).toFixed(1)
                      : '0.0'
                    }%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100">
                  <div 
                    className="h-full rounded-full bg-button" 
                    style={{ 
                      width: metrics.totalOnPremises > 0 
                        ? `${(metrics.totalCashDeskFloat / metrics.totalOnPremises) * 100}%` 
                        : '0%'
                    }} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Distribution Table */}
          <Card className="rounded-lg bg-container shadow-md lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Detailed Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead isFirstColumn>Point of Holding</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell isFirstColumn className="font-medium">Main Vault</TableCell>
                    <TableCell className="text-xs uppercase text-gray-500">Vault</TableCell>
                    <TableCell className="text-right font-bold text-orangeHighlight">{formatAmount(metrics.systemBalance)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell isFirstColumn className="font-medium">Slot Floor (Drops)</TableCell>
                    <TableCell className="text-xs uppercase text-gray-500">Machines</TableCell>
                    <TableCell className="text-right font-bold text-lighterBlueHighlight">{formatAmount(metrics.totalMachineBalance)}</TableCell>
                  </TableRow>
                  {reportData.cashierFloats.map((float: any) => (
                    <TableRow key={float._id}>
                      <TableCell isFirstColumn className="font-medium">{float.cashierName || 'Unknown Cashier'}</TableCell>
                      <TableCell className="text-xs uppercase text-gray-500">Cashier Float</TableCell>
                      <TableCell className="text-right font-bold text-button">{formatAmount(float.currentBalance || float.balance || 0)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50/50">
                    <TableCell isFirstColumn className="font-bold">Total On Premises</TableCell>
                    <TableCell />
                    <TableCell className="text-right font-bold text-orangeHighlight text-lg">{formatAmount(metrics.totalOnPremises)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

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
            </>
          );
        })()}
      </div>
    </PageLayout>
  );
}
