/**
 * Vault Cash on Premises Page Content Component
 *
 * Cash on Premises report page for the Vault Management application.
 *
 * Features:
 * - Total Cash on Premises card with progress bar
 * - Summary metric cards (Vault Balance, Machine Balance, Cash Desk Floats)
 * - Location Breakdown table
 * - Summary Statistics
 *
 * @module components/VAULT/pages/VaultCashOnPremisesPageContent
 */
'use client';

import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { mockCashierFloats } from '@/components/VAULT/overview/data/mockData';
import { RefreshCw, Download, Printer, Wallet, Monitor, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Mock data for cash on premises
const mockLocationBreakdown = [
  {
    id: '1',
    location: 'Main Vault',
    type: 'Vault',
    balance: 125000,
    percentOfTotal: 64.2,
  },
  {
    id: '2',
    location: 'Slot Machines',
    type: 'Machines',
    balance: 45000,
    percentOfTotal: 23.1,
  },
  {
    id: '3',
    location: 'Sarah Johnson',
    type: 'Cash Desk - Desk 1',
    balance: 8500,
    percentOfTotal: 4.4,
  },
  {
    id: '4',
    location: 'Mike Chen',
    type: 'Cash Desk - Desk 2',
    balance: 7200,
    percentOfTotal: 3.7,
  },
  {
    id: '5',
    location: 'Emma Wilson',
    type: 'Cash Desk - Desk 3',
    balance: 9100,
    percentOfTotal: 4.7,
  },
];

const totalCashOnPremises = 194800;
const limit = 250000;
const utilization = (totalCashOnPremises / limit) * 100;
const vaultBalance = 125000;
const machineBalance = 45000;
const cashDeskFloats = mockCashierFloats.reduce((sum: number, f: { currentFloat: number }) => sum + f.currentFloat, 0);
const activeCashDesks = mockCashierFloats.filter((f: { status: string }) => f.status === 'active').length;
const avgDeskFloat = cashDeskFloats / activeCashDesks;
const availableHeadroom = limit - totalCashOnPremises;

export default function VaultCashOnPremisesPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handle refresh data action
   * Placeholder for future API integration
   */
  const handleRefresh = () => {
    toast.success('Data refreshed');
  };

  /**
   * Handle CSV export action
   * Placeholder for future export functionality
   */
  const handleExportCSV = () => {
    toast.info('CSV export will be implemented');
  };

  /**
   * Handle PDF export action
   * Placeholder for future export functionality
   */
  const handleExportPDF = () => {
    toast.info('PDF export will be implemented');
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Cash on Premises</h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor total cash across all locations
          </p>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="border-gray-300"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            onClick={handleExportPDF}
            variant="outline"
            size="sm"
            className="border-gray-300"
          >
            <Printer className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Total Cash on Premises Card */}
      <Card className="rounded-lg bg-container shadow-md">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Wallet className="h-6 w-6 text-orangeHighlight" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Total Cash on Premises
                </h2>
              </div>
              <p className="mt-2 break-words text-2xl font-bold text-orangeHighlight sm:text-3xl md:text-4xl">
                {formatAmount(totalCashOnPremises)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                of {formatAmount(limit)} limit
              </p>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-gray-600">Utilization</span>
                  <span className="font-semibold text-button">
                    {utilization.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-button transition-all"
                    style={{ width: `${utilization}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-orangeHighlight" />
                  <p className="text-sm font-medium text-gray-600">Vault Balance</p>
                </div>
                <p className="mt-2 break-words text-xl font-bold text-orangeHighlight sm:text-2xl">
                  {formatAmount(vaultBalance)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {((vaultBalance / totalCashOnPremises) * 100).toFixed(1)}% of total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-button" />
                  <p className="text-sm font-medium text-gray-600">Machine Balance</p>
                </div>
                <p className="mt-2 break-words text-xl font-bold text-button sm:text-2xl">
                  {formatAmount(machineBalance)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {((machineBalance / totalCashOnPremises) * 100).toFixed(1)}% of total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-lighterBlueHighlight" />
                  <p className="text-sm font-medium text-gray-600">Cash Desk Floats</p>
                </div>
                <p className="mt-2 break-words text-xl font-bold text-lighterBlueHighlight sm:text-2xl">
                  {formatAmount(cashDeskFloats)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {((cashDeskFloats / totalCashOnPremises) * 100).toFixed(1)}% of total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Breakdown Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Location Breakdown</h2>
        <div className="rounded-lg bg-container shadow-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead isFirstColumn>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>% of Total</TableHead>
                <TableHead>Visual</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockLocationBreakdown.map(location => (
                <TableRow key={location.id}>
                  <TableCell isFirstColumn className="font-medium">
                    {location.location}
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {location.type}
                  </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'font-semibold',
                        location.type === 'Vault'
                          ? 'text-orangeHighlight'
                          : location.type === 'Machines'
                            ? 'text-button'
                            : 'text-orangeHighlight'
                      )}
                    >
                      {formatAmount(location.balance)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {location.percentOfTotal.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-button transition-all"
                        style={{ width: `${location.percentOfTotal}%` }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Summary Statistics</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="rounded-lg bg-container shadow-md">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-gray-600">
                Locations Tracked
              </p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {mockLocationBreakdown.length}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-lg bg-container shadow-md">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-gray-600">Active Cash Desks</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {activeCashDesks}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-lg bg-container shadow-md">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-gray-600">Avg. Desk Float</p>
              <p className="mt-1 break-words text-xl font-bold text-button sm:text-2xl">
                {formatAmount(avgDeskFloat)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-lg bg-container shadow-md">
            <CardContent className="p-4">
              <p className="text-sm font-medium text-gray-600">Available Headroom</p>
              <p className="mt-1 break-words text-xl font-bold text-button sm:text-2xl">
                {formatAmount(availableHeadroom)}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </PageLayout>
  );
}
