/**
 * Vault Cash on Premises Page Content Component
 *
 * Cash on Premises report page for Vault Management application.
 *
 * Features:
 * - Total Cash on Premises card with progress bar
 * - Summary metric cards (Vault Balance, Machine Balance, Cash Desk Floats)
 * - Location Breakdown table
 * - Summary Statistics (Real-time queried data)
 *
 * @module components/VAULT/reports/cash-on-premises/VaultCashOnPremisesPageContent
 */

'use client';

import { useState, useEffect } from 'react';
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
import { useUserStore } from '@/lib/store/userStore';
import {
  RefreshCw,
  Download,
  Printer,
  Wallet,
  Monitor,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CashierFloat } from '@/shared/types/vault';
import {
  DEFAULT_CASHIER_FLOATS,
  DEFAULT_VAULT_BALANCE,
} from '@/components/VAULT/overview/data/defaults';
import {
  fetchCashOnPremisesData,
  fetchLocationDetails,
} from '@/lib/helpers/vaultHelpers';
import VaultCashOnPremisesSkeleton from '@/components/ui/skeletons/VaultCashOnPremisesSkeleton';

export default function VaultCashOnPremisesPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultBalance, setVaultBalance] = useState(DEFAULT_VAULT_BALANCE);
  const [cashierFloats, setCashierFloats] = useState<CashierFloat[]>(
    DEFAULT_CASHIER_FLOATS
  );
  const [locationLimit, setLocationLimit] = useState(0); // Default fallback to 0

  // Constants
  const machineBalance = 0; // Placeholder for meters API
  const cashDeskFloatsTotal = cashierFloats.reduce(
    (sum: number, f: CashierFloat) => sum + (f.balance || 0),
    0
  );
  const activeCashDesks = cashierFloats.filter(
    (f: CashierFloat) => f.status === 'active'
  ).length;
  const avgDeskFloat =
    activeCashDesks > 0 ? cashDeskFloatsTotal / activeCashDesks : 0;

  // Real calculation for total cash on premises
  const totalOnPremises =
    (vaultBalance?.balance || 0) + machineBalance + cashDeskFloatsTotal;
  const availableHeadroom = Math.max(0, (locationLimit || 0) - totalOnPremises);
  const utilization =
    totalOnPremises > 0 && locationLimit > 0
      ? (totalOnPremises / locationLimit) * 100
      : 0;

  // ============================================================================
  // Data Fetching
  // ============================================================================
  const fetchCashData = async () => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) {
      setError('No location assigned');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [cashData, locDetails] = await Promise.all([
        fetchCashOnPremisesData(locationId),
        fetchLocationDetails(locationId),
      ]);

      if (cashData) {
        setVaultBalance(cashData.vaultBalance);
        setCashierFloats(cashData.cashierFloats);
      }

      if (locDetails?.locationMembershipSettings?.locationLimit) {
        setLocationLimit(locDetails.locationMembershipSettings.locationLimit);
      } else {
        setLocationLimit(0);
      }
    } catch (err) {
      console.error('Failed to fetch cash data:', err);
      setError('Failed to load cash data');
      toast.error('Failed to load cash monitoring data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchCashData();
  }, [user?.assignedLocations]);

  // Create location breakdown data
  const locationBreakdown = [
    {
      id: 'vault',
      location: 'Main Vault',
      type: 'Vault' as const,
      balance: vaultBalance.balance,
      percentOfTotal:
        totalOnPremises > 0
          ? (vaultBalance.balance / totalOnPremises) * 100
          : 0,
    },
    {
      id: 'machines',
      location: 'Slot Machines',
      type: 'Machines' as const,
      balance: machineBalance,
      percentOfTotal:
        totalOnPremises > 0 ? (machineBalance / totalOnPremises) * 100 : 0,
    },
    ...cashierFloats.map((float, index) => ({
      id: `cashier-${float._id || index}`,
      location: float.cashierName,
      type: `Cash Desk - Desk ${index + 1}` as const,
      balance: float.balance,
      percentOfTotal:
        totalOnPremises > 0 ? (float.balance / totalOnPremises) * 100 : 0,
    })),
  ].filter(item => item.balance > 0);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handle refresh data action
   */
  const handleRefresh = () => {
    fetchCashData();
    toast.success('Data refreshed');
  };

  /**
   * Handle CSV export action
   */
  const handleExportCSV = () => {
    toast.info('CSV export will be implemented');
  };

  /**
   * Handle PDF export action
   */
  const handleExportPDF = () => {
    toast.info('PDF export will be implemented');
  };

  // ============================================================================
  // Render
  // ============================================================================
  if (loading) {
    return <VaultCashOnPremisesSkeleton />;
  }

  if (error) {
    return (
      <PageLayout showHeader={false}>
        <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center space-y-4">
          <div className="rounded-full bg-red-100 p-3">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">{error}</h2>
          <Button onClick={fetchCashData} variant="outline">
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
              Cash on Premises
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Monitor total cash across all locations
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-gray-300"
            >
              <RefreshCw
                className={cn('mr-2 h-4 w-4', loading && 'animate-spin')}
              />
              {loading ? 'Refreshing...' : 'Refresh'}
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
                  {formatAmount(totalOnPremises)}
                </p>
                <p className="mt-1 text-sm text-gray-600">
                  of {formatAmount(locationLimit)} limit
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
                    <p className="text-sm font-medium text-gray-600">
                      Vault Balance
                    </p>
                  </div>
                  <p className="mt-2 break-words text-xl font-bold text-orangeHighlight sm:text-2xl">
                    {formatAmount(vaultBalance.balance)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {totalOnPremises > 0
                      ? (
                          (vaultBalance.balance / totalOnPremises) *
                          100
                        ).toFixed(1)
                      : '0.0'}
                    % of total
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
                    <p className="text-sm font-medium text-gray-600">
                      Machine Balance
                    </p>
                  </div>
                  <p className="mt-2 break-words text-xl font-bold text-button sm:text-2xl">
                    {formatAmount(machineBalance)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {totalOnPremises > 0
                      ? ((machineBalance / totalOnPremises) * 100).toFixed(1)
                      : '0.0'}
                    % of total
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
                    <p className="text-sm font-medium text-gray-600">
                      Cash Desk Floats
                    </p>
                  </div>
                  <p className="mt-2 break-words text-xl font-bold text-lighterBlueHighlight sm:text-2xl">
                    {formatAmount(cashDeskFloatsTotal)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {totalOnPremises > 0
                      ? ((cashDeskFloatsTotal / totalOnPremises) * 100).toFixed(
                          1
                        )
                      : '0.0'}
                    % of total
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Location Breakdown Table */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Location Breakdown
          </h2>
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
                {locationBreakdown.map(location => (
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
                {locationBreakdown.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-gray-500"
                    >
                      No cash data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Summary Statistics
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="rounded-lg bg-container shadow-md">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-600">
                  Locations Tracked
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {locationBreakdown.length}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-lg bg-container shadow-md">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-600">
                  Active Cash Desks
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900">
                  {activeCashDesks}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-lg bg-container shadow-md">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-600">
                  Avg. Desk Float
                </p>
                <p className="mt-1 break-words text-xl font-bold text-button sm:text-2xl">
                  {formatAmount(avgDeskFloat)}
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-lg bg-container shadow-md">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-600">
                  Available Headroom
                </p>
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
