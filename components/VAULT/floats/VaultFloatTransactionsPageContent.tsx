/**
 * Vault Float Transactions Page Content Component
 *
 * Float management page for the Vault Management application.
 *
 * Features:
 * - Summary metrics cards
 * - Issue Float and Receive Float action buttons
 * - Current Cashier Floats table
 * - Float Transaction History table with pagination
 *
 * @module components/VAULT/pages/VaultFloatTransactionsPageContent
 */
'use client';

import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import VaultFloatTransactionsSkeleton from '@/components/ui/skeletons/VaultFloatTransactionsSkeleton';
import {
    DEFAULT_CASHIER_FLOATS,
    DEFAULT_VAULT_BALANCE,
} from '@/components/VAULT/overview/data/defaults';
import {
    fetchFloatTransactionsData,
    handleApproveFloatTransaction,
    handleRejectFloatTransaction,
} from '@/lib/helpers/vaultHelpers';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import { useUserStore } from '@/lib/store/userStore';
import { cn } from '@/lib/utils';
import type { CashierFloat } from '@/shared/types/vault';
import { AlertTriangle, RefreshCw, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import VaultCashierFloatsMobileCards from './cards/VaultCashierFloatsMobileCards';
import VaultFloatTransactionsMobileCards from './cards/VaultFloatTransactionsMobileCards';
import type { CashierFloatSortOption } from './tables/VaultCashierFloatsTable';
import VaultCashierFloatsTable from './tables/VaultCashierFloatsTable';
import type { FloatTransactionSortOption } from './tables/VaultFloatTransactionsTable';
import VaultFloatTransactionsTable from './tables/VaultFloatTransactionsTable';

export default function VaultFloatTransactionsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floatSortOption, setFloatSortOption] =
    useState<CashierFloatSortOption>('cashierName');
  const [floatSortOrder, setFloatSortOrder] = useState<'asc' | 'desc'>('asc');
  const [transactionSortOption, setTransactionSortOption] =
    useState<FloatTransactionSortOption>('timestamp');
  const [transactionSortOrder, setTransactionSortOrder] = useState<
    'asc' | 'desc'
  >('desc');

  const [cashierFloats, setCashierFloats] = useState<CashierFloat[]>(
    DEFAULT_CASHIER_FLOATS
  );
  const [floatTransactions, setFloatTransactions] = useState<any[]>([]);
  const [vaultBalance, setVaultBalance] = useState(DEFAULT_VAULT_BALANCE);
  const [floatRequests, setFloatRequests] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // ============================================================================
  // Data Fetching
  // ============================================================================
  const fetchData = async () => {
    const locationId = user?.assignedLocations?.[0];
    if (!locationId) {
      setError('No location assigned');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchFloatTransactionsData(
        locationId,
        currentPage + 1,
        20
      );
      setCashierFloats(data.cashierFloats);
      setVaultBalance(data.vaultBalance);
      setFloatTransactions(data.floatTransactions);
      setFloatRequests(data.floatRequests);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to fetch float data:', error);
      setError('Failed to load float data');
      toast.error('Failed to load float data');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, [user?.assignedLocations, currentPage]);

  // ============================================================================
  // Computed Values
  // ============================================================================
  /**
   * Sum of all cashier float amounts
   */
  const totalCashierFloat = useMemo(
    () => cashierFloats.reduce((sum, float) => sum + (float.balance || 0), 0),
    [cashierFloats]
  );

  /**
   * Count of active cashiers
   */
  const activeCashiers = useMemo(
    () => cashierFloats.filter(f => f.status === 'active').length,
    [cashierFloats]
  );

  /**
   * Count of pending float transaction requests
   */
  const pendingRequests = floatRequests.length;

  /**
   * Sort cashier floats based on sort option and order
   */
  const sortedCashierFloats = useMemo(() => {
    const sorted = [...cashierFloats].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (floatSortOption) {
        case 'cashierName':
          aValue = (a.cashierName || '').toLowerCase();
          bValue = (b.cashierName || '').toLowerCase();
          break;
        case 'balance':
          aValue = a.balance;
          bValue = b.balance;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return floatSortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return floatSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [cashierFloats, floatSortOption, floatSortOrder]);

  /**
   * Sort float transactions based on sort option and order
   */
  const sortedFloatTransactions = useMemo(() => {
    const sorted = [...floatTransactions].sort((a, b) => {
      let aValue: string | number | boolean;
      let bValue: string | number | boolean;

      switch (transactionSortOption) {
        case 'timestamp':
          aValue = new Date(a.timestamp).getTime();
          bValue = new Date(b.timestamp).getTime();
          break;
        case 'performedByName':
          aValue = (a.performedByName || '').toLowerCase();
          bValue = (b.performedByName || '').toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'notes':
          aValue = (a.notes || '').toLowerCase();
          bValue = (b.notes || '').toLowerCase();
          break;
        case 'isVoid':
          aValue = a.isVoid;
          bValue = b.isVoid;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return transactionSortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return transactionSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [floatTransactions, transactionSortOption, transactionSortOrder]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handle refresh data
   */
  const handleRefresh = () => {
    fetchData();
    toast.success('Data refreshed');
  };



  /**
   * Handle approve transaction action
   */
  const handleApprove = async (transactionId: string) => {
    try {
      const result = await handleApproveFloatTransaction(transactionId);
      if (result.success) {
        toast.success('Transaction approved');
        fetchData(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to approve transaction');
      }
    } catch (error) {
      console.error('Error approving transaction:', error);
      toast.error('An error occurred while approving transaction');
    }
  };

  /**
   * Handle reject transaction action
   */
  const handleReject = async (transactionId: string) => {
    try {
      const result = await handleRejectFloatTransaction(transactionId);
      if (result.success) {
        toast.error('Transaction rejected');
        fetchData(); // Refresh data
      } else {
        toast.error(result.error || 'Failed to reject transaction');
      }
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      toast.error('An error occurred while rejecting transaction');
    }
  };

  /**
   * Handle cashier float table column sort
   */
  const handleFloatSort = (column: CashierFloatSortOption) => {
    if (floatSortOption === column) {
      setFloatSortOrder(floatSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setFloatSortOption(column);
      setFloatSortOrder('asc');
    }
  };

  /**
   * Handle float transaction table column sort
   */
  const handleTransactionSort = (column: FloatTransactionSortOption) => {
    if (transactionSortOption === column) {
      setTransactionSortOrder(transactionSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setTransactionSortOption(column);
      setTransactionSortOrder('asc');
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  if (loading && floatTransactions.length === 0) {
    return (
      <PageLayout showHeader={false}>
        <VaultFloatTransactionsSkeleton />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout showHeader={false}>
        <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-red-500" />
          <h2 className="text-xl font-semibold text-gray-900">{error}</h2>
          <Button onClick={fetchData} variant="outline" className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
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
              Float Transactions
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage float increases and decreases.
            </p>
          </div>
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
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-lg bg-container shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Cashier Float
                  </p>
                  <p className="break-words text-xl font-bold text-orangeHighlight sm:text-2xl">
                    {formatAmount(totalCashierFloat)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg bg-container shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Active Cashiers
                  </p>
                  <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">
                    {activeCashiers}
                  </p>
                </div>
                <Users className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg bg-container shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Requests
                  </p>
                  <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">
                    {pendingRequests}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-lg bg-container shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Vault Available
                  </p>
                  <p className="break-words text-xl font-bold text-lighterBlueHighlight sm:text-2xl">
                    {formatAmount(vaultBalance.balance)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>



        {/* Current Cashier Floats: Responsive Views */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Current Cashier Floats
          </h2>

          {/* Desktop Table View - lg and above */}
          <div className={loading ? 'pointer-events-none opacity-50' : ''}>
            <VaultCashierFloatsTable
              floats={sortedCashierFloats}
              sortOption={floatSortOption}
              sortOrder={floatSortOrder}
              onSort={handleFloatSort}
            />
          </div>

          {/* Mobile/Tablet Card View - below lg */}
          <div
            className={
              loading ? 'pointer-events-none opacity-50' : 'block lg:hidden'
            }
          >
            <VaultCashierFloatsMobileCards floats={sortedCashierFloats} />
          </div>
        </div>

        {/* Float Transaction History: Responsive Views */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Float Transaction History
          </h2>

          {/* Desktop Table View - lg and above */}
          <div className={loading ? 'pointer-events-none opacity-50' : ''}>
            <VaultFloatTransactionsTable
              transactions={sortedFloatTransactions}
              sortOption={transactionSortOption}
              sortOrder={transactionSortOrder}
              onSort={handleTransactionSort}
              onApprove={handleApprove}
              onReject={handleReject}
              showActions={true}
            />
          </div>

          {/* Mobile/Tablet Card View - below lg */}
          <div
            className={
              loading ? 'pointer-events-none opacity-50' : 'block lg:hidden'
            }
          >
            <VaultFloatTransactionsMobileCards
              transactions={sortedFloatTransactions}
              onApprove={handleApprove}
              onReject={handleReject}
              showActions={true}
            />
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                setCurrentPage={setCurrentPage}
              />
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
