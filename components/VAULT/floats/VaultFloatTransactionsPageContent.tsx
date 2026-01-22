/**
 * Vault Float Transactions Page Content Component
 *
 * Float management page for the Vault Management application.
 *
 * Features:
 * - Summary metrics cards
 * - Issue Float and Receive Float action buttons
 * - Current Cashier Floats table
 * - Float Transaction History table
 *
 * @module components/VAULT/pages/VaultFloatTransactionsPageContent
 */
'use client';

import { useState, useMemo } from 'react';
import PageLayout from '@/components/shared/layout/PageLayout';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import {
  mockCashierFloats,
  mockFloatTransactions,
  mockVaultBalance,
} from '@/components/VAULT/overview/data/mockData';
import type { CashierFloat } from '@/shared/types/vault';
import type { CashierFloatSortOption } from './tables/VaultCashierFloatsTable';
import type { FloatTransactionSortOption } from './tables/VaultFloatTransactionsTable';
import VaultCashierFloatsTable from './tables/VaultCashierFloatsTable';
import VaultCashierFloatsMobileCards from './cards/VaultCashierFloatsMobileCards';
import VaultFloatTransactionsTable from './tables/VaultFloatTransactionsTable';
import VaultFloatTransactionsMobileCards from './cards/VaultFloatTransactionsMobileCards';
import { Plus, Minus, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function VaultFloatTransactionsPageContent() {
  // ============================================================================
  // Hooks & State
  // ============================================================================
  const { formatAmount } = useCurrencyFormat();
  const [floatSortOption, setFloatSortOption] = useState<CashierFloatSortOption>('cashier');
  const [floatSortOrder, setFloatSortOrder] = useState<'asc' | 'desc'>('asc');
  const [transactionSortOption, setTransactionSortOption] =
    useState<FloatTransactionSortOption>('dateTime');
  const [transactionSortOrder, setTransactionSortOrder] = useState<'asc' | 'desc'>('desc');

  // ============================================================================
  // Computed Values
  // ============================================================================
  /**
   * Sum of all cashier float amounts
   */
  const totalCashierFloat = mockCashierFloats.reduce(
    (sum: number, float: CashierFloat) => sum + float.currentFloat,
    0
  );

  /**
   * Count of active cashiers
   */
  const activeCashiers = mockCashierFloats.filter((f: CashierFloat) => f.status === 'active').length;

  /**
   * Count of pending float transaction requests
   */
  const pendingRequests = mockFloatTransactions.filter(tx => tx.status === 'pending')
    .length;

  /**
   * Sort cashier floats based on sort option and order
   */
  const sortedCashierFloats = useMemo(() => {
    const sorted = [...mockCashierFloats].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (floatSortOption) {
        case 'cashier':
          aValue = a.cashier.toLowerCase();
          bValue = b.cashier.toLowerCase();
          break;
        case 'station':
          aValue = a.station.toLowerCase();
          bValue = b.station.toLowerCase();
          break;
        case 'currentFloat':
          aValue = a.currentFloat;
          bValue = b.currentFloat;
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
  }, [floatSortOption, floatSortOrder]);

  /**
   * Sort float transactions based on sort option and order
   */
  const sortedFloatTransactions = useMemo(() => {
    const sorted = [...mockFloatTransactions].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (transactionSortOption) {
        case 'dateTime':
          aValue = new Date(a.dateTime).getTime();
          bValue = new Date(b.dateTime).getTime();
          break;
        case 'cashier':
          aValue = a.cashier.toLowerCase();
          bValue = b.cashier.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'amount':
          aValue = Math.abs(a.amount);
          bValue = Math.abs(b.amount);
          break;
        case 'reason':
          aValue = a.reason.toLowerCase();
          bValue = b.reason.toLowerCase();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return transactionSortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return transactionSortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [transactionSortOption, transactionSortOrder]);

  // ============================================================================
  // Event Handlers
  // ============================================================================
  /**
   * Handle issue float button click
   * Placeholder for future modal implementation
   */
  const handleIssueFloat = () => {
    toast.info('Issue Float modal will be implemented');
  };

  /**
   * Handle receive float button click
   * Placeholder for future modal implementation
   */
  const handleReceiveFloat = () => {
    toast.info('Receive Float modal will be implemented');
  };

  /**
   * Handle approve transaction action
   * Placeholder for future API integration
   *
   * @param transactionId - ID of transaction to approve
   */
  const handleApprove = (transactionId: string) => {
    toast.success(`Transaction ${transactionId} approved`);
  };

  /**
   * Handle reject transaction action
   * Placeholder for future API integration
   *
   * @param transactionId - ID of transaction to reject
   */
  const handleReject = (transactionId: string) => {
    toast.error(`Transaction ${transactionId} rejected`);
  };

  /**
   * Handle cashier float table column sort
   * Toggles sort order if clicking the same column, otherwise sets new sort column
   *
   * @param column - Column to sort by
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
   * Toggles sort order if clicking the same column, otherwise sets new sort column
   *
   * @param column - Column to sort by
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
  return (
    <PageLayout showHeader={false}>
      <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Float Transactions</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage float increases and decreases.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cashier Float</p>
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
                <p className="text-sm font-medium text-gray-600">Active Cashiers</p>
                <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">{activeCashiers}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                <p className="break-words text-xl font-bold text-gray-900 sm:text-2xl">{pendingRequests}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg bg-container shadow-md">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vault Available</p>
                <p className="break-words text-xl font-bold text-lighterBlueHighlight sm:text-2xl">
                  {formatAmount(mockVaultBalance.balance)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button
          onClick={handleIssueFloat}
          className="bg-orangeHighlight text-white hover:bg-orangeHighlight/90"
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Issue Float
        </Button>
        <Button
          onClick={handleReceiveFloat}
          className="bg-button text-white hover:bg-button/90"
          size="lg"
        >
          <Minus className="mr-2 h-5 w-5" />
          Receive Float
        </Button>
      </div>

      {/* Current Cashier Floats: Responsive Views */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Current Cashier Floats</h2>

        {/* Desktop Table View - lg and above */}
        <VaultCashierFloatsTable
          floats={sortedCashierFloats}
          sortOption={floatSortOption}
          sortOrder={floatSortOrder}
          onSort={handleFloatSort}
        />

        {/* Mobile/Tablet Card View - below lg */}
        <VaultCashierFloatsMobileCards floats={sortedCashierFloats} />
      </div>

      {/* Float Transaction History: Responsive Views */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Float Transaction History</h2>

        {/* Desktop Table View - lg and above */}
        <VaultFloatTransactionsTable
          transactions={sortedFloatTransactions}
          sortOption={transactionSortOption}
          sortOrder={transactionSortOrder}
          onSort={handleTransactionSort}
          onApprove={handleApprove}
          onReject={handleReject}
          showActions={true}
        />

        {/* Mobile/Tablet Card View - below lg */}
        <VaultFloatTransactionsMobileCards
          transactions={sortedFloatTransactions}
          onApprove={handleApprove}
          onReject={handleReject}
          showActions={true}
        />
      </div>
      </div>
    </PageLayout>
  );
}
